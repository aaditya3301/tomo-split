import React, { createContext, useContext, useState } from 'react'

interface WormholeBridgeData {
  targetAmount?: number
  recipient?: string
  sourceChain?: string
  destinationChain?: string
  currentAccount?: any
}

interface WormholePortalContextType {
  isWormholePortalOpen: boolean
  bridgeData: WormholeBridgeData | null
  openWormholePortal: (data?: WormholeBridgeData) => void
  closeWormholePortal: () => void
}

const WormholePortalContext = createContext<WormholePortalContextType | undefined>(undefined)

export const useWormholePortal = () => {
  const context = useContext(WormholePortalContext)
  if (!context) {
    throw new Error('useWormholePortal must be used within a WormholePortalProvider')
  }
  return context
}

interface WormholePortalProviderProps {
  children: React.ReactNode
}

export const WormholePortalProvider: React.FC<WormholePortalProviderProps> = ({ children }) => {
  const [isWormholePortalOpen, setIsWormholePortalOpen] = useState(false)
  const [bridgeData, setBridgeData] = useState<WormholeBridgeData | null>(null)

  const openWormholePortal = (data?: WormholeBridgeData) => {
    if (data) {
      setBridgeData(data)
    }
    setIsWormholePortalOpen(true)
  }

  const closeWormholePortal = () => {
    setIsWormholePortalOpen(false)
    setBridgeData(null)
  }

  return (
    <WormholePortalContext.Provider
      value={{
        isWormholePortalOpen,
        bridgeData,
        openWormholePortal,
        closeWormholePortal
      }}
    >
      {children}
    </WormholePortalContext.Provider>
  )
}