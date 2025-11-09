'use client';

import { useState, useEffect } from 'react';
import { useWriteContract, useWaitForTransactionReceipt, useBalance, useReadContract } from 'wagmi';
import { parseEther, keccak256, stringToBytes, formatUnits } from 'viem';
import { X402MailABI } from '@/lib/contracts';
import { Button } from './ui/Button';
import axios from 'axios';

interface ComposeProps {
  senderAddress: string;
}

type TransactionStatus = 'idle' | 'resolving' | 'checking-balance' | 'approving' | 'depositing' | 'sending-email' | 'success' | 'error';

export function Compose({ senderAddress }: ComposeProps) {
  const [receiverEmail, setReceiverEmail] = useState('');
  const [receiverAddress, setReceiverAddress] = useState<string | null>(null);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [amount, setAmount] = useState('0.005');
  const [status, setStatus] = useState<TransactionStatus>('idle');
  const [statusMessage, setStatusMessage] = useState('');
  const [error, setError] = useState<string | null>(null);

  const contractAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS as `0x${string}`;
  const paymentTokenAddress = process.env.NEXT_PUBLIC_PAYMENT_TOKEN_ADDRESS as `0x${string}`;

  // Check wallet balance
  const { data: balance, isLoading: balanceLoading } = useBalance({
    address: senderAddress as `0x${string}`,
  });

  // Check USDC balance
  const { data: tokenBalance, isLoading: tokenBalanceLoading } = useReadContract({
    address: paymentTokenAddress,
    abi: [
      {
        inputs: [{ internalType: 'address', name: 'account', type: 'address' }],
        name: 'balanceOf',
        outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
        stateMutability: 'view',
        type: 'function',
      },
    ],
    functionName: 'balanceOf',
    args: [senderAddress as `0x${string}`],
  });

  // Check existing allowance
  const { data: allowance } = useReadContract({
    address: paymentTokenAddress,
    abi: [
      {
        inputs: [
          { internalType: 'address', name: 'owner', type: 'address' },
          { internalType: 'address', name: 'spender', type: 'address' },
        ],
        name: 'allowance',
        outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
        stateMutability: 'view',
        type: 'function',
      },
    ],
    functionName: 'allowance',
    args: [senderAddress as `0x${string}`, contractAddress],
  });

  const { writeContract: writeApproval, data: approvalHashData, isPending: isApproving, error: approvalError } = useWriteContract();
  const { writeContract: writeDeposit, data: depositHashData, isPending: isDepositing, error: depositError } = useWriteContract();

  // Track approval transaction
  const { isLoading: isApprovalConfirming, isSuccess: isApprovalSuccess, error: approvalTxError } = useWaitForTransactionReceipt({
    hash: approvalHashData,
  });

  // Track deposit transaction
  const { isLoading: isDepositConfirming, isSuccess: isDepositSuccess, error: depositTxError } = useWaitForTransactionReceipt({
    hash: depositHashData,
  });

  // Update status when transactions complete
  useEffect(() => {
    if (isApprovalSuccess && !depositHashData) {
      setStatus('depositing');
      setStatusMessage('Approval confirmed. Depositing payment...');
    }
  }, [isApprovalSuccess, depositHashData]);

  useEffect(() => {
    if (isDepositSuccess && depositHashData && receiverAddress && subject && body) {
      setStatus('sending-email');
      setStatusMessage('Transaction confirmed. Sending email...');
      
      // Send email after successful deposit
      const sendEmail = async () => {
        try {
          const messageContent = `${subject}:${body}:${Date.now()}`;
          const messageHash = keccak256(stringToBytes(messageContent));
          const amountInWei = BigInt(Math.floor(parseFloat(amount) * 1000000));

          const response = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/api/messages`, {
            messageHash: messageHash,
            sender: senderAddress,
            receiver: receiverAddress,
            receiverEmail: receiverEmail,
            subject,
            body,
            amount: amountInWei.toString(),
            transactionHash: depositHashData,
          });

          setStatus('success');
          setStatusMessage('Email sent successfully!');
          console.log('Email sent successfully:', response.data);
          
          // Reset form after success
          setTimeout(() => {
            setReceiverEmail('');
            setReceiverAddress(null);
            setSubject('');
            setBody('');
            setStatus('idle');
            setStatusMessage('');
            setError(null);
          }, 3000);
        } catch (error: any) {
          console.error('Email sending error:', error);
          setStatus('error');
          setError(`Email sending failed: ${error.response?.data?.error || error.message || 'Unknown error'}`);
        }
      };
      
      sendEmail();
    }
  }, [isDepositSuccess, depositHashData, receiverAddress, receiverEmail, subject, body, amount, senderAddress]);

  // Handle errors
  useEffect(() => {
    if (approvalError || approvalTxError) {
      setStatus('error');
      setError(approvalError?.message || approvalTxError?.message || 'Approval failed');
      console.error('Approval error:', approvalError || approvalTxError);
    }
  }, [approvalError, approvalTxError]);

  useEffect(() => {
    if (depositError || depositTxError) {
      setStatus('error');
      setError(depositError?.message || depositTxError?.message || 'Deposit failed');
      console.error('Deposit error:', depositError || depositTxError);
    }
  }, [depositError, depositTxError]);

  // Resolve email to wallet address
  const resolveEmailToWallet = async (email: string): Promise<string> => {
    try {
      setStatus('resolving');
      setStatusMessage(`Resolving email: ${email}...`);
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/api/users/email/${encodeURIComponent(email)}`
      );
      if (!response.data.walletAddress) {
        throw new Error('No wallet address found in response');
      }
      return response.data.walletAddress;
    } catch (error: any) {
      console.error('Email resolution error:', error);
      throw new Error(
        error.response?.data?.message || 
        error.message || 
        `No wallet address found for email: ${email}. Please ensure the recipient has registered their email address.`
      );
    }
  };

  // Check wallet balance
  const checkBalance = async (): Promise<boolean> => {
    try {
      setStatus('checking-balance');
      setStatusMessage('Checking wallet balance...');
  
      const amountInWei = BigInt(Math.floor(parseFloat(amount) * 1000000));
  
      // If no balance yet (RPC slow), wait a moment
      if (!balance) {
        await new Promise((r) => setTimeout(r, 1000));
      }
  
      // Require minimal gas for Base Sepolia (~0.000005 ETH)
      if (!balance || balance.value < parseEther('0.000005')) {
        throw new Error(
          'Insufficient ETH for gas fees on Base Sepolia. Please add a small amount (0.00001 ETH or more).'
        );
      }
  
      // Check USDC balance
      if (!tokenBalance || tokenBalance < amountInWei) {
        const balanceFormatted = tokenBalance ? formatUnits(tokenBalance, 6) : '0';
        throw new Error(
          `Insufficient USDC balance. Required: ${amount} USDC, Available: ${balanceFormatted} USDC`
        );
      }
  
      return true;
    } catch (error: any) {
      console.error('Balance check error:', error);
      throw error;
    }
  };
  


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setStatus('idle');
    setStatusMessage('');

    try {
      // Step 1: Resolve email to wallet address
      let walletAddress = receiverAddress;
      
      if (!walletAddress && receiverEmail) {
        try {
          walletAddress = await resolveEmailToWallet(receiverEmail);
          setReceiverAddress(walletAddress);
        } catch (error: any) {
          setStatus('error');
          setError(error.message || 'Failed to resolve email to wallet address');
          console.error('Email resolution error:', error);
          return;
        }
      }

      if (!walletAddress) {
        setStatus('error');
        setError('Please provide either an email address or wallet address');
        return;
      }

      // Step 2: Check balance
      await checkBalance();

      // Step 3: Generate message hash
      const messageContent = `${subject}:${body}:${Date.now()}`;
      const messageHash = keccak256(stringToBytes(messageContent));

      // Convert amount to wei (assuming 6 decimals for USDC)
      const amountInWei = BigInt(Math.floor(parseFloat(amount) * 1000000));

      // Step 4: Approve token spending (if needed)
      const ERC20_ABI = [
        {
          inputs: [
            { internalType: 'address', name: 'spender', type: 'address' },
            { internalType: 'uint256', name: 'amount', type: 'uint256' },
          ],
          name: 'approve',
          outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
          stateMutability: 'nonpayable',
          type: 'function',
        },
      ];

      // Check if approval is needed
      if (!allowance || allowance < amountInWei) {
        setStatus('approving');
        setStatusMessage('Requesting token approval...');
        writeApproval({
          address: paymentTokenAddress,
          abi: ERC20_ABI,
          functionName: 'approve',
          args: [contractAddress, amountInWei],
        });
      } else {
        // Already approved, proceed to deposit
        setStatus('depositing');
        setStatusMessage('Approval already exists. Depositing payment...');
        writeDeposit({
          address: contractAddress,
          abi: X402MailABI,
          functionName: 'depositPayment',
          args: [
            walletAddress as `0x${string}`,
            messageHash,
            amountInWei,
          ],
        });
      }
    } catch (error: any) {
      console.error('Error in handleSubmit:', error);
      setStatus('error');
      setError(error.message || 'Failed to send message. Please try again.');
    }
  };

  // Handle deposit after approval
  useEffect(() => {
    if (isApprovalSuccess && !depositHashData && receiverAddress && subject && body) {
      const messageContent = `${subject}:${body}:${Date.now()}`;
      const messageHash = keccak256(stringToBytes(messageContent));
      const amountInWei = BigInt(Math.floor(parseFloat(amount) * 1000000));

      setStatus('depositing');
      setStatusMessage('Approval confirmed. Depositing payment...');

      writeDeposit({
        address: contractAddress,
        abi: X402MailABI,
        functionName: 'depositPayment',
        args: [
          receiverAddress as `0x${string}`,
          messageHash,
          amountInWei,
        ],
      });
    }
  }, [isApprovalSuccess, depositHashData, receiverAddress, subject, body, amount, contractAddress]);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-black mb-2">
          To (Email Address)
        </label>
        <input
          type="email"
          value={receiverEmail}
          onChange={(e) => setReceiverEmail(e.target.value)}
          placeholder="recipient@example.com"
          required
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        />
        <p className="mt-1 text-xs text-gray-500">
          Or enter wallet address directly below
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-black mb-2">
          To (Wallet Address - Optional)
        </label>
        <input
          type="text"
          value={receiverAddress || ''}
          onChange={(e) => setReceiverAddress(e.target.value || null)}
          placeholder="0x... (optional if email provided)"
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-black mb-2">
          Subject
        </label>
        <input
          type="text"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Email subject"
          required
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-black mb-2">
          Message
        </label>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Your message..."
          rows={10}
          required
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-black mb-2">
          Payment Amount (USDC)
        </label>
        <input
          type="number"
          step="0.001"
          min="0.005"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          required
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        />
        <p className="mt-1 text-sm text-gray-500">
          Minimum: 0.005 USDC (fee may be lower based on your credibility score)
        </p>
      </div>

      {/* Wallet Balance Display */}
      <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-700">Wallet Balance:</span>
          {balanceLoading || tokenBalanceLoading ? (
            <span className="text-sm text-gray-500">Loading...</span>
          ) : (
            <div className="text-right">
              <div className="text-sm font-semibold text-gray-900">
                {balance ? `${parseFloat(balance.formatted).toFixed(4)} ${balance.symbol}` : 'N/A'}
              </div>
              {tokenBalance && (
                <div className="text-xs text-gray-600">
                  {formatUnits(tokenBalance, 6)} USDC
                </div>
              )}
            </div>
          )}
        </div>
        {tokenBalance && parseFloat(amount) > parseFloat(formatUnits(tokenBalance, 6)) && (
          <p className="text-xs text-red-600 mt-1">
            ⚠️ Insufficient USDC balance
          </p>
        )}
      </div>

      {/* Status Messages */}
      {statusMessage && (
        <div className={`p-4 rounded-lg border ${
          status === 'success' 
            ? 'bg-green-50 border-green-200 text-green-800'
            : status === 'error'
            ? 'bg-red-50 border-red-200 text-red-800'
            : 'bg-blue-50 border-blue-200 text-blue-800'
        }`}>
          <p className="text-sm font-medium">{statusMessage}</p>
          {status === 'approving' && approvalHashData && (
            <p className="text-xs mt-1">
              Transaction: {approvalHashData.slice(0, 10)}...{approvalHashData.slice(-8)}
            </p>
          )}
          {status === 'depositing' && depositHashData && (
            <p className="text-xs mt-1">
              Transaction: {depositHashData.slice(0, 10)}...{depositHashData.slice(-8)}
            </p>
          )}
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm font-medium text-red-800">Error:</p>
          <p className="text-sm text-red-700 mt-1">{error}</p>
          <button
            onClick={() => {
              setError(null);
              setStatus('idle');
              setStatusMessage('');
            }}
            className="text-xs text-red-600 underline mt-2"
          >
            Dismiss
          </button>
        </div>
      )}

      <Button
        type="submit"
        disabled={
          status === 'resolving' ||
          status === 'checking-balance' ||
          status === 'approving' ||
          status === 'depositing' ||
          status === 'sending-email' ||
          isApproving ||
          isApprovalConfirming ||
          isDepositing ||
          isDepositConfirming ||
          status === 'success'
        }
        className="w-full"
      >
        {status === 'resolving'
          ? 'Resolving email...'
          : status === 'checking-balance'
          ? 'Checking balance...'
          : status === 'approving' || isApproving || isApprovalConfirming
          ? 'Approving tokens...'
          : status === 'depositing' || isDepositing || isDepositConfirming
          ? 'Depositing payment...'
          : status === 'sending-email'
          ? 'Sending email...'
          : status === 'success'
          ? 'Email Sent! ✓'
          : status === 'error'
          ? 'Retry'
          : 'Send Email'}
      </Button>

      {status === 'success' && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-green-800 font-medium">✓ Email sent successfully!</p>
          <p className="text-sm text-green-700 mt-1">
            The recipient will receive the email and can claim their reward by marking it as read.
          </p>
        </div>
      )}
    </form>
  );
}

