'use client';

import { createConfig, http, WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { polygon, baseSepolia } from 'wagmi/chains';
import { injected, walletConnect } from 'wagmi/connectors';

const projectId = process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID || '';

const metadata = {
  name: 'X402 Mail Protocol',
  description: 'Pay-to-Send, Read-to-Earn Email Communication',
  url: 'https://x402mail.com',
  icons: ['https://x402mail.com/logo.png'],
};

const wagmiConfig = createConfig({
  chains: [baseSepolia], 
  connectors: [
    injected(),
    walletConnect({ projectId, metadata }),
  ],
  transports: {
    [baseSepolia.id]: http(),
  },
});

const queryClient = new QueryClient();

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  );
}

