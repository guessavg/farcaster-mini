'use client'
import { useMemo, useState } from 'react'
import { useAccount, useConnect, useReadContract, useWriteContract } from 'wagmi'
import { formatEther, parseEther } from 'viem'
import { guess23Abi } from '@/lib/abi'

// Base mainnet contract address
const CONTRACT = "0x4BbeE9F876ff56832E724DC9a7bD06538C8868D2" as `0x${string}`

export default function GamePage() {
  const { isConnected, address } = useAccount()
  const { connect, connectors } = useConnect()
  const [eth, setEth] = useState('0.01')

  // 读取总额 / gameId / minX / maxX
  const { data: totalAmount } = useReadContract({
    address: CONTRACT, abi: guess23Abi, functionName: 'totalAmount'
  })
  const { data: gameId } = useReadContract({
    address: CONTRACT, abi: guess23Abi, functionName: 'gameId'
  })
  const { data: minX } = useReadContract({
    address: CONTRACT, abi: guess23Abi, functionName: 'minX'
  })
  const { data: maxX } = useReadContract({
    address: CONTRACT, abi: guess23Abi, functionName: 'maxX'
  })
  const { data: alreadyPlayed } = useReadContract({
    address: CONTRACT, abi: guess23Abi, functionName: 'hasPlayed', args: [address ?? '0x0000000000000000000000000000000000000000']
  })

  const value = useMemo(() => (eth ? parseEther(eth) : 0n), [eth])
  const { writeContractAsync, isPending, data: txHash, error } = useWriteContract()

  const onPlay = async () => {
    await writeContractAsync({
      address: CONTRACT,
      abi: guess23Abi,
      functionName: 'play',
      value,
    })
  }

  if (!isConnected) {
    return (
      <div className="p-6 space-y-4">
        <h1 className="text-xl font-semibold">Guess 2/3 of the Average</h1>
        <p className="text-sm text-gray-600">Chain: Base • Contract: {CONTRACT.slice(0,6)}…{CONTRACT.slice(-4)}</p>
        <button
          className="px-4 py-2 rounded bg-black text-white"
          onClick={() => connect({ connector: connectors[0] })}
        >
          Connect Wallet
        </button>
      </div>
    )
  }

  const disabled = isPending || !value || value === 0n || alreadyPlayed === true

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-xl font-semibold">Round #{(gameId as bigint) ?? 0n}</h1>
      <p className="text-sm text-gray-600">
        Pool: {totalAmount ? `${formatEther(totalAmount as bigint)} ETH` : '–'} •
        Stop window ≈ [{String(minX ?? '–')}, {String(maxX ?? '–')}]
      </p>

      <label className="block">
        <span className="text-sm">Enter any amount (ETH)</span>
        <input
          className="mt-1 border rounded px-3 py-2 w-full"
          placeholder="0.01"
          value={eth}
          onChange={(e) => setEth(e.target.value)}
          inputMode="decimal"
        />
      </label>

      <button
        className="px-4 py-2 rounded bg-purple-600 text-white disabled:opacity-50"
        disabled={disabled}
        onClick={onPlay}
      >
        {alreadyPlayed ? 'You already played' : (isPending ? 'Submitting…' : 'Join this round')}
      </button>

      {txHash && <p className="text-sm break-all">Submitted tx: <code>{txHash}</code></p>}
      {error && <p className="text-sm text-red-600">Error: {error.message}</p>}

      <hr className="my-4" />
      <p className="text-xs text-gray-500">
        Rule: closest to ⌊2/3 × average⌋ wins total pool – 1% fee to owner. Ties go to earliest player.
      </p>
    </div>
  )
}
