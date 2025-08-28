import { NextResponse } from 'next/server'
import { APP_NAME, APP_URL, APP_ICON_URL, APP_SPLASH_URL, APP_SPLASH_BACKGROUND_COLOR, APP_PRIMARY_CATEGORY, APP_TAGS } from '~/lib/constants'

export async function GET() {
  return NextResponse.json({
    miniapp: {
      version: '1',
      name: APP_NAME,
      iconUrl: APP_ICON_URL,
      splashImageUrl: APP_SPLASH_URL,
      splashBackgroundColor: APP_SPLASH_BACKGROUND_COLOR,
      homeUrl: APP_URL,
      requiredChains: ['eip155:8453'], // Base
      requiredCapabilities: [
        'wallet.getEthereumProvider'
      ],
      primaryCategory: APP_PRIMARY_CATEGORY,
      tags: APP_TAGS
    },
  })
}
