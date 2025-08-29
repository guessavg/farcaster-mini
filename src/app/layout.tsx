import './globals.css'
import Providers from './providers'
import { Metadata } from 'next'

// Basic app configuration
const appConfig = {
  title: 'Guess 2/3 Game',
  description: 'A game where players guess 2/3 of the average bet',
  image: 'https://guess23.vercel.app/icon.png',
  url: 'https://guess23.vercel.app',
}

// Farcaster Mini App configuration
const farcasterConfig = {
  buttons: [
    {
      label: 'Play Now',
      action: 'post',
    },
    {
      label: 'Learn More',
      action: 'link',
      target: 'https://guess23.vercel.app',
    }
  ],
  // Add other configurations as needed
}

// Generate Farcaster Meta tags content
const fcMetaContent = JSON.stringify({
  image: appConfig.image,
  buttons: farcasterConfig.buttons,
  // Add other Farcaster-specific configurations as needed
})

// Define Next.js metadata
export const metadata: Metadata = {
  title: appConfig.title,
  description: appConfig.description,
  openGraph: {
    title: appConfig.title,
    description: appConfig.description,
    images: [{ url: appConfig.image }],
  },
  twitter: {
    card: 'summary_large_image',
    title: appConfig.title,
    description: appConfig.description,
    images: [appConfig.image],
  },
  other: {
    'fc:miniapp': fcMetaContent,
    'fc:frame': fcMetaContent, // For backward compatibility
  }
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body><Providers>{children}</Providers></body>
    </html>
  )
}
