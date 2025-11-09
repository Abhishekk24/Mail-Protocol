'use client';

import { useState, useEffect } from 'react';
import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { X402MailABI } from '@/lib/contracts';
import { Button } from './ui/Button';
import { Mail, Check, Flag } from 'lucide-react';
import axios from 'axios';
import { format } from 'date-fns';

interface InboxProps {
  address: string;
}

interface Message {
  messageHash: string;
  sender: string;
  subject: string;
  body: string;
  amount: string;
  timestamp: number;
  isRead: boolean;
  isSpam: boolean;
}

export function Inbox({ address }: InboxProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);

  const contractAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS as `0x${string}`;

  const { writeContract, data: hash } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  useEffect(() => {
    loadMessages();
  }, [address]);

  const loadMessages = async () => {
    try {
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/api/messages/inbox/${address}`
      );
      setMessages(response.data);
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (messageHash: string) => {
    try {
      writeContract({
        address: contractAddress,
        abi: X402MailABI,
        functionName: 'markAsRead',
        args: [messageHash as `0x${string}`],
      });

      if (isSuccess) {
        // Update local state
        setMessages((prev) =>
          prev.map((msg) =>
            msg.messageHash === messageHash ? { ...msg, isRead: true } : msg
          )
        );
        setSelectedMessage(null);
      }
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const handleFlagSpam = async (messageHash: string) => {
    try {
      writeContract({
        address: contractAddress,
        abi: X402MailABI,
        functionName: 'flagSpam',
        args: [messageHash as `0x${string}`],
      });

      if (isSuccess) {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.messageHash === messageHash ? { ...msg, isSpam: true } : msg
          )
        );
        setSelectedMessage(null);
      }
    } catch (error) {
      console.error('Error flagging spam:', error);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading messages...</div>;
  }

  if (messages.length === 0) {
    return (
      <div className="text-center py-12">
        <Mail className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-500 text-lg">No messages yet</p>
        <p className="text-gray-400 text-sm mt-2">
          Verified emails will appear here
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="md:col-span-1 border-r border-gray-200 pr-4">
        <h2 className="font-semibold text-lg mb-4">Messages</h2>
        <div className="space-y-2">
          {messages.map((message) => (
            <div
              key={message.messageHash}
              onClick={() => setSelectedMessage(message)}
              className={`p-3 rounded-lg cursor-pointer transition-colors ${
                selectedMessage?.messageHash === message.messageHash
                  ? 'bg-primary-50 border-2 border-primary-500'
                  : message.isRead
                  ? 'bg-gray-50 border border-gray-200'
                  : 'bg-blue-50 border-2 border-blue-300'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">
                    {message.subject}
                  </p>
                  <p className="text-xs text-gray-500 truncate mt-1">
                    {message.sender.slice(0, 6)}...{message.sender.slice(-4)}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    {format(new Date(message.timestamp), 'MMM d, yyyy')}
                  </p>
                </div>
                {!message.isRead && (
                  <div className="w-2 h-2 bg-blue-500 rounded-full ml-2"></div>
                )}
              </div>
              <div className="mt-2 text-xs font-semibold text-green-600">
                +{parseFloat(message.amount) / 1e6} USDC
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="md:col-span-2">
        {selectedMessage ? (
          <div className="space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-xl font-bold">{selectedMessage.subject}</h3>
                <p className="text-sm text-gray-500 mt-1">
                  From: {selectedMessage.sender}
                </p>
                <p className="text-sm text-gray-500">
                  {format(
                    new Date(selectedMessage.timestamp),
                    'MMMM d, yyyy h:mm a'
                  )}
                </p>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold text-green-600">
                  +{parseFloat(selectedMessage.amount) / 1e6} USDC
                </div>
                <p className="text-xs text-gray-500">Reward for reading</p>
              </div>
            </div>

            <div className="border-t border-b border-gray-200 py-4">
              <p className="whitespace-pre-wrap text-gray-700">
                {selectedMessage.body}
              </p>
            </div>

            {!selectedMessage.isRead && (
              <div className="flex space-x-3">
                <Button
                  onClick={() => handleMarkAsRead(selectedMessage.messageHash)}
                  disabled={isConfirming}
                  className="flex-1"
                >
                  <Check className="w-4 h-4 mr-2 inline" />
                  Mark as Read (Claim Reward)
                </Button>
                <Button
                  onClick={() => handleFlagSpam(selectedMessage.messageHash)}
                  variant="danger"
                  disabled={isConfirming}
                >
                  <Flag className="w-4 h-4 inline" />
                  Flag Spam
                </Button>
              </div>
            )}

            {selectedMessage.isRead && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-green-800">
                  ✓ Message read - Reward claimed!
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-400">
            Select a message to view
          </div>
        )}
      </div>
    </div>
  );
}

