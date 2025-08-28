// src/lib/rpcHelpers.ts
import { createPublicClient, http, PublicClient, Abi, Address, ContractEventName } from 'viem';
import { base } from 'viem/chains';

// Alternative RPC endpoints to try if the primary fails
const RPC_FALLBACKS = [
  'https://mainnet.base.org',
  'https://base.drpc.org',
  'https://base.llamarpc.com',
  'https://rpc.ankr.com/base'
];

/**
 * Creates a fallback public client that tries multiple RPC endpoints
 * if the primary endpoint fails with RPC errors
 */
export async function createFallbackClient(): Promise<PublicClient> {
  // Create client with first RPC endpoint
  const client = createPublicClient({
    chain: base,
    transport: http(RPC_FALLBACKS[0], {
      retryCount: 2,
      timeout: 10000,
    }),
  });
  
  try {
    // Test the client with a simple call
    await client.getBlockNumber();
    console.log("Using primary RPC endpoint:", RPC_FALLBACKS[0]);
    return client as PublicClient;
  } catch (error) {
    console.warn("Primary RPC failed, trying fallbacks...", error);
    
    // Try each fallback RPC endpoint
    for (let i = 1; i < RPC_FALLBACKS.length; i++) {
      try {
        const fallbackClient = createPublicClient({
          chain: base,
          transport: http(RPC_FALLBACKS[i], {
            retryCount: 2,
            timeout: 10000,
          }),
        });
        
        // Test the fallback
        await fallbackClient.getBlockNumber();
        console.log("Using fallback RPC endpoint:", RPC_FALLBACKS[i]);
        return fallbackClient as PublicClient;
      } catch (innerError) {
        console.warn(`Fallback RPC ${i} failed:`, innerError);
      }
    }
    
    // If all fallbacks fail, return the original client as last resort
    console.error("All RPC endpoints failed. Using default client.");
    return client as PublicClient;
  }
}

/**
 * Helper function to safely get contract events with fallbacks for RPC errors
 */
export async function getContractEventsWithFallback<TAbi extends Abi>({
  client,
  address,
  abi,
  eventName,
  fromBlock,
  toBlock = 'latest'
}: {
  client: PublicClient;
  address: Address;
  abi: TAbi;
  eventName: ContractEventName<TAbi>;
  fromBlock: bigint;
  toBlock?: 'latest' | bigint;
}) {
  try {
    return await client.getContractEvents({
      address,
      abi,
      eventName: eventName as any,
      fromBlock,
      toBlock,
      strict: false
    });
  } catch (error) {
    console.error(`Error fetching ${eventName} events:`, error);
    
    // If original client fails, try with fallback clients
    if (String(error).includes("InternalRpcError") || 
        String(error).includes("input does not match format")) {
      console.log("Attempting with fallback RPC...");
      
      const fallbackClient = await createFallbackClient();
      
      // Reduce block range for fallback attempt
      // Start with a more recent block to reduce chance of RPC error
      const blockOffset = 900n;
      const startBlock = typeof toBlock === 'bigint' 
        ? (fromBlock + ((toBlock - fromBlock) / 2n)) // Halfway point if we have a range
        : (fromBlock + blockOffset); // Add a fixed amount if using 'latest'
      
      return await fallbackClient.getContractEvents({
        address,
        abi,
        eventName: eventName as any,
        fromBlock: startBlock,
        toBlock,
        strict: false
      });
    }
    
    throw error;
  }
}
