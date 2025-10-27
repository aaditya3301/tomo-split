import React, { useState } from 'react'
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
import UniswapV4Widget from './UniswapV4Widget'

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
  const [paymentMethod, setPaymentMethod] = useState<'swap' | 'direct'>('swap')
  const [activeTab, setActiveTab] = useState<'swap' | 'direct'>('swap')

  const handleSwapComplete = async (txHash: string, amountOut: number) => {
    console.log('✅ Swap completed:', { txHash, amountOut })
    setPaymentStatus('success')
    setTransactionId(txHash)
    
    // Call success callback
    if (onPaymentSuccess) {
      onPaymentSuccess(txHash)
    }
  }

  const handleSwapError = (error: string) => {
    console.error('❌ Swap failed:', error)
    setPaymentStatus('error')
    setError(error)
  }

  const handlePayment = async () => {
    if (!isConnected || !address || !walletClient) {
      setError('Please connect your wallet first')
      return
    }

    setIsProcessing(true)
    setPaymentStatus('processing')
    setError('')

    try {
      console.log('🚀 Starting payment process...')
      
      // Initialize payment service with ethers provider
      const provider = new ethers.BrowserProvider(walletClient as any)
      const signer = await provider.getSigner()
      const paymentService = getPaymentService(provider)
      await paymentService.initialize(signer)

      const paymentParams: PaymentParams = {
        receiverAddress: transaction.to,
        amount: transaction.amount,
        groupId,
        splitId: `split-${Date.now()}`, // You can pass actual split ID if available
        groupName,
        receiverName: toMemberName
      }

      let result
      if (paymentMethod === 'swap') {
        console.log('💱 Executing swap payment...')
        result = await paymentService.executePayment(paymentParams)
      } else {
        console.log('📝 Recording direct payment...')
        result = await paymentService.recordManualPayment(paymentParams)
      }

      if (result.success && result.transactionId) {
        console.log('✅ Payment successful:', result.transactionId)
        setPaymentStatus('success')
        setTransactionId(result.transactionId)
        
        // Call success callback
        if (onPaymentSuccess) {
          onPaymentSuccess(result.transactionId)
        }
      } else {
        console.error('❌ Payment failed:', result.error)
        setPaymentStatus('error')
        setError(result.error || 'Payment failed')
      }
    } catch (err: any) {
      console.error('❌ Payment error:', err)
      setPaymentStatus('error')
      setError(err.message || 'An unexpected error occurred')
    } finally {
      setIsProcessing(false)
    }
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
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-br from-yellow-400 to-yellow-500 rounded-full flex items-center justify-center">
              <DollarSign className="h-4 w-4 text-black" />
            </div>
            <span>Process Payment</span>
          </DialogTitle>
          <DialogDescription>
            Pay your share using Uniswap V4 or direct transfer
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Transaction Details */}
          <div className="p-4 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-black rounded-lg border border-gray-200 dark:border-gray-800">
            <div className="space-y-3">
              {/* Group Info */}
              <div className="flex items-center justify-between">
                <Label className="text-xs text-muted-foreground">Group</Label>
                <Badge variant="secondary">{groupName}</Badge>
              </div>

              <Separator />

              {/* From */}
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center">
                  <User className="h-5 w-5 text-white" />
                </div>
                <div className="flex-1">
                  <Label className="text-xs text-muted-foreground">From (You)</Label>
                  <p className="font-semibold">{fromMemberName}</p>
                  <p className="text-xs text-muted-foreground font-mono">
                    {transaction.from.slice(0, 6)}...{transaction.from.slice(-4)}
                  </p>
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
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center">
                  <User className="h-5 w-5 text-white" />
                </div>
                <div className="flex-1">
                  <Label className="text-xs text-muted-foreground">To</Label>
                  <p className="font-semibold">{toMemberName}</p>
                  <p className="text-xs text-muted-foreground font-mono">
                    {transaction.to.slice(0, 6)}...{transaction.to.slice(-4)}
                  </p>
                </div>
              </div>

              <Separator />

              {/* Amount */}
              <div className="flex items-center justify-between">
                <Label className="text-sm text-muted-foreground">Amount to Pay</Label>
                <div className="text-right">
                  <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                    ${transaction.amount.toFixed(2)}
                  </p>
                  <p className="text-xs text-muted-foreground">USD</p>
                </div>
              </div>
            </div>
          </div>

          {/* Payment Method Tabs */}
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'swap' | 'direct')} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="swap" className="flex items-center space-x-2">
                <Zap className="h-4 w-4" />
                <span>Swap & Pay</span>
              </TabsTrigger>
              <TabsTrigger value="direct" className="flex items-center space-x-2">
                <Wallet className="h-4 w-4" />
                <span>Direct Transfer</span>
              </TabsTrigger>
            </TabsList>

            {/* Swap Tab */}
            <TabsContent value="swap" className="space-y-4">
              <div className="text-sm text-muted-foreground bg-blue-50 dark:bg-blue-950 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="flex items-start space-x-2">
                  <Zap className="h-4 w-4 text-blue-600 mt-0.5" />
                  <div>
                    <p className="font-semibold text-blue-900 dark:text-blue-100">Uniswap V4 Integration</p>
                    <p className="text-xs text-blue-700 dark:text-blue-300">
                      Swap any token to the required amount and pay directly through our custom hook.
                    </p>
                  </div>
                </div>
              </div>

              {/* Uniswap V4 Widget */}
              <UniswapV4Widget
                targetAmount={transaction.amount}
                recipient={transaction.to}
                onSwapComplete={handleSwapComplete}
                onError={handleSwapError}
              />
            </TabsContent>

            {/* Direct Transfer Tab */}
            <TabsContent value="direct" className="space-y-4">
              <div className="text-sm text-muted-foreground bg-yellow-50 dark:bg-yellow-950 p-3 rounded-lg border border-yellow-200 dark:border-yellow-800">
                <div className="flex items-start space-x-2">
                  <Wallet className="h-4 w-4 text-yellow-600 mt-0.5" />
                  <div>
                    <p className="font-semibold text-yellow-900 dark:text-yellow-100">Direct Payment</p>
                    <p className="text-xs text-yellow-700 dark:text-yellow-300">
                      Record a payment made outside the platform or transfer directly.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4 p-4 border rounded-lg">
                <div className="space-y-2">
                  <Label>Payment Method</Label>
                  <p className="text-sm text-muted-foreground">
                    This will record the payment on-chain through our smart contract.
                  </p>
                </div>

                <Button
                  onClick={handlePayment}
                  disabled={!isConnected || isProcessing}
                  className="w-full bg-gradient-to-r from-yellow-400 to-yellow-500 hover:from-yellow-500 hover:to-yellow-600 text-black font-semibold h-12"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Wallet className="h-4 w-4 mr-2" />
                      Record Payment ${transaction.amount.toFixed(2)}
                    </>
                  )}
                </Button>
              </div>
            </TabsContent>
          </Tabs>

          {/* Status Messages */}
          {paymentStatus === 'processing' && (
            <Alert className="border-blue-500 bg-blue-50 dark:bg-blue-950">
              <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
              <AlertDescription className="text-blue-900 dark:text-blue-100">
                Processing payment... Please confirm the transaction in your wallet.
              </AlertDescription>
            </Alert>
          )}

          {paymentStatus === 'success' && (
            <Alert className="border-green-500 bg-green-50 dark:bg-green-950">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-900 dark:text-green-100">
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
                className="bg-green-600 hover:bg-green-700"
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
