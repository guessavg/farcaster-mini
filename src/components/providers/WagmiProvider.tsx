import { useEffect, useState } from "react";
import { useConnect, useAccount } from "wagmi";
import React from "react";

// Add ethereum to the window object type
declare global {
  interface Window {
    ethereum?: any; // Use 'any' to avoid conflicts with existing definitions
  }
}

// Base chain ID
const BASE_CHAIN_ID = 8453; // Base mainnet

// Custom hook for Coinbase Wallet detection, auto-connection and network switching
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

  // Auto switch to Base network
  useEffect(() => {
    const switchToBaseNetwork = async () => {
      if (!window.ethereum) return;
      
      try {
        // Try to switch to Base network
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: `0x${BASE_CHAIN_ID.toString(16)}` }], // Convert to hex
        });
        console.log('Successfully switched to Base network');
      } catch (switchError: any) {
        // This error code indicates that the chain has not been added to MetaMask
        if (switchError.code === 4902) {
          try {
            // Add Base network to the wallet
            await window.ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [
                {
                  chainId: `0x${BASE_CHAIN_ID.toString(16)}`,
                  chainName: 'Base',
                  nativeCurrency: {
                    name: 'ETH',
                    symbol: 'ETH',
                    decimals: 18,
                  },
                  rpcUrls: ['https://mainnet.base.org'],
                  blockExplorerUrls: ['https://basescan.org'],
                },
              ],
            });
            console.log('Base network added to wallet');
          } catch (addError) {
            console.error('Failed to add Base network:', addError);
          }
        } else {
          console.error('Failed to switch to Base network:', switchError);
        }
      }
    };

    // If wallet is connected, try to switch to Base network
    if (isConnected && window.ethereum) {
      switchToBaseNetwork();
    }
  }, [isConnected]);

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
