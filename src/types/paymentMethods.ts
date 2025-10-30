import React from 'react'
import { ChainType } from '@/contexts/MultiChainWalletContext'

export type PaymentMethodId = 'aptos-native' | 'aptos-to-evm' | 'evm-native'

export interface PaymentMethod {
  id: PaymentMethodId
  name: string
  description: string
  icon: React.ReactNode
  chains: {
    source: ChainType
    destination: ChainType
  }
  available: boolean
  features: string[]
}

export interface MultiChainPaymentProps {
  targetAmount: number
  recipient?: string
  groupId?: string
  splitId?: string
  groupName?: string
  receiverName?: string
  onPaymentComplete?: (txHash: string, method: PaymentMethodId, amountOut: number) => void
  onError?: (error: string) => void
  forcedMethod?: PaymentMethodId
  onMethodDetected?: (method: PaymentMethodId) => void
}

export interface WormholeConfig {
  network: 'Mainnet' | 'Testnet' | 'Devnet'
  chains: string[]
  tokens: string[]
  rpcs: Record<string, string>
  ui?: {
    title?: string
    defaultInputs?: {
      fromChain?: string
      toChain?: string
    }
  }
}

export interface AptosTokenInfo {
  symbol: string
  name: string
  address: string
  decimals: number
  logoUri?: string
}