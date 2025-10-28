import { ethers } from 'ethers'
import { useAccount, usePublicClient, useWalletClient } from 'wagmi'

// Hook Contract ABI (only the functions we need)
const SPLIT_PAYMENT_HOOK_ABI = [
  {
    "inputs": [
      { "internalType": "address", "name": "from", "type": "address" },
      { "internalType": "address", "name": "to", "type": "address" },
      { "internalType": "uint256", "name": "amount", "type": "uint256" },
      { "internalType": "string", "name": "groupId", "type": "string" },
      { "internalType": "string", "name": "splitId", "type": "string" }
    ],
    "name": "recordManualPayment",
    "outputs": [{ "internalType": "bytes32", "name": "", "type": "bytes32" }],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "bytes32", "name": "txId", "type": "bytes32" }],
    "name": "getPaymentInfo",
    "outputs": [
      {
        "components": [
          { "internalType": "address", "name": "payer", "type": "address" },
          { "internalType": "address", "name": "receiver", "type": "address" },
          { "internalType": "uint256", "name": "amount", "type": "uint256" },
          { "internalType": "string", "name": "groupId", "type": "string" },
          { "internalType": "string", "name": "splitId", "type": "string" },
          { "internalType": "uint256", "name": "timestamp", "type": "uint256" },
          { "internalType": "bool", "name": "processed", "type": "bool" }
        ],
        "internalType": "struct SplitPaymentHook.PaymentInfo",
        "name": "",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "address", "name": "from", "type": "address" },
      { "indexed": true, "internalType": "address", "name": "to", "type": "address" },
      { "indexed": false, "internalType": "uint256", "name": "amount", "type": "uint256" },
      { "indexed": false, "internalType": "string", "name": "groupId", "type": "string" },
      { "indexed": false, "internalType": "string", "name": "splitId", "type": "string" },
      { "indexed": true, "internalType": "bytes32", "name": "transactionId", "type": "bytes32" },
      { "indexed": false, "internalType": "uint256", "name": "timestamp", "type": "uint256" }
    ],
    "name": "PaymentProcessed",
    "type": "event"
  }
] as const

// Uniswap V4 Pool Manager ABI (simplified for swap operations)
const POOL_MANAGER_ABI = [
  {
    "inputs": [
      {
        "components": [
          { "internalType": "address", "name": "currency0", "type": "address" },
          { "internalType": "address", "name": "currency1", "type": "address" },
          { "internalType": "uint24", "name": "fee", "type": "uint24" },
          { "internalType": "int24", "name": "tickSpacing", "type": "int24" },
          { "internalType": "contract IHooks", "name": "hooks", "type": "address" }
        ],
        "internalType": "struct PoolKey",
        "name": "key",
        "type": "tuple"
      },
      {
        "components": [
          { "internalType": "bool", "name": "zeroForOne", "type": "bool" },
          { "internalType": "int256", "name": "amountSpecified", "type": "int256" },
          { "internalType": "uint160", "name": "sqrtPriceLimitX96", "type": "uint160" }
        ],
        "internalType": "struct IPoolManager.SwapParams",
        "name": "params",
        "type": "tuple"
      },
      { "internalType": "bytes", "name": "hookData", "type": "bytes" }
    ],
    "name": "swap",
    "outputs": [
      {
        "components": [
          { "internalType": "int128", "name": "amount0", "type": "int128" },
          { "internalType": "int128", "name": "amount1", "type": "int128" }
        ],
        "internalType": "struct BalanceDelta",
        "name": "delta",
        "type": "tuple"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  }
] as const

// Ethereum Mainnet Contract Addresses
const UNISWAP_V3_ROUTER = '0xE592427A0AEce92De3Edee1F18E0157C05861564' // Uniswap V3 SwapRouter on Ethereum
const HOOK_CONTRACT_ADDRESS = import.meta.env.VITE_HOOK_CONTRACT_ADDRESS || '0x0000000000000000000000000000000000000000'
const POOL_MANAGER_ADDRESS = import.meta.env.VITE_POOL_MANAGER_ADDRESS || '0x0000000000000000000000000000000000000000'

// Ethereum Mainnet Token Addresses (OFFICIAL VERIFIED ADDRESSES)  
const WETH_ADDRESS = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2' // Wrapped Ether
const USDC_ADDRESS = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' // USDC
const USDT_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7' // Tether USD
const DAI_ADDRESS = '0x6B175474E89094C44Da98b954EedeAC495271d0F'   // Dai Stablecoin

export interface PaymentParams {
  receiverAddress: string
  amount: number // Amount in USD or token units
  groupId: string
  splitId: string
  groupName: string
  receiverName: string
}

export interface PaymentResult {
  success: boolean
  transactionId?: string
  error?: string
}

export class UniswapV4PaymentService {
  private provider: ethers.BrowserProvider | null = null
  private signer: ethers.Signer | null = null

  constructor(provider?: ethers.BrowserProvider) {
    if (provider) {
      this.provider = provider
    }
  }

  async initialize(signer: ethers.Signer) {
    this.signer = signer
    this.provider = signer.provider as ethers.BrowserProvider
  }

  /**
   * Execute payment through token swap and direct transfer
   */
  async executePayment(params: PaymentParams): Promise<PaymentResult> {
    if (!this.signer) {
      return { success: false, error: 'Wallet not connected' }
    }

    try {
      console.log('💳 Initiating swap payment:', params)

      // Get token addresses based on symbols from the widget
      const fromTokenAddress = this.getTokenAddress('ETH') // Default from token
      const toTokenAddress = this.getTokenAddress('USDC')  // Default to token

      // For now, let's implement a simple direct transfer mechanism
      // This can be enhanced later with actual DEX integration
      
      let txHash: string

      if (fromTokenAddress === 'ETH') {
        // ETH transfer
        console.log('� ETH transfer to recipient')
        const tx = await this.signer.sendTransaction({
          to: params.receiverAddress,
          value: ethers.parseEther(params.amount.toString())
        })
        const receipt = await tx.wait()
        txHash = receipt?.hash || ''
      } else {
        // ERC20 transfer
        console.log('💸 ERC20 transfer to recipient')
        const tokenContract = new ethers.Contract(
          fromTokenAddress,
          [
            'function transfer(address to, uint256 amount) returns (bool)',
            'function decimals() view returns (uint8)'
          ],
          this.signer
        )

        const decimals = await tokenContract.decimals()
        const amount = ethers.parseUnits(params.amount.toString(), decimals)
        
        const tx = await tokenContract.transfer(params.receiverAddress, amount)
        const receipt = await tx.wait()
        txHash = receipt?.hash || ''
      }

      console.log('✅ Payment completed:', txHash)

      return {
        success: true,
        transactionId: txHash
      }
    } catch (error: any) {
      console.error('❌ Payment execution failed:', error)
      return {
        success: false,
        error: error.message || 'Payment failed'
      }
    }
  }

  /**
   * Get token address by symbol
   */
  private getTokenAddress(symbol: string): string {
    const tokenMap: Record<string, string> = {
      'ETH': 'ETH', // Special case for ETH
      'WETH': WETH_ADDRESS,
      'USDC': USDC_ADDRESS,
      'USDT': USDT_ADDRESS,
      'DAI': DAI_ADDRESS
    }
    return tokenMap[symbol] || USDC_ADDRESS
  }

  /**
   * Record manual payment (without swap) directly through the hook
   */
  async recordManualPayment(params: PaymentParams): Promise<PaymentResult> {
    if (!this.signer) {
      return { success: false, error: 'Wallet not connected' }
    }

    try {
      console.log('📝 Recording manual payment:', params)

      const hookContract = new ethers.Contract(
        HOOK_CONTRACT_ADDRESS,
        SPLIT_PAYMENT_HOOK_ABI,
        this.signer
      )

      // Convert amount to proper units
      const amountInWei = ethers.parseUnits(params.amount.toString(), 6)

      const tx = await hookContract.recordManualPayment(
        await this.signer.getAddress(),
        params.receiverAddress,
        amountInWei,
        params.groupId,
        params.splitId
      )

      console.log('⏳ Waiting for transaction confirmation...')
      const receipt = await tx.wait()

      console.log('✅ Manual payment recorded:', receipt.hash)

      return {
        success: true,
        transactionId: receipt.hash
      }
    } catch (error: any) {
      console.error('❌ Manual payment recording failed:', error)
      return {
        success: false,
        error: error.message || 'Payment recording failed'
      }
    }
  }

  /**
   * Get payment information by transaction ID
   */
  async getPaymentInfo(txId: string): Promise<any> {
    if (!this.provider) {
      throw new Error('Provider not initialized')
    }

    try {
      const hookContract = new ethers.Contract(
        HOOK_CONTRACT_ADDRESS,
        SPLIT_PAYMENT_HOOK_ABI,
        this.provider
      )

      const paymentInfo = await hookContract.getPaymentInfo(txId)
      return paymentInfo
    } catch (error) {
      console.error('❌ Failed to get payment info:', error)
      throw error
    }
  }

  /**
   * Listen for payment events from the hook contract
   */
  async listenForPaymentEvents(
    callback: (event: any) => void,
    groupId?: string
  ): Promise<() => void> {
    if (!this.provider) {
      throw new Error('Provider not initialized')
    }

    const hookContract = new ethers.Contract(
      HOOK_CONTRACT_ADDRESS,
      SPLIT_PAYMENT_HOOK_ABI,
      this.provider
    )

    const filter = hookContract.filters.PaymentProcessed()
    
    const listener = (from: string, to: string, amount: bigint, gId: string, splitId: string, txId: string, timestamp: bigint) => {
      // Filter by group if specified
      if (groupId && gId !== groupId) {
        return
      }

      const event = {
        from,
        to,
        amount: ethers.formatUnits(amount, 6),
        groupId: gId,
        splitId,
        transactionId: txId,
        timestamp: Number(timestamp)
      }

      console.log('🔔 Payment event received:', event)
      callback(event)
    }

    hookContract.on(filter, listener)

    // Return cleanup function
    return () => {
      hookContract.off(filter, listener)
    }
  }
}

// Singleton instance
let paymentService: UniswapV4PaymentService | null = null

export const getPaymentService = (provider?: ethers.BrowserProvider): UniswapV4PaymentService => {
  if (!paymentService) {
    paymentService = new UniswapV4PaymentService(provider)
  }
  return paymentService
}

export default UniswapV4PaymentService
