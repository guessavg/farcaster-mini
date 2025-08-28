'use client'
import { WagmiProvider } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { wagmiConfig } from '../lib/wagmi'
import { MiniAppProvider } from '@neynar/react'
import { useState } from 'react'

export default function Providers({ children }: { children: React.ReactNode }) {
  // Create a query client with React Query
  const [queryClient] = useState(() => new QueryClient())

  return (
    <MiniAppProvider>
      <QueryClientProvider client={queryClient}>
        <WagmiProvider config={wagmiConfig}>{children}</WagmiProvider>
      </QueryClientProvider>
    </MiniAppProvider>
  )
}
