import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import {
  ArrowDownUp,
  TrendingDown,
  TrendingUp,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Zap,
  Wallet
} from 'lucide-react'
import { useAccount, useWalletClient } from 'wagmi'
import { ethers } from 'ethers'
import { getSwapService } from '@/services/swapService'

interface TokenInfo {
  symbol: string
  name: string
  address: string
  decimals: number
  logoUri?: string
}

// Ethereum Mainnet tokens
const TOKENS: TokenInfo[] = [
  {
    symbol: 'ETH',
    name: 'Ethereum',
    address: '0x0000000000000000000000000000000000000000',
    decimals: 18,
    logoUri: 'https://cryptologos.cc/logos/ethereum-eth-logo.png'
  },
  {
    symbol: 'USDC',
    name: 'USD Coin',
  address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', // USDC (Ethereum mainnet)
    decimals: 6,
    logoUri: 'https://cryptologos.cc/logos/usd-coin-usdc-logo.png'
  },
  {
    symbol: 'USDT',
    name: 'Tether USD',
    address: '0xdAC17F958D2ee523a2206206994597C13D831ec7', // Ethereum USDT
    decimals: 6,
    logoUri: 'https://cryptologos.cc/logos/tether-usdt-logo.png'
  },
  {
    symbol: 'DAI',
    name: 'Dai Stablecoin',
    address: '0x6B175474E89094C44Da98b954EedeAC495271d0F', // Ethereum DAI
    decimals: 18,
    logoUri: 'https://cryptologos.cc/logos/multi-collateral-dai-dai-logo.png'
  }
]

interface UniswapV4WidgetProps {
  targetAmount: number // Amount in USD that needs to be paid
  recipient?: string // Address to send payment to
  groupId?: string // Group ID for payment tracking
  splitId?: string // Split ID for payment tracking
  groupName?: string // Group name for payment context
  receiverName?: string // Receiver name for payment context
  onSwapComplete?: (txHash: string, amountOut: number) => void
  onError?: (error: string) => void
}

export const UniswapV4Widget: React.FC<UniswapV4WidgetProps> = ({
  targetAmount,
  recipient,
  groupId,
  splitId,
  groupName,
  receiverName,
  onSwapComplete,
  onError
}) => {
  const { address, isConnected } = useAccount()
  const { data: walletClient } = useWalletClient()

  const [fromToken, setFromToken] = useState<TokenInfo>(TOKENS[0])
  const [toToken, setToToken] = useState<TokenInfo>(TOKENS[1])
  const [fromAmount, setFromAmount] = useState<string>('')
  const [toAmount, setToAmount] = useState<string>(targetAmount.toString())
  const [isSwapping, setIsSwapping] = useState(false)
  const [exchangeRate, setExchangeRate] = useState<number>(1)
  const [slippage, setSlippage] = useState<number>(0.5)
  const [priceImpact, setPriceImpact] = useState<number>(0)
  const [isLoadingQuote, setIsLoadingQuote] = useState(false)
  const [userBalance, setUserBalance] = useState<string>('0')
  const [isLoadingBalance, setIsLoadingBalance] = useState(false)

  // Fetch user balance
  const fetchBalance = async () => {
    if (!address || !walletClient) return

    setIsLoadingBalance(true)
    try {
      const provider = new ethers.BrowserProvider(walletClient as any)
      
      if (fromToken.symbol === 'ETH') {
        const balance = await provider.getBalance(address)
        setUserBalance(ethers.formatEther(balance))
      } else {
        const tokenContract = new ethers.Contract(
          fromToken.address,
          ['function balanceOf(address) view returns (uint256)'],
          provider
        )
        const balance = await tokenContract.balanceOf(address)
        setUserBalance(ethers.formatUnits(balance, fromToken.decimals))
      }
    } catch (error) {
      console.error('Failed to fetch balance:', error)
      setUserBalance('0')
    } finally {
      setIsLoadingBalance(false)
    }
  }

  // Fetch balance when token or address changes
  useEffect(() => {
    fetchBalance()
  }, [fromToken, address, walletClient])

  // Auto-calculate from amount based on target
  useEffect(() => {
    if (targetAmount && exchangeRate) {
      const calculatedFromAmount = (targetAmount / exchangeRate).toFixed(6)
      setFromAmount(calculatedFromAmount)
    }
  }, [targetAmount, exchangeRate])

  // Fetch quote from Uniswap V4 / 1inch API
  const fetchQuote = async () => {
    if (!fromAmount || parseFloat(fromAmount) <= 0) return

    setIsLoadingQuote(true)
    try {
      // TODO: Integrate with real DEX aggregator API (1inch, 0x, etc.)
      // For now using estimated rates based on market prices
      const rates: Record<string, number> = {
        'ETH-USDC': 3000,   // 1 ETH ≈ 3000 USDC
        'ETH-USDT': 3000,   // 1 ETH ≈ 3000 USDT
        'ETH-DAI': 3000,    // 1 ETH ≈ 3000 DAI
        'USDC-USDT': 1,     // 1:1 stablecoin
        'USDC-DAI': 1,      // 1:1 stablecoin
        'USDT-DAI': 1,      // 1:1 stablecoin
        'USDT-USDC': 1,     // 1:1 stablecoin
        'DAI-USDC': 1,      // 1:1 stablecoin
        'DAI-USDT': 1,      // 1:1 stablecoin
      }
      
      // Get rate for this pair
      const pairKey = `${fromToken.symbol}-${toToken.symbol}`
      const reversePairKey = `${toToken.symbol}-${fromToken.symbol}`
      
      let rate = rates[pairKey]
      if (!rate && rates[reversePairKey]) {
        rate = 1 / rates[reversePairKey]
      }
      if (!rate) {
        rate = fromToken.symbol === 'ETH' ? 3000 : 1
      }
      
      setExchangeRate(rate)
      
      const calculatedToAmount = parseFloat(fromAmount) * rate
      setToAmount(calculatedToAmount.toFixed(6))
      
      // Calculate realistic price impact based on liquidity
      const tradeSize = parseFloat(fromAmount) * (fromToken.symbol === 'ETH' ? 3000 : 1)
      let impact = 0
      if (tradeSize > 100000) impact = 5
      else if (tradeSize > 50000) impact = 3
      else if (tradeSize > 10000) impact = 1
      else if (tradeSize > 1000) impact = 0.5
      else impact = 0.1
      
      setPriceImpact(impact)
    } catch (error) {
      console.error('Failed to fetch quote:', error)
      onError?.('Failed to fetch quote')
    } finally {
      setIsLoadingQuote(false)
    }
  }

  useEffect(() => {
    const debounce = setTimeout(() => {
      if (fromAmount) {
        fetchQuote()
      }
    }, 500)

    return () => clearTimeout(debounce)
  }, [fromAmount, fromToken, toToken])

  const handleSwapTokens = () => {
    const temp = fromToken
    setFromToken(toToken)
    setToToken(temp)
    setFromAmount(toAmount)
    setToAmount(fromAmount)
  }

  const handleSwap = async () => {
    if (!isConnected || !walletClient || !address) {
      onError?.('Please connect your wallet')
      return
    }

    if (!recipient) {
      onError?.('Recipient address is required')
      return
    }

    // Check if user has enough balance
    const userBalanceNum = parseFloat(userBalance)
    const fromAmountNum = parseFloat(fromAmount)
    
    if (fromAmountNum > userBalanceNum) {
      onError?.(`Insufficient balance. You have ${userBalanceNum.toFixed(6)} ${fromToken.symbol}`)
      return
    }

    setIsSwapping(true)
    try {
      console.log('🔄 Executing Uniswap V4 payment...')
      console.log('From:', fromToken.symbol, 'Amount:', fromAmount)
      console.log('To:', toToken.symbol, 'Target Amount:', toAmount)
      console.log('Recipient:', recipient)
      console.log('Network: Ethereum Mainnet')
      
      const provider = new ethers.BrowserProvider(walletClient as any)
      const signer = await provider.getSigner()

      // Initialize swap service
      const swapService = getSwapService()
      await swapService.initialize(signer)

      console.log('� Executing swap with real DEX integration...')
      console.log('From:', fromAmount, fromToken.symbol)
      console.log('To:', toAmount, toToken.symbol)
      console.log('Recipient:', recipient)

      // Execute the swap
      const swapResult = await swapService.executeSwap({
        fromToken,
        toToken,
        fromAmount,
        recipient,
        slippage // Use the slippage from the widget state
      })

      if (!swapResult.success) {
        throw new Error(swapResult.error || 'Swap failed')
      }

      const txHash = swapResult.transactionHash || ''

      console.log('✅ Swap completed successfully:', txHash)
      console.log('View on Etherscan: https://etherscan.io/tx/' + txHash)
      
      // Refresh balance
      await fetchBalance()
      
      // Call success callback with the actual output amount
      onSwapComplete?.(txHash, parseFloat(swapResult.amountOut || toAmount))
    } catch (error: any) {
      console.error('❌ Payment failed:', error)
      
      // Better error messages
      let errorMessage = 'Payment failed'
      
      if (error.message.includes('insufficient funds')) {
        errorMessage = 'Insufficient ETH for gas fees. Please add more ETH to your wallet.'
      } else if (error.message.includes('user rejected')) {
        errorMessage = 'Transaction rejected by user'
      } else if (error.message.includes('missing revert data')) {
        errorMessage = `Transaction failed. Make sure you're on Ethereum mainnet and have the required tokens!`
      } else if (error.message.includes('CALL_EXCEPTION')) {
        errorMessage = `Smart contract call failed. Ensure you're connected to Ethereum mainnet.`
      } else if (error.message.includes('Wallet not connected')) {
        errorMessage = 'Please connect your wallet and try again'
      } else if (error.message.includes('Hook contract')) {
        errorMessage = 'Payment contract not available. Please try again later.'
      } else {
        errorMessage = error.message || 'Payment failed'
      }
      
      onError?.(errorMessage)
    } finally {
      setIsSwapping(false)
    }
  }

  const isInsufficientLiquidity = parseFloat(fromAmount) > 100000
  const isPriceImpactHigh = priceImpact > 3

  return (
    <Card className="w-full border-2 border-yellow-400/30 shadow-lg">
      <CardHeader className="bg-gradient-to-r from-yellow-400/10 to-yellow-500/10 border-b border-yellow-400/30">
        <CardTitle className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-gradient-to-br from-yellow-400 to-yellow-500 rounded-full flex items-center justify-center">
            <Zap className="h-4 w-4 text-black" />
          </div>
          <span>Uniswap V4 Swap</span>
          <Badge variant="secondary" className="ml-auto">
            <Sparkles className="h-3 w-3 mr-1" />
            V4
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 space-y-4">
        {/* Ethereum Network Info */}
        <Alert className="bg-blue-500/10 border-blue-500/20">
          <Zap className="h-4 w-4 text-blue-400" />
          <AlertDescription className="text-sm">
            <p className="font-semibold">🔷 Ethereum Mainnet</p>
            <p className="text-xs mt-1 text-muted-foreground">
              Secure & decentralized • Industry standard
            </p>
          </AlertDescription>
        </Alert>

        {/* From Token */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-sm text-muted-foreground">From</Label>
            {address && (
              <span className="text-xs text-muted-foreground">
                {isLoadingBalance ? (
                  <Loader2 className="h-3 w-3 animate-spin inline" />
                ) : (
                  `Balance: ${parseFloat(userBalance).toFixed(6)} ${fromToken.symbol}`
                )}
              </span>
            )}
          </div>
          <div className="flex space-x-2">
            <Select
              value={fromToken.symbol}
              onValueChange={(value) => {
                const token = TOKENS.find(t => t.symbol === value)
                if (token) setFromToken(token)
              }}
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TOKENS.map((token) => (
                  <SelectItem key={token.symbol} value={token.symbol}>
                    <div className="flex items-center space-x-2">
                      {token.logoUri && (
                        <img src={token.logoUri} alt={token.symbol} className="w-5 h-5 rounded-full" />
                      )}
                      <span>{token.symbol}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              type="number"
              placeholder="0.0"
              value={fromAmount}
              onChange={(e) => setFromAmount(e.target.value)}
              className="flex-1 text-lg font-semibold"
            />
          </div>
        </div>

        {/* Swap Button */}
        <div className="flex justify-center -my-2">
          <Button
            variant="outline"
            size="icon"
            onClick={handleSwapTokens}
            className="rounded-full border-yellow-400 hover:bg-yellow-400/10"
          >
            <ArrowDownUp className="h-4 w-4" />
          </Button>
        </div>

        {/* To Token */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-sm text-muted-foreground">To</Label>
            {targetAmount && (
              <span className="text-xs text-green-600 dark:text-green-400 font-semibold">
                Target: ${targetAmount.toFixed(2)}
              </span>
            )}
          </div>
          <div className="flex space-x-2">
            <Select
              value={toToken.symbol}
              onValueChange={(value) => {
                const token = TOKENS.find(t => t.symbol === value)
                if (token) setToToken(token)
              }}
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TOKENS.map((token) => (
                  <SelectItem key={token.symbol} value={token.symbol}>
                    <div className="flex items-center space-x-2">
                      {token.logoUri && (
                        <img src={token.logoUri} alt={token.symbol} className="w-5 h-5 rounded-full" />
                      )}
                      <span>{token.symbol}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              type="number"
              placeholder="0.0"
              value={toAmount}
              readOnly
              className="flex-1 text-lg font-semibold bg-muted"
            />
          </div>
        </div>

        <Separator />

        {/* Swap Details */}
        <div className="space-y-2 text-sm">
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Exchange Rate</span>
            <span className="font-semibold">
              1 {fromToken.symbol} = {exchangeRate.toFixed(4)} {toToken.symbol}
            </span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Price Impact</span>
            <span className={`font-semibold ${isPriceImpactHigh ? 'text-orange-600' : 'text-green-600'}`}>
              {isLoadingQuote ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  {priceImpact < 0.01 ? '<0.01' : priceImpact.toFixed(2)}%
                  {isPriceImpactHigh && <TrendingUp className="inline h-3 w-3 ml-1" />}
                </>
              )}
            </span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Slippage Tolerance</span>
            <Select
              value={slippage.toString()}
              onValueChange={(value) => setSlippage(parseFloat(value))}
            >
              <SelectTrigger className="w-20 h-7 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0.1">0.1%</SelectItem>
                <SelectItem value="0.5">0.5%</SelectItem>
                <SelectItem value="1">1%</SelectItem>
                <SelectItem value="3">3%</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Minimum Received</span>
            <span className="font-semibold">
              {(parseFloat(toAmount) * (1 - slippage / 100)).toFixed(6)} {toToken.symbol}
            </span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Network Fee</span>
            <span className="font-semibold text-yellow-600">~$15-50</span>
          </div>
        </div>

        {/* Warnings */}
        {isPriceImpactHigh && (
          <Alert className="border-orange-500 bg-orange-50 dark:bg-orange-950">
            <AlertCircle className="h-4 w-4 text-orange-600" />
            <AlertDescription className="text-orange-900 dark:text-orange-100 text-xs">
              High price impact! This swap may not be optimal.
            </AlertDescription>
          </Alert>
        )}

        {isInsufficientLiquidity && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-xs">
              Insufficient liquidity for this trade amount.
            </AlertDescription>
          </Alert>
        )}

        {/* Swap Button */}
        <Button
          onClick={handleSwap}
          disabled={
            !isConnected ||
            !fromAmount ||
            parseFloat(fromAmount) <= 0 ||
            isSwapping ||
            isInsufficientLiquidity ||
            isLoadingQuote
          }
          className="w-full bg-gradient-to-r from-yellow-400 to-yellow-500 hover:from-yellow-500 hover:to-yellow-600 text-black font-bold text-lg h-12"
        >
          {!isConnected ? (
            'Connect Wallet'
          ) : isSwapping ? (
            <>
              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
              Processing...
            </>
          ) : isLoadingQuote ? (
            <>
              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
              Loading Quote...
            </>
          ) : fromToken.symbol === toToken.symbol ? (
            <>
              <Wallet className="h-5 w-5 mr-2" />
              Send {toToken.symbol}
            </>
          ) : (
            <>
              <ArrowDownUp className="h-5 w-5 mr-2" />
              Swap & Pay
            </>
          )}
        </Button>

        {/* Info */}
        <div className="text-center">
          <p className="text-xs text-muted-foreground">
            {fromToken.symbol === toToken.symbol 
              ? `Direct ${toToken.symbol} transfer • Secured by smart contract`
              : `🔄 Real token swap via Uniswap V3 • Recipient gets ${toToken.symbol}`
            }
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

export default UniswapV4Widget
