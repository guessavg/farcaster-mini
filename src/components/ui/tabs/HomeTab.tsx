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
  const { writeContract, isPending } = useContractWrite();

  // Wait for transaction receipt if we have a hash
  const { data: hash } = useContractWrite();
  
  const { isLoading: isConfirming } = useWaitForTransactionReceipt({
    hash,
  });

  // Public client for fetching events
  const publicClient = usePublicClient();
  const [gameEvents, setGameEvents] = useState<any[]>([]);
  const [lastWinner, setLastWinner] = useState<any>(null);

  // Fetch game events
  useEffect(() => {
    const fetchEvents = async () => {
      if (!publicClient) return;
      
      try {
        // Get recent game ended events - use more limited block range to prevent RPC errors
        // Many providers limit how far back you can query with eth_getLogs
        const blockNumber = await publicClient.getBlockNumber();
        const startBlock = blockNumber > 100000n ? blockNumber - 100000n : 0n;
        
        const endEvents = await publicClient.getContractEvents({
          address: CONTRACT_ADDRESS as `0x${string}`,
          abi: guess23Abi,
          eventName: 'GameEnded',
          fromBlock: startBlock, // Use more recent blocks instead of 0
          toBlock: 'latest'
        });

        if (endEvents && endEvents.length > 0) {
          setLastWinner(endEvents[endEvents.length - 1]);
          setGameEvents(endEvents);
        }
      } catch (error) {
        console.error("Error fetching events:", error);
        
        // Fallback to a more limited query if the first one fails
        try {
          console.log("Trying fallback with more limited block range");
          const blockNumber = await publicClient.getBlockNumber();
          const startBlock = blockNumber > 10000n ? blockNumber - 10000n : 0n;
          
          const endEvents = await publicClient.getContractEvents({
            address: CONTRACT_ADDRESS as `0x${string}`,
            abi: guess23Abi,
            eventName: 'GameEnded',
            fromBlock: startBlock,
            toBlock: 'latest'
          });

          if (endEvents && endEvents.length > 0) {
            setLastWinner(endEvents[endEvents.length - 1]);
            setGameEvents(endEvents);
          }
        } catch (fallbackError) {
          console.error("Fallback event fetch failed:", fallbackError);
        }
      }
    };

    fetchEvents();
  }, [publicClient, gameId]);

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

    try {
      setIsLoading(true);
      setErrorMessage(null);
      
      // Use the wagmi writeContract function to interact with the contract
      writeContract({
        functionName: 'play',
        address: CONTRACT_ADDRESS as `0x${string}`,
        abi: guess23Abi,
        value: parseEther(amount)
      });
    } catch (error) {
      console.error("Error playing game:", error);
      setErrorMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setIsLoading(false);
    }
  };

  // Connect wallet (if Farcaster Frame connector available, use it)
  const handleConnect = () => {
    const farcasterConnector = connectors.find(c => c.name === "Farcaster Frame");
    if (farcasterConnector) {
      connect({ connector: farcasterConnector });
    } else if (connectors.length > 0) {
      connect({ connector: connectors[0] });
    }
  };

  return (
    <div className="px-4 py-2">
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
          <Button onClick={handleConnect}>Connect Wallet</Button>
          <p className="mt-2 text-xs text-gray-500">Connect your wallet to play</p>
        </div>
      ) : (
        <>
          {hasPlayedData ? (
            <div className="bg-green-100 dark:bg-green-900 p-4 rounded-lg mb-6 text-center">
              <p>You&apos;ve already joined this round!</p>
              <p className="text-sm mt-2">Wait for the game to end to see results.</p>
            </div>
          ) : (
            <div className="mb-6">
              <div className="mb-4">
                <Label htmlFor="amount" className="mb-1 block">Bet Amount (ETH)</Label>
                <div className="flex gap-2">
                  <Input
                    id="amount"
                    type="number"
                    step="0.001"
                    min="0"
                    placeholder="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="flex-1"
                  />
                  <Button 
                    onClick={handlePlay} 
                    disabled={isLoading || isConfirming || isPending}
                    className="min-w-24"
                  >
                    {isLoading || isConfirming || isPending ? "Processing..." : "Play"}
                  </Button>
                </div>
                {balance && (
                  <p className="text-xs mt-1 text-gray-500">
                    Balance: {formatEther(balance.value).substring(0, 8)} {balance.symbol}
                  </p>
                )}
              </div>

              {errorMessage && (
                <div className="bg-red-100 dark:bg-red-900 p-3 rounded text-sm text-red-700 dark:text-red-300 mb-4">
                  {errorMessage}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Game History */}
      <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-6">
        <h3 className="font-semibold mb-3">Recent Winners</h3>
        
        {lastWinner && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-lg mb-4">
            <p className="text-sm font-medium">Last Winner: {lastWinner.args.winner.substring(0, 6)}...{lastWinner.args.winner.substring(38)}</p>
            <p className="text-xs">Won {lastWinner.args.reward ? formatEther(lastWinner.args.reward).substring(0, 8) : "0"} ETH</p>
            <p className="text-xs">Target: {lastWinner.args.guessTarget ? formatEther(lastWinner.args.guessTarget).substring(0, 8) : "0"} ETH</p>
          </div>
        )}
        
        {gameEvents.length === 0 && (
          <p className="text-sm text-gray-500">No game history yet</p>
        )}

        {gameEvents.length > 0 && (
          <div className="mt-4">
            <p className="text-xs text-center mb-4">Share this game with your friends!</p>
            <Share text={`Play the "Guess 2/3 of the Average" game on ${APP_NAME}!`} />
          </div>
        )}
      </div>
    </div>
  );
} 