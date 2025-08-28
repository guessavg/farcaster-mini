import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

export async function GET(req: NextRequest) {
  try {
    // You can fetch current pot data from your contract or API here
    const currentPot = '0.5 ETH'; // Replace with actual data fetch
    
    return new ImageResponse(
      (
        <div
          style={{
            display: 'flex',
            fontSize: 60,
            color: 'white',
            background: 'linear-gradient(to bottom, #8B5CF6, #6366F1)',
            width: '100%',
            height: '100%',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            padding: 50,
          }}
        >
          <div style={{ fontSize: 70, fontWeight: 'bold', marginBottom: 20 }}>
            Guess 23 Mini Game
          </div>
          <div style={{ fontSize: 50, marginBottom: 40 }}>
            Current Pot: {currentPot}
          </div>
          <div
            style={{
              fontSize: 30,
              backgroundColor: 'rgba(255,255,255,0.2)',
              padding: '12px 24px',
              borderRadius: 12,
            }}
          >
            Take your guess now!
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    );
  } catch (e) {
    console.error(e);
    return new Response('Failed to generate OG image', { status: 500 });
  }
}
