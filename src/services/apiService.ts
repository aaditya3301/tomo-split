import { FriendData, GroupData, SplitData, UserDues } from './databaseService'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'

console.log('🔗 Frontend API Base URL:', API_BASE_URL)
console.log('🌐 Frontend running on:', window.location.origin)

class ApiService {
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`
    
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    }

    try {
      console.log(`🔄 API Request: ${options.method || 'GET'} ${url}`)
      console.log(`📤 Request Body:`, options.body ? JSON.parse(options.body as string) : 'No body')
      
      const response = await fetch(url, config)
      
      console.log(`📥 Response Status: ${response.status} ${response.statusText}`)
      
      let data
      try {
        data = await response.json()
        console.log(`📥 Response Data:`, data)
      } catch (jsonError) {
        console.error(`❌ Failed to parse response as JSON:`, jsonError)
        throw new Error(`Invalid JSON response from server (${response.status})`)
      }

      if (!response.ok) {
        console.error(`❌ HTTP Error ${response.status}:`, data)
        throw new Error(data.error || `HTTP error! status: ${response.status}`)
      }

      if (!data.success) {
        console.error(`❌ API Error:`, data.error)
        throw new Error(data.error || 'API request failed')
      }

      console.log(`✅ API Success: ${options.method || 'GET'} ${endpoint}`)
      return data.data
    } catch (error) {
      console.error(`❌ API Error: ${options.method || 'GET'} ${endpoint}`, error)
      throw error
    }
  }

  // User Operations
  async createOrUpdateUser(walletAddress: string, ensName?: string, displayName?: string) {
    return this.request('/users', {
      method: 'POST',
      body: JSON.stringify({ walletAddress, ensName, displayName })
    })
  }

  async getUserByWallet(walletAddress: string) {
    return this.request(`/users/${walletAddress}`)
  }

  // Friend Operations
  async getFriends(walletAddress: string): Promise<FriendData[]> {
    return this.request(`/friends/${walletAddress}`)
  }

  async addFriend(userWallet: string, friendData: FriendData) {
    return this.request('/friends', {
      method: 'POST',
      body: JSON.stringify({ userWallet, friendData })
    })
  }

  async removeFriend(userWallet: string, friendId: string) {
    return this.request(`/friends/${userWallet}/${friendId}`, {
      method: 'DELETE'
    })
  }

  // Group Operations
  async getGroups(walletAddress: string): Promise<GroupData[]> {
    return this.request(`/groups/${walletAddress}`)
  }

  async createGroup(creatorWallet: string, name: string, memberWallets: string[]) {
    return this.request('/groups', {
      method: 'POST',
      body: JSON.stringify({ creatorWallet, name, memberWallets })
    })
  }

  // Split Operations
  async createSplit(splitData: SplitData) {
    return this.request('/splits', {
      method: 'POST',
      body: JSON.stringify({ splitData })
    })
  }

  async getGroupSplits(groupId: string): Promise<SplitData[]> {
    return this.request<SplitData[]>(`/splits/group/${groupId}`)
  }

  // Dues Operations
  async getUserDues(walletAddress: string): Promise<UserDues> {
    return this.request(`/dues/${walletAddress}`)
  }

  // Payment Operations
  async recordPayment(
    splitId: string,
    fromUserWallet: string,
    amount: number,
    method: string = 'MANUAL',
    transactionId?: string
  ) {
    return this.request('/payments', {
      method: 'POST',
      body: JSON.stringify({
        splitId,
        fromUserWallet,
        amount,
        method,
        transactionId
      })
    })
  }

  // ENS Cache Operations
  async getCachedENSResolution(ensName: string) {
    try {
      return await this.request(`/ens/cache/${ensName}`)
    } catch {
      return null // Return null if not cached or error
    }
  }

  async cacheENSResolution(ensName: string, walletAddress: string | null) {
    try {
      await this.request('/ens/cache', {
        method: 'POST',
        body: JSON.stringify({ ensName, walletAddress })
      })
    } catch (error) {
      console.warn('ENS cache update failed:', error)
    }
  }

  // Health Check
  async healthCheck() {
    try {
      return await this.request('/health')
    } catch (error) {
      console.error('API health check failed:', error)
      return { status: 'ERROR' }
    }
  }
}

export const apiService = new ApiService()
export default apiService