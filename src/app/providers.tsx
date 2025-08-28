'use client'
import { WagmiProvider } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { config } from '../lib/wagmi'
import { MiniAppProvider } from '@neynar/react'
import { useState } from 'react'
import { CoinbaseWalletAutoConnect } from '../components/providers/WagmiProvider'
import { SafeFarcasterSolanaProvider } from '../components/providers/SafeFarcasterSolanaProvider'
import FarcasterFallbackProvider from '../components/providers/FarcasterFallbackProvider'

// Solana RPC endpoint - using a public endpoint for this example, but consider using a dedicated one for production
const SOLANA_RPC_ENDPOINT = 'https://api.mainnet-beta.solana.com'

export default function Providers({ children }: { children: React.ReactNode }) {
  // Create a query client with React Query
  const [queryClient] = useState(() => new QueryClient())

  return (
    <FarcasterFallbackProvider>
      <MiniAppProvider>
        <QueryClientProvider client={queryClient}>
          <WagmiProvider config={config}>
            <CoinbaseWalletAutoConnect>
              <SafeFarcasterSolanaProvider endpoint={SOLANA_RPC_ENDPOINT}>
                {children}
              </SafeFarcasterSolanaProvider>
            </CoinbaseWalletAutoConnect>
          </WagmiProvider>
        </QueryClientProvider>
      </MiniAppProvider>
    </FarcasterFallbackProvider>
  )
}
