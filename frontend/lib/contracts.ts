export const X402MailABI = [
  {
    inputs: [
      { internalType: 'address', name: 'receiver', type: 'address' },
      { internalType: 'bytes32', name: 'messageHash', type: 'bytes32' },
      { internalType: 'uint256', name: 'amount', type: 'uint256' },
    ],
    name: 'depositPayment',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'bytes32', name: 'messageHash', type: 'bytes32' }],
    name: 'markAsRead',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'bytes32', name: 'messageHash', type: 'bytes32' }],
    name: 'refundExpired',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'bytes32', name: 'messageHash', type: 'bytes32' }],
    name: 'flagSpam',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'address', name: 'sender', type: 'address' }],
    name: 'calculateFee',
    outputs: [{ internalType: 'uint256', name: 'fee', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'bytes32', name: 'messageHash', type: 'bytes32' }],
    name: 'getMessage',
    outputs: [
      {
        components: [
          { internalType: 'address', name: 'sender', type: 'address' },
          { internalType: 'address', name: 'receiver', type: 'address' },
          { internalType: 'bytes32', name: 'messageHash', type: 'bytes32' },
          { internalType: 'uint256', name: 'amount', type: 'uint256' },
          { internalType: 'uint256', name: 'timestamp', type: 'uint256' },
          { internalType: 'bool', name: 'isRead', type: 'bool' },
          { internalType: 'bool', name: 'isRefunded', type: 'bool' },
          { internalType: 'bool', name: 'isSpam', type: 'bool' },
        ],
        internalType: 'struct X402Mail.Message',
        name: 'message',
        type: 'tuple',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'address', name: 'sender', type: 'address' }],
    name: 'getSenderProfile',
    outputs: [
      {
        components: [
          { internalType: 'uint256', name: 'credibilityScore', type: 'uint256' },
          { internalType: 'uint256', name: 'totalSent', type: 'uint256' },
          { internalType: 'uint256', name: 'totalRead', type: 'uint256' },
          { internalType: 'uint256', name: 'spamFlags', type: 'uint256' },
        ],
        internalType: 'struct X402Mail.SenderProfile',
        name: 'profile',
        type: 'tuple',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

