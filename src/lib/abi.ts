// lib/abi.ts
export const guess23Abi = [
  // write
  { type: 'function', name: 'play', stateMutability: 'payable', inputs: [], outputs: [] },

  // reads
  { type: 'function', name: 'totalAmount', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'gameId',      stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'minX',        stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'maxX',        stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'hasPlayed',   stateMutability: 'view', inputs: [{type:'address', name:'addr'}], outputs: [{ type: 'bool' }] },

  // players(i) -> (addr, amount)
  { type: 'function', name: 'players', stateMutability: 'view', inputs: [{ type: 'uint256', name: 'i' }],
    outputs: [{ type: 'address', name:'addr' }, { type: 'uint256', name:'amount' } ] },

  // events（可选，用于监听）
  { type: 'event', name: 'PlayerJoined', inputs: [
      { indexed: true,  name: 'player', type: 'address' },
      { indexed: false, name: 'amount', type: 'uint256' }
    ], anonymous: false },
  { type: 'event', name: 'GameEnded', inputs: [
      { indexed: true,  name: 'gameId',     type: 'uint256' },
      { indexed: true,  name: 'winner',     type: 'address' },
      { indexed: false, name: 'reward',     type: 'uint256' },
      { indexed: false, name: 'guessTarget',type: 'uint256' }
    ], anonymous: false },
] as const
