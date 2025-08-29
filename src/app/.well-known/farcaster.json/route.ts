import { NextResponse } from 'next/server'
import { APP_NAME, APP_URL, APP_ICON_URL, APP_SPLASH_URL, APP_SPLASH_BACKGROUND_COLOR, APP_PRIMARY_CATEGORY, APP_TAGS } from '~/lib/constants'

export async function GET() {
  return NextResponse.json({
    miniapp: {
      version: '1',
      name: 'Guess 2/3',
      iconUrl: "https://guessavg.github.io/icon/icon.png",
      splashImageUrl: "https://guessavg.github.io/icon/icon.png",
      splashBackgroundColor: '#0b0b10',
      homeUrl: 'https://guess23.vercel.app/',
      requiredChains: ['eip155:8453'],
      requiredCapabilities: [
        'wallet.getEthereumProvider'
      ],
      primaryCategory: 'games',
      tags: ['game', 'base', 'eth']
    },
    accountAssociation: {
      header: 'eip191:…',
      payload: '…',
      signature: '0x…'
    }
  })
}
