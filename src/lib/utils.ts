import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Manifest } from '@farcaster/miniapp-core/src/manifest';
import {
  APP_OG_IMAGE_URL,
  APP_URL,
  APP_WEBHOOK_URL,
  APP_ACCOUNT_ASSOCIATION,
} from './constants';
import farcasterConfig from '../../public/.well-known/farcaster.json';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function generateDevId(): string {
  return `dev-${Math.floor(Math.random() * 1000000)}`;
}

export function getMiniAppEmbedMetadata(ogImageUrl?: string) {
  const { frame } = farcasterConfig;
  
  return {
    version: 'next',
    imageUrl: ogImageUrl ?? frame.iconUrl,
    ogTitle: frame.name,
    ogDescription: frame.description,
    ogImageUrl: ogImageUrl ?? frame.iconUrl,
    button: {
      title: frame.subtitle || 'Play Now',
      action: {
        type: 'launch_frame',
        name: frame.name,
        url: frame.homeUrl,
        splashImageUrl: frame.splashImageUrl,
        iconUrl: frame.iconUrl,
        splashBackgroundColor: frame.splashBackgroundColor,
        description: frame.description,
        primaryCategory: frame.primaryCategory,
        tags: [],
      },
    },
  };
}

export async function getFarcasterDomainManifest(): Promise<Manifest> {
  const { frame, accountAssociation } = farcasterConfig;
  
  return {
    accountAssociation: APP_ACCOUNT_ASSOCIATION || accountAssociation,
    miniapp: {
      version: "1",
      name: frame.name,
      homeUrl: frame.homeUrl || APP_URL,
      iconUrl: frame.iconUrl,
      imageUrl: APP_OG_IMAGE_URL || frame.iconUrl,
      buttonTitle: frame.subtitle || 'Launch Mini App',
      splashImageUrl: frame.splashImageUrl,
      splashBackgroundColor: frame.splashBackgroundColor,
      webhookUrl: APP_WEBHOOK_URL,
    },
  };
}
