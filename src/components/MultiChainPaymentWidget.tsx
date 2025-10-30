import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { 
  Sparkles, 
  AlertCircle, 
  Wallet,
  CheckCircle2,
  ArrowRight
} from 'lucide-react'
import { useMultiChainWallet } from '@/contexts/MultiChainWalletContext'
import { 
  PaymentMethodId, 
  MultiChainPaymentProps 
} from '@/types/paymentMethods'
import { 
  PAYMENT_METHODS, 
  getAvailablePaymentMethods,
  getPaymentMethod
} from '@/constants/paymentMethods'

// Utility functions for address detection
const isEVMAddress = (address: string): boolean => {
  return address?.startsWith('0x') && address.length === 42
}

const isAptosAddress = (address: string): boolean => {
  return address?.startsWith('0x') && address.length === 66
}

const detectOptimalPaymentMethod = (
  senderChain: string | null, 
  recipientAddress: string | undefined, 
  availableMethods: any[]
): PaymentMethodId => {
  if (!recipientAddress || availableMethods.length === 0) {
    return availableMethods[0]?.id || 'evm-native'
  }

  const isRecipientEVM = isEVMAddress(recipientAddress)
  const isRecipientAptos = isAptosAddress(recipientAddress)

  // Aptos sender logic
  if (senderChain === 'APTOS') {
    if (isRecipientAptos) {
      // Aptos to Aptos - use native
      return availableMethods.find(m => m.id === 'aptos-native')?.id || 'aptos-native'
    } else if (isRecipientEVM) {
      // Aptos to EVM - use cross-chain bridge
      return availableMethods.find(m => m.id === 'aptos-to-evm')?.id || 'aptos-to-evm'
    }
  }

  // EVM sender logic
  if (senderChain === 'EVM') {
    if (isRecipientEVM) {
      // EVM to EVM - use native
      return availableMethods.find(m => m.id === 'evm-native')?.id || 'evm-native'
    } else if (isRecipientAptos) {
      // EVM to Aptos - use cross-chain bridge (reverse direction)
      return availableMethods.find(m => m.id === 'aptos-to-evm')?.id || 'aptos-to-evm'
    }
  }

  // Fallback to first available method
  return availableMethods[0]?.id || 'evm-native'
}
import UniswapV4Widget from './UniswapV4Widget'
import WormholeBridgeWidget from './WormholeBridgeWidget'
import AptosNativeWidget from './AptosNativeWidget'

export const MultiChainPaymentWidget: React.FC<MultiChainPaymentProps> = ({
  targetAmount,
  recipient,
  groupId,
  splitId,
  groupName,
  receiverName,
  onPaymentComplete,
  onError,
  forcedMethod,
  onMethodDetected
}) => {
  const { currentAccount, chainType, isConnected } = useMultiChainWallet()
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethodId>('evm-native')
  const [isProcessing, setIsProcessing] = useState(false)

  // Get available payment methods based on connected wallet
  const availableMethods = getAvailablePaymentMethods(chainType, isConnected)
  const selectedPaymentMethod = getPaymentMethod(selectedMethod)

  // Smart auto-select best payment method based on sender and recipient
  useEffect(() => {
    if (availableMethods.length > 0) {
      // Use forced method if provided, otherwise auto-detect
      const methodToUse = forcedMethod || detectOptimalPaymentMethod(chainType, recipient, availableMethods)
      setSelectedMethod(methodToUse)
      
      // Notify parent component of the detected method
      onMethodDetected?.(methodToUse)
    }
  }, [chainType, isConnected, recipient, availableMethods, forcedMethod, onMethodDetected])

  // Handle payment completion from child components
  const handlePaymentSuccess = (txHash: string, amountOut: number) => {
    setIsProcessing(false)
    onPaymentComplete?.(txHash, selectedMethod, amountOut)
  }

  // Handle payment errors from child components
  const handlePaymentError = (error: string) => {
    setIsProcessing(false)
    onError?.(error)
  }



  // Render payment interface based on selected method
  const renderPaymentInterface = () => {
    if (!selectedPaymentMethod) return null

    switch (selectedMethod) {
      case 'evm-native':
        return (
          <UniswapV4Widget
            targetAmount={targetAmount}
            recipient={recipient}
            groupId={groupId}
            splitId={splitId}
            groupName={groupName}
            receiverName={receiverName}
            onSwapComplete={handlePaymentSuccess}
            onError={handlePaymentError}
          />
        )

      case 'aptos-to-evm':
        return (
          <WormholeBridgeWidget
            targetAmount={targetAmount}
            recipient={recipient}
            groupId={groupId}
            splitId={splitId}
            groupName={groupName}
            receiverName={receiverName}
            sourceChain="Aptos"
            destinationChain="Ethereum"
            onBridgeComplete={handlePaymentSuccess}
            onError={handlePaymentError}
          />
        )

      case 'aptos-native':
        return (
          <AptosNativeWidget
            targetAmount={targetAmount}
            recipient={recipient}
            groupId={groupId}
            splitId={splitId}
            groupName={groupName}
            receiverName={receiverName}
            selectedToken="USDC"
            onTransferComplete={handlePaymentSuccess}
            onError={handlePaymentError}
          />
        )

      default:
        return (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Unsupported payment method: {selectedMethod}
            </AlertDescription>
          </Alert>
        )
    }
  }

  // Show wallet connection prompt if not connected
  if (!isConnected || !currentAccount) {
    return (
      <Card className="w-full border-2 border-yellow-400/30 shadow-lg">
        <CardContent className="p-4 sm:p-8 text-center">
          <div className="space-y-3 sm:space-y-4">
            <div className="w-12 h-12 sm:w-16 sm:h-16 mx-auto bg-yellow-500/20 rounded-full flex items-center justify-center">
              <Wallet className="h-6 w-6 sm:h-8 sm:w-8 text-yellow-400" />
            </div>
            <div>
              <h3 className="font-semibold text-base sm:text-lg">Connect Your Wallet</h3>
              <p className="text-xs sm:text-sm text-muted-foreground mt-2">
                Connect your Aptos or Ethereum wallet to start making payments
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Show no available methods message
  if (availableMethods.length === 0) {
    return (
      <Card className="w-full border-2 border-yellow-400/30 shadow-lg">
        <CardContent className="p-4 sm:p-8 text-center">
          <div className="space-y-3 sm:space-y-4">
            <div className="w-12 h-12 sm:w-16 sm:h-16 mx-auto bg-red-500/20 rounded-full flex items-center justify-center">
              <AlertCircle className="h-6 w-6 sm:h-8 sm:w-8 text-red-400" />
            </div>
            <div>
              <h3 className="font-semibold text-base sm:text-lg">No Payment Methods Available</h3>
              <p className="text-xs sm:text-sm text-muted-foreground mt-2">
                No supported payment methods for your current wallet connection
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full border-2 border-yellow-400/30 shadow-lg">
      <CardHeader className="bg-gradient-to-r from-yellow-400/10 to-yellow-500/10 border-b border-yellow-400/30 py-3 sm:py-6">
        <CardTitle className="flex items-center">
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-br from-yellow-400 to-yellow-500 rounded-full flex items-center justify-center">
              <ArrowRight className="h-3 w-3 sm:h-4 sm:w-4 text-black" />
            </div>
            <span className="text-sm sm:text-base">Multi-Chain Payment</span>
          </div>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="p-3 sm:p-6 space-y-3 sm:space-y-6">        
        {/* Selected Payment Interface */}
        <div className="space-y-3 sm:space-y-4">
          {renderPaymentInterface()}
        </div>
      </CardContent>
    </Card>
  )
}

export default MultiChainPaymentWidget