"use client";

import { useState, useEffect } from "react";
import { useAccount, useContractRead, useContractWrite, useWaitForTransactionReceipt, useBalance, usePublicClient } from "wagmi";
import { useConnect } from "wagmi";
import { formatEther } from "viem";
import { Button } from "../Button";
import { Input } from "../input";
import { Label } from "../label";
import { Share } from "../Share";
import { guess23Abi } from "~/lib/abi";
import { APP_NAME } from "~/lib/constants";

// Default contract address - update with your deployed contract address
const CONTRACT_ADDRESS = "0x4BbeE9F876ff56832E724DC9a7bD06538C8868D2"; // Base contract
// For testing in different chains, add more contract addresses

/**
 * HomeTab component displays the main game interface for the "Guess 2/3 of the average" game.
 * 
 * This component provides the following functionality:
 * - Connect wallet interface
 * - Game status display
 * - Game participation interface
 * - Game results and history
 * 
 * @example
 * ```tsx
 * <HomeTab />
 * ```
 */
export function HomeTab() {
  // State
  const [amountGwei, setAmountGwei] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [players, setPlayers] = useState<{ address: string; amount: bigint }[]>([]);
  const [isLoadingPlayers, setIsLoadingPlayers] = useState(false);
  // We're using players.length instead of playerCount to display the count
  const [_playerCount, setPlayerCount] = useState(0); // Prefix with _ to indicate it's intentionally unused
  const [blockRange, setBlockRange] = useState<bigint>(50n); // Default to 50 blocks

  // Wallet connection
  const { address, isConnected } = useAccount();
  const { connectors, connect } = useConnect();

  // Read contract state - keep using the original parameters
  const { data: gameId } = useContractRead({
    address: CONTRACT_ADDRESS as `0x${string}`,
    abi: guess23Abi,
    functionName: "gameId",
  });

  const { data: totalAmount } = useContractRead({
    address: CONTRACT_ADDRESS as `0x${string}`,
    abi: guess23Abi,
    functionName: "totalAmount",
  });

  const { data: hasPlayedData } = useContractRead({
    address: CONTRACT_ADDRESS as `0x${string}`,
    abi: guess23Abi,
    functionName: "hasPlayed",
    args: address ? [address] : undefined,
  });

  // Base network constants
  const BASE_CHAIN_ID = 8453; // Base mainnet
  const BASE_HEX_CHAIN_ID = `0x${BASE_CHAIN_ID.toString(16)}`; // 0x2105

  // Get user balance specifically on Base network
  const { data: balance, refetch: refetchBalance } = useBalance({
    address,
    chainId: BASE_CHAIN_ID, // Explicitly specify Base network
  });

  // Use contract write hook from wagmi
  const { writeContract, isPending, data: hash, error: writeError } = useContractWrite();
  
  // Log hash and any errors for debugging
  useEffect(() => {
    if (hash) {
      console.log("Transaction hash received:", hash);
    }
    if (writeError) {
      console.error("Write contract error:", writeError);
    }
  }, [hash, writeError]);
  
  // Log contract read data for debugging
  useEffect(() => {
    console.log("Contract data - gameId:", gameId);
    console.log("Contract data - totalAmount:", totalAmount);
    console.log("Contract data - hasPlayedData:", hasPlayedData);
    console.log("Wallet connection status:", isConnected ? "Connected" : "Not connected");
    console.log("Wallet address:", address);
  }, [gameId, totalAmount, hasPlayedData, isConnected, address]);
  
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });
  
  // Show success message when transaction is confirmed
  useEffect(() => {
    if (isSuccess && hash) {
      setErrorMessage(null);
      console.log("Transaction confirmed successfully:", hash);
      // 尝试重新加载游戏状态
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    }
  }, [isSuccess, hash]);
  
  // Listen for network changes to keep balance updated
  useEffect(() => {
    if (!window.ethereum) return;
    
    const handleChainChanged = async (chainId: string) => {
      console.log('Network changed to chainId:', chainId);
      
      // Update network status display
      const networkStatusEl = document.getElementById('network-status');
      if (networkStatusEl) {
        if (chainId === BASE_HEX_CHAIN_ID) {
          networkStatusEl.textContent = 'Base';
          networkStatusEl.className = 'text-xs py-0.5 px-2 rounded-full bg-blue-900/50 text-blue-300 border border-blue-800/40';
          setErrorMessage(null);
        } else {
          networkStatusEl.textContent = 'Wrong Network';
          networkStatusEl.className = 'text-xs py-0.5 px-2 rounded-full bg-red-900/50 text-red-300 border border-red-800/40';
          setErrorMessage("You're not on Base network. This game only works on Base.");
        }
      }
      
      // Refresh balance when network changes
      await refetchBalance();
    };
    
    window.ethereum.on('chainChanged', handleChainChanged);
    
    // Initial check
    window.ethereum.request({ method: 'eth_chainId' })
      .then(handleChainChanged)
      .catch(console.error);
    
    return () => {
      window.ethereum.removeListener('chainChanged', handleChainChanged);
    };
  }, [refetchBalance, BASE_HEX_CHAIN_ID]);
  
  // Check network on component mount and when connection status changes
  useEffect(() => {
    const checkNetwork = async () => {
      if (isConnected && window.ethereum) {
        try {
          const chainId = await window.ethereum.request({ method: 'eth_chainId' });
          
          if (chainId !== BASE_HEX_CHAIN_ID) {
            console.log('Not on Base network. Current chain:', chainId);
            setErrorMessage("You're not on the Base network. Click 'Switch to Base' to play.");
          } else {
            console.log('Already on Base network');
            setErrorMessage(null);
            
            // Make sure balance is refreshed when already on Base network
            await refetchBalance();
          }
        } catch (error) {
          console.error('Failed to check network:', error);
        }
      }
    };
    
    checkNetwork();
  }, [isConnected, refetchBalance, BASE_HEX_CHAIN_ID]);
  
  // Clear error message after a while
  useEffect(() => {
    if (errorMessage) {
      const timer = setTimeout(() => {
        setErrorMessage(null);
      }, 8000);
      
      return () => clearTimeout(timer);
    }
  }, [errorMessage]);

  // Public client for fetching events
  const publicClient = usePublicClient();
  const [gameEvents, setGameEvents] = useState<any[]>([]);
  const [lastWinner, setLastWinner] = useState<any>(null);

  // Fetch game events and player information
  useEffect(() => {
    // Fetch data as long as we have a publicClient, even if wallet is not connected
    const shouldFetch = publicClient !== undefined;
    if (!shouldFetch) return;
    
    console.log("Attempting to fetch game data, wallet connected:", isConnected);
    
    const fetchGameData = async () => {
      try {
        // Start loading indicators
        setIsLoadingPlayers(true);
        
        // Get block number for event queries
        const blockNumber = await publicClient.getBlockNumber();
        console.log("Current block number:", blockNumber.toString());
        
        // Use an extremely small block range to avoid RPC errors
        // Just 50 blocks (approximately 15 minutes on Base)
        // This helps prevent "input does not match format" RPC errors
        const startBlock = blockNumber > blockRange ? blockNumber - blockRange : 0n;
        
        // 1. Fetch recent game events (winners)
        try {
          console.log(`Fetching GameEnded events from block ${startBlock} to latest`);
          console.log(`Using contract address: ${CONTRACT_ADDRESS}`);
          
          const endEvents = await publicClient.getContractEvents({
            address: CONTRACT_ADDRESS as `0x${string}`,
            abi: guess23Abi,
            eventName: 'GameEnded' as any,
            fromBlock: startBlock,
            toBlock: 'latest',
            strict: false // Make the request more lenient
          });

          console.log(`Game events result:`, endEvents);
          
          if (endEvents && endEvents.length > 0) {
            console.log(`Successfully fetched ${endEvents.length} game end events`);
            setLastWinner(endEvents[endEvents.length - 1]);
            setGameEvents(endEvents);
          } else {
            console.log("No GameEnded events found");
          }
        } catch (eventError) {
          console.error("Error fetching game end events:", eventError);
        }
        
        // 2. Fetch recent player join events
        try {
          console.log(`Fetching PlayerJoined events from block ${startBlock} to latest`);
          
          // Use the same small block range for player events to avoid RPC errors
          const joinEvents = await publicClient.getContractEvents({
            address: CONTRACT_ADDRESS as `0x${string}`,
            abi: guess23Abi,
            eventName: 'PlayerJoined' as any,
            fromBlock: startBlock,
            toBlock: 'latest',
            strict: false // Make the request more lenient
          });

          console.log(`Player join events result:`, joinEvents);
          
          if (joinEvents && joinEvents.length > 0) {
            console.log(`Successfully fetched ${joinEvents.length} player join events`);
            
            // Process player data from events
            const playerData = joinEvents.map((event: any) => ({
              address: event.args.player as string,
              amount: event.args.amount as bigint
            }));
            
            // Set player count and data
            setPlayerCount(playerData.length);
            setPlayers(playerData);
          } else {
            console.log("No PlayerJoined events found");
          }
        } catch (playerError) {
          console.error("Error fetching player events:", playerError);
        }
        
      } catch (error) {
        console.error("Error fetching game data:", error);
        
        // Show a more friendly error message to the user
        setErrorMessage("Failed to load game data. The RPC service may be experiencing issues. Please try again later.");
        
        // Fallback to an even smaller block range if we get RPC errors
        if (String(error).includes("input does not match format") || 
            String(error).includes("InternalRpcError")) {
          try {
            console.log("Attempting fallback with smaller block range...");
            // Get current block number again for fallback
            const currentBlock = await publicClient.getBlockNumber();
            const minimalBlockRange = 100n;
            const lastFewBlocks = currentBlock - minimalBlockRange > 0n ? currentBlock - minimalBlockRange : 0n;
            
            // Try just getting player count at minimum
            const minimalEvents = await publicClient.getContractEvents({
              address: CONTRACT_ADDRESS as `0x${string}`,
              abi: guess23Abi,
              eventName: 'PlayerJoined' as any,
              fromBlock: lastFewBlocks,
              toBlock: 'latest',
              strict: false
            });
            
            if (minimalEvents && minimalEvents.length > 0) {
              setPlayerCount(minimalEvents.length);
              setPlayers(minimalEvents.map((event: any) => ({
                address: event.args.player as string,
                amount: event.args.amount as bigint
              })));
              
              // Clear error since we got some data
              setErrorMessage(null);
            }
          } catch (fallbackError) {
            console.error("Fallback data fetch also failed:", fallbackError);
          }
        }
      } finally {
        setIsLoadingPlayers(false);
      }
    };

    // Wrap in try/catch to ensure UI doesn't get blocked
    try {
      fetchGameData().catch(err => {
        console.error("Failed to fetch game data:", err);
        setIsLoadingPlayers(false);
      });
    } catch (e) {
      console.error("Game data fetching error:", e);
      setIsLoadingPlayers(false);
    }
  }, [publicClient, isConnected, gameId, blockRange]);

  // 定义直接使用 window.ethereum 发送交易的函数
  const sendTransactionDirectly = async (gweiAmount: string) => {
    if (!window.ethereum) {
      throw new Error("No wallet detected. Please install MetaMask or another wallet.");
    }
    
    try {
      // 首先检查输入是否为有效数字
      const gweiValue = parseInt(gweiAmount);
      if (isNaN(gweiValue) || gweiValue <= 0) {
        throw new Error(`Invalid Gwei amount: ${gweiAmount}`);
      }
      
      // 将Gwei数量转换为Wei (1 Gwei = 10^9 Wei)
      const weiValue = BigInt(gweiValue) * BigInt(1e9);
      
      // 获取当前账户
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      const account = accounts[0];
      
      // 确保在Base网络上
      const chainId = await window.ethereum.request({ method: 'eth_chainId' });
      if (chainId !== BASE_HEX_CHAIN_ID) {
        throw new Error("Must be on Base network to play. Please switch networks first.");
      }
      
      // 在Base网络上再次检查用户余额
      const balanceResponse = await window.ethereum.request({
        method: 'eth_getBalance',
        params: [account, 'latest']
      });
      
      const accountBalance = BigInt(balanceResponse);
      console.log(`Base network balance check: ${formatEther(accountBalance)} ETH (${Number(accountBalance) / 1e9} Gwei)`);
      
      if (weiValue > accountBalance) {
        throw new Error(`Insufficient balance on Base network: You have ${formatEther(accountBalance)} ETH (${Math.floor(Number(accountBalance) / 1e9).toLocaleString()} Gwei), but need ${gweiValue.toLocaleString()} Gwei (${formatEther(weiValue)} ETH)`);
      }
      
      console.log(`直接向合约发送交易: ${gweiValue.toLocaleString()} Gwei (${formatEther(weiValue)} ETH), 从: ${account}`);
      
      // 创建交易参数
      const txParams = {
        from: account,
        to: CONTRACT_ADDRESS,
        value: `0x${weiValue.toString(16)}`, // 转换为十六进制
        data: '0x92d98a65', // play() 函数的签名
      };
      
      console.log("交易参数:", txParams);
      
      // 发送交易
      const txHash = await window.ethereum.request({
        method: 'eth_sendTransaction',
        params: [txParams],
      });
      
      console.log("交易已发送，交易哈希:", txHash);
      return txHash;
    } catch (error) {
      console.error("直接发送交易失败:", error);
      throw error;
    }
  };

  // Handle form submission for placing a bet
  const handlePlay = async () => {
    // Clear previous error messages
    setIsLoading(true);
    
    try {
      // Validate form input first
      if (!address || !isConnected) {
        setErrorMessage("Please connect your wallet first");
        return;
      }
      
      if (!amountGwei || isNaN(parseInt(amountGwei)) || parseInt(amountGwei) <= 0) {
        setErrorMessage("Please enter a valid amount in Gwei");
        return;
      }
      
          // Make sure user is on Base network before placing bet
      if (window.ethereum) {
        // Check current network
        const chainId = await window.ethereum.request({ method: 'eth_chainId' });
        
        if (chainId !== BASE_HEX_CHAIN_ID) {
          console.log('Not on Base network. Attempting to switch...');
          const networkSwitched = await switchToBaseNetwork();
          if (!networkSwitched) {
            setErrorMessage("You must be on the Base network to play this game. Please click the 'Switch to Base Network' button.");
            return;
          }
          
          // Give a moment for the network switch to complete and for balance to update
          await new Promise(resolve => setTimeout(resolve, 1500));
          
          // Force refresh balance after network switch
          await refetchBalance();
        }
      }
      
      // Convert Gwei to Wei for both balance check and transaction
      const gweiAmount = parseInt(amountGwei);
      const amountWei = BigInt(gweiAmount) * BigInt(1e9); // Convert Gwei to Wei
      
      console.log(`Balance check: Amount: ${gweiAmount} Gwei (${formatEther(amountWei)} ETH), User balance: ${formatEther(balance?.value || 0n)} ETH`);
      
      // Check if user has sufficient balance
      if (balance && amountWei > balance.value) {
        // Calculate how much more ETH is needed
        const shortageWei = amountWei - balance.value;
        const shortageGwei = Number(shortageWei) / 1e9;
        
        setErrorMessage(
          `Insufficient balance. You have ${formatEther(balance.value)} ETH (${Math.floor(Number(formatEther(balance.value)) * 1e9).toLocaleString()} Gwei), ` +
          `but trying to bet ${gweiAmount.toLocaleString()} Gwei (${formatEther(amountWei)} ETH). ` +
          `You need ${shortageGwei.toLocaleString()} more Gwei.`
        );
        return;
      }
      
      // All validation passed, proceed with bet
      setErrorMessage(null);
      
      // Try wagmi contract write first
      try {
        console.log(`Placing bet with contract write: ${gweiAmount.toLocaleString()} Gwei (${formatEther(amountWei)} ETH)`);
        
        writeContract({
          address: CONTRACT_ADDRESS as `0x${string}`,
          abi: guess23Abi,
          functionName: "play",
          value: amountWei,
        });
      } catch (writeErr: any) {
        console.error("Contract write failed:", writeErr);
        
        // Check for user rejection
        if (writeErr.message && writeErr.message.includes("rejected")) {
          setErrorMessage("You rejected the transaction in your wallet.");
          return;
        }
        
        // Fallback to direct transaction method
        try {
          console.log(`Falling back to direct ethereum transaction: ${gweiAmount} Gwei`);
          await sendTransactionDirectly(gweiAmount.toString());
        } catch (directTxError: any) {
          console.error("Direct transaction failed:", directTxError);
          setErrorMessage("Contract interaction not available. Please refresh and try again.");
        }
      }
    } catch (error: any) {
      console.error("Error in play function:", error);
      
      // Format user-friendly error message
      let userMessage = "An error occurred processing your bet.";
      
      // Check for common errors
      if (error.message) {
        if (error.message.includes("insufficient funds")) {
          userMessage = "You don't have enough ETH to place this bet.";
        } else if (error.message.includes("User denied")) {
          userMessage = "You cancelled the transaction.";
        } else if (error.message.includes("already played")) {
          userMessage = "You have already played in this round.";
        } else {
          userMessage = `Error: ${error.message.split('\n')[0]}`;
        }
      }
      
      setErrorMessage(userMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Function to switch to Base network
  const switchToBaseNetwork = async () => {
    if (!window.ethereum) {
      setErrorMessage("No wallet detected. Please install MetaMask or use another Web3 wallet.");
      return false;
    }
    
    try {
      // First check if already on Base network
      const chainId = await window.ethereum.request({ method: 'eth_chainId' });
      console.log('Current chain ID:', chainId);
      
      if (chainId === BASE_HEX_CHAIN_ID) {
        console.log('Already on Base network');
        // Even if already on Base network, refresh the balance to be sure
        await refetchBalance();
        return true;
      }
      
      // Not on Base network, try to switch
      console.log('Switching to Base network...');
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: BASE_HEX_CHAIN_ID }],
      });
      console.log('Successfully switched to Base network');
      
      // After switching networks, refresh the balance
      setTimeout(async () => {
        console.log('Refreshing balance after network switch...');
        await refetchBalance();
      }, 1000);
      
      return true;
    } catch (switchError: any) {
      // This error code indicates that the chain has not been added to MetaMask
      if (switchError.code === 4902) {
        try {
          // Add Base network to the wallet
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [
              {
                chainId: `0x${BASE_CHAIN_ID.toString(16)}`,
                chainName: 'Base',
                nativeCurrency: {
                  name: 'ETH',
                  symbol: 'ETH',
                  decimals: 18,
                },
                rpcUrls: ['https://mainnet.base.org'],
                blockExplorerUrls: ['https://basescan.org'],
              },
            ],
          });
          console.log('Base network added to wallet');
          
          // Try switching again after adding
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: `0x${BASE_CHAIN_ID.toString(16)}` }],
          });
          return true;
        } catch (addError) {
          console.error('Failed to add Base network:', addError);
          setErrorMessage("Failed to add Base network. Please add it manually in your wallet.");
          return false;
        }
      } else if (switchError.code === 4001) {
        // User rejected the request
        setErrorMessage("You rejected the request to switch to Base network. This game requires Base network.");
        return false;
      } else {
        console.error('Failed to switch to Base network:', switchError);
        setErrorMessage("Failed to switch to Base network. Please try again or switch manually.");
        return false;
      }
    }
  };

  // Handle wallet connection
  const handleConnect = async () => {
    try {
      // First try to switch to Base network if wallet is already available
      if (window.ethereum) {
        const networkSwitched = await switchToBaseNetwork();
        if (!networkSwitched) {
          return; // Don't proceed if network switch failed
        }
      }
      
      // Find an available connector
      const connector = connectors.find(c => c.ready);
      
      if (connector) {
        console.log("Connecting wallet with connector:", connector.name);
        connect({ connector });
      } else {
        setErrorMessage("No wallet connectors available. Please install a Web3 wallet extension like MetaMask or use WalletConnect.");
      }
    } catch (error) {
      console.error("Connection error:", error);
      setErrorMessage("Failed to connect wallet. Please try again or refresh the page.");
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h2 className="text-2xl font-bold mb-4 text-center">Guess 2/3 of the Average Game</h2>
      <p className="mb-2 text-sm text-purple-200 text-center">
        Bet Gwei to enter the mathematical mind game! The player closest to 2/3 of the average bet wins the entire pot.
      </p>
      <p className="mb-2 text-xs text-purple-300/70 text-center">
        Current parameters: Small rounds (min=2, max=3 players) | Game completes quickly!
      </p>
      <p className="mb-8 text-xs bg-blue-900/20 text-blue-300 py-1 px-2 rounded-md mx-auto max-w-sm text-center border border-blue-800/30">
        <span className="font-medium">Note:</span> This game runs exclusively on Base network
      </p>

      {/* Game Rules */}
      <div className="bg-gradient-to-r from-gray-900/80 to-purple-900/20 rounded-xl p-5 mb-6 border border-purple-700/20 shadow-lg shadow-purple-900/10">
        <h3 className="font-semibold mb-2 text-purple-300">How to Play</h3>
        <ol className="list-decimal pl-5 text-sm text-gray-200">
          <li className="mb-1">Connect your wallet with ETH to enter</li>
          <li className="mb-1">Enter a whole number of Gwei (1 Gwei = 0.000000001 ETH)</li>
          <li className="mb-1">Game ends automatically after 2-3 players join</li>
          <li className="mb-1">The closest guess to ⅔ of the average wins the entire pot!</li>
        </ol>
        <p className="text-xs mt-2 text-purple-300">Strategy: Your bet in Gwei (e.g., 1000 Gwei) = your prediction of what 2/3 of the average will be</p>
      </div>
      
      {/* Wallet Connection / Betting Interface */}
      {!isConnected ? (
        <div className="bg-gray-900/80 rounded-lg p-6 shadow-lg border border-purple-700/20 shadow-purple-900/10">
          <h3 className="font-semibold mb-4 text-purple-200">Step 1: Connect Your Wallet</h3>
          <Button
            onClick={handleConnect}
            className="w-full bg-gradient-to-r from-purple-800 to-purple-600 hover:from-purple-700 hover:to-purple-500 text-white font-medium py-3 px-4 rounded-lg shadow-lg transition-all duration-200 hover:shadow-purple-700/30"
            disabled={isPending}
          >
            <span className="glow-sm">{isPending ? "Connecting..." : "Connect Wallet"}</span>
          </Button>
          <p className="mt-2 text-xs text-purple-300">Connect your wallet to play</p>
          <p className="mt-1 text-xs text-purple-300">
            Make sure you have a wallet extension like MetaMask installed or are using a dApp browser
          </p>
          
          {errorMessage && (
            <div className="bg-red-900/40 p-4 rounded-lg text-sm text-red-200 mt-4 border border-red-800/40 shadow-md">
              <div className="flex items-center">
                <svg className="w-5 h-5 mr-2 text-red-400" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zm-1 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd"></path>
                </svg>
                <span>{errorMessage}</span>
              </div>
              {errorMessage.includes("RPC") && (
                <p className="mt-2 text-xs text-red-300/80">
                  RPC errors can happen when too many requests are made to the blockchain. Try again in a moment.
                </p>
              )}
            </div>
          )}
        </div>
      ) : (
        <>
          {errorMessage && errorMessage.includes("not on the Base network") ? (
            <div className="bg-blue-900/30 rounded-lg p-6 shadow-lg border border-blue-700/30 shadow-blue-900/10 text-center mb-6">
              <h3 className="font-semibold mb-3 text-blue-200">Wrong Network Detected</h3>
              <p className="text-blue-300 mb-4">This game runs exclusively on the Base network.</p>
              <Button
                onClick={() => switchToBaseNetwork()}
                className="w-full bg-gradient-to-r from-blue-700 to-blue-500 hover:from-blue-600 hover:to-blue-400 text-white font-medium py-3 px-4 rounded-lg shadow-lg transition-all duration-200 hover:shadow-blue-700/30"
              >
                <span className="glow-sm">Switch to Base Network</span>
              </Button>
            </div>
          ) : hasPlayedData ? (
            <div className="bg-green-900/50 p-4 rounded-lg mb-6 text-center border border-green-700/30 shadow-lg shadow-green-900/10">
              <p className="text-green-300">You&apos;ve already joined this round!</p>
              <p className="text-sm mt-2 text-green-200">Wait for the game to end to see results.</p>
            </div>
          ) : (
            <div className="bg-gray-900/80 rounded-lg p-6 shadow-lg border border-purple-700/20 shadow-purple-900/10">
              <h3 className="font-semibold mb-4 text-purple-200">Step 2: Place Your Bet</h3>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="amount">Your Bet Amount (Gwei) = Your Prediction</Label>
                  <Input
                    id="amount"
                    value={amountGwei}
                    onChange={(e) => setAmountGwei(e.target.value.replace(/\D/g, ''))} // Only allow integers
                    placeholder="1000"
                    type="number"
                    min="1"
                    step="1"
                    disabled={isLoading || isPending || isConfirming}
                  />
                  <p className="mt-1 text-xs text-purple-300">
                    Enter whole numbers only (1 Gwei = 0.000000001 ETH). Think strategically - game ends after 2-3 players!
                  </p>
                </div>
                
                <Button
                  onClick={handlePlay}
                  className={`w-full gradient-border ${
                    isLoading || isPending || isConfirming
                      ? "bg-gray-700 cursor-not-allowed"
                      : "bg-gradient-to-r from-purple-800 to-purple-600 hover:from-purple-700 hover:to-purple-500"
                  } text-white font-medium py-3 px-4 rounded-lg relative overflow-hidden transition-all duration-200 hover:shadow-lg hover:shadow-purple-700/30`}
                  disabled={isLoading || isPending || isConfirming || !amountGwei}
                >
                  <span className={isLoading || isPending || isConfirming ? "" : "glow-sm"}>
                    {isLoading || isPending
                      ? "Processing..."
                      : isConfirming
                      ? "Confirming..."
                      : "Place Bet"}
                  </span>
                </Button>
                
                <p className="text-xs text-purple-300 mt-1">
                  Connected as: <span className="text-blue-300">{address?.slice(0, 6)}...{address?.slice(-4)}</span>
                </p>
                
                <div className="flex items-center justify-between mt-1">
                  <p className="text-xs text-purple-300">
                    Network: <span id="network-status" className="text-xs py-0.5 px-2 rounded-full bg-blue-900/50 text-blue-300 border border-blue-800/40">Base</span>
                  </p>
                  <button 
                    onClick={() => refetchBalance()} 
                    className="text-xs text-purple-400 hover:text-purple-300 underline"
                  >
                    Refresh Balance
                  </button>
                </div>
                
                {balance && (
                  <p className="text-xs text-purple-300 mt-1">
                    Available balance: <span className="text-green-300 font-medium">{formatEther(balance?.value).substring(0, 8)} ETH</span> 
                    <span className="text-xs text-purple-300/70"> ≈ {Math.floor(Number(formatEther(balance?.value)) * 1e9).toLocaleString()} Gwei</span>
                  </p>
                )}
              </div>
              
              {errorMessage && (
                <div className="bg-red-900/40 p-4 rounded text-sm text-red-300 mt-3 border border-red-800/40 shadow-lg shadow-red-900/10">
                  {errorMessage}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Game History and Player Records */}
      <div className="border-t border-purple-800/30 pt-4 mt-6 mx-auto max-w-2xl">
        {/* Current Game Status */}
        <div className="mb-6">
          <h3 className="font-semibold mb-3 text-purple-300">Current Game Status</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-900/80 backdrop-blur-sm p-4 rounded-lg border border-purple-700/20 shadow-lg shadow-purple-900/10">
              <p className="text-xs text-purple-400 mb-1">Game ID</p>
              <div className="flex items-center">
                {isConnected ? (
                  <p className="font-medium text-white">{gameId ? gameId.toString() : <span className="text-purple-400/70">Loading...</span>}</p>
                ) : (
                  <div>
                    <p className="text-sm text-amber-600 dark:text-amber-400">Connect wallet to view</p>
                    <p className="text-xs text-purple-300 mt-1">Game data requires a wallet connection</p>
                  </div>
                )}
              </div>
            </div>
            <div className="bg-gray-900/80 backdrop-blur-sm p-4 rounded-lg border border-purple-700/20 shadow-lg shadow-purple-900/10">
              <p className="text-xs text-purple-400 mb-1">Total Pot</p>
              <div className="flex items-center">
                {isConnected ? (
                  <p className="font-medium text-white">{totalAmount ? <span className="text-green-300 glow-sm">{(totalAmount / BigInt(1e9)).toString()} Gwei</span> : <span className="text-purple-400/70">Loading...</span>}</p>
                ) : (
                  <p className="text-sm text-amber-600 dark:text-amber-400">Connect wallet to view</p>
                )}
              </div>
            </div>
          </div>
        </div>
        
        {/* Last Winner */}
        <h3 className="font-semibold mb-3 text-purple-300">Latest Winner 🏆</h3>
        {lastWinner ? (
          <div className="bg-yellow-900/20 p-4 rounded-lg mb-4 border border-yellow-700/30 shadow-lg shadow-yellow-900/10">
            <div className="grid grid-cols-2 gap-2 mb-2">
              <div>
                <p className="text-xs text-purple-400">Game</p>
                <p className="font-medium text-white">#{lastWinner.args.gameId?.toString()}</p>
              </div>
              <div>
                <p className="text-xs text-purple-400">Winner</p>
                <p className="font-medium text-white">{lastWinner.args.winner.substring(0, 6)}...{lastWinner.args.winner.substring(38)}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="text-xs text-purple-400">Reward</p>
                <p className="font-medium text-green-400 glow-sm">{formatEther(lastWinner.args.reward).substring(0, 8)} ETH</p>
              </div>
              <div>
                <p className="text-xs text-purple-400">Target (2/3 of avg)</p>
                <p className="font-medium text-blue-300">{lastWinner.args.guessTarget?.toString()}</p>
              </div>
            </div>
          </div>
        ) : isLoadingPlayers ? (
          <div className="flex justify-center items-center my-4 py-2">
            <div className="animate-spin h-6 w-6 border-2 border-purple-500 border-t-transparent rounded-full shadow-lg shadow-purple-500/30"></div>
            <span className="ml-3 text-sm text-purple-300">Loading winners...</span>
          </div>
        ) : (
          <div className="bg-gray-900/40 backdrop-blur-sm p-4 rounded-lg mb-4 border border-purple-800/20 shadow-lg shadow-purple-900/10">
            <div className="flex flex-col items-center justify-center py-2">
              <svg className="w-8 h-8 text-purple-500/50 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
              </svg>
              <p className="text-center text-sm text-purple-300">No recent winners yet</p>
              <p className="text-center text-xs text-purple-200/70 mt-1">Be the first to start a new round!</p>
            </div>
          </div>
        )}
        
        {/* Recent Games */}
        {gameEvents && gameEvents.length > 0 && (
          <>
            <h3 className="font-semibold mb-3">Recent Games</h3>
            <div className="overflow-hidden border border-gray-200 dark:border-gray-700 rounded-lg">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Game</th>
                    <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Winner</th>
                    <th scope="col" className="px-3 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400">Reward</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                  {gameEvents.slice(0, 5).map((event, index) => (
                    <tr key={index}>
                      <td className="px-3 py-2 whitespace-nowrap text-xs">
                        #{event.args.gameId?.toString()}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-xs">
                        {event.args.winner.substring(0, 6)}...{event.args.winner.substring(38)}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-xs text-right">
                        {(event.args.reward / BigInt(1e9)).toString()} Gwei
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
        
        {/* Data Fetching Controls */}
        <div className="bg-gray-900/80 backdrop-blur-sm p-4 rounded-lg mb-4 mt-4 border border-purple-700/30 shadow-lg shadow-purple-900/10">
          <h4 className="text-sm font-medium mb-2 text-purple-300">History Settings</h4>
          <p className="text-xs text-purple-200/70 mb-3">
            Adjust how far back to search for game events. Small ranges load faster but show less history.
          </p>
          
          <div className="flex flex-wrap gap-2 mb-3">
            <button
              onClick={() => setBlockRange(10n)}
              className={`px-3 py-1.5 text-xs rounded-md transition-all duration-200 border ${blockRange === 10n ? 'bg-purple-700 border-purple-500 text-white shadow-md shadow-purple-900/30' : 'bg-gray-800/80 border-purple-700/20 text-purple-200 hover:bg-gray-700'}`}
            >
              Very Small (10 blocks)
            </button>
            <button
              onClick={() => setBlockRange(50n)}
              className={`px-3 py-1.5 text-xs rounded-md transition-all duration-200 border ${blockRange === 50n ? 'bg-purple-700 border-purple-500 text-white shadow-md shadow-purple-900/30' : 'bg-gray-800/80 border-purple-700/20 text-purple-200 hover:bg-gray-700'}`}
            >
              Small (50 blocks)
            </button>
            <button
              onClick={() => setBlockRange(200n)}
              className={`px-3 py-1.5 text-xs rounded-md transition-all duration-200 border ${blockRange === 200n ? 'bg-purple-700 border-purple-500 text-white shadow-md shadow-purple-900/30' : 'bg-gray-800/80 border-purple-700/20 text-purple-200 hover:bg-gray-700'}`}
            >
              Medium (200 blocks)
            </button>
            <button
              onClick={() => setBlockRange(1000n)}
              className={`px-3 py-1.5 text-xs rounded-md transition-all duration-200 border ${blockRange === 1000n ? 'bg-purple-700 border-purple-500 text-white shadow-md shadow-purple-900/30' : 'bg-gray-800/80 border-purple-700/20 text-purple-200 hover:bg-gray-700'}`}
            >
              Large (1000 blocks)
            </button>
          </div>
          
          <button
            onClick={() => {
              setIsLoadingPlayers(true);
              // Force a refresh of data
              setTimeout(() => window.location.reload(), 100);
            }}
            disabled={isLoadingPlayers}
            className="w-full mt-1 bg-gradient-to-r from-purple-700 to-purple-600 hover:from-purple-600 hover:to-purple-500 text-white py-2 px-4 rounded-md text-xs font-medium shadow-md shadow-purple-900/20 hover:shadow-lg hover:shadow-purple-900/30 transition-all duration-200 flex items-center justify-center space-x-1"
          >
            {isLoadingPlayers ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Refreshing...</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                </svg>
                <span>Refresh Data with Selected Range</span>
              </>
            )}
          </button>
          
          {errorMessage && errorMessage.includes("RPC") && (
            <div className="mt-3 p-2 rounded-md bg-red-900/30 border border-red-800/40 flex items-center">
              <svg className="w-4 h-4 text-red-400 mr-1.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
              </svg>
              <p className="text-xs text-red-300">
                Network error detected. Try using a smaller history range.
              </p>
            </div>
          )}
        </div>
        
        {/* Player Records */}
        <h3 className="font-semibold mb-3 mt-6 text-purple-300">Current Round Players</h3>
        {isLoadingPlayers ? (
          <div className="flex justify-center items-center my-6 py-4">
            <div className="animate-spin h-6 w-6 border-2 border-purple-500 border-t-transparent rounded-full shadow-lg shadow-purple-500/30"></div>
            <span className="ml-3 text-sm text-purple-300">Loading data...</span>
          </div>
        ) : players.length > 0 ? (
          <div className="overflow-hidden border border-purple-800/30 rounded-lg shadow-lg shadow-purple-900/10">
            <table className="min-w-full divide-y divide-purple-800/30">
              <thead className="bg-gray-900/70">
                <tr>
                  <th scope="col" className="px-3 py-2.5 text-left text-xs font-medium text-purple-300">Player</th>
                  <th scope="col" className="px-3 py-2.5 text-right text-xs font-medium text-purple-300">Amount</th>
                </tr>
              </thead>
              <tbody className="bg-gray-900/40 backdrop-blur-sm divide-y divide-purple-800/20">
                {players.map((player, index) => (
                  <tr key={index}>
                    <td className="px-3 py-2.5 whitespace-nowrap text-xs text-blue-300">
                      {player.address.substring(0, 6)}...{player.address.substring(38)}
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-xs text-right text-green-300">
                      {(player.amount / BigInt(1e9)).toString()} Gwei
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="bg-gray-900/40 backdrop-blur-sm p-4 rounded-lg border border-purple-800/20 shadow-lg shadow-purple-900/10">
            <div className="flex flex-col items-center justify-center py-2">
              <svg className="w-8 h-8 text-purple-500/50 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
              </svg>
              <p className="text-center text-sm text-purple-300">No active players in the current round</p>
              <p className="text-center text-xs text-purple-200/70 mt-1">Be the first to join! Game ends after just 2-3 players.</p>
            </div>
          </div>
        )}
      </div>
      
      {/* Social Sharing */}
      <div className="mt-8 text-center">
        <h3 className="text-sm font-semibold mb-2 text-purple-300">Challenge your friends</h3>
        <Share text={`Play the mathematical mind game! Guess 2/3 of the average in Gwei and win the pot on ${APP_NAME} v0.0.1 🧠💰`} />
      </div>
      
      {/* Contract Transparency */}
      <div className="mt-6 text-center border-t border-purple-800/30 pt-4">
        <p className="text-xs text-purple-300/70">
          Smart Contract: <a 
            href="https://basescan.org/address/0x4BbeE9F876ff56832E724DC9a7bD06538C8868D2" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="text-blue-400 hover:text-blue-300 hover:underline transition-colors">
            0x4BbeE9F876ff56832E724DC9a7bD06538C8868D2
          </a>
        </p>
        <p className="text-xs text-purple-200/60 mt-1">
          Code publicly verifiable on Basescan
        </p>
      </div>
    </div>
  );
}
