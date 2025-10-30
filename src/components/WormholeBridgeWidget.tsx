import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { 
  AlertCircle, 
  CheckCircle2, 
  Loader2,
  ArrowRightLeft,
  ExternalLink
} from 'lucide-react'
import { useMultiChainWallet } from '@/contexts/MultiChainWalletContext'
import { useWormholePortal } from '@/contexts/WormholePortalContext'

interface WormholeBridgeWidgetProps {
  targetAmount: number
  recipient?: string
  groupId?: string
  splitId?: string
  groupName?: string
  receiverName?: string
  sourceChain?: string
  destinationChain?: string
  onBridgeComplete?: (txHash: string, amountOut: number) => void
  onError?: (error: string) => void
}

interface BridgeStatus {
  status: 'idle' | 'connecting' | 'bridging' | 'success' | 'error'
  txHash?: string
  error?: string
  amountOut?: number
}

export const WormholeBridgeWidget: React.FC<WormholeBridgeWidgetProps> = ({
  targetAmount,
  recipient,
  groupId,
  splitId,
  groupName,
  receiverName,
  sourceChain = 'Aptos',
  destinationChain = 'Ethereum',
  onBridgeComplete,
  onError
}) => {
  const { currentAccount, chainType, isConnected } = useMultiChainWallet()
  const { openWormholePortal } = useWormholePortal()
  const [bridgeStatus, setBridgeStatus] = useState<BridgeStatus>({ status: 'idle' })

  // Handle bridge initiation
  const handleStartBridge = () => {
    if (!isConnected) {
      onError?.('Please connect your wallet first')
      return
    }

    if (!recipient) {
      onError?.('Recipient address is required')
      return
    }

    console.log('🌉 Opening Wormhole Bridge Portal:', {
      currentWallet: {
        type: chainType,
        address: currentAccount?.address,
        connected: isConnected
      },
      bridgeData: {
        targetAmount,
        recipient,
        sourceChain,
        destinationChain
      }
    })

    setBridgeStatus({ status: 'connecting' })
    
    // Remove focus from any active elements to prevent focus conflicts
    const activeElement = document.activeElement as HTMLElement
    if (activeElement && activeElement.blur) {
      activeElement.blur()
    }
    
    // Small delay to let the dialog lose focus before opening Wormhole
    setTimeout(() => {
      openWormholePortal({
        targetAmount,
        recipient,
        sourceChain,
        destinationChain,
        currentAccount
      })
    }, 100)
  }

  // Mock bridge completion handler (Wormhole Connect handles the actual bridging)
  const handleBridgeSuccess = (txHash: string) => {
    setBridgeStatus({ 
      status: 'success', 
      txHash, 
      amountOut: targetAmount 
    })
    onBridgeComplete?.(txHash, targetAmount)
  }

  // Handle bridge errors
  const handleBridgeError = (error: string) => {
    setBridgeStatus({ status: 'error', error })
    onError?.(error)
  }

  // Bridge status indicator
  const renderBridgeStatus = () => {
    switch (bridgeStatus.status) {
      case 'connecting':
        return (
          <Alert className="border-blue-500 bg-blue-50 dark:bg-blue-950">
            <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
            <AlertDescription className="text-blue-900 dark:text-blue-100">
              Connecting to Wormhole Bridge...
            </AlertDescription>
          </Alert>
        )

      case 'bridging':
        return (
          <Alert className="border-purple-500 bg-purple-50 dark:bg-purple-950">
            <motion.div
              className="flex items-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <ArrowRightLeft className="h-4 w-4 text-purple-600 mr-2" />
              <AlertDescription className="text-purple-900 dark:text-purple-100">
                <p className="font-semibold mb-1">Bridge Transfer in Progress</p>
                <p className="text-xs">
                  This may take a few minutes. Please don't close this window.
                </p>
              </AlertDescription>
            </motion.div>
          </Alert>
        )

      case 'success':
        return (
          <Alert className="border-green-500 bg-green-50 dark:bg-green-950">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-900 dark:text-green-100">
              <p className="font-semibold mb-1">Bridge Transfer Completed!</p>
              <p className="text-xs font-mono break-all">
                Transaction: {bridgeStatus.txHash?.slice(0, 10)}...{bridgeStatus.txHash?.slice(-8)}
              </p>
            </AlertDescription>
          </Alert>
        )

      case 'error':
        return (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <p className="font-semibold mb-1">Bridge Transfer Failed</p>
              <p className="text-xs">{bridgeStatus.error}</p>
            </AlertDescription>
          </Alert>
        )

      default:
        return null
    }
  }

  // Bridge info panel
  const renderBridgeInfo = () => (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Bridge Route</span>
        <div className="flex items-center space-x-2">
          <Badge variant="outline" className="text-xs">
            {sourceChain}
          </Badge>
          <ArrowRightLeft className="h-3 w-3 text-muted-foreground" />
          <Badge variant="outline" className="text-xs">
            {destinationChain}
          </Badge>
        </div>
      </div>

      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Amount</span>
        <span className="font-semibold">${targetAmount.toFixed(2)} USD</span>
      </div>

      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Recipient</span>
        <span className="font-mono text-xs">
          {recipient ? `${recipient.slice(0, 6)}...${recipient.slice(-4)}` : 'Not set'}
        </span>
      </div>

      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Estimated Time</span>
        <span className="font-medium">~15 minutes</span>
      </div>

      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Bridge Fee</span>
        <span className="font-medium">~$5-15</span>
      </div>
    </div>
  )

  return (
    <Card className="w-full border-2 border-purple-400/30 shadow-lg">
      <CardHeader className="bg-gradient-to-r from-purple-400/10 to-purple-500/10 border-b border-purple-400/30">
        <CardTitle className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-gradient-to-br from-purple-400 to-purple-500 rounded-full flex items-center justify-center">
            <ArrowRightLeft className="h-4 w-4 text-white" />
          </div>
          <span>Wormhole Cross-Chain Bridge</span>
          <Badge variant="secondary" className="ml-auto">
            <ArrowRightLeft className="h-3 w-3 mr-1" />
            Bridge
          </Badge>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="p-6 space-y-6">
        {/* Bridge Status */}
        {renderBridgeStatus()}

        {/* Bridge Information */}
        <div className="space-y-4">
          <div className="text-sm font-medium text-muted-foreground">
            Bridge Details
          </div>
          {renderBridgeInfo()}
        </div>

        <Separator />

        {/* Bridge Action */}
        <div className="space-y-4">
          <Alert className="bg-purple-500/10 border-purple-500/20">
            <ArrowRightLeft className="h-4 w-4 text-purple-400" />
                <AlertDescription className="text-sm">
                  <p className="font-semibold text-purple-100 mb-1">Cross-Chain Transfer</p>
                  <p className="text-purple-200 text-xs">
                    This will bridge your assets from {sourceChain} to {destinationChain} using Wormhole's secure cross-chain protocol.
                  </p>
                </AlertDescription>
              </Alert>

              <Button
                onClick={handleStartBridge}
                disabled={!isConnected || !recipient || bridgeStatus.status === 'connecting'}
                className="w-full bg-gradient-to-r from-purple-400 to-purple-500 hover:from-purple-500 hover:to-purple-600 text-white font-bold text-lg h-12"
              >
                {!isConnected ? (
                  'Connect Wallet'
                ) : !recipient ? (
                  'Recipient Required'
                ) : bridgeStatus.status === 'connecting' ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <ArrowRightLeft className="h-5 w-5 mr-2" />
                    Bridge ${targetAmount.toFixed(2)}
                  </>
                )}
              </Button>
            </div>

        {/* Bridge completion actions */}
        {bridgeStatus.status === 'success' && (
          <div className="space-y-3">
            <Separator />
            <div className="flex space-x-2">
              <Button 
                variant="outline" 
                size="sm"
                className="flex-1"
                onClick={() => setBridgeStatus({ status: 'idle' })}
              >
                Bridge Again
              </Button>
              {bridgeStatus.txHash && (
                <Button 
                  variant="outline" 
                  size="sm"
                  className="flex-1"
                  onClick={() => window.open(`https://wormholescan.io/#/tx/${bridgeStatus.txHash}`, '_blank')}
                >
                  <ExternalLink className="h-4 w-4 mr-1" />
                  View on Explorer
                </Button>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default WormholeBridgeWidget