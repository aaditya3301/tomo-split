import React from 'react'
import { useWormholePortal } from '@/contexts/WormholePortalContext'
import { WormholePortal } from './WormholePortal'

/**
 * Global Wormhole Portal Manager
 * This component should be placed at the root level of your app
 * It renders the WormholePortal outside any dialog containers to avoid focus conflicts
 */
export const GlobalWormholePortal: React.FC = () => {
  const { isWormholePortalOpen, bridgeData, closeWormholePortal } = useWormholePortal()

  return (
    <WormholePortal
      isOpen={isWormholePortalOpen}
      onClose={closeWormholePortal}
      targetAmount={bridgeData?.targetAmount}
      recipient={bridgeData?.recipient}
      sourceChain={bridgeData?.sourceChain}
      destinationChain={bridgeData?.destinationChain}
      currentAccount={bridgeData?.currentAccount}
    />
  )
}