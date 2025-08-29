// app/.well-known/farcaster.json/route.ts
import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    accountAssociation: {
      header: "eyJmaWQiOjExNjU5OTksInR5cGUiOiJhdXRoIiwia2V5IjoiMHg5REZlOEFiZjFDYjc2RjBBQjNEYjBjM2I1MDgzRTdERjhkNTdBRDZhIn0",
      payload: "eyJkb21haW4iOiJndWVzczIzLnZlcmNlbC5hcHAifQ",
      signature: "FG6BxeQDYOHsXmcE1SJtgpQIdo0vBY+G6qNIOWqWhNpUoI/7pFm2QGO8ppxrJFiuIMsoikHgR956yas/4ptTUBw="
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
