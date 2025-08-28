import { NextRequest, NextResponse } from 'next/server';
import { APP_OG_IMAGE_URL } from '~/lib/constants';

export async function GET(_req: NextRequest) {
  return NextResponse.redirect(APP_OG_IMAGE_URL);
}
