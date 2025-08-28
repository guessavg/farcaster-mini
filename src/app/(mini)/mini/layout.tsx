'use client'
import { useEffect } from 'react'

export default function MiniLayout({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    (async () => {
      const { sdk } = await import('@farcaster/miniapp-sdk')
      await sdk.actions.ready()    // 关键：隐藏启动页
    })()
  }, [])
  return <>{children}</>
}
