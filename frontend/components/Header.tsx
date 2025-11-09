'use client';

import { useAccount } from 'wagmi';
import { WalletButton } from './WalletButton';
import { Mail } from 'lucide-react';

export function Header() {
  const { isConnected, address } = useAccount();

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="container mx-auto px-4 py-4 max-w-6xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Mail className="w-8 h-8 text-primary-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">X402 Mail</h1>
              <p className="text-sm text-gray-500">Pay-to-Send, Read-to-Earn</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            {isConnected && (
              <div className="text-sm text-gray-600">
                {address?.slice(0, 6)}...{address?.slice(-4)}
              </div>
            )}
            <WalletButton />
          </div>
        </div>
      </div>
    </header>
  );
}

