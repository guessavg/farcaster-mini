import { isMobile } from './devices';

// Deep link URLs for various wallets
const WALLET_DEEP_LINKS = {
  metamask: 'https://metamask.app.link/dapp/',
  trustwallet: 'https://link.trustwallet.com/open_url?url=',
  coinbase: 'https://go.cb-w.com/dapp?cb_url=',
  rainbow: 'https://rnbwapp.com/dapp?url='
};

// Check if any provider is available
export function hasEthereumProvider(): boolean {
  return typeof window !== 'undefined' && !!window.ethereum;
}

// Check for specific wallet providers
export function hasMetaMaskProvider(): boolean {
  return typeof window !== 'undefined' && 
    !!window.ethereum && 
    (window.ethereum.isMetaMask || false);
}

export function hasCoinbaseWalletProvider(): boolean {
  return typeof window !== 'undefined' && 
    !!window.ethereum && 
    (window.ethereum.isCoinbaseWallet || false);
}

// Helper function to open a dApp URL in a mobile wallet via deep link
export function openWalletAppWithDappUrl(
  preferredWallet: keyof typeof WALLET_DEEP_LINKS = 'metamask'
): void {
  if (!isMobile()) return;
  
  // Get current URL (the dApp URL)
  const currentUrl = `${window.location.href}`;
  
  // Get the deep link prefix for the preferred wallet
  const deepLinkPrefix = WALLET_DEEP_LINKS[preferredWallet] || WALLET_DEEP_LINKS.metamask;
  
  // For MetaMask, the format is different than other wallets
  const deepLink = preferredWallet === 'metamask'
    ? `${deepLinkPrefix}${window.location.hostname}${window.location.pathname}${window.location.search}`
    : `${deepLinkPrefix}${encodeURIComponent(currentUrl)}`;
  
  // Open the deep link
  window.location.href = deepLink;
}

// Try to connect to wallet in mobile environment
export async function tryWalletConnectOnMobile(): Promise<boolean> {
  // Don't do anything if not on mobile or if provider already exists
  if (!isMobile() || hasEthereumProvider()) return true;
  
  // Try to open a wallet app with the current dApp URL
  openWalletAppWithDappUrl();
  
  // Return false since we can't guarantee connection happened
  return false;
}
