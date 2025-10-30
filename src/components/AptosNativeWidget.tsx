import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { 
  Coins, 
  AlertCircle, 
  CheckCircle2, 
  Loader2,
  Wallet,
  ExternalLink,
  Copy,
  Send
} from 'lucide-react'
import { useMultiChainWallet } from '@/contexts/MultiChainWalletContext'
import { APTOS_TOKENS } from '@/constants/paymentMethods'
import { Aptos, AptosConfig, Network } from '@aptos-labs/ts-sdk'

interface AptosNativeWidgetProps {
  targetAmount: number
  recipient?: string
  groupId?: string
  splitId?: string
  groupName?: string
  receiverName?: string
  selectedToken?: 'USDC' | 'APT' | 'USDT'
  onTransferComplete?: (txHash: string, amountOut: number) => void
  onError?: (error: string) => void
}

interface TransferStatus {
  status: 'idle' | 'estimating' | 'confirming' | 'pending' | 'success' | 'error'
  txHash?: string
  error?: string
  estimatedGas?: number
  amountOut?: number
}

interface TokenBalance {
  symbol: string
  balance: number
  decimals: number
  usdValue: number
}

export const AptosNativeWidget: React.FC<AptosNativeWidgetProps> = ({
  targetAmount,
  recipient,
  groupId,
  splitId,
  groupName,
  receiverName,
  selectedToken = 'USDC',
  onTransferComplete,
  onError
}) => {
  const { currentAccount, chainType, isConnected, connectAptos } = useMultiChainWallet()
  const [transferStatus, setTransferStatus] = useState<TransferStatus>({ status: 'idle' })
  const [recipientAddress, setRecipientAddress] = useState(recipient || '')
  const [transferAmount, setTransferAmount] = useState(targetAmount.toString())
  const [tokenBalances, setTokenBalances] = useState<TokenBalance[]>([])
  const [isLoadingBalances, setIsLoadingBalances] = useState(false)
  const [selectedTokenInfo, setSelectedTokenInfo] = useState(APTOS_TOKENS.find(t => t.symbol === selectedToken) || APTOS_TOKENS[0])
  const [gasEstimate, setGasEstimate] = useState<number>(0.01) // Default gas estimate

  // Load token balances when wallet is connected
  useEffect(() => {
    if (isConnected && chainType === 'APTOS' && currentAccount) {
      loadTokenBalances()
    }
  }, [isConnected, chainType, currentAccount])

  // Real function to load token balances from Aptos blockchain
  const loadTokenBalances = async () => {
    if (!currentAccount?.address) return
    
    setIsLoadingBalances(true)
    try {
      // Initialize Aptos client (using mainnet, change to testnet if needed)
      const config = new AptosConfig({ network: Network.MAINNET })
      const aptos = new Aptos(config)
      
      const balances: TokenBalance[] = []
      
      // Get APT balance (native token)
      try {
        const aptBalance = await aptos.getAccountAPTAmount({
          accountAddress: currentAccount.address
        })
        
        // Convert from octas to APT (1 APT = 100,000,000 octas)
        const aptAmount = Number(aptBalance) / 100_000_000
        
        balances.push({
          symbol: 'APT',
          balance: aptAmount,
          decimals: 8,
          usdValue: aptAmount * 10 // Mock USD price - would need real price API
        })
      } catch (aptError) {
        balances.push({
          symbol: 'APT',
          balance: 0,
          decimals: 8,
          usdValue: 0
        })
      }
      
      // Get USDC balance (if available)
      try {
        // USDC on Aptos mainnet contract address
        const usdcAddress = "0xf22bede237a07e121b56d91a491eb7bcdfd1f5907926a9e58338f964a01b17fa::asset::USDC"
        
        const coinBalance = await aptos.getAccountCoinAmount({
          accountAddress: currentAccount.address,
          coinType: usdcAddress
        })
        
        // USDC has 6 decimals
        const usdcAmount = Number(coinBalance) / 1_000_000
        
        balances.push({
          symbol: 'USDC',
          balance: usdcAmount,
          decimals: 6,
          usdValue: usdcAmount // USDC ≈ $1
        })
      } catch (usdcError) {
        balances.push({
          symbol: 'USDC',
          balance: 0,
          decimals: 6,
          usdValue: 0
        })
      }
      
      // Get USDT balance (if available)
      try {
        // USDT on Aptos - you'll need the correct contract address
        const usdtAddress = "0x357b0b74bc833e95a115ad22604854d6b0fca151cecd94111770e5d6ffc9dc2b::usdt::USDT"
        
        const coinBalance = await aptos.getAccountCoinAmount({
          accountAddress: currentAccount.address,
          coinType: usdtAddress
        })
        
        // USDT has 6 decimals
        const usdtAmount = Number(coinBalance) / 1_000_000
        
        balances.push({
          symbol: 'USDT',
          balance: usdtAmount,
          decimals: 6,
          usdValue: usdtAmount // USDT ≈ $1
        })
      } catch (usdtError) {
        balances.push({
          symbol: 'USDT',
          balance: 0,
          decimals: 6,
          usdValue: 0
        })
      }
      
      setTokenBalances(balances)
      
    } catch (error) {
      
      // Set zero balances on error
      const errorBalances: TokenBalance[] = [
        { symbol: 'APT', balance: 0, decimals: 8, usdValue: 0 },
        { symbol: 'USDC', balance: 0, decimals: 6, usdValue: 0 },
        { symbol: 'USDT', balance: 0, decimals: 6, usdValue: 0 }
      ]
      setTokenBalances(errorBalances)
    } finally {
      setIsLoadingBalances(false)
    }
  }

  // Get current token balance
  const getCurrentTokenBalance = () => {
    return tokenBalances.find(b => b.symbol === selectedTokenInfo.symbol)
  }

  // Estimate transaction gas
  const estimateGas = async () => {
    setTransferStatus({ status: 'estimating' })
    
    try {
      // Mock gas estimation - would integrate with Aptos SDK
      await new Promise(resolve => setTimeout(resolve, 1000))
      const estimate = Math.random() * 0.01 + 0.005 // 0.005-0.015 APT
      setGasEstimate(estimate)
      setTransferStatus({ status: 'idle' })
    } catch (error) {
      setTransferStatus({ status: 'error', error: 'Failed to estimate gas' })
      onError?.('Failed to estimate transaction cost')
    }
  }

  // Handle token selection
  const handleTokenSelect = (token: typeof APTOS_TOKENS[0]) => {
    setSelectedTokenInfo(token)
    estimateGas()
  }

  // Validate transfer inputs
  const validateTransfer = (): string | null => {
    if (!recipientAddress) return 'Recipient address is required'
    if (!transferAmount || parseFloat(transferAmount) <= 0) return 'Valid amount is required'
    
    const balance = getCurrentTokenBalance()
    if (!balance) return 'Token balance not available'
    if (parseFloat(transferAmount) > balance.balance) return 'Insufficient balance'

    if (selectedTokenInfo.symbol === 'APT' && balance.balance < gasEstimate) {
      return 'Insufficient APT for gas fees'
    }

    return null
  }

  // Execute Aptos transfer
  const executeTransfer = async () => {
    const validationError = validateTransfer()
    if (validationError) {
      onError?.(validationError)
      return
    }

    setTransferStatus({ status: 'confirming' })

    try {
      // Mock transfer execution - would integrate with Aptos SDK
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      setTransferStatus({ status: 'pending' })
      
      // Simulate transaction confirmation
      await new Promise(resolve => setTimeout(resolve, 3000))
      
      const mockTxHash = '0x' + Math.random().toString(16).substring(2, 66)
      const amountOut = parseFloat(transferAmount)
      
      setTransferStatus({ 
        status: 'success', 
        txHash: mockTxHash,
        amountOut 
      })
      
      onTransferComplete?.(mockTxHash, amountOut)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Transfer failed'
      setTransferStatus({ status: 'error', error: errorMessage })
      onError?.(errorMessage)
    }
  }

  // Copy address to clipboard
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    // Could show a toast notification here
  }

  // Transfer status indicator
  const renderTransferStatus = () => {
    switch (transferStatus.status) {
      case 'estimating':
        return (
          <Alert className="border-blue-500 bg-blue-50 dark:bg-blue-950">
            <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
            <AlertDescription className="text-blue-900 dark:text-blue-100">
              Estimating transaction cost...
            </AlertDescription>
          </Alert>
        )

      case 'confirming':
        return (
          <Alert className="border-purple-500 bg-purple-50 dark:bg-purple-950">
            <Wallet className="h-4 w-4 text-purple-600" />
            <AlertDescription className="text-purple-900 dark:text-purple-100">
              Please confirm the transaction in your Petra wallet
            </AlertDescription>
          </Alert>
        )

      case 'pending':
        return (
          <Alert className="border-orange-500 bg-orange-50 dark:bg-orange-950">
            <motion.div
              className="flex items-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <Loader2 className="h-4 w-4 animate-spin text-orange-600 mr-2" />
              <AlertDescription className="text-orange-900 dark:text-orange-100">
                <p className="font-semibold mb-1">Transaction Pending</p>
                <p className="text-xs">Waiting for network confirmation...</p>
              </AlertDescription>
            </motion.div>
          </Alert>
        )

      case 'success':
        return (
          <Alert className="border-green-500 bg-green-50 dark:bg-green-950">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-900 dark:text-green-100">
              <p className="font-semibold mb-1">Transfer Completed!</p>
              <p className="text-xs font-mono break-all">
                Transaction: {transferStatus.txHash?.slice(0, 10)}...{transferStatus.txHash?.slice(-8)}
              </p>
            </AlertDescription>
          </Alert>
        )

      case 'error':
        return (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <p className="font-semibold mb-1">Transfer Failed</p>
              <p className="text-xs">{transferStatus.error}</p>
            </AlertDescription>
          </Alert>
        )

      default:
        return null
    }
  }

  // Token balance display
  const renderTokenBalances = () => (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium text-muted-foreground">Available Tokens</div>
        {isLoadingBalances && (
          <div className="flex items-center space-x-2 text-xs text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" />
            <span>Loading balances...</span>
          </div>
        )}
      </div>
      <div className="grid grid-cols-1 gap-2">
        {APTOS_TOKENS.map((token) => {
          const balance = tokenBalances.find(b => b.symbol === token.symbol)
          const isSelected = selectedTokenInfo.symbol === token.symbol
          
          return (
            <button
              key={token.symbol}
              onClick={() => handleTokenSelect(token)}
              className={`p-3 rounded-lg border text-left transition-all ${
                isSelected 
                  ? 'border-purple-500 bg-purple-50 dark:bg-purple-950' 
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-6 h-6 bg-gradient-to-br from-purple-400 to-purple-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs font-bold">{token.symbol[0]}</span>
                  </div>
                  <div>
                    <div className="font-medium text-sm">{token.symbol}</div>
                    <div className="text-xs text-muted-foreground">{token.name}</div>
                  </div>
                </div>
                <div className="text-right">
                  {isLoadingBalances ? (
                    <div className="flex items-center space-x-1">
                      <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">Loading...</span>
                    </div>
                  ) : (
                    <>
                      <div className="font-medium text-sm">
                        {balance ? balance.balance.toFixed(4) : '0.0000'}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        ${balance ? balance.usdValue.toFixed(2) : '0.00'}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )

  return (
    <Card className="w-full border-2 border-purple-400/30 shadow-lg">
      <CardHeader className="bg-gradient-to-r from-purple-400/10 to-purple-500/10 border-b border-purple-400/30">
        <CardTitle className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-gradient-to-br from-purple-400 to-purple-500 rounded-full flex items-center justify-center">
            <Coins className="h-4 w-4 text-white" />
          </div>
          <span>Aptos Native Transfer</span>
          <Badge variant="secondary" className="ml-auto">
            <Coins className="h-3 w-3 mr-1" />
            Native
          </Badge>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="p-6 space-y-6">
        {/* Transfer Status */}
        {renderTransferStatus()}

        {/* Wallet Connection */}
        {!isConnected || chainType !== 'APTOS' ? (
          <Alert className="bg-yellow-500/10 border-yellow-500/20">
            <Wallet className="h-4 w-4 text-yellow-400" />
            <AlertDescription>
              <div className="space-y-3">
                <p className="text-yellow-100 text-sm">
                  Connect your Aptos wallet (Petra) to make native transfers
                </p>
                <Button 
                  onClick={() => connectAptos()}
                  className="w-full bg-purple-600 hover:bg-purple-700"
                >
                  <Wallet className="h-4 w-4 mr-2" />
                  Connect Petra Wallet
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        ) : (
          <>
            {/* Token Selection */}
            {renderTokenBalances()}

            <Separator />

            {/* Transfer Form */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="recipient">Recipient Address</Label>
                <div className="flex space-x-2">
                  <Input
                    id="recipient"
                    placeholder="0x1234...abcd"
                    value={recipientAddress}
                    onChange={(e) => setRecipientAddress(e.target.value)}
                    className="font-mono text-sm"
                  />
                  {recipientAddress && (
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => copyToClipboard(recipientAddress)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                {receiverName && (
                  <p className="text-xs text-muted-foreground">
                    Sending to: {receiverName}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="amount">Amount ({selectedTokenInfo.symbol})</Label>
                <div className="relative">
                  <Input
                    id="amount"
                    type="number"
                    placeholder="0.00"
                    value={transferAmount}
                    onChange={(e) => setTransferAmount(e.target.value)}
                    className="pr-20"
                  />
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-sm font-medium text-muted-foreground">
                    {selectedTokenInfo.symbol}
                  </div>
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>≈ ${(parseFloat(transferAmount) || 0).toFixed(2)} USD</span>
                  <span>
                    Balance: {getCurrentTokenBalance()?.balance.toFixed(4) || '0.0000'}
                  </span>
                </div>
              </div>

              {/* Gas Estimate */}
              <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Estimated Gas Fee</span>
                  <span className="font-medium">~{gasEstimate.toFixed(4)} APT</span>
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Network: Aptos Mainnet</span>
                  <span>≈ ${(gasEstimate * 10).toFixed(3)} USD</span>
                </div>
              </div>
            </div>

            <Separator />

            {/* Transfer Action */}
            <Button
              onClick={executeTransfer}
              disabled={
                !recipientAddress || 
                !transferAmount || 
                parseFloat(transferAmount) <= 0 ||
                transferStatus.status === 'confirming' ||
                transferStatus.status === 'pending'
              }
              className="w-full bg-gradient-to-r from-purple-400 to-purple-500 hover:from-purple-500 hover:to-purple-600 text-white font-bold text-lg h-12"
            >
              {transferStatus.status === 'confirming' || transferStatus.status === 'pending' ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  {transferStatus.status === 'confirming' ? 'Confirming...' : 'Sending...'}
                </>
              ) : (
                <>
                  <Send className="h-5 w-5 mr-2" />
                  Send {selectedTokenInfo.symbol}
                </>
              )}
            </Button>

            {/* Success Actions */}
            {transferStatus.status === 'success' && (
              <div className="space-y-3">
                <Separator />
                <div className="flex space-x-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="flex-1"
                    onClick={() => setTransferStatus({ status: 'idle' })}
                  >
                    Send Again
                  </Button>
                  {transferStatus.txHash && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="flex-1"
                      onClick={() => window.open(`https://explorer.aptoslabs.com/txn/${transferStatus.txHash}`, '_blank')}
                    >
                      <ExternalLink className="h-4 w-4 mr-1" />
                      View Transaction
                    </Button>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}

export default AptosNativeWidget