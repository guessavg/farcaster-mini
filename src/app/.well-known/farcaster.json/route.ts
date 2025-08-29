// app/.well-known/farcaster.json/route.ts
import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    accountAssociation: {
      header: "eyJmaWQiOjExNjU5OTksInR5cGUiOiJhdXRoIiwia2V5IjoiMHg5REZlOEFiZjFDYjc2RjBBQjNEYjBjM2I1MDgzRTdERjhkNTdBRDZhIn0",
      payload: "eyJkb21haW4iOiIifQ",
      signature: "cV2PxtZTKmW0HjHPBaJBBXXbGZKy/eSwVltBHm68ozwnb2DhKzUArtvnqwYbzz1Eu0U3fbCo/r6EWL02XY7XXhs="
    },
    miniapp: {
      version: '1',
      name: 'Guess 2/3',
      iconUrl: 'https://guess23.vercel.app/icon.png',
      splashImageUrl: 'https://guess23.vercel.app/splash.png',
      splashBackgroundColor: '#0b0b10',
      homeUrl: 'https://guess23.vercel.app/',
      requiredChains: ['eip155:8453'],
      requiredCapabilities: ['wallet.getEthereumProvider'],
      primaryCategory: 'games',
      tags: ['game', 'base', 'eth']
    }
  })
}
