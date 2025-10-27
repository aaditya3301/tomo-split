import lighthouse from '@lighthouse-web3/sdk'

interface SplitMember {
  id: string
  name: string
  walletId: string
  amount: number
  isPaid: boolean
  paidAt?: string
}

interface SplitData {
  id: string
  groupId: string
  groupName: string
  description: string
  totalAmount: number
  paidBy: string // wallet address of person who paid
  paidByName: string
  members: SplitMember[]
  createdAt: string
  createdBy: string // wallet address
  splitType: 'equal' | 'custom'
  currency: string
  isSettled: boolean
  settledAt?: string
  ipfsHash?: string
}

interface UserDues {
  totalOwed: number // Amount user owes to others
  totalOwedToUser: number // Amount others owe to user
  netBalance: number // Positive = others owe you, Negative = you owe others
  pendingGroups: {
    groupId: string
    groupName: string
    amountOwed: number
    amountOwedToUser: number
    netAmount: number
  }[]
}

class SplitStorageService {
  private readonly apiKey: string

  constructor() {
    this.apiKey = import.meta.env.VITE_STORAGE_API_KEY || ''
    
    if (!this.apiKey) {
      console.error('❌ VITE_STORAGE_API_KEY not found for split storage')
    } else {
      console.log('✅ Split Storage Service initialized')
    }
  }

  /**
   * Upload split data to Filecoin
   */
  async uploadSplitData(splitData: SplitData): Promise<{
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
      console.log('📤 Uploading split data to Filecoin...', {
        splitId: splitData.id,
        groupName: splitData.groupName,
        totalAmount: splitData.totalAmount,
        membersCount: splitData.members.length
      })

      // Create detailed split document
      const splitDocument = {
        ...splitData,
        uploadedAt: new Date().toISOString(),
        version: '1.0',
        metadata: {
          totalMembers: splitData.members.length,
          averageAmount: splitData.totalAmount / splitData.members.length,
          currency: splitData.currency || 'USD'
        }
      }

      // Convert to formatted JSON
      const jsonData = JSON.stringify(splitDocument, null, 2)
      
      // Create filename
      const fileName = `split-${splitData.groupName.replace(/\s+/g, '-').toLowerCase()}-${splitData.id}-${Date.now()}`
      
      console.log('📝 Split document details:', {
        fileName,
        dataSize: jsonData.length,
        splitType: splitData.splitType
      })

      // Upload to Lighthouse
      const response = await lighthouse.uploadText(jsonData, this.apiKey, fileName)
      
      if (response.data?.Hash) {
        console.log('✅ Split data uploaded successfully!', {
          hash: response.data.Hash,
          name: response.data.Name,
          size: response.data.Size
        })

        // Store the hash in the split data
        splitData.ipfsHash = response.data.Hash

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
      console.error('❌ Error uploading split data:', error)
      return {
        success: false,
        error: error.message || 'Split upload failed'
      }
    }
  }

  /**
   * Fetch split data from Filecoin
   */
  async fetchSplitData(hash: string): Promise<{
    success: boolean
    data?: SplitData
    error?: string
  }> {
    try {
      console.log('📥 Fetching split data from IPFS:', hash)
      
      const gateways = [
        `https://gateway.lighthouse.storage/ipfs/${hash}`,
        `https://ipfs.io/ipfs/${hash}`,
        `https://cloudflare-ipfs.com/ipfs/${hash}`
      ]
      
      for (const gateway of gateways) {
        try {
          const response = await fetch(gateway, { timeout: 10000 } as any)
          
          if (response.ok) {
            const splitData: SplitData = await response.json()
            console.log('✅ Split data fetched successfully')
            return {
              success: true,
              data: splitData
            }
          }
        } catch (error) {
          continue
        }
      }
      
      return {
        success: false,
        error: 'Failed to fetch split data from all gateways'
      }

    } catch (error: any) {
      console.error('❌ Error fetching split data:', error)
      return {
        success: false,
        error: error.message || 'Fetch failed'
      }
    }
  }

  /**
   * Calculate user dues across all groups
   */
  calculateUserDues(splits: SplitData[], userAddress: string): UserDues {
    let totalOwed = 0
    let totalOwedToUser = 0
    const pendingGroups: UserDues['pendingGroups'] = []

    // Group splits by group ID
    const groupedSplits = splits.reduce((acc, split) => {
      if (!acc[split.groupId]) {
        acc[split.groupId] = []
      }
      acc[split.groupId].push(split)
      return acc
    }, {} as Record<string, SplitData[]>)

    // Calculate dues for each group
    Object.entries(groupedSplits).forEach(([groupId, groupSplits]) => {
      let groupOwed = 0
      let groupOwedToUser = 0

      groupSplits.forEach(split => {
        if (split.isSettled) return // Skip settled splits

        const userMember = split.members.find(m => 
          m.walletId.toLowerCase() === userAddress.toLowerCase()
        )

        if (userMember) {
          if (!userMember.isPaid) {
            // User owes money in this split
            groupOwed += userMember.amount
          }
        }

        // If user paid for this split, calculate what others owe them
        if (split.paidBy.toLowerCase() === userAddress.toLowerCase()) {
          const unpaidAmount = split.members
            .filter(m => !m.isPaid && m.walletId.toLowerCase() !== userAddress.toLowerCase())
            .reduce((sum, m) => sum + m.amount, 0)
          
          groupOwedToUser += unpaidAmount
        }
      })

      if (groupOwed > 0 || groupOwedToUser > 0) {
        const groupName = groupSplits[0]?.groupName || `Group ${groupId}`
        pendingGroups.push({
          groupId,
          groupName,
          amountOwed: groupOwed,
          amountOwedToUser: groupOwedToUser,
          netAmount: groupOwedToUser - groupOwed
        })
      }

      totalOwed += groupOwed
      totalOwedToUser += groupOwedToUser
    })

    return {
      totalOwed,
      totalOwedToUser,
      netBalance: totalOwedToUser - totalOwed,
      pendingGroups
    }
  }

  /**
   * Store split hashes locally for user
   */
  storeSplitHash(userAddress: string, splitId: string, hash: string): void {
    try {
      const key = `split_hashes_${userAddress.toLowerCase()}`
      const stored = localStorage.getItem(key)
      const hashes = stored ? JSON.parse(stored) : {}
      
      hashes[splitId] = {
        hash,
        timestamp: Date.now()
      }
      
      localStorage.setItem(key, JSON.stringify(hashes))
      console.log('💾 Stored split hash locally:', splitId)
    } catch (error) {
      console.error('❌ Error storing split hash:', error)
    }
  }

  /**
   * Get all split hashes for user
   */
  getUserSplitHashes(userAddress: string): Record<string, { hash: string, timestamp: number }> {
    try {
      const key = `split_hashes_${userAddress.toLowerCase()}`
      const stored = localStorage.getItem(key)
      return stored ? JSON.parse(stored) : {}
    } catch (error) {
      console.error('❌ Error getting split hashes:', error)
      return {}
    }
  }

  /**
   * Check if service is configured
   */
  isConfigured(): boolean {
    return !!this.apiKey
  }
}

export const splitStorageService = new SplitStorageService()
export type { SplitData, SplitMember, UserDues }
