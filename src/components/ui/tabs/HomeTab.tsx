"use client";

import { useState, useEffect } from "react";
import { useAccount, useContractRead, useContractWrite, useWaitForTransactionReceipt, useBalance, usePublicClient } from "wagmi";
import { useConnect } from "wagmi";
import { parseEther, formatEther } from "viem";
import { Button } from "../Button";
import { Input } from "../input";
import { Label } from "../label";
import { Share } from "../Share";
import { guess23Abi } from "~/lib/abi";
import { APP_NAME } from "~/lib/constants";

// Default contract address - update with your deployed contract address
const CONTRACT_ADDRESS = "0x4BbeEa57578E4a078CB8ae4F98C83E45613868D2"; // Base contract
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
  const [amount, setAmount] = useState("");
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

  // Get user balance
  const { data: balance } = useBalance({
    address,
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
            eventName: 'GameEnded',
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
            eventName: 'PlayerJoined',
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
              eventName: 'PlayerJoined',
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
  const sendTransactionDirectly = async (ethAmount: string) => {
    if (!window.ethereum) {
      throw new Error("No wallet detected. Please install MetaMask or another wallet.");
    }
    
    try {
      // 将ETH数量转换为Wei
      const weiValue = parseEther(ethAmount).toString();
      
      // 获取当前账户
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      const account = accounts[0];
      
      console.log(`直接向合约发送交易: ${ethAmount} ETH, 从: ${account}`);
      
      // 创建交易参数
      const txParams = {
        from: account,
        to: CONTRACT_ADDRESS,
        value: `0x${parseInt(weiValue).toString(16)}`, // 转换为十六进制
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
      
      if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
        setErrorMessage("Please enter a valid amount");
        return;
      }
      
      // Check if user has sufficient balance
      if (balance && parseEther(amount) > balance.value) {
        setErrorMessage(`Insufficient balance. You have ${formatEther(balance.value)} ETH, but trying to bet ${amount} ETH.`);
        return;
      }
      
      // All validation passed, proceed with bet
      setErrorMessage(null);
      
      // Try wagmi contract write first
      try {
        console.log("Attempting to place bet with contract write:", amount);
        
        writeContract({
          address: CONTRACT_ADDRESS as `0x${string}`,
          abi: guess23Abi,
          functionName: "play",
          value: parseEther(amount),
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
          console.log("Falling back to direct ethereum transaction");
          await sendTransactionDirectly(amount);
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

  // Handle wallet connection
  const handleConnect = async () => {
    try {
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
      <h2 className="text-2xl font-bold mb-8 text-center">Guess 2/3 of the Average Game</h2>
      <p className="mb-8 text-sm text-purple-200 text-center">
        Each player picks a number from 1-100. The player closest to 2/3 of the average wins the pot.
      </p>

      {/* Game Rules */}
      <div className="bg-gradient-to-r from-gray-900/80 to-purple-900/20 rounded-xl p-5 mb-6 border border-purple-700/20 shadow-lg shadow-purple-900/10">
        <h3 className="font-semibold mb-2 text-purple-300">How to Play</h3>
        <ol className="list-decimal pl-5 text-sm text-gray-200">
          <li className="mb-1">Connect your wallet with ETH to enter</li>
          <li className="mb-1">Send any amount of ETH to join the round (your bet)</li>
          <li className="mb-1">When enough players join, a winner is automatically selected</li>
          <li className="mb-1">The closest guess to ⅔ of the average wins the entire pot</li>
        </ol>
        <p className="text-xs mt-2 text-purple-300">Your ETH amount represents your guess from 1-100</p>
      </div>
      
      {/* Wallet Connection / Betting Interface */}
      {!isConnected ? (
        <div className="bg-gray-900/80 rounded-lg p-6 shadow-lg border border-purple-700/20 shadow-purple-900/10">
          <h3 className="font-semibold mb-4 text-purple-200">Step 1: Connect Your Wallet</h3>
          <Button
            onClick={handleConnect}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded"
            disabled={isPending}
          >
            {isPending ? "Connecting..." : "Connect Wallet"}
          </Button>
          <p className="mt-2 text-xs text-purple-300">Connect your wallet to play</p>
          <p className="mt-1 text-xs text-purple-300">
            Make sure you have a wallet extension like MetaMask installed or are using a dApp browser
          </p>
          
          {errorMessage && (
            <div className="bg-red-100 dark:bg-red-900 p-3 rounded-lg text-sm text-red-700 dark:text-red-300 mt-3 border border-red-300 dark:border-red-600 shadow-sm animate-pulse">
              <div className="flex items-center">
                <svg className="w-5 h-5 mr-2 text-red-600 dark:text-red-400" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zm-1 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd"></path>
                </svg>
                <span>{errorMessage}</span>
              </div>
              {errorMessage.includes("RPC") && (
                <p className="mt-2 text-xs text-gray-300">
                  RPC errors can happen when too many requests are made to the blockchain. Try again in a moment.
                </p>
              )}
            </div>
          )}
        </div>
      ) : (
        <>
          {hasPlayedData ? (
            <div className="bg-green-900/50 p-4 rounded-lg mb-6 text-center border border-green-700/30 shadow-lg shadow-green-900/10">
              <p className="text-green-300">You&apos;ve already joined this round!</p>
              <p className="text-sm mt-2 text-green-200">Wait for the game to end to see results.</p>
            </div>
          ) : (
            <div className="bg-gray-900/80 rounded-lg p-6 shadow-lg border border-purple-700/20 shadow-purple-900/10">
              <h3 className="font-semibold mb-4 text-purple-200">Step 2: Place Your Bet</h3>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="amount">Amount (ETH) - This will be your guess value</Label>
                  <Input
                    id="amount"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.01"
                    type="number"
                    min="0.000001"
                    step="0.01"
                    disabled={isLoading || isPending || isConfirming}
                  />
                  <p className="mt-1 text-xs text-purple-300">
                    Send any amount of ETH. The closer to ⅔ of the average, the better!
                  </p>
                </div>
                
                <Button
                  onClick={handlePlay}
                  className={`w-full gradient-border ${
                    isLoading || isPending || isConfirming
                      ? "bg-gray-700 cursor-not-allowed"
                      : "bg-gradient-to-r from-purple-800 to-purple-600 hover:from-purple-700 hover:to-purple-500"
                  } text-white font-medium py-3 px-4 rounded-lg relative overflow-hidden transition-all duration-200 hover:shadow-lg hover:shadow-purple-700/30`}
                  disabled={isLoading || isPending || isConfirming || !amount}
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
                
                {balance && (
                  <p className="text-xs text-purple-300">
                    Available balance: <span className="text-green-300 font-medium">{formatEther(balance?.value).substring(0, 8)} ETH</span>
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
                  <p className="font-medium text-white">{totalAmount ? <span className="text-green-300 glow-sm">{formatEther(totalAmount).substring(0, 8)} ETH</span> : <span className="text-purple-400/70">Loading...</span>}</p>
                ) : (
                  <p className="text-sm text-amber-600 dark:text-amber-400">Connect wallet to view</p>
                )}
              </div>
            </div>
          </div>
          
          {!isConnected && (
            <div className="mt-4 bg-gray-800/80 backdrop-blur-sm border border-amber-700/20 p-4 rounded-lg text-center shadow-lg shadow-amber-900/10">
              <p className="text-sm font-medium text-amber-400">
                Connect your wallet to see game status and participate
              </p>
              <button 
                onClick={() => connect({ connector: connectors[0] })} 
                className="mt-2 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white py-2 px-6 rounded-lg text-sm shadow-md shadow-amber-900/30 hover:shadow-lg hover:shadow-amber-700/30 transition-all duration-200"
              >
                Connect Wallet
              </button>
            </div>
          )}
        </div>
        
        {/* Last Winner */}
        <h3 className="font-semibold mb-3 text-purple-300">Recent Winner</h3>
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
              <p className="text-center text-sm text-purple-300">No recent winners found</p>
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
                        {formatEther(event.args.reward).substring(0, 8)} ETH
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
          <h4 className="text-sm font-medium mb-2 text-purple-300">Event Range Settings</h4>
          <p className="text-xs text-purple-200/70 mb-3">
            Adjust the block range if you encounter RPC errors. Smaller ranges are more reliable but show less history.
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
                RPC error detected. Try using a smaller block range.
              </p>
            </div>
          )}
        </div>
        
        {/* Player Records */}
        <h3 className="font-semibold mb-3 mt-6 text-purple-300">Player Records</h3>
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
                      {formatEther(player.amount).substring(0, 8)} ETH
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
              <p className="text-center text-sm text-purple-300">No player records found in this block range</p>
              <p className="text-center text-xs text-purple-200/70 mt-1">Try increasing the block range to see more history</p>
            </div>
          </div>
        )}
      </div>
      
      {/* Social Sharing */}
      <div className="mt-8 text-center">
        <h3 className="text-sm font-semibold mb-2">Share with friends</h3>
        <Share text={`Join me in the Guess 2/3 Game on ${APP_NAME}!`} />
      </div>
    </div>
  );
}
