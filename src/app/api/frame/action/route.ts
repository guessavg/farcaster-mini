import { NextRequest, NextResponse } from 'next/server';
import { APP_URL } from '~/lib/constants';

export const dynamic = 'force-dynamic';

// Handle POST request after Frame button click
export async function POST(request: NextRequest) {
  try {
    // Parse Frame's POST request
    const body = await request.json();
    
    // Extract information from the request
    const { untrustedData, trustedData } = body;
    const { fid, buttonIndex } = untrustedData || {};
    
    // Handle different actions based on button index
    switch (buttonIndex) {
      case 1: // "Play Now" button
        // Game-related logic can be added here
        // For example, create a game session or record user participation
        
        // Return a new Frame as response
        return NextResponse.json({
          frameMetadata: {
            version: 1,
            image: `${APP_URL}/api/opengraph-image?action=play${fid ? `&fid=${fid}` : ''}`,
            title: 'Ready to Play!',
            description: 'Get ready to guess 2/3 of the average',
            buttons: [
              {
                label: 'Open Game',
                action: 'link',
                target: `${APP_URL}/mini?fid=${fid}`
              }
            ],
          }
        });
        
      default:
        // Default response
        return NextResponse.json({
          frameMetadata: {
            version: 1,
            image: `${APP_URL}/api/opengraph-image?action=default`,
            title: 'Guess 2/3 Game',
            description: 'Thank you for interacting!',
            buttons: [
              {
                label: 'Visit App',
                action: 'link',
                target: APP_URL
              }
            ],
          }
        });
    }
  } catch (error) {
    console.error('Error processing frame action:', error);
    return NextResponse.json({ error: 'Failed to process frame action' }, { status: 500 });
  }
}
