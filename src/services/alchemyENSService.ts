import { Alchemy, Network } from 'alchemy-sdk'

interface ENSResolutionResult {
  address: string | null
  error?: string
}

class AlchemyENSService {
  private alchemy: Alchemy | null = null
  private readonly apiKey: string

  constructor() {
    // Get Alchemy API key from environment
    const envKey = import.meta.env.VITE_ALCHEMY_API_KEY
    
    // Development-only debug logging (removed in production)
    if (import.meta.env.DEV) {
      console.log('🔍 Alchemy ENS Service initialization')
      console.log('- API Key exists:', !!envKey)
      console.log('- API Key length:', envKey?.length || 0)
    }
    
    // SECURITY: Never use hardcoded fallback keys
    if (!envKey) {
      console.error('❌ VITE_ALCHEMY_API_KEY not found in environment variables')
      console.error('💡 Please add VITE_ALCHEMY_API_KEY to your .env file')
      this.apiKey = ''
    } else {
      this.apiKey = envKey
    }
    
    if (this.apiKey && this.apiKey.length > 10) {
      if (import.meta.env.DEV) {
        console.log('✅ Alchemy API Key configured, initializing SDK...')
      }
      this.initializeAlchemy()
    } else {
      console.error('❌ Invalid or missing Alchemy API key')
    }
  }

  private initializeAlchemy() {
    try {
      const config = {
        apiKey: this.apiKey,
        network: Network.ETH_MAINNET, // ENS resolution on Ethereum mainnet
      }
      
      this.alchemy = new Alchemy(config)
      console.log('✅ Alchemy SDK initialized for ENS resolution')
    } catch (error) {
      console.error('❌ Failed to initialize Alchemy SDK:', error)
    }
  }

  /**
   * Check if a string is a valid ENS name
   * Following ENS docs: treat all dot-separated strings as potential ENS names
   */
  isENSName(input: string): boolean {
    // Per ENS docs: treat all dot-separated strings as potential ENS names
    const hasValidStructure = /^[a-zA-Z0-9_-]+\.[a-zA-Z]{2,}$/i.test(input.toLowerCase())
    return hasValidStructure && input.includes('.')
  }

  /**
   * Check if a string is a valid Ethereum address
   */
  isEthereumAddress(input: string): boolean {
    try {
      // Simple Ethereum address validation
      return /^0x[a-fA-F0-9]{40}$/.test(input)
    } catch {
      return false
    }
  }

  /**
   * Resolve ENS name to wallet address using Alchemy SDK
   * Following Alchemy's official documentation
   */
  async resolveENSToAddress(ensName: string): Promise<ENSResolutionResult> {
    console.log(`🔄 Starting Alchemy ENS resolution for: ${ensName}`)
    
    if (!this.alchemy) {
      console.error('❌ Alchemy SDK not initialized')
      return {
        address: null,
        error: 'Alchemy SDK not initialized. Please check your API key.'
      }
    }

    if (!this.isENSName(ensName)) {
      console.error(`❌ Invalid ENS name format: ${ensName}`)
      return {
        address: null,
        error: 'Invalid ENS name format'
      }
    }

    const normalizedName = ensName.toLowerCase().trim()

    try {
      console.log(`🔍 Getting wallet address for ENS: ${normalizedName}`)
      
      // Method 1: Try using ethers resolver (most reliable)
      try {
        const ethers = await import('ethers')
        const provider = new ethers.JsonRpcProvider(`https://eth-mainnet.g.alchemy.com/v2/${this.apiKey}`)
        
        // Try to resolve using ethers resolver
        const address = await provider.resolveName(normalizedName)
        
        if (address && this.isEthereumAddress(address)) {
          console.log(`✅ Resolved ENS via ethers: ${normalizedName} -> ${address}`)
          return { address }
        }
      } catch (ethersError) {
        console.log(`⚠️ Ethers resolver failed:`, ethersError)
      }
      
      // Method 2: Try using Alchemy's ENS lookup
      try {
        const address = await this.alchemy.core.resolveName(normalizedName)
        if (address && this.isEthereumAddress(address)) {
          console.log(`✅ Resolved ENS via Alchemy: ${normalizedName} -> ${address}`)
          return { address }
        }
      } catch (alchemyError) {
        console.log(`⚠️ Alchemy ENS lookup failed:`, alchemyError)
      }
      
      // If we reach here, all methods failed
      console.log(`❌ All ENS resolution methods failed for: ${normalizedName}`)
      return {
        address: null,
        error: 'ENS name not found or invalid'
      }
    } catch (error: any) {
      console.error('❌ ENS resolution error:', error)
      
      // Handle specific errors
      if (error.code === 'NETWORK_ERROR') {
        return {
          address: null,
          error: 'Network error. Please check your connection and try again.'
        }
      }
      
      if (error.code === 'INVALID_ARGUMENT') {
        return {
          address: null,
          error: 'Invalid ENS name provided.'
        }
      }
      
      if (error.message?.includes('rate limit')) {
        return {
          address: null,
          error: 'Rate limit exceeded. Please try again in a moment.'
        }
      }
      
      return {
        address: null,
        error: 'Failed to resolve ENS name. Please check the name and try again.'
      }
    }
  }

  /**
   * Resolve address back to ENS name using Alchemy SDK (reverse resolution)
   */
  async resolveAddressToENS(address: string): Promise<string | null> {
    console.log(`🔄 Starting Alchemy reverse ENS resolution for: ${address}`)
    
    if (!this.alchemy) {
      console.error('❌ Alchemy SDK not initialized')
      return null
    }

    if (!this.isEthereumAddress(address)) {
      console.error(`❌ Invalid Ethereum address: ${address}`)
      return null
    }

    try {
      console.log(`🔍 Looking up ENS name for address with Alchemy SDK: ${address}`)
      
      // Use Alchemy's lookupAddress method for reverse resolution
      const ensName = await this.alchemy.core.lookupAddress(address)
      
      if (!ensName) {
        console.warn(`⚠️ No ENS name found for address: ${address}`)
        return null
      }

      console.log(`✅ Alchemy address ${address} resolved to ENS: ${ensName}`)
      
      return ensName
    } catch (error) {
      console.error('❌ Alchemy reverse ENS resolution error:', error)
      return null
    }
  }

  /**
   * Validate and process wallet input (ENS or address) using Alchemy SDK
   */
  async processWalletInput(input: string): Promise<{
    walletId: string
    resolvedAddress?: string
    resolvedENS?: string
    isENS: boolean
    error?: string
  }> {
    const trimmedInput = input.trim()
    console.log(`🔄 Processing wallet input with Alchemy: "${trimmedInput}"`)

    // If it's already a valid Ethereum address, try reverse resolution to find ENS
    if (this.isEthereumAddress(trimmedInput)) {
      console.log(`✅ Input is valid Ethereum address, attempting reverse ENS lookup...`)
      
      try {
        const ensName = await this.resolveAddressToENS(trimmedInput)
        return {
          walletId: trimmedInput,
          resolvedENS: ensName || undefined,
          isENS: false
        }
      } catch (error) {
        console.log(`⚠️ Reverse ENS lookup failed, but address is valid`)
        return {
          walletId: trimmedInput,
          isENS: false
        }
      }
    }

    // If it looks like an ENS name, try to resolve it
    if (this.isENSName(trimmedInput)) {
      console.log(`📝 Input looks like ENS name, attempting resolution...`)
      const result = await this.resolveENSToAddress(trimmedInput)
      
      if (result.error) {
        console.log(`❌ ENS resolution failed: ${result.error}`)
        return {
          walletId: trimmedInput,
          isENS: true,
          error: result.error
        }
      }

      console.log(`✅ ENS resolution successful`)
      return {
        walletId: trimmedInput, // Keep the ENS name as display
        resolvedAddress: result.address!, // Store the resolved address
        isENS: true
      }
    }

    // If it ends with .eth but doesn't match pattern, still try to resolve it
    if (trimmedInput.toLowerCase().endsWith('.eth')) {
      console.log(`🔍 Input ends with .eth, forcing ENS resolution attempt...`)
      const result = await this.resolveENSToAddress(trimmedInput)
      
      if (result.error) {
        return {
          walletId: trimmedInput,
          isENS: true,
          error: result.error
        }
      }

      return {
        walletId: trimmedInput,
        resolvedAddress: result.address!,
        isENS: true
      }
    }

    console.log(`❌ Input doesn't match any valid format`)
    return {
      walletId: trimmedInput,
      isENS: false,
      error: 'Please enter a valid Ethereum address or ENS name'
    }
  }
}

// Export singleton instance
export const alchemyENSService = new AlchemyENSService()
export default alchemyENSService