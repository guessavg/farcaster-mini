import { NextRequest, NextResponse } from 'next/server';
import { APP_URL } from '~/lib/constants';

export const dynamic = 'force-dynamic';

// This API endpoint handles Farcaster Frame requests
export async function GET(request: NextRequest) {
  try {
    // Get query parameters from the request
    const { searchParams } = new URL(request.url);
    const fid = searchParams.get('fid');
    
    // Build Frame metadata
    const frameMetadata = {
      version: 1,
      image: `${APP_URL}/api/opengraph-image${fid ? `?fid=${fid}` : ''}`,
      ogImage: `${APP_URL}/api/opengraph-image${fid ? `?fid=${fid}` : ''}`,
      title: 'Guess 2/3 Game',
      description: 'A game where players guess 2/3 of the average bet',
      buttons: [
        {
          label: 'Play Now',
          action: 'post',
          // Cast/POST request handling
          target: `${APP_URL}/api/frame/action`,
          // Can pass parameters
          postData: {
            action: 'play'
          }
        },
        {
          label: 'Learn More',
          // Link action
          action: 'link', 
          target: APP_URL
        }
      ],
    };

    // Build HTML response with Frame metadata
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Guess 2/3 Game</title>
          <meta property="og:title" content="Guess 2/3 Game" />
          <meta property="og:description" content="A game where players guess 2/3 of the average bet" />
          <meta property="og:image" content="${frameMetadata.image}" />
          <meta property="fc:frame" content="vNext" />
          <meta property="fc:frame:image" content="${frameMetadata.image}" />
          <meta property="fc:frame:button:1" content="${frameMetadata.buttons[0].label}" />
          <meta property="fc:frame:button:1:action" content="${frameMetadata.buttons[0].action}" />
          <meta property="fc:frame:button:1:target" content="${frameMetadata.buttons[0].target}" />
          <meta property="fc:frame:button:2" content="${frameMetadata.buttons[1].label}" />
          <meta property="fc:frame:button:2:action" content="${frameMetadata.buttons[1].action}" />
          <meta property="fc:frame:button:2:target" content="${frameMetadata.buttons[1].target}" />
          <meta property="fc:frame:post_url" content="${APP_URL}/api/frame/action" />
        </head>
        <body>
          <h1>Guess 2/3 Game - Farcaster Frame</h1>
          <p>This is a Farcaster Frame for the Guess 2/3 Game.</p>
        </body>
      </html>
    `;

    return new Response(html, {
      headers: { 'Content-Type': 'text/html' },
    });
  } catch (error) {
    console.error('Error generating frame:', error);
    return NextResponse.json({ error: 'Failed to generate frame' }, { status: 500 });
  }
}
