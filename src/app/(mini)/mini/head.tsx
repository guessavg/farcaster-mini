export default function Head() {
  const embed = {
    version: '1',
    imageUrl: 'https://your.domain/og/current-pot.png', // 建议 3:2 PNG（可改为动态 OG 图）
    button: {
      title: 'Play on Farcaster',
      action: {
        type: 'launch_miniapp',
        url: 'https://your.domain/mini',
        name: 'Guess 2/3',
        splashImageUrl: 'https://your.domain/icon-200.png',
        splashBackgroundColor: '#0b0b10',
      },
    },
  }
  return (
    <>
      <meta name="fc:miniapp" content={JSON.stringify(embed)} />
      {/* 兼容旧版： */}
      <meta name="fc:frame" content={JSON.stringify({ ...embed, button: { ...embed.button, action: { ...embed.button.action, type: 'launch_frame' }}})} />
    </>
  )
}
