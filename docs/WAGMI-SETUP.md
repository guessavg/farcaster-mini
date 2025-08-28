# Setting up Wagmi and React Query with Farcaster Mini App

This guide explains how to properly set up Wagmi and React Query in your Farcaster Mini App.

## Providers Setup

Make sure your providers.tsx file includes both WagmiProvider and QueryClientProvider:

```tsx
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
```

## Wagmi Configuration

Configure Wagmi in lib/wagmi.ts:

```tsx
import { createConfig, http } from 'wagmi'
import { base, baseSepolia, mainnet } from 'wagmi/chains'
import { farcasterMiniApp as miniAppConnector } from '@farcaster/miniapp-wagmi-connector'
import { coinbaseWallet, injected, walletConnect } from 'wagmi/connectors'

// Default to Base mainnet unless specified otherwise
const CHAIN_ID = Number(process.env.NEXT_PUBLIC_CHAIN_ID || 8453)
const CHAIN = CHAIN_ID === baseSepolia.id ? baseSepolia : base

const WALLET_CONNECT_PROJECT_ID = process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID || 'your_project_id'

export const wagmiConfig = createConfig({
  chains: [CHAIN, mainnet],
  transports: {
    [base.id]: http(),
    [baseSepolia.id]: http(),
    [mainnet.id]: http()
  },
  connectors: [
    miniAppConnector(),
    injected(),
    coinbaseWallet({ appName: 'Your App Name' }),
    walletConnect({ 
      projectId: WALLET_CONNECT_PROJECT_ID,
      metadata: {
        name: 'Your App Name',
        description: 'Your app description',
        url: typeof window !== 'undefined' ? window.location.origin : 'https://yourapp.com',
        icons: ['https://yourapp.com/icon.png']
      }
    })
  ]
})
```

## Using Wagmi Hooks

When using Wagmi hooks in your components:

```tsx
// Reading from contracts
const { data } = useContractRead({
  address: CONTRACT_ADDRESS as `0x${string}`,
  abi: yourContractAbi,
  functionName: "yourFunction",
  args: [arg1, arg2], // if needed
});

// Writing to contracts
const { writeContract, isPending } = useContractWrite();

// In your handler function:
const handleAction = async () => {
  try {
    writeContract({
      address: CONTRACT_ADDRESS as `0x${string}`,
      abi: yourContractAbi,
      functionName: 'yourFunction',
      args: [arg1, arg2], // if needed
      value: parseEther('0.01') // if sending ETH
    });
  } catch (error) {
    console.error("Error:", error);
  }
};

// Use isPending in your UI
<Button disabled={isPending}>
  {isPending ? "Processing..." : "Submit"}
</Button>
```

## Common Issues

1. **"No QueryClient set, use QueryClientProvider to set one"**
   - Make sure QueryClientProvider is properly set up in your providers.tsx

2. **"Object literal may only specify known properties, and 'enabled' does not exist in type..."**
   - Some properties like 'enabled' may not be available in newer versions of Wagmi

3. **Wagmi configuration errors**
   - Make sure to properly type all addresses with `as \`0x${string}\`` 
   - Ensure all required chains are included in the transports object
