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
  const [playerCount, setPlayerCount] = useState(0);

  // Wallet connection
  const { address, isConnected } = useAccount();
  const { connectors, connect } = useConnect();

  // Read contract state
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

  // Public client for fetching events
  const publicClient = usePublicClient();
  const [gameEvents, setGameEvents] = useState<any[]>([]);
  const [lastWinner, setLastWinner] = useState<any>(null);

  // Fetch game events and player information
  useEffect(() => {
    // Skip fetching on initial load to prevent blocking wallet connection
    const shouldFetch = publicClient && isConnected;
    if (!shouldFetch) return;
    
    const fetchGameData = async () => {
      try {
        // Start loading indicators
        setIsLoadingPlayers(true);
        
        // Get block number for event queries
        const blockNumber = await publicClient.getBlockNumber();
        // Use a reasonable block range to avoid RPC errors
        const startBlock = blockNumber > 100000n ? blockNumber - 100000n : blockNumber - 10000n;
        
        // 1. Fetch recent game events (winners)
        try {
          const endEvents = await publicClient.getContractEvents({
            address: CONTRACT_ADDRESS as `0x${string}`,
            abi: guess23Abi,
            eventName: 'GameEnded',
            fromBlock: startBlock,
            toBlock: 'latest'
          });

          if (endEvents && endEvents.length > 0) {
            console.log(`Successfully fetched ${endEvents.length} game end events`);
            setLastWinner(endEvents[endEvents.length - 1]);
            setGameEvents(endEvents);
          }
        } catch (eventError) {
          console.error("Error fetching game end events:", eventError);
        }
        
        // 2. Fetch recent player join events
        try {
          const joinEvents = await publicClient.getContractEvents({
            address: CONTRACT_ADDRESS as `0x${string}`,
            abi: guess23Abi,
            eventName: 'PlayerJoined',
            fromBlock: startBlock,
            toBlock: 'latest'
          });

          if (joinEvents && joinEvents.length > 0) {
            console.log(`Successfully fetched ${joinEvents.length} player join events`);
            
            // Process player data from events
            const playerData = joinEvents.map(event => ({
              address: event.args.player as string,
              amount: event.args.amount as bigint
            }));
            
            // Set player count and data
            setPlayerCount(playerData.length);
            setPlayers(playerData);
          }
        } catch (playerError) {
          console.error("Error fetching player events:", playerError);
        }
        
      } catch (error) {
        console.error("Error fetching game data:", error);
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
  }, [publicClient, isConnected, gameId]);

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

  // Handle game participation
  const handlePlay = async () => {
    if (!isConnected || !address) {
      setErrorMessage("Please connect your wallet first");
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      setErrorMessage("Please enter a valid amount");
      return;
    }
    
    // Check if user has enough balance
    if (balance && parseEther(amount) > balance.value) {
      setErrorMessage(`Insufficient balance. You have ${formatEther(balance.value)} ETH, but trying to bet ${amount} ETH.`);
      return;
    }

    try {
      setIsLoading(true);
      setErrorMessage(null);
      
      console.log("Starting contract interaction with:", {
        address: CONTRACT_ADDRESS,
        functionName: 'play',
        value: amount
      });
      
      // 尝试直接使用 window.ethereum 发送交易 (更可靠的方法)
      try {
        const txHash = await sendTransactionDirectly(amount);
        console.log("Transaction submitted successfully with hash:", txHash);
        alert("交易已提交！请等待确认。");
        
        // 设置交易状态 (模拟成功获取了hash)
        // 注意: 实际上这里应该更新组件状态来显示交易状态
        setIsLoading(false);
        return;
      } catch (directError: any) {
        console.error("Direct transaction failed:", directError);
        if (directError?.message?.includes("User rejected")) {
          setErrorMessage("You rejected the transaction in your wallet.");
          setIsLoading(false);
          return;
        }
        // 如果直接交易失败，尝试使用 wagmi
        console.log("Falling back to wagmi...");
      }
      
      // 回退到 wagmi writeContract
      // Check if writeContract is available
      if (typeof writeContract !== 'function') {
        console.error("writeContract function is not available or not properly initialized");
        setErrorMessage("Contract interaction not available. Please refresh and try again.");
        return;
      }
      
      console.log("Preparing to call writeContract with:", {
        functionName: 'play',
        address: CONTRACT_ADDRESS,
        value: parseEther(amount).toString()
      });
      
      try {
        writeContract({
          functionName: 'play',
          address: CONTRACT_ADDRESS as `0x${string}`,
          abi: guess23Abi,
          value: parseEther(amount)
        });
        
        console.log("Transaction initiated with wagmi");
      } catch (error: any) {
        console.error("Error in writeContract:", error);
        
        // Provide more user-friendly error messages
        let userMessage = "Transaction failed. ";
        
        if (error?.message) {
          console.error("Error message:", error.message);
          
          if (error.message.includes("insufficient funds")) {
            userMessage += "Insufficient funds in your wallet. Please reduce the amount or add funds.";
          } else if (error.message.includes("user rejected") || error.message.includes("user denied")) {
            userMessage += "Transaction was rejected in your wallet.";
          } else if (error.message.includes("network") || error.message.includes("connect")) {
            userMessage += "Network connection issue. Please check your internet connection.";
          } else {
            userMessage += error.message;
          }
        } else {
          userMessage += "Unknown error occurred. Please try again.";
        }
        
        setErrorMessage(userMessage);
      } finally {
        setIsLoading(false);
      }
      
    } catch (outerError) {
      // This catches any errors in the try block outside of the writeContract promise
      console.error("Unexpected error in handlePlay:", outerError);
      setErrorMessage("An unexpected error occurred. Please try again.");
      setIsLoading(false);
    }
  };

  // Connect wallet with error handling
  const handleConnect = () => {
    try {
      // First, log all connectors for debugging
      console.log("All connectors:", connectors.map(c => ({ name: c.name, ready: c.ready })));
      
      // Check network connectivity to common wallet services
      if (typeof window !== 'undefined' && window.navigator && !window.navigator.onLine) {
        console.warn("Browser is offline, connection to wallet services may fail");
      }
      
      // Try to connect even if connectors don't report as ready
      // Sometimes connectors are actually usable even if not reporting as ready
      
      // First try Farcaster connector if available (for Warpcast users)
      const farcasterConnector = connectors.find(c => c.name === "Farcaster Frame");
      if (farcasterConnector) {
        connect({ connector: farcasterConnector });
        return;
      }
      
      // Detect if we're in a wallet browser environment
      const isInWalletApp = typeof window !== 'undefined' && (
        window.ethereum?.isMetaMask || 
        window.ethereum?.isCoinbaseWallet || 
        window.ethereum?.isTrust || 
        window.ethereum?.isTokenPocket ||
        window.ethereum?.isMathWallet
      );
      
      if (isInWalletApp) {
        // If we're in a wallet app, use the injected connector
        const injectedConnector = connectors.find(c => c.name === "Injected");
        if (injectedConnector) {
          connect({ connector: injectedConnector });
          return;
        }
      }
      
      // Then try common wallet connectors
      const walletConnector = connectors.find(c => 
        c.name.includes("WalletConnect") || 
        c.name.includes("Injected") || 
        c.name.includes("MetaMask") ||
        c.name.includes("Coinbase")
      );
      if (walletConnector) {
        connect({ connector: walletConnector });
        return;
      }
      
      // Fallback to any available connector
      if (connectors.length > 0) {
        connect({ connector: connectors[0] });
      } else {
        console.error("No connectors available");
        setErrorMessage("No wallet connectors available. Please install a Web3 wallet extension like MetaMask or use WalletConnect.");
      }
    } catch (error) {
      console.error("Connection error:", error);
      setErrorMessage("Failed to connect wallet. Please try again or refresh the page.");
    }
  };

  return (
    <div className="px-4 py-2 pb-10">
      <div className="text-center mb-6">
        <h2 className="text-xl font-bold mb-2">Guess 2/3 of the Average</h2>
        <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
          Bet any amount. Winner gets the closest to 2/3 of the average bet!
        </p>
        
        <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded-lg mb-4">
          <p className="text-sm">Current Game: #{gameId?.toString() || "0"}</p>
          <p className="text-sm">Total Pot: {totalAmount ? `${formatEther(totalAmount)} ETH` : "0 ETH"}</p>
        </div>
      </div>

      {!isConnected ? (
        <div className="text-center mb-6">
          <Button 
            onClick={handleConnect} 
            isLoading={isPending} 
            disabled={isPending}
          >
            {isPending ? "Connecting..." : "Connect Wallet"}
          </Button>
          <p className="mt-2 text-xs text-gray-500">Connect your wallet to play</p>
          <p className="mt-1 text-xs text-gray-500">
            Make sure you have a wallet extension like MetaMask installed or are using a dApp browser
          </p>
          
          {errorMessage && (
            <div className="bg-red-100 dark:bg-red-900 p-3 rounded text-sm text-red-700 dark:text-red-300 mt-3">
              {errorMessage}
            </div>
          )}
        </div>
      ) : (
        <>
          {hasPlayedData ? (
            <div className="bg-green-100 dark:bg-green-900 p-4 rounded-lg mb-6 text-center">
              <p>You&apos;ve already joined this round!</p>
              <p className="text-sm mt-2">Wait for the game to end to see results.</p>
            </div>
          ) : (
            <div className="mb-6 mx-auto max-w-xl w-full">
              <div className="mb-4">
                <Label htmlFor="amount" className="mb-2 block text-lg font-medium">Bet Amount (ETH)</Label>
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1 max-w-full w-full">
                    <Input
                      id="amount"
                      type="number"
                      step="0.001"
                      min="0"
                      placeholder="0.01"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="h-14 text-xl px-4 font-medium w-full"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none">
                      ETH
                    </span>
                  </div>
                  <Button 
                    onClick={handlePlay} 
                    disabled={isLoading || isConfirming || isPending}
                    className="sm:min-w-32 w-full sm:w-auto h-14 text-base font-medium"
                    size="lg"
                  >
                    {isPending ? "Confirm in wallet..." : 
                     isConfirming ? "Confirming..." : 
                     isLoading ? "Processing..." : "Play"}
                  </Button>
                </div>
                {balance && (
                  <div className="mt-3 text-sm text-gray-600 dark:text-gray-300 flex flex-col sm:flex-row justify-between">
                    <p className="mb-1 sm:mb-0">Balance: {formatEther(balance.value).substring(0, 8)} {balance.symbol}</p>
                    <p className="font-medium">Recommended bet: 0.001-0.005 ETH</p>
                  </div>
                )}
              </div>

              {/* Transaction Status Indicators */}
              {isPending && (
                <div className="bg-yellow-100 dark:bg-yellow-900/30 p-3 rounded text-sm text-yellow-700 dark:text-yellow-300 mt-3">
                  Please confirm the transaction in your wallet...
                </div>
              )}
              
              {isConfirming && hash && (
                <div className="bg-blue-100 dark:bg-blue-900/30 p-3 rounded text-sm text-blue-700 dark:text-blue-300 mt-3">
                  Transaction submitted! Waiting for confirmation...
                  <div className="text-xs mt-1 break-all">
                    Transaction: {hash}
                  </div>
                </div>
              )}
              
              {isSuccess && hash && (
                <div className="bg-green-100 dark:bg-green-900/30 p-3 rounded text-sm text-green-700 dark:text-green-300 mt-3">
                  Transaction confirmed! You have entered the game.
                </div>
              )}

              {errorMessage && (
                <div className="bg-red-100 dark:bg-red-900 p-3 rounded text-sm text-red-700 dark:text-red-300 mt-3 mb-4">
                  {errorMessage}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Game History and Player Records */}
      <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-6 mx-auto max-w-2xl">
        {/* Current Game Status */}
        <div className="mb-6">
          <h3 className="font-semibold mb-3">Current Game Status</h3>
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
              <p className="text-xs text-gray-500">Game ID</p>
              <p className="font-medium">{gameId ? gameId.toString() : 'Loading...'}</p>
            </div>
            <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
              <p className="text-xs text-gray-500">Total Pot</p>
              <p className="font-medium">{totalAmount ? `${formatEther(totalAmount).substring(0, 8)} ETH` : 'Loading...'}</p>
            </div>
          </div>
        </div>
        
        {/* Last Winner */}
        <h3 className="font-semibold mb-3">Recent Winner</h3>
        {lastWinner ? (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-lg mb-4">
            <div className="flex justify-between items-center">
              <p className="text-sm font-medium">Winner: {lastWinner.args.winner.substring(0, 6)}...{lastWinner.args.winner.substring(38)}</p>
              <p className="text-xs bg-green-100 dark:bg-green-900/30 px-2 py-1 rounded">Game #{lastWinner.args.gameId?.toString()}</p>
            </div>
            <p className="text-xs mt-1">Won {lastWinner.args.reward ? formatEther(lastWinner.args.reward).substring(0, 8) : "0"} ETH</p>
            <p className="text-xs">Target Bet: {lastWinner.args.guessTarget ? formatEther(lastWinner.args.guessTarget).substring(0, 8) : "0"} ETH</p>
          </div>
        ) : (
          <p className="text-sm text-gray-500 mb-4">No winner information available</p>
        )}
        
        {/* Winner History */}
        {gameEvents.length > 1 && (
          <>
            <h3 className="font-semibold mb-3 mt-4">Winner History</h3>
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
        
        {/* Player Records */}
        <h3 className="font-semibold mb-3 mt-6">Player Records</h3>
        {isLoadingPlayers ? (
          <div className="flex justify-center my-4">
            <div className="animate-spin h-5 w-5 border-2 border-primary border-t-transparent rounded-full"></div>
          </div>
        ) : players.length > 0 ? (
          <div className="overflow-hidden border border-gray-200 dark:border-gray-700 rounded-lg">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Player</th>
                  <th scope="col" className="px-3 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400">Amount</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                {players.map((player, index) => (
                  <tr key={index}>
                    <td className="px-3 py-2 whitespace-nowrap text-xs">
                      {player.address.substring(0, 6)}...{player.address.substring(38)}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-xs text-right">
                      {formatEther(player.amount).substring(0, 8)} ETH
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-gray-500">No player records available</p>
        )}

        {/* Share Button */}
        <div className="mt-6">
          <p className="text-xs text-center mb-4">Share this game with your friends!</p>
          <Share text={`Play the "Guess 2/3 of the Average" game on ${APP_NAME}!`} />
        </div>
      </div>
    </div>
  );
} 