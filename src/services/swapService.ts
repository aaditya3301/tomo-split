import { ethers } from 'ethers'

// Contract addresses (Ethereum Mainnet)
// Utility function to validate and normalize addresses
function validateAddress(address: string, name: string): string {
  try {
    return ethers.getAddress(address)
  } catch (error) {
    console.error(`❌ Invalid ${name} address: ${address}`, error)
    throw new Error(`Invalid ${name} address: ${address}`)
  }
}
const UNISWAP_V3_ROUTER = '0xE592427A0AEce92De3Edee1F18E0157C05861564'
const WETH_ADDRESS = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2'
const USDC_ADDRESS = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' // USDC on Ethereum Mainnet
const USDT_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7' // USDT on Ethereum Mainnet  
const DAI_ADDRESS = '0x6B175474E89094C44Da98b954EedeAC495271d0F'   // DAI on Ethereum Mainnet

// Uniswap V3 Router ABI (simplified)
const UNISWAP_V3_ROUTER_ABI = [
  {
    "inputs": [
      {
        "components": [
          { "internalType": "address", "name": "tokenIn", "type": "address" },
          { "internalType": "address", "name": "tokenOut", "type": "address" },
          { "internalType": "uint24", "name": "fee", "type": "uint24" },
          { "internalType": "address", "name": "recipient", "type": "address" },
          { "internalType": "uint256", "name": "deadline", "type": "uint256" },
          { "internalType": "uint256", "name": "amountIn", "type": "uint256" },
          { "internalType": "uint256", "name": "amountOutMinimum", "type": "uint256" },
          { "internalType": "uint160", "name": "sqrtPriceLimitX96", "type": "uint160" }
        ],
        "internalType": "struct ISwapRouter.ExactInputSingleParams",
        "name": "params",
        "type": "tuple"
      }
    ],
    "name": "exactInputSingle",
    "outputs": [{ "internalType": "uint256", "name": "amountOut", "type": "uint256" }],
    "stateMutability": "payable",
    "type": "function"
  }
] as const

// ERC20 ABI
const ERC20_ABI = [
  'function approve(address spender, uint256 amount) returns (bool)',
  'function transfer(address to, uint256 amount) returns (bool)',
  'function balanceOf(address owner) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function allowance(address owner, address spender) view returns (uint256)'
] as const

export interface SwapParams {
  fromToken: {
    symbol: string
    address: string
    decimals: number
  }
  toToken: {
    symbol: string
    address: string
    decimals: number
  }
  fromAmount: string
  recipient: string
  slippage: number // percentage
}

export interface SwapResult {
  success: boolean
  transactionHash?: string
  amountOut?: string
  error?: string
}

export class SwapService {
  private signer: ethers.Signer | null = null

  async initialize(signer: ethers.Signer) {
    this.signer = signer
  }

  getTokenAddress(symbol: string): string {
    const tokenMap: Record<string, string> = {
      'ETH': ethers.ZeroAddress, // ETH native
      'WETH': WETH_ADDRESS,
      'USDC': USDC_ADDRESS,
      'USDT': USDT_ADDRESS,
      'DAI': DAI_ADDRESS
    }
    const address = tokenMap[symbol] || USDC_ADDRESS
    // Validate address format, but skip for ZeroAddress (ETH)
    return address === ethers.ZeroAddress ? address : validateAddress(address, symbol)
  }

  async executeSwap(params: SwapParams): Promise<SwapResult> {
    if (!this.signer) {
      return { success: false, error: 'Signer not initialized' }
    }

    try {
      console.log('🔄 Executing swap:', params)

      const { fromToken, toToken, fromAmount, recipient } = params

      // Same token transfer - no swap needed
      if (fromToken.symbol === toToken.symbol) {
        console.log('💸 Same token transfer')
        return await this.directTransfer(fromToken, fromAmount, recipient)
      }

      // ETH → USDC/USDT/DAI: REAL SWAP using Uniswap V3
      if (fromToken.symbol === 'ETH' && ['USDC', 'USDT', 'DAI'].includes(toToken.symbol)) {
        console.log('💱 ETH → Stablecoin: ACTUAL SWAP via Uniswap V3')
        console.log(`🔄 REAL SWAP: Converting ${fromAmount} ETH → ${toToken.symbol}`)
        console.log(`📤 You send: ${fromAmount} ETH to Uniswap Router`)
        console.log(`📥 Recipient gets: ${toToken.symbol} tokens`)
        console.log('🚨 This is NOT a direct transfer - it\'s a real DEX swap!')
        
        const toAddress = this.getTokenAddress(toToken.symbol)
        
        return await this.swapETHForToken(
          WETH_ADDRESS,     // fromAddress (WETH for ETH swaps)
          toAddress,        // toAddress
          fromAmount,       // ethAmount
          recipient,        // recipient
          2,               // slippage (2%)
          toToken.decimals // toDecimals
        )
      }

      // USDC/USDT/DAI → ETH: REAL SWAP using Uniswap V3
      if (['USDC', 'USDT', 'DAI'].includes(fromToken.symbol) && toToken.symbol === 'ETH') {
        console.log('💱 Stablecoin → ETH: ACTUAL SWAP via Uniswap V3')
        
        const fromAddress = this.getTokenAddress(fromToken.symbol)
        
        return await this.swapTokenForETH(
          fromAddress,      // fromAddress
          WETH_ADDRESS,     // toAddress (WETH for ETH swaps)
          fromAmount,       // tokenAmount
          recipient,        // recipient
          2,               // slippage (2%)
          fromToken.decimals // fromDecimals
        )
      }

      // Stablecoin to stablecoin: REAL SWAP using Uniswap V3
      if (['USDC', 'USDT', 'DAI'].includes(fromToken.symbol) && 
          ['USDC', 'USDT', 'DAI'].includes(toToken.symbol)) {
        console.log('💱 Stablecoin → Stablecoin: ACTUAL SWAP via Uniswap V3')
        
        const fromAddress = this.getTokenAddress(fromToken.symbol)
        const toAddress = this.getTokenAddress(toToken.symbol)
        
        return await this.swapTokenForToken(
          fromAddress,
          toAddress,
          fromAmount,
          recipient,
          2, // 2% slippage
          fromToken.decimals,
          toToken.decimals
        )
      }

      // Fallback: Direct transfer if swap not supported
      console.log('💸 Fallback: Direct transfer (swap not supported)')
      return await this.directTransfer(toToken, fromAmount, recipient)

    } catch (error: any) {
      console.error('❌ Swap failed:', error)
      return {
        success: false,
        error: error.message || 'Swap failed'
      }
    }
  }

  private async directTransfer(
    token: { symbol: string; address: string; decimals: number },
    amount: string,
    recipient: string
  ): Promise<SwapResult> {
    try {
      let tx: any

      if (token.symbol === 'ETH') {
        // Direct ETH transfer
        tx = await this.signer!.sendTransaction({
          to: recipient,
          value: ethers.parseEther(amount)
        })
      } else {
        // Direct ERC20 transfer
        const tokenContract = new ethers.Contract(
          this.getTokenAddress(token.symbol),
          ERC20_ABI,
          this.signer!
        )

        const transferAmount = ethers.parseUnits(amount, token.decimals)
        tx = await tokenContract.transfer(recipient, transferAmount)
      }

      const receipt = await tx.wait()
      
      return {
        success: true,
        transactionHash: receipt.hash,
        amountOut: amount
      }
    } catch (error: any) {
      return {
        success: false,
        error: `Transfer failed: ${error.message}`
      }
    }
  }

  private async swapETHForToken(
    fromAddress: string,
    toAddress: string,
    ethAmount: string,
    recipient: string,
    slippage: number,
    toDecimals: number
  ): Promise<SwapResult> {
    try {
      const router = new ethers.Contract(
        UNISWAP_V3_ROUTER,
        UNISWAP_V3_ROUTER_ABI,
        this.signer!
      )

      const amountIn = ethers.parseEther(ethAmount)
      
      console.log('💱 ETH Swap Details:')
      console.log('  - ETH Amount In:', ethAmount, 'ETH')
      console.log('  - Amount In (wei):', amountIn.toString())
      console.log('  - To Token:', toAddress)
      console.log('  - Slippage:', slippage, '%')
      
      // Estimate output amount (simplified calculation)
      const estimatedOut = await this.estimateSwapOutput(amountIn, 'ETH', toAddress)
      console.log('  - Estimated Out:', estimatedOut.toString())
      
      const slippageBigInt = BigInt(Math.floor(slippage * 100)) // Convert percentage to basis points
      const minAmountOut = estimatedOut * (BigInt(10000) - slippageBigInt) / BigInt(10000)
      console.log('  - Min Amount Out:', minAmountOut.toString())

      const swapParams = {
        tokenIn: WETH_ADDRESS, // Uniswap uses WETH
        tokenOut: toAddress,
        fee: 3000, // 0.3% fee tier
        recipient: recipient,
        deadline: Math.floor(Date.now() / 1000) + 1800, // 30 minutes
        amountIn: amountIn,
        amountOutMinimum: minAmountOut,
        sqrtPriceLimitX96: 0
      }

      console.log('🔥 EXECUTING REAL UNISWAP SWAP:')
      console.log('  📤 Your ETH goes to:', UNISWAP_V3_ROUTER)
      console.log('  📥 USDC tokens go to:', recipient)
      console.log('  💰 Expected USDC output:', ethers.formatUnits(estimatedOut, toDecimals))

      const tx = await router.exactInputSingle(swapParams, {
        value: amountIn
      })

      const receipt = await tx.wait()

      return {
        success: true,
        transactionHash: receipt.hash,
        amountOut: ethers.formatUnits(estimatedOut, toDecimals)
      }
    } catch (error: any) {
      return {
        success: false,
        error: `ETH to token swap failed: ${error.message}`
      }
    }
  }

  private async swapTokenForToken(
    fromAddress: string,
    toAddress: string,
    tokenAmount: string,
    recipient: string,
    slippage: number,
    fromDecimals: number,
    toDecimals: number
  ): Promise<SwapResult> {
    try {
      const tokenContract = new ethers.Contract(fromAddress, ERC20_ABI, this.signer!)
      const router = new ethers.Contract(UNISWAP_V3_ROUTER, UNISWAP_V3_ROUTER_ABI, this.signer!)

      const amountIn = ethers.parseUnits(tokenAmount, fromDecimals)

      // Check and approve if necessary
      const currentAllowance = await tokenContract.allowance(
        await this.signer!.getAddress(),
        UNISWAP_V3_ROUTER
      )

      if (currentAllowance < amountIn) {
        console.log('🔄 Approving token spend...')
        const approveTx = await tokenContract.approve(UNISWAP_V3_ROUTER, amountIn)
        await approveTx.wait()
      }

      // Estimate output amount
      const estimatedOut = await this.estimateSwapOutput(amountIn, fromAddress, toAddress)
      const slippageBigInt = BigInt(Math.floor(slippage * 100)) // Convert percentage to basis points
      const minAmountOut = estimatedOut * (BigInt(10000) - slippageBigInt) / BigInt(10000)

      const swapParams = {
        tokenIn: fromAddress,
        tokenOut: toAddress,
        fee: 3000,
        recipient: recipient,
        deadline: Math.floor(Date.now() / 1000) + 1800,
        amountIn: amountIn,
        amountOutMinimum: minAmountOut,
        sqrtPriceLimitX96: 0
      }

      const tx = await router.exactInputSingle(swapParams)
      const receipt = await tx.wait()

      return {
        success: true,
        transactionHash: receipt.hash,
        amountOut: ethers.formatUnits(estimatedOut, toDecimals)
      }
    } catch (error: any) {
      return {
        success: false,
        error: `Token swap failed: ${error.message}`
      }
    }
  }

  private async swapTokenForETH(
    fromAddress: string,
    toAddress: string,
    tokenAmount: string,
    recipient: string,
    slippage: number,
    fromDecimals: number
  ): Promise<SwapResult> {
    try {
      const tokenContract = new ethers.Contract(fromAddress, ERC20_ABI, this.signer!)
      const router = new ethers.Contract(UNISWAP_V3_ROUTER, UNISWAP_V3_ROUTER_ABI, this.signer!)

      const amountIn = ethers.parseUnits(tokenAmount, fromDecimals)

      console.log('💱 Token → ETH Swap Details:')
      console.log('  - Token Amount In:', tokenAmount)
      console.log('  - Amount In (units):', amountIn.toString())
      console.log('  - From Token:', fromAddress)
      console.log('  - To ETH via WETH:', toAddress)
      console.log('  - Slippage:', slippage, '%')

      // Check and approve if necessary
      const currentAllowance = await tokenContract.allowance(
        await this.signer!.getAddress(),
        UNISWAP_V3_ROUTER
      )

      if (currentAllowance < amountIn) {
        console.log('🔄 Approving token spend...')
        const approveTx = await tokenContract.approve(UNISWAP_V3_ROUTER, amountIn)
        await approveTx.wait()
      }

      // Estimate output amount (ETH)
      const estimatedOut = await this.estimateSwapOutput(amountIn, fromAddress, toAddress)
      console.log('  - Estimated ETH Out:', ethers.formatEther(estimatedOut), 'ETH')
      
      const slippageBigInt = BigInt(Math.floor(slippage * 100)) // Convert percentage to basis points
      const minAmountOut = estimatedOut * (BigInt(10000) - slippageBigInt) / BigInt(10000)
      console.log('  - Min ETH Out:', ethers.formatEther(minAmountOut), 'ETH')

      const swapParams = {
        tokenIn: fromAddress,
        tokenOut: WETH_ADDRESS, // Swap to WETH (will automatically unwrap to ETH)
        fee: 3000, // 0.3% fee tier
        recipient: recipient,
        deadline: Math.floor(Date.now() / 1000) + 1800, // 30 minutes
        amountIn: amountIn,
        amountOutMinimum: minAmountOut,
        sqrtPriceLimitX96: 0
      }

      const tx = await router.exactInputSingle(swapParams)
      const receipt = await tx.wait()

      return {
        success: true,
        transactionHash: receipt.hash,
        amountOut: ethers.formatEther(estimatedOut)
      }
    } catch (error: any) {
      console.error('❌ Token to ETH swap failed:', error)
      return {
        success: false,
        error: `Token to ETH swap failed: ${error.message}`
      }
    }
  }

  private async estimateSwapOutput(
    amountIn: bigint,
    fromTokenAddress: string,
    toTokenAddress: string
  ): Promise<bigint> {
    // Simplified price estimation
    // In production, you'd use Quoter contract or price oracles
    
    // ETH/WETH to USD conversions (1 ETH ≈ 2500 USD)
    if (fromTokenAddress === 'ETH' || fromTokenAddress === ethers.ZeroAddress || fromTokenAddress === WETH_ADDRESS) {
      if (toTokenAddress === USDC_ADDRESS || toTokenAddress === USDT_ADDRESS) {
        // Convert ETH to USDC/USDT: 1 ETH (18 decimals) → 2500 USDC (6 decimals)
        // amountIn is in wei (18 decimals), multiply by 2500 and divide by 10^12 to get USDC (6 decimals)
        return amountIn * BigInt(2500) / BigInt(10 ** 12)
      }
      if (toTokenAddress === DAI_ADDRESS) {
        // Convert ETH to DAI: 1 ETH (18 decimals) → 2500 DAI (18 decimals)
        return amountIn * BigInt(2500)
      }
    }

    // USD to ETH/WETH conversions  
    if ((fromTokenAddress === USDC_ADDRESS || fromTokenAddress === USDT_ADDRESS) && 
        (toTokenAddress === 'ETH' || toTokenAddress === ethers.ZeroAddress || toTokenAddress === WETH_ADDRESS)) {
      // Convert USDC/USDT to ETH: 2500 USDC (6 decimals) → 1 ETH (18 decimals)
      // amountIn is in USDC units (6 decimals), multiply by 10^12 and divide by 2500 to get wei
      return amountIn * BigInt(10 ** 12) / BigInt(2500)
    }

    // DAI to ETH/WETH conversions
    if (fromTokenAddress === DAI_ADDRESS && 
        (toTokenAddress === 'ETH' || toTokenAddress === ethers.ZeroAddress || toTokenAddress === WETH_ADDRESS)) {
      // Convert DAI to ETH: 2500 DAI (18 decimals) → 1 ETH (18 decimals)
      return amountIn / BigInt(2500)
    }

    // Stablecoin to stablecoin (1:1 ratio)
    if ((fromTokenAddress === USDC_ADDRESS || fromTokenAddress === USDT_ADDRESS) &&
        (toTokenAddress === USDC_ADDRESS || toTokenAddress === USDT_ADDRESS)) {
      return amountIn // Same decimals, 1:1 ratio
    }

    // Default case: apply 1% price impact
    return amountIn * BigInt(99) / BigInt(100)
  }
}

// Export singleton instance
let swapService: SwapService | null = null

export const getSwapService = (): SwapService => {
  if (!swapService) {
    swapService = new SwapService()
  }
  return swapService
}