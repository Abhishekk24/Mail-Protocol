'use client';

import { useAccount, useDisconnect, useConnect } from 'wagmi';
import { Button } from './ui/Button';

export function WalletButton() {
  const { isConnected, address } = useAccount();
  const { disconnect } = useDisconnect();
  const { connect, connectors } = useConnect();

  if (isConnected) {
    return (
      <Button onClick={() => disconnect()} variant="outline">
        Disconnect
      </Button>
    );
  }

  return (
    <Button 
      onClick={() => connect({ connector: connectors[0] })} 
      variant="primary"
    >
      Connect Wallet
    </Button>
  );
}

