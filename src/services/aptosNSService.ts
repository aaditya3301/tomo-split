/**
 * Aptos Name Service (ANS) Resolution Service
 * Handles .apt domain resolution on the Aptos blockchain
 */

interface ANSResolutionResult {
  address: string | null
  error?: string
}

class AptosNSService {
  private readonly APTOS_NODE_URL: string

  constructor() {
    // Use public Aptos node or configure your own
    this.APTOS_NODE_URL = 'https://fullnode.mainnet.aptoslabs.com/v1'
    
    console.log('🔍 Aptos Name Service initialized')
    console.log('- Node URL:', this.APTOS_NODE_URL)
    console.log('- Primary resolution: GraphQL API')
  }

  /**
   * Check if a string is a valid ANS name
   */
  isANSName(input: string): boolean {
    // ANS names typically end with .apt
    const hasValidStructure = /^[a-zA-Z0-9_-]+\.apt$/i.test(input.toLowerCase())
    return hasValidStructure
  }

  /**
   * Check if a string is a valid Aptos address
   */
  isAptosAddress(input: string): boolean {
    try {
      // Aptos addresses are 64-character hex strings with or without 0x prefix
      const cleaned = input.startsWith('0x') ? input.slice(2) : input
      return /^[a-fA-F0-9]{64}$/.test(cleaned) && cleaned.length === 64
    } catch {
      return false
    }
  }

  /**
   * Normalize Aptos address (ensure 0x prefix and proper length)
   */
  normalizeAptosAddress(address: string): string {
    if (!address) return address
    
    // Remove 0x prefix if present
    let cleaned = address.startsWith('0x') ? address.slice(2) : address
    
    // Pad with leading zeros if needed (Aptos addresses should be 64 chars)
    cleaned = cleaned.padStart(64, '0')
    
    // Add 0x prefix
    return '0x' + cleaned.toLowerCase()
  }

  /**
   * Resolve ANS name to Aptos address
   */
  async resolveANSToAddress(ansName: string): Promise<ANSResolutionResult> {
    console.log(`🔄 Starting ANS resolution for: ${ansName}`)
    
    if (!this.isANSName(ansName)) {
      console.error(`❌ Invalid ANS name format: ${ansName}`)
      return {
        address: null,
        error: 'Invalid ANS name format. ANS names should end with .apt'
      }
    }

    const normalizedName = ansName.toLowerCase().trim()

    try {
      console.log(`🔍 Resolving ANS name: ${normalizedName}`)
      
      // Since ANS resolution has been disabled, return error immediately
      console.log(`⚠️ ANS resolution is disabled`)
      
      return {
        address: null,
        error: `ANS resolution is currently disabled. Please use direct Aptos addresses instead.`
      }
      
      // Method 3: Fallback - check if it's actually an address with .apt suffix
      const withoutSuffix = normalizedName.replace('.apt', '')
      if (this.isAptosAddress(withoutSuffix)) {
        const address = this.normalizeAptosAddress(withoutSuffix)
        console.log(`✅ Treated as address with .apt suffix: ${address}`)
        return { address }
      }
      
      // If we reach here, resolution failed
      console.log(`❌ ANS resolution failed for: ${normalizedName}`)
      
      return {
        address: null,
        error: `ANS name "${normalizedName}" not found or not registered. Please check the spelling and ensure the .apt name is registered on Aptos Name Service.`
      }
    } catch (error: any) {
      console.error('❌ ANS resolution error:', error)
      
      // Handle specific errors
      if (error.message?.includes('network')) {
        return {
          address: null,
          error: 'Network error. Please check your connection and try again.'
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
        error: 'Failed to resolve ANS name. Please check the name and try again.'
      }
    }
  }

  /**
   * Resolve Aptos address back to ANS name (reverse resolution)
   */
  async resolveAddressToANS(address: string): Promise<string | null> {
    console.log(`🔄 Starting reverse ANS resolution for: ${address}`)
    
    const normalizedAddress = this.normalizeAptosAddress(address)
    
    if (!this.isAptosAddress(normalizedAddress)) {
      console.error(`❌ Invalid Aptos address: ${address}`)
      return null
    }

    try {
      console.log(`🔍 Looking up ANS name for address: ${normalizedAddress}`)
      
      // ANS reverse resolution is disabled
      console.log(`⚠️ ANS reverse resolution is disabled`)
      
      return null
      
      console.log(`⚠️ No ANS name found for address: ${normalizedAddress}`)
      return null
    } catch (error) {
      console.error('❌ Reverse ANS resolution error:', error)
      return null
    }
  }

  /**
   * Validate and process wallet input (ANS or address)
   */
  async processWalletInput(input: string): Promise<{
    walletId: string
    resolvedAddress?: string
    resolvedANS?: string
    isANS: boolean
    error?: string
  }> {
    const trimmedInput = input.trim()
    console.log(`🔄 Processing Aptos wallet input: "${trimmedInput}"`)

    // If it's already a valid Aptos address, try reverse resolution to find ANS
    if (this.isAptosAddress(trimmedInput)) {
      console.log(`✅ Input is valid Aptos address, attempting reverse ANS lookup...`)
      
      const normalizedAddress = this.normalizeAptosAddress(trimmedInput)
      
      try {
        const ansName = await this.resolveAddressToANS(normalizedAddress)
        return {
          walletId: normalizedAddress,
          resolvedANS: ansName || undefined,
          isANS: false
        }
      } catch (error) {
        console.log(`⚠️ Reverse ANS lookup failed, but address is valid`)
        return {
          walletId: normalizedAddress,
          isANS: false
        }
      }
    }

    // If it looks like an ANS name, try to resolve it
    if (this.isANSName(trimmedInput)) {
      console.log(`📝 Input looks like ANS name, attempting resolution...`)
      const result = await this.resolveANSToAddress(trimmedInput)
      
      if (result.error) {
        console.log(`❌ ANS resolution failed: ${result.error}`)
        return {
          walletId: trimmedInput,
          isANS: true,
          error: result.error
        }
      }

      console.log(`✅ ANS resolution successful`)
      return {
        walletId: trimmedInput, // Keep the ANS name as display
        resolvedAddress: result.address!, // Store the resolved address
        isANS: true
      }
    }

    // If it ends with .apt but doesn't match pattern, still try to resolve it
    if (trimmedInput.toLowerCase().endsWith('.apt')) {
      console.log(`🔍 Input ends with .apt, forcing ANS resolution attempt...`)
      const result = await this.resolveANSToAddress(trimmedInput)
      
      if (result.error) {
        return {
          walletId: trimmedInput,
          isANS: true,
          error: result.error
        }
      }

      return {
        walletId: trimmedInput,
        resolvedAddress: result.address!,
        isANS: true
      }
    }

    console.log(`❌ Input doesn't match any valid Aptos format`)
    return {
      walletId: trimmedInput,
      isANS: false,
      error: 'Please enter a valid Aptos address or ANS name (.apt)'
    }
  }
}

// Export singleton instance
export const aptosNSService = new AptosNSService()
export default aptosNSService