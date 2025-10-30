import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  ArrowRightLeft, 
  Wallet, 
  CheckCircle2, 
  XCircle, 
  Loader2,
  AlertCircle,
  TrendingUp,
  DollarSign,
  User,
  Zap
} from 'lucide-react'
import { useAccount, useWalletClient } from 'wagmi'
import { getPaymentService, PaymentParams } from '@/services/uniswapV4PaymentService'
import { ethers } from 'ethers'
import MultiChainPaymentWidget from './MultiChainPaymentWidget'
import { PaymentMethodId } from '@/types/paymentMethods'

interface PaymentModalProps {
  isOpen: boolean
  onClose: () => void
  transaction: {
    from: string
    to: string
    amount: number
    description?: string
  }
  groupId: string
  groupName: string
  fromMemberName: string
  toMemberName: string
  onPaymentSuccess?: (transactionId: string) => void
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  transaction,
  groupId,
  groupName,
  fromMemberName,
  toMemberName,
  onPaymentSuccess
}) => {
  const { address, isConnected } = useAccount()
  const { data: walletClient } = useWalletClient()
  
  const [isProcessing, setIsProcessing] = useState(false)
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle')
  const [error, setError] = useState<string>('')
  const [transactionId, setTransactionId] = useState<string>('')
  const [autoSelectedMethod, setAutoSelectedMethod] = useState<PaymentMethodId>('evm-native')

  const handleSwapComplete = async (txHash: string, method: PaymentMethodId, amountOut: number) => {
    setPaymentStatus('success')
    setTransactionId(txHash)
    
    // Call success callback
    if (onPaymentSuccess) {
      onPaymentSuccess(txHash)
    }
  }

  const handleSwapError = (error: string) => {
    setPaymentStatus('error')
    setError(error)
  }



  const handleClose = () => {
    if (!isProcessing) {
      setPaymentStatus('idle')
      setError('')
      setTransactionId('')
      onClose()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto bg-black border-yellow-500">
        <DialogHeader className="border-b border-yellow-500/30 pb-4">
          <DialogTitle className="flex items-center space-x-3 text-white">
            <div className="w-10 h-10 bg-gradient-to-br from-yellow-400 to-yellow-500 rounded-full flex items-center justify-center shadow-lg">
              <DollarSign className="h-5 w-5 text-black" />
            </div>
            <span className="text-xl font-bold">Process Payment</span>
          </DialogTitle>
          <DialogDescription className="text-white/70">
            Choose your preferred payment method for cross-chain transactions
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Transaction Details */}
          <div className="p-6 bg-yellow-500/10 rounded-xl border border-yellow-500/30 shadow-lg">
            <div className="space-y-4">
              {/* Group Info */}
              <div className="flex items-center justify-between">
                <Label className="text-sm text-white/70 font-medium">Group</Label>
                <Badge className="bg-yellow-500/30 text-yellow-300 border-yellow-500">{groupName}</Badge>
              </div>

              <Separator />

              {/* From */}
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-yellow-500 to-yellow-600 border-2 border-yellow-400 flex items-center justify-center shadow-lg">
                  <User className="h-5 w-5 text-black" />
                </div>
                <div className="flex-1">
                  <Label className="text-sm text-white/70 font-medium">From (You)</Label>
                  <p className="font-bold text-white text-lg">{fromMemberName}</p>
                </div>
              </div>

              {/* Arrow */}
              <div className="flex justify-center">
                <div className="p-2 bg-yellow-400/20 rounded-full">
                  <ArrowRightLeft className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                </div>
              </div>

              {/* To */}
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-500 border-2 border-yellow-300 flex items-center justify-center shadow-lg">
                  <User className="h-5 w-5 text-black" />
                </div>
                <div className="flex-1">
                  <Label className="text-sm text-white/70 font-medium">To</Label>
                  <p className="font-bold text-white text-lg">{toMemberName}</p>
                </div>
              </div>

              <Separator />

              {/* Amount */}
              <div className="flex items-center justify-between">
                <Label className="text-lg text-white font-bold">Amount to Pay</Label>
                <div className="text-right">
                  <p className="text-3xl font-black text-yellow-400">
                    ${transaction.amount.toFixed(2)}
                  </p>
                  <p className="text-sm text-white/60 font-medium">USD</p>
                </div>
              </div>
            </div>
          </div>

          {/* Payment Method Display - Auto-Selected */}
          <div className="space-y-4">
            <div className="text-center">
              <div className="text-sm font-medium text-muted-foreground mb-2">
                Auto-Selected Payment Method
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {/* APT to USDC Button */}
              <div
                className={`h-auto p-3 flex flex-col space-y-2 transition-all duration-200 border rounded-md cursor-default ${
                  autoSelectedMethod === 'aptos-native' 
                    ? 'bg-gradient-to-r from-green-400 to-green-500 text-white border-green-400 shadow-lg' 
                    : 'border-border bg-muted/30 opacity-50'
                }`}
              >
                <Zap className={`h-5 w-5 mx-auto ${autoSelectedMethod === 'aptos-native' ? 'text-white' : 'text-green-500'}`} />
                <div className="text-center">
                  <div className="font-semibold text-xs">APT to USDC</div>
                  <div className={`text-xs ${autoSelectedMethod === 'aptos-native' ? 'text-white/70' : 'text-muted-foreground'}`}>
                    Aptos Chain
                  </div>
                  {autoSelectedMethod === 'aptos-native' && (
                    <div className="text-xs text-white/80 mt-1 font-medium">✓ Selected</div>
                  )}
                </div>
              </div>

              {/* Aptos to EVM Button */}
              <div
                className={`h-auto p-3 flex flex-col space-y-2 transition-all duration-200 border rounded-md cursor-default ${
                  autoSelectedMethod === 'aptos-to-evm' 
                    ? 'bg-gradient-to-r from-purple-400 to-purple-500 text-white border-purple-400 shadow-lg' 
                    : 'border-border bg-muted/30 opacity-50'
                }`}
              >
                <ArrowRightLeft className={`h-5 w-5 mx-auto ${autoSelectedMethod === 'aptos-to-evm' ? 'text-white' : 'text-purple-500'}`} />
                <div className="text-center">
                  <div className="font-semibold text-xs">Aptos to EVM</div>
                  <div className={`text-xs ${autoSelectedMethod === 'aptos-to-evm' ? 'text-white/70' : 'text-muted-foreground'}`}>
                    Cross-Chain
                  </div>
                  {autoSelectedMethod === 'aptos-to-evm' && (
                    <div className="text-xs text-white/80 mt-1 font-medium">✓ Selected</div>
                  )}
                </div>
              </div>

              {/* ETH to USDC Button */}
              <div
                className={`h-auto p-3 flex flex-col space-y-2 transition-all duration-200 border rounded-md cursor-default ${
                  autoSelectedMethod === 'evm-native' 
                    ? 'bg-gradient-to-r from-blue-400 to-blue-500 text-white border-blue-400 shadow-lg' 
                    : 'border-border bg-muted/30 opacity-50'
                }`}
              >
                <ArrowRightLeft className={`h-5 w-5 mx-auto ${autoSelectedMethod === 'evm-native' ? 'text-white' : 'text-blue-500'}`} />
                <div className="text-center">
                  <div className="font-semibold text-xs">ETH to USDC</div>
                  <div className={`text-xs ${autoSelectedMethod === 'evm-native' ? 'text-white/70' : 'text-muted-foreground'}`}>
                    EVM Chain
                  </div>
                  {autoSelectedMethod === 'evm-native' && (
                    <div className="text-xs text-white/80 mt-1 font-medium">✓ Selected</div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Multi-Chain Payment Widget */}
          <MultiChainPaymentWidget
            targetAmount={transaction.amount}
            recipient={transaction.to}
            groupId={groupId}
            splitId={`split-${Date.now()}`}
            groupName={groupName}
            receiverName={toMemberName}
            onPaymentComplete={handleSwapComplete}
            onError={handleSwapError}
            onMethodDetected={setAutoSelectedMethod}
          />

          {/* Status Messages */}
          {paymentStatus === 'processing' && (
            <Alert className="border-yellow-500 bg-yellow-50 dark:bg-yellow-950">
              <motion.img
                src="/favicon.ico"
                alt="Processing"
                className="w-4 h-4"
                initial={{ scale: 0.8, opacity: 0.7 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ 
                  duration: 1.2, 
                  repeat: Infinity, 
                  repeatType: "reverse",
                  ease: "easeInOut"
                }}
              />
              <AlertDescription className="text-yellow-900 dark:text-yellow-100">
                Processing payment... Please confirm the transaction in your wallet.
              </AlertDescription>
            </Alert>
          )}

          {paymentStatus === 'success' && (
            <Alert className="border-yellow-500 bg-yellow-50 dark:bg-yellow-950">
              <CheckCircle2 className="h-4 w-4 text-yellow-600" />
              <AlertDescription className="text-yellow-900 dark:text-yellow-100">
                <p className="font-semibold mb-1">Payment Successful!</p>
                <p className="text-xs font-mono break-all">
                  Transaction: {transactionId.slice(0, 10)}...{transactionId.slice(-8)}
                </p>
              </AlertDescription>
            </Alert>
          )}

          {paymentStatus === 'error' && (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertDescription>
                <p className="font-semibold mb-1">Payment Failed</p>
                <p className="text-xs">{error}</p>
              </AlertDescription>
            </Alert>
          )}

          {!isConnected && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Please connect your wallet to make a payment.
              </AlertDescription>
            </Alert>
          )}

          {/* Action Buttons */}
          {paymentStatus === 'success' && (
            <div className="flex justify-end">
              <Button 
                onClick={handleClose} 
                className="bg-yellow-500 hover:bg-yellow-400 text-black font-bold"
              >
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Done
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default PaymentModal
