import { useEffect, useState } from "react";
import { useConnect, useAccount } from "wagmi";
import React from "react";

// Add ethereum to the window object type
declare global {
  interface Window {
    ethereum?: any; // Use 'any' to avoid conflicts with existing definitions
  }
}

// Custom hook for Coinbase Wallet detection and auto-connection
function useCoinbaseWalletAutoConnect() {
  const [isCoinbaseWallet, setIsCoinbaseWallet] = useState(false);
  const { connect, connectors } = useConnect();
  const { isConnected } = useAccount();

  useEffect(() => {
    // Check if we're running in Coinbase Wallet
    const checkCoinbaseWallet = () => {
      const isInCoinbaseWallet = window.ethereum?.isCoinbaseWallet || 
        window.ethereum?.isCoinbaseWalletExtension ||
        window.ethereum?.isCoinbaseWalletBrowser;
      setIsCoinbaseWallet(!!isInCoinbaseWallet);
    };
    
    checkCoinbaseWallet();
    window.addEventListener('ethereum#initialized', checkCoinbaseWallet);
    
    return () => {
      window.removeEventListener('ethereum#initialized', checkCoinbaseWallet);
    };
  }, []);

  useEffect(() => {
    // Auto-connect if in Coinbase Wallet and not already connected
    if (isCoinbaseWallet && !isConnected) {
      connect({ connector: connectors[1] }); // Coinbase Wallet connector
    }
  }, [isCoinbaseWallet, isConnected, connect, connectors]);

  return isCoinbaseWallet;
}

// Wrapper component that provides Coinbase Wallet auto-connection
function CoinbaseWalletAutoConnect({ children }: { children: React.ReactNode }) {
  useCoinbaseWalletAutoConnect();
  return <>{children}</>;
}

// We no longer create a WagmiProvider here to avoid duplication
// Instead, we only export the CoinbaseWalletAutoConnect component to use in the main providers.tsx
export { CoinbaseWalletAutoConnect };

// Keep this for backward compatibility, but make it a no-op that just returns children
export default function Provider({ children }: { children: React.ReactNode }) {
  // Simply return children without wrapping in WagmiProvider to avoid duplication
  console.warn('WagmiProvider from components/providers/WagmiProvider.tsx is deprecated. Use app/providers.tsx instead.');
  return <>{children}</>;
}
