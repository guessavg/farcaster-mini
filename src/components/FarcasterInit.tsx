'use client';

import { useEffect } from 'react';

/**
 * FarcasterInit component is responsible for initializing the Farcaster SDK
 * Place it in the root layout file to ensure initialization when the application loads
 */
export default function FarcasterInit() {
  useEffect(() => {
    async function initFarcaster() {
      try {
        // Dynamically import Farcaster SDK to avoid SSR issues
        const { sdk } = await import('@farcaster/miniapp-sdk');
        // Initialize and hide the splash screen
        await sdk.actions.ready();
        console.log('Farcaster SDK initialized');
      } catch (error) {
        console.error('Failed to initialize Farcaster SDK:', error);
      }
    }

    initFarcaster();
  }, []);

  // This component doesn't render any visible content
  return null;
}
