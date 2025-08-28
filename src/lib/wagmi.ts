// lib/wagmi.ts
import { createConfig, http } from 'wagmi'
import { base, baseSepolia, mainnet } from 'wagmi/chains'
import { farcasterMiniApp as miniAppConnector } from '@farcaster/miniapp-wagmi-connector'
import { coinbaseWallet, injected, walletConnect } from 'wagmi/connectors'

// Default to Base mainnet unless specified otherwise in environment
const CHAIN_ID = Number(process.env.NEXT_PUBLIC_CHAIN_ID || 8453)
const CHAIN = CHAIN_ID === baseSepolia.id ? baseSepolia : base

// WalletConnect projectId - you should get your own from https://cloud.walletconnect.com/
const WALLET_CONNECT_PROJECT_ID = process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID || '3a8170812b534d0ff9d794f19a901d64'

// Initialize WalletConnect with offline fallback options to prevent errors
const walletConnectOptions = {
  projectId: WALLET_CONNECT_PROJECT_ID,
  metadata: {
    name: 'Guess 2/3 Game',
    description: 'A game where players guess 2/3 of the average bet',
    url: typeof window !== 'undefined' ? window.location.origin : 'https://guess23.example.com',
    icons: ['https://avatars.githubusercontent.com/u/37784886']
  },
  // Add options to make WalletConnect more resilient to network issues
  showQrModal: true,
  optionalMethods: true,
  relayUrl: 'wss://relay.walletconnect.org'
}

// Create a singleton config to prevent multiple initializations
export const config = createConfig({
  // Include Base and mainnet for wider compatibility
  chains: [CHAIN, mainnet],
  transports: {
    [base.id]: http('https://mainnet.base.org'),
    [baseSepolia.id]: http('https://sepolia.base.org'), 
    [mainnet.id]: http('https://eth.merkle.io')
  },
  connectors: [
    // Farcaster Mini App connector should be first for best experience in Warpcast
    miniAppConnector(),
    // Add other common wallet connectors for broader compatibility
    injected(),
    coinbaseWallet({ 
      appName: 'Guess 2/3 Game',
    }),
    walletConnect(walletConnectOptions)
  ]
})

// Export for backward compatibility (renamed to avoid confusion)
export const wagmiConfig = config;
