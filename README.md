# Guess 2/3 of the Average - Farcaster Mini App

A decentralized game where players bet ETH and try to guess 2/3 of the average bet amount. The closest player wins the pot!

This is a [NextJS](https://nextjs.org/) + TypeScript + React app built as a Farcaster Mini App.

## Game Rules

1. **Betting**: Players can bet any amount of ETH they want.
2. **Target**: The winning number is calculated as 2/3 of the average of all bets.
3. **Winner**: The player whose bet is closest to the target wins the entire pot (minus a small fee).
4. **Game End**: Games end randomly, with the probability increasing as more players join.
5. **Multiple Bets**: A player can only participate once per game round.

## Getting Started

### Development Environment

First, install the dependencies:

```bash
npm install
```

Then, run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

### Smart Contract

The game uses a smart contract deployed on Base. The default contract address is:
```
0x4BbeEa57578E4a078CB8ae4F98C83E45613868D2
```

#### Deploying Your Own Contract

If you want to deploy your own version of the contract:

1. Install Hardhat dependencies:
   ```bash
   npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox @nomicfoundation/hardhat-verify
   ```

2. Create a `.env` file with your private key and API keys:
   ```
   PRIVATE_KEY=your_private_key_here
   ETHERSCAN_API_KEY=your_etherscan_api_key
   BASESCAN_API_KEY=your_basescan_api_key
   ```

3. Deploy the contract:
   ```bash
   npx hardhat run scripts/deploy-contract.ts --network base
   ```

4. Update the contract address in `src/components/ui/tabs/HomeTab.tsx`.

## Deploying to Vercel
For projects that have made minimal changes to the quickstart template, deploy to vercel by running:
```{bash}
npm run deploy:vercel
```

## Building for Production

To create a production build, run:
```{bash}
npm run build
```

The above command will generate a `.env` file based on the `.env.local` file and user input. Be sure to configure those environment variables on your hosting platform.

## Developing Script Locally

This section is only for working on the script and template. If you simply want to create a mini app and _use_ the template, this section is not for you.

### Recommended: Using `npm link` for Local Development

To iterate on the CLI and test changes in a generated app without publishing to npm:

1. In your installer/template repo (this repo), run:
   ```bash
   npm link
   ```
   This makes your local version globally available as a symlinked package.


1. Now, when you run:
   ```bash
   npx @neynar/create-farcaster-mini-app
   ```
   ...it will use your local changes (including any edits to `init.js` or other files) instead of the published npm version.

### Alternative: Running the Script Directly

You can also run the script directly for quick iteration:

```bash
node ./bin/index.js
```

However, this does not fully replicate the npx install flow and may not catch all issues that would occur in a real user environment.

### Environment Variables and Scripts

If you update environment variable handling, remember to replicate any changes in the `dev`, `build`, and `deploy` scripts as needed. The `build` and `deploy` scripts may need further updates and are less critical for most development workflows.

# farcaster-mini
