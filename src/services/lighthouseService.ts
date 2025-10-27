import lighthouse from '@lighthouse-web3/sdk'

interface Friend {
  id: string
  name: string
  walletId: string
  resolvedAddress?: string
  resolvedENS?: string
  isENS?: boolean
  isSelected: boolean
}

interface Group {
  id: string
  name: string
  hash: string
  members: string[]
  createdAt: Date
  isSettled?: boolean
  totalAmount?: number
  yourShare?: number
  isPaid?: boolean
}

interface UserData {
  friends: Friend[]
  groups: Group[]
  lastUpdated: string
  userAddress?: string
}

class LighthouseService {
  private readonly apiKey: string

  constructor() {
    this.apiKey = import.meta.env.VITE_STORAGE_API_KEY || ''
    
    console.log('🔧 Lighthouse Service Constructor')
    console.log('📊 All VITE env vars:', Object.keys(import.meta.env).filter(key => key.startsWith('VITE_')))
    console.log('🔑 VITE_STORAGE_API_KEY exists:', !!import.meta.env.VITE_STORAGE_API_KEY)
    console.log('🔑 API Key length:', this.apiKey.length)
    
    if (!this.apiKey) {
      console.error('❌ VITE_STORAGE_API_KEY not found in environment variables')
      console.error('💡 Make sure you have VITE_STORAGE_API_KEY in your .env file')
    } else {
      console.log('✅ Lighthouse API Key found, initializing storage service...')
      console.log('🔑 API Key (first 10 chars):', this.apiKey.substring(0, 10) + '...')
    }
  }

  /**
   * Upload user data (friends and groups) to Lighthouse using SDK
   */
  async uploadUserData(friends: Friend[], groups: Group[], userAddress?: string): Promise<{
    success: boolean
    hash?: string
    error?: string
  }> {
    if (!this.apiKey) {
      return {
        success: false,
        error: 'Lighthouse API key not configured'
      }
    }

    try {
      console.log('📤 Uploading user data to Lighthouse using SDK...')
      
      const userData: UserData = {
        friends,
        groups,
        lastUpdated: new Date().toISOString(),
        userAddress
      }

      // Convert data to JSON string
      const jsonData = JSON.stringify(userData, null, 2)
      
      // Create a unique name for this upload
      const fileName = `user-data-${userAddress?.slice(0, 8) || 'anonymous'}-${Date.now()}`
      
      console.log('📝 Uploading JSON data:', {
        dataSize: jsonData.length,
        fileName,
        friendsCount: friends.length,
        groupsCount: groups.length
      })

      // Use Lighthouse SDK to upload text
      const response = await lighthouse.uploadText(jsonData, this.apiKey, fileName)
      
      console.log('✅ Data uploaded successfully to Lighthouse:', response)
      
      if (response.data?.Hash) {
        return {
          success: true,
          hash: response.data.Hash
        }
      } else {
        return {
          success: false,
          error: 'Upload succeeded but no hash returned'
        }
      }

    } catch (error: any) {
      console.error('❌ Error uploading to Lighthouse:', error)
      return {
        success: false,
        error: error.message || 'Upload failed'
      }
    }
  }

  /**
   * Fetch user data from Lighthouse using IPFS hash
   */
  async fetchUserData(hash: string): Promise<{
    success: boolean
    data?: UserData
    error?: string
  }> {
    if (!hash) {
      return {
        success: false,
        error: 'No hash provided'
      }
    }

    try {
      console.log('📥 Fetching user data from Lighthouse IPFS:', hash)
      
      // Try multiple IPFS gateways for better reliability
      const gateways = [
        `https://gateway.lighthouse.storage/ipfs/${hash}`,
        `https://ipfs.io/ipfs/${hash}`,
        `https://cloudflare-ipfs.com/ipfs/${hash}`
      ]
      
      let userData: UserData | null = null
      let lastError: string = ''
      
      for (const gateway of gateways) {
        try {
          console.log(`🔄 Trying gateway: ${gateway}`)
          const response = await fetch(gateway, {
            timeout: 10000 // 10 second timeout
          } as any)
          
          if (response.ok) {
            userData = await response.json()
            console.log('✅ Data fetched successfully from:', gateway)
            break
          } else {
            lastError = `HTTP ${response.status}`
            console.log(`❌ Gateway failed: ${gateway} - ${lastError}`)
          }
        } catch (gatewayError: any) {
          lastError = gatewayError.message
          console.log(`❌ Gateway error: ${gateway} - ${lastError}`)
          continue
        }
      }
      
      if (!userData) {
        return {
          success: false,
          error: `Failed to fetch from all gateways. Last error: ${lastError}`
        }
      }
      
      // Convert date strings back to Date objects
      if (userData.groups) {
        userData.groups = userData.groups.map(group => ({
          ...group,
          createdAt: new Date(group.createdAt)
        }))
      }

      console.log('📊 Loaded data:', {
        friendsCount: userData.friends?.length || 0,
        groupsCount: userData.groups?.length || 0,
        lastUpdated: userData.lastUpdated
      })

      return {
        success: true,
        data: userData
      }

    } catch (error: any) {
      console.error('❌ Error fetching from Lighthouse:', error)
      return {
        success: false,
        error: error.message || 'Fetch failed'
      }
    }
  }

  /**
   * Get user's stored data hashes (this would typically be stored in localStorage or a database)
   */
  getUserDataHash(userAddress: string): string | null {
    try {
      const stored = localStorage.getItem(`lighthouse_hash_${userAddress}`)
      return stored
    } catch (error) {
      console.error('❌ Error getting stored hash:', error)
      return null
    }
  }

  /**
   * Store user's data hash locally
   */
  setUserDataHash(userAddress: string, hash: string): void {
    try {
      localStorage.setItem(`lighthouse_hash_${userAddress}`, hash)
      console.log('💾 Stored data hash locally for user:', userAddress)
    } catch (error) {
      console.error('❌ Error storing hash:', error)
    }
  }

  /**
   * Upload and store user data, then save the hash locally
   */
  async saveUserData(friends: Friend[], groups: Group[], userAddress?: string): Promise<{
    success: boolean
    hash?: string
    error?: string
  }> {
    const result = await this.uploadUserData(friends, groups, userAddress)
    
    if (result.success && result.hash && userAddress) {
      this.setUserDataHash(userAddress, result.hash)
    }
    
    return result
  }

  /**
   * Load user data from storage
   */
  async loadUserData(userAddress: string): Promise<{
    success: boolean
    data?: UserData
    error?: string
  }> {
    const hash = this.getUserDataHash(userAddress)
    
    if (!hash) {
      return {
        success: false,
        error: 'No stored data found for this user'
      }
    }
    
    return await this.fetchUserData(hash)
  }

  /**
   * Check if API key is configured
   */
  isConfigured(): boolean {
    return !!this.apiKey
  }

  /**
   * Get storage statistics (mock for now)
   */
  async getStorageStats(): Promise<{
    totalUploads: number
    lastUpload?: string
    storageUsed: string
  }> {
    // This would typically come from Lighthouse API
    return {
      totalUploads: 0,
      storageUsed: '0 MB'
    }
  }
}

export const lighthouseService = new LighthouseService()
