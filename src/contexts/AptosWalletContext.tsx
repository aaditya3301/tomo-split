import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'

// Types for Aptos wallet
interface AptosAccount {
  address: string
  publicKey: string
}

interface AptosWalletContextType {
  // Connection state
  isConnected: boolean
  isConnecting: boolean
  account: AptosAccount | null
  
  // Methods
  connect: () => Promise<void>
  disconnect: () => Promise<void>
  signAndSubmitTransaction: (transaction: any) => Promise<any>
  signMessage: (message: string) => Promise<string>
  
  // ANS support
  resolveANS: (name: string) => Promise<string | null>
  reverseResolveANS: (address: string) => Promise<string | null>
}

const AptosWalletContext = createContext<AptosWalletContextType | undefined>(undefined)

export const useAptosWallet = () => {
  const context = useContext(AptosWalletContext)
  if (context === undefined) {
    throw new Error('useAptosWallet must be used within an AptosWalletProvider')
  }
  return context
}

interface AptosWalletProviderProps {
  children: ReactNode
}

export const AptosWalletProvider: React.FC<AptosWalletProviderProps> = ({ children }) => {
  const [isConnected, setIsConnected] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [account, setAccount] = useState<AptosAccount | null>(null)

  // Check if Petra wallet is available
  const isPetraAvailable = () => {
    return typeof window !== 'undefined' && 'aptos' in window
  }

  // Connect to Petra wallet
  const connect = async () => {
    if (!isPetraAvailable()) {
      throw new Error('Petra wallet not found. Please install Petra wallet extension.')
    }

    setIsConnecting(true)
    try {
      // @ts-ignore - Petra wallet types
      const response = await window.aptos.connect()
      
      setAccount({
        address: response.address,
        publicKey: response.publicKey
      })
      setIsConnected(true)
      
      console.log('✅ Connected to Aptos via Petra:', response.address)
    } catch (error) {
      console.error('❌ Failed to connect to Petra:', error)
      throw error
    } finally {
      setIsConnecting(false)
    }
  }

  // Disconnect from Petra wallet
  const disconnect = async () => {
    try {
      // @ts-ignore - Petra wallet types
      await window.aptos.disconnect()
      setAccount(null)
      setIsConnected(false)
      console.log('✅ Disconnected from Aptos wallet')
    } catch (error) {
      console.error('❌ Failed to disconnect from Aptos wallet:', error)
    }
  }

  // Sign and submit transaction
  const signAndSubmitTransaction = async (transaction: any) => {
    if (!isPetraAvailable() || !isConnected) {
      throw new Error('Wallet not connected')
    }

    try {
      // @ts-ignore - Petra wallet types
      const response = await window.aptos.signAndSubmitTransaction(transaction)
      return response
    } catch (error) {
      console.error('❌ Transaction failed:', error)
      throw error
    }
  }

  // Sign message
  const signMessage = async (message: string) => {
    if (!isPetraAvailable() || !isConnected) {
      throw new Error('Wallet not connected')
    }

    try {
      // @ts-ignore - Petra wallet types
      const response = await window.aptos.signMessage({
        message,
        nonce: Date.now().toString()
      })
      return response.signature
    } catch (error) {
      console.error('❌ Message signing failed:', error)
      throw error
    }
  }

  // ANS Resolution (Aptos Name Service)
  const resolveANS = async (name: string): Promise<string | null> => {
    try {
      // TODO: Implement ANS resolution
      // This would typically call Aptos ANS smart contract
      console.log('🔄 Resolving ANS name:', name)
      
      // Placeholder implementation
      // In production, you'd call the ANS contract
      return null
    } catch (error) {
      console.error('❌ ANS resolution failed:', error)
      return null
    }
  }

  // Reverse ANS Resolution
  const reverseResolveANS = async (address: string): Promise<string | null> => {
    try {
      // TODO: Implement reverse ANS resolution
      console.log('🔄 Reverse resolving ANS for address:', address)
      
      // Placeholder implementation
      return null
    } catch (error) {
      console.error('❌ Reverse ANS resolution failed:', error)
      return null
    }
  }

  // Check for existing connection on mount
  useEffect(() => {
    const checkConnection = async () => {
      if (isPetraAvailable()) {
        try {
          // @ts-ignore - Petra wallet types
          const isConnected = await window.aptos.isConnected()
          if (isConnected) {
            // @ts-ignore - Petra wallet types
            const account = await window.aptos.account()
            setAccount({
              address: account.address,
              publicKey: account.publicKey
            })
            setIsConnected(true)
          }
        } catch (error) {
          console.warn('Failed to check existing Aptos connection:', error)
        }
      }
    }

    checkConnection()
  }, [])

  const value: AptosWalletContextType = {
    isConnected,
    isConnecting,
    account,
    connect,
    disconnect,
    signAndSubmitTransaction,
    signMessage,
    resolveANS,
    reverseResolveANS
  }

  return (
    <AptosWalletContext.Provider value={value}>
      {children}
    </AptosWalletContext.Provider>
  )
}

// Global types for Petra wallet
declare global {
  interface Window {
    aptos?: {
      connect(): Promise<{ address: string; publicKey: string }>
      disconnect(): Promise<void>
      isConnected(): Promise<boolean>
      account(): Promise<{ address: string; publicKey: string }>
      signAndSubmitTransaction(transaction: any): Promise<any>
      signMessage(payload: { message: string; nonce: string }): Promise<{ signature: string }>
    }
  }
}