import { createPublicClient, http, formatUnits } from 'viem';
import { baseSepolia } from 'viem/chains';

const client = createPublicClient({
  chain: baseSepolia,
  transport: http(),
});

const balance = await client.readContract({
  address: '0x1c7d4b196cb0c7b70fc392c0faff3ad5bf9e2b6f', // ✅ lowercase to avoid checksum errors
  abi: [{
    inputs: [{ name: 'account', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  }],
  functionName: 'balanceOf',
  args: ['0x03cED33A7d25E1efa753440d97f16d2fCf267036'],
});

console.log('Balance:', formatUnits(balance, 6), 'USDC');
