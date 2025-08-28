import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
  // Use SWC compiler instead of Babel
  swcMinify: true,
  serverExternalPackages: ['@vercel/og'],
  images: {
    domains: ['localhost'],
  },
  // Exclude hardhat related files from the build
  webpack: (config, { _isServer }) => {
    // Exclude hardhat.config.ts and files in contracts/ and scripts/ folders from the build
    config.externals = [...(config.externals || []), 'hardhat', '@nomicfoundation/hardhat-toolbox'];
    
    // Add specific rule to ignore hardhat config
    config.module = config.module || {};
    config.module.rules = config.module.rules || [];
    config.module.rules.push({
      test: /hardhat\.config\.ts$/,
      loader: 'ignore-loader',
    });
    
    config.resolve = config.resolve || {};
    config.resolve.alias = {
      ...config.resolve.alias,
      '@gemini-wallet/core': path.resolve(__dirname, './src/lib/gemini-wallet-shim.js'),
    };
    
    return config;
  },
};

export default nextConfig;
