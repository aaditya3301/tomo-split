import React from 'react'
import { Zap, ArrowRightLeft, Wallet } from 'lucide-react'
import { PaymentMethod, PaymentMethodId, WormholeConfig, AptosTokenInfo } from '@/types/paymentMethods'

// Payment method configurations
export const PAYMENT_METHODS: PaymentMethod[] = [
  {
    id: 'aptos-native',
    name: 'APT to USDC',
    description: 'Convert APT to USDC on Aptos',
    icon: React.createElement(Zap, { className: "h-5 w-5 text-green-500" }),
    chains: { source: 'APTOS', destination: 'APTOS' },
    available: true,
    features: ['Fast', 'Low Cost', 'Aptos']
  },
  {
    id: 'aptos-to-evm',
    name: 'Aptos to EVM',
    description: 'Bridge from Aptos to Ethereum',
    icon: React.createElement(ArrowRightLeft, { className: "h-5 w-5 text-purple-500" }),
    chains: { source: 'APTOS', destination: 'EVM' },
    available: true,
    features: ['Cross-Chain', 'Bridge', 'Wormhole']
  },
  {
    id: 'evm-native',
    name: 'ETH to USDC',
    description: 'Convert ETH to USDC on EVM',
    icon: React.createElement(ArrowRightLeft, { className: "h-5 w-5 text-blue-500" }),
    chains: { source: 'EVM', destination: 'EVM' },
    available: true,
    features: ['Swap', 'EVM', 'Uniswap V4']
  }
]

// Wormhole Connect Configuration
export const WORMHOLE_CONFIG = {
  network: 'Mainnet' as const,
  chains: ['Aptos', 'Ethereum', 'Arbitrum', 'Polygon'] as const,
  tokens: ['APT', 'USDC', 'ETH', 'WETH'] as const,
  // Enhanced configuration for better wallet integration
  bridgeDefaults: {
    fromNetwork: 'Aptos',
    toNetwork: 'Ethereum',
    token: 'USDC'
  },
  // Ensure wallet modal appears on top
  ui: {
    showHamburgerMenu: false,
    walletConnectProjectId: undefined, // Use default
    enableAdvancedMode: true,
    enableSettingsModal: true
  }
}

// Wormhole Connect Theme
export const WORMHOLE_THEME = {
  mode: 'dark' as const,
  primary: '#fbbf24', // Yellow to match your theme
  secondary: '#78350f',
  text: '#ffffff',
  textSecondary: '#a1a1aa',
  error: '#ef4444',
  success: '#22c55e',
  font: 'Inter, system-ui, sans-serif'
}

// Aptos Token Configurations
export const APTOS_TOKENS: AptosTokenInfo[] = [
  {
    symbol: 'APT',
    name: 'Aptos Token',
    address: '0x1::aptos_coin::AptosCoin',
    decimals: 8,
    logoUri: 'https://cryptologos.cc/logos/aptos-apt-logo.png'
  },
  {
    symbol: 'USDC',
    name: 'USD Coin (Aptos)',
    address: '0xf22bede237a07e121b56d91a491eb7bcdfd1f5907926a9e58338f964a01b17fa::asset::USDC', // Example USDC on Aptos
    decimals: 6,
    logoUri: 'https://cryptologos.cc/logos/usd-coin-usdc-logo.png'
  }
]

// Payment method availability based on wallet connection
export const getAvailablePaymentMethods = (chainType: string | null, isConnected: boolean): PaymentMethod[] => {
  if (!isConnected || !chainType) {
    return []
  }

  return PAYMENT_METHODS.filter(method => {
    switch (chainType) {
      case 'APTOS':
        // Aptos wallet can use native Aptos payments and cross-chain to EVM
        return ['aptos-native', 'aptos-to-evm'].includes(method.id)
      case 'EVM':
        // EVM wallet can use native EVM payments and can be destination for cross-chain
        return ['evm-native'].includes(method.id)
      default:
        return false
    }
  })
}

// Get payment method by ID
export const getPaymentMethod = (id: PaymentMethodId): PaymentMethod | undefined => {
  return PAYMENT_METHODS.find(method => method.id === id)
}

// Check if cross-chain payment is supported
export const isCrossChainSupported = (fromChain: string, toChain: string): boolean => {
  const supportedPairs = [
    ['Aptos', 'Ethereum'],
    ['Aptos', 'Arbitrum'],
    ['Aptos', 'Polygon'],
    ['Ethereum', 'Aptos'],
    ['Arbitrum', 'Aptos'],
    ['Polygon', 'Aptos']
  ]
  
  return supportedPairs.some(([from, to]) => 
    (from === fromChain && to === toChain) || (from === toChain && to === fromChain)
  )
}