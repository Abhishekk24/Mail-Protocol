'use client';

import { useAccount, useConnect } from 'wagmi';
import { useState } from 'react';
import { Inbox } from '@/components/Inbox';
import { Compose } from '@/components/Compose';
import { Header } from '@/components/Header';
import { WalletButton } from '@/components/WalletButton';

export default function Home() {
  const { isConnected, address } = useAccount();
  const [activeTab, setActiveTab] = useState<'inbox' | 'compose'>('inbox');

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <Header />
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {!isConnected ? (
          <div className="flex flex-col items-center justify-center min-h-[60vh]">
            <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
              <h2 className="text-2xl font-bold text-gray-800 mb-4 text-center">
                Connect Your Wallet
              </h2>
              <p className="text-gray-600 mb-6 text-center">
                Connect your wallet to start using X402 Mail Protocol. Send
                verified emails with micropayments and earn rewards for reading.
              </p>
              <WalletButton />
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-lg">
            <div className="border-b border-gray-200">
              <nav className="flex">
                <button
                  onClick={() => setActiveTab('inbox')}
                  className={`px-6 py-4 font-medium ${
                    activeTab === 'inbox'
                      ? 'text-primary-600 border-b-2 border-primary-600'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Inbox
                </button>
                <button
                  onClick={() => setActiveTab('compose')}
                  className={`px-6 py-4 font-medium ${
                    activeTab === 'compose'
                      ? 'text-primary-600 border-b-2 border-primary-600'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Compose
                </button>
              </nav>
            </div>
            <div className="p-6">
              {activeTab === 'inbox' ? (
                <Inbox address={address!} />
              ) : (
                <Compose senderAddress={address!} />
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

