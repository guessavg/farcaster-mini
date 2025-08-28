# Guess 2/3 of the Average - Farcaster Mini App

A Farcaster mini app implementing the classic "Guess 2/3 of the average" game using blockchain technology.

## Game Rules

In this game:

1. Players bet any amount of ETH to participate
2. The system calculates 2/3 of the average bet amount
3. The player whose bet is closest to this target value wins the entire pot (minus a small fee)
4. Each game ends randomly to ensure fairness
5. Each player can only participate once per game

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- A Farcaster account
- A wallet with ETH on Base network

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/guess-23-mini.git
cd guess-23-mini
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
# Edit .env and add your Neynar API key
```

4. Start the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) to see the app in your browser.

## Smart Contract

The game is powered by a smart contract deployed on the Base network. The contract address is:

```
0x4BbeEa57578E4a078CB8ae4F98C83E45613868D2
```

### Deploying Your Own Contract

If you want to deploy your own version of the contract:

1. Set up your private key and API keys in the `.env` file
2. Run the deployment script:
```bash
npx hardhat run scripts/deploy-contract.ts --network base
```
3. Update the `CONTRACT_ADDRESS` in `src/components/ui/tabs/HomeTab.tsx` with your newly deployed contract address

## Technology Stack

- Next.js
- React
- Wagmi (Ethereum interactions)
- Farcaster Mini App SDK
- Hardhat (Contract development)
- Solidity

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Built using the [Neynar Farcaster Mini App](https://docs.neynar.com/docs/create-farcaster-miniapp-in-60s) template
- Inspired by the classic game theory problem "Guess 2/3 of the average"
