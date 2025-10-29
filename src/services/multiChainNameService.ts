import { alchemyENSService } from './alchemyENSService'
import { aptosNSService } from './aptosNSService'

export type ChainType = 'EVM' | 'APTOS'

interface NameResolutionResult {
  walletId: string
  resolvedAddress?: string
  resolvedName?: string // ENS or ANS name
  isNameService: boolean // true if input was a name (ENS/ANS), false if address
  chainType: ChainType
  error?: string
}

/**
 * Multi-Chain Name Resolution Service
 * Handles both ENS (Ethereum) and ANS (Aptos) name resolution
 */
class MultiChainNameService {
  /**
   * Process wallet input based on the current chain type
   */
  async processWalletInput(
    input: string, 
    currentChainType: ChainType
  ): Promise<NameResolutionResult> {
    const trimmedInput = input.trim()
    console.log(`🔄 Multi-chain processing: "${trimmedInput}" on ${currentChainType}`)

    if (currentChainType === 'EVM') {
      return this.processEVMInput(trimmedInput)
    } else if (currentChainType === 'APTOS') {
      return this.processAptosInput(trimmedInput)
    }

    // Fallback - try to auto-detect
    return this.autoDetectAndProcess(trimmedInput)
  }

  /**
   * Process input for EVM chains (ENS resolution)
   */
  private async processEVMInput(input: string): Promise<NameResolutionResult> {
    try {
      const result = await alchemyENSService.processWalletInput(input)
      
      return {
        walletId: result.walletId,
        resolvedAddress: result.resolvedAddress,
        resolvedName: result.resolvedENS,
        isNameService: result.isENS,
        chainType: 'EVM',
        error: result.error
      }
    } catch (error: any) {
      console.error('❌ EVM processing error:', error)
      return {
        walletId: input,
        isNameService: false,
        chainType: 'EVM',
        error: 'Failed to process EVM wallet input'
      }
    }
  }

  /**
   * Process input for Aptos chain (ANS resolution)
   */
  private async processAptosInput(input: string): Promise<NameResolutionResult> {
    try {
      const result = await aptosNSService.processWalletInput(input)
      
      return {
        walletId: result.walletId,
        resolvedAddress: result.resolvedAddress,
        resolvedName: result.resolvedANS,
        isNameService: result.isANS,
        chainType: 'APTOS',
        error: result.error
      }
    } catch (error: any) {
      console.error('❌ Aptos processing error:', error)
      return {
        walletId: input,
        isNameService: false,
        chainType: 'APTOS',
        error: 'Failed to process Aptos wallet input'
      }
    }
  }

  /**
   * Auto-detect chain type and process accordingly
   */
  private async autoDetectAndProcess(input: string): Promise<NameResolutionResult> {
    console.log('🔍 Auto-detecting chain type for input:', input)
    
    // Check for ENS patterns
    if (alchemyENSService.isENSName(input) || alchemyENSService.isEthereumAddress(input)) {
      console.log('📝 Detected EVM pattern, using ENS resolution')
      return this.processEVMInput(input)
    }
    
    // Check for ANS patterns
    if (aptosNSService.isANSName(input) || aptosNSService.isAptosAddress(input)) {
      console.log('📝 Detected Aptos pattern, using ANS resolution')
      return this.processAptosInput(input)
    }
    
    // Default to EVM if can't detect
    console.log('⚠️ Could not detect chain type, defaulting to EVM')
    return this.processEVMInput(input)
  }

  /**
   * Get user-friendly placeholder text based on chain type
   */
  getPlaceholderText(chainType: ChainType): string {
    switch (chainType) {
      case 'EVM':
        return 'Enter ENS name (e.g., vitalik.eth) or Ethereum address'
      case 'APTOS':
        return 'Enter ANS name (e.g., alice.apt) or Aptos address'
      default:
        return 'Enter wallet address or name'
    }
  }

  /**
   * Get supported name service info for current chain
   */
  getNameServiceInfo(chainType: ChainType): {
    serviceName: string
    suffix: string
    example: string
  } {
    switch (chainType) {
      case 'EVM':
        return {
          serviceName: 'ENS (Ethereum Name Service)',
          suffix: '.eth',
          example: 'vitalik.eth'
        }
      case 'APTOS':
        return {
          serviceName: 'ANS (Aptos Name Service)',
          suffix: '.apt',
          example: 'alice.apt'
        }
      default:
        return {
          serviceName: 'Name Service',
          suffix: '',
          example: 'name.domain'
        }
    }
  }

  /**
   * Validate address format for specific chain
   */
  isValidAddress(address: string, chainType: ChainType): boolean {
    switch (chainType) {
      case 'EVM':
        return alchemyENSService.isEthereumAddress(address)
      case 'APTOS':
        return aptosNSService.isAptosAddress(address)
      default:
        return false
    }
  }

  /**
   * Reverse resolve address to name for specific chain
   */
  async reverseResolve(address: string, chainType: ChainType): Promise<string | null> {
    try {
      switch (chainType) {
        case 'EVM':
          return await alchemyENSService.resolveAddressToENS(address)
        case 'APTOS':
          return await aptosNSService.resolveAddressToANS(address)
        default:
          return null
      }
    } catch (error) {
      console.error(`❌ Reverse resolution failed for ${chainType}:`, error)
      return null
    }
  }
}

// Export singleton instance
export const multiChainNameService = new MultiChainNameService()
export default multiChainNameService