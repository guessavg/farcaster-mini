'use client';

import { useState, useEffect, useCallback } from 'react';
import { sdk } from '@farcaster/miniapp-sdk';

// Detect if running in a Farcaster environment
const isFarcasterEnvironment = typeof window !== 'undefined' && (
  window.parent !== window || // iframe
  (navigator.userAgent && navigator.userAgent.includes('Warpcast')) || // Warpcast app
  (window.location && window.location.href && window.location.href.includes('?embedded=true')) || // embedded parameter
  (window.location && window.location.hostname && window.location.hostname === 'localhost') || // Include localhost for development
  (typeof sdk !== 'undefined' && sdk?.quickAuth !== undefined) // SDK is properly loaded and defined
);

// Safe access to SDK with detailed checks
const getSdk = () => {
  try {
    // Check if SDK is defined at all
    if (typeof sdk === 'undefined') {
      console.warn('Farcaster SDK is not defined - this is normal outside of Farcaster environment');
      return null;
    }
    
    // Check if SDK is an object
    if (typeof sdk !== 'object' || sdk === null) {
      console.warn('Farcaster SDK is not a valid object');
      return null;
    }
    
    // Verify quickAuth is available
    if (!sdk.quickAuth) {
      console.warn('Farcaster SDK is missing quickAuth module');
      return null;
    }
    
    // Verify quickAuth.getToken is a function
    if (typeof sdk.quickAuth.getToken !== 'function') {
      console.warn('Farcaster SDK quickAuth.getToken is not a function');
      return null;
    }
    
    return sdk;
  } catch (error) {
    console.warn('Error accessing Farcaster SDK:', error);
    return null;
  }
};

/**
 * Represents the current authenticated user state
 */
interface AuthenticatedUser {
  /** The user's Farcaster ID (FID) */
  fid: number;
}

/**
 * Possible authentication states for QuickAuth
 */
type QuickAuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

/**
 * Return type for the useQuickAuth hook
 */
interface UseQuickAuthReturn {
  /** Current authenticated user data, or null if not authenticated */
  authenticatedUser: AuthenticatedUser | null;
  /** Current authentication status */
  status: QuickAuthStatus;
  /** Function to initiate the sign-in process using QuickAuth */
  signIn: () => Promise<boolean>;
  /** Function to sign out and clear the current authentication state */
  signOut: () => Promise<void>;
  /** Function to retrieve the current authentication token */
  getToken: () => Promise<string | null>;
}

/**
 * Custom hook for managing QuickAuth authentication state
 *
 * This hook provides a complete authentication flow using Farcaster's QuickAuth:
 * - Automatically checks for existing authentication on mount
 * - Validates tokens with the server-side API
 * - Manages authentication state in memory (no persistence)
 * - Provides sign-in/sign-out functionality
 *
 * QuickAuth tokens are managed in memory only, so signing out of the Farcaster
 * client will automatically sign the user out of this mini app as well.
 *
 * @returns {UseQuickAuthReturn} Object containing user state and authentication methods
 *
 * @example
 * ```tsx
 * const { authenticatedUser, status, signIn, signOut } = useQuickAuth();
 *
 * if (status === 'loading') return <div>Loading...</div>;
 * if (status === 'unauthenticated') return <button onClick={signIn}>Sign In</button>;
 *
 * return (
 *   <div>
 *     <p>Welcome, FID: {authenticatedUser?.fid}</p>
 *     <button onClick={signOut}>Sign Out</button>
 *   </div>
 * );
 * ```
 */
export function useQuickAuth(): UseQuickAuthReturn {
  // Current authenticated user data
  const [authenticatedUser, setAuthenticatedUser] =
    useState<AuthenticatedUser | null>(null);
  // Current authentication status
  const [status, setStatus] = useState<QuickAuthStatus>('loading');

  /**
   * Validates a QuickAuth token with the server-side API
   *
   * @param {string} authToken - The JWT token to validate
   * @returns {Promise<AuthenticatedUser | null>} User data if valid, null otherwise
   */
  const validateTokenWithServer = async (
    authToken: string,
  ): Promise<AuthenticatedUser | null> => {
    try {
      const validationResponse = await fetch('/api/auth/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: authToken }),
      });

      if (validationResponse.ok) {
        const responseData = await validationResponse.json();
        return responseData.user;
      }

      return null;
    } catch (error) {
      console.error('Token validation failed:', error);
      return null;
    }
  };

  /**
   * Checks for existing authentication token and validates it on component mount
   * This runs automatically when the hook is first used
   */
  useEffect(() => {
    const checkExistingAuthentication = async () => {
      try {
        // Set initial state to loading
        setStatus('loading');

        // If not in Farcaster environment, allow graceful degradation
        if (!isFarcasterEnvironment) {
          console.warn('Not running in a Farcaster environment, authentication may be limited');
        }

        // Safely access SDK
        const currentSdk = getSdk();
        if (!currentSdk || !currentSdk.quickAuth) {
          console.warn('QuickAuth is not available, skipping auto-authentication');
          setStatus('unauthenticated');
          return;
        }

        try {
          // Attempt to retrieve existing token from QuickAuth SDK
          const response = await currentSdk.quickAuth.getToken();
          
          // Handle case where response or response.token might be undefined
          if (!response || !response.token) {
            console.warn('No existing QuickAuth token found');
            setStatus('unauthenticated');
            return;
          }

          // Validate the token with our server-side API
          const validatedUserSession = await validateTokenWithServer(response.token);

          if (validatedUserSession) {
            // Token is valid, set authenticated state
            setAuthenticatedUser(validatedUserSession);
            setStatus('authenticated');
            return;
          }
        } catch (sdkError) {
          console.warn('Error accessing QuickAuth:', sdkError);
          // Continue to the failure case below
        }

        // Authentication failed or token invalid
        setStatus('unauthenticated');
      } catch (error) {
        console.error('Error checking existing authentication:', error);
        setStatus('unauthenticated');
      }
    };

    checkExistingAuthentication();
  }, []);

  /**
   * Initiates the QuickAuth sign-in process
   *
   * Uses sdk.quickAuth.getToken() to get a QuickAuth session token.
   * If there is already a session token in memory that hasn't expired,
   * it will be immediately returned, otherwise a fresh one will be acquired.
   *
   * @returns {Promise<boolean>} True if sign-in was successful, false otherwise
   */
  const signIn = useCallback(async (): Promise<boolean> => {
    try {
      setStatus('loading');

      // If not in Farcaster environment, show warning but allow to proceed
      if (!isFarcasterEnvironment) {
        console.warn('Not running in a Farcaster environment, authentication may be limited');
      }

      // Safely access SDK
      const currentSdk = getSdk();
      if (!currentSdk || !currentSdk.quickAuth) {
        console.error('QuickAuth is not available');
        setStatus('unauthenticated');
        return false;
      }

      try {
        // Wrap the SDK call in a try-catch with timeout to prevent hanging
        const timeoutPromise = new Promise<null>((_, reject) => {
          setTimeout(() => reject(new Error('QuickAuth getToken timed out')), 5000);
        });
        
        // Race the SDK call with a timeout
        const response = await Promise.race([
          currentSdk.quickAuth.getToken(),
          timeoutPromise
        ]) as { token: string } | null;
        
        // Handle case where response or response.token might be undefined
        if (!response || !response.token) {
          console.warn('QuickAuth token is undefined or empty');
          setStatus('unauthenticated');
          return false;
        }

        // Validate the token with our server-side API
        const validatedUserSession = await validateTokenWithServer(response.token);

        if (validatedUserSession) {
          // Authentication successful, update user state
          setAuthenticatedUser(validatedUserSession);
          setStatus('authenticated');
          return true;
        }
      } catch (sdkError) {
        // Handle specific error related to the "reading 'result'" issue
        if (sdkError instanceof TypeError && 
            sdkError.message.includes("Cannot read properties of undefined") && 
            sdkError.message.includes("'result'")) {
          console.warn('Known QuickAuth issue: Cannot read properties of undefined (reading "result")');
          console.warn('This usually happens when not running in Warpcast or proper Farcaster environment');
        } else {
          console.error('SDK error during authentication:', sdkError);
        }
        // Continue to the failure case below
      }

      // Authentication failed, clear user state
      setStatus('unauthenticated');
      return false;
    } catch (error) {
      console.error('Sign-in process failed:', error);
      setStatus('unauthenticated');
      return false;
    }
  }, []);

  /**
   * Signs out the current user and clears the authentication state
   *
   * Since QuickAuth tokens are managed in memory only, this simply clears
   * the local user state. The actual token will be cleared when the
   * user signs out of their Farcaster client.
   */
  const signOut = useCallback(async (): Promise<void> => {
    // Clear local user state
    setAuthenticatedUser(null);
    setStatus('unauthenticated');
  }, []);

  /**
   * Retrieves the current authentication token from QuickAuth
   *
   * @returns {Promise<string | null>} The current auth token, or null if not authenticated
   */
  const getToken = useCallback(async (): Promise<string | null> => {
    try {
      // Check for Farcaster environment first
      if (!isFarcasterEnvironment) {
        console.warn('Not in Farcaster environment, authentication not available');
        return null;
      }
      
      // Safely access SDK
      const currentSdk = getSdk();
      if (!currentSdk || !currentSdk.quickAuth) {
        console.warn('QuickAuth is not available');
        return null;
      }
      
      try {
        // Wrap the SDK call in a try-catch with timeout to prevent hanging
        const timeoutPromise = new Promise<null>((_, reject) => {
          setTimeout(() => reject(new Error('QuickAuth getToken timed out')), 5000);
        });
        
        // Race the SDK call with a timeout
        const response = await Promise.race([
          currentSdk.quickAuth.getToken(),
          timeoutPromise
        ]) as { token: string } | null;
        
        // Safety check for response
        if (!response) {
          console.warn('QuickAuth returned null response');
          return null;
        }
        
        // Safety check for token
        if (!response.token) {
          console.warn('QuickAuth token is undefined or empty');
          return null;
        }
        
        return response.token;
      } catch (sdkError) {
        // Handle specific error related to the "reading 'result'" issue
        if (sdkError instanceof TypeError && 
            sdkError.message.includes("Cannot read properties of undefined") && 
            sdkError.message.includes("'result'")) {
          console.warn('Known QuickAuth issue: Cannot read properties of undefined (reading "result")');
          console.warn('This usually happens when not running in Warpcast or proper Farcaster environment');
          return null;
        }
        
        // Other SDK errors
        console.warn('Error accessing QuickAuth token:', sdkError);
        return null;
      }
    } catch (error) {
      // General error handling
      console.error('Failed to retrieve authentication token:', error);
      return null;
    }
  }, []);

  return {
    authenticatedUser,
    status,
    signIn,
    signOut,
    getToken,
  };
}