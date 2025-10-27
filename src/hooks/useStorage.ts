import { useState, useCallback } from 'react'
import { useAccount } from 'wagmi'
import { lighthouseService } from '@/services/lighthouseService'

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

interface UseStorageReturn {
  // Loading states
  isUploading: boolean
  isLoading: boolean
  
  // Upload functions
  saveData: (friends: Friend[], groups: Group[]) => Promise<boolean>
  
  // Load functions
  loadData: () => Promise<{ friends: Friend[], groups: Group[] } | null>
  
  // Status
  lastUploadHash: string | null
  isConfigured: boolean
  
  // Error handling
  error: string | null
  clearError: () => void
}

export const useStorage = (): UseStorageReturn => {
  const { address } = useAccount()
  const [isUploading, setIsUploading] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [lastUploadHash, setLastUploadHash] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  const saveData = useCallback(async (friends: Friend[], groups: Group[]): Promise<boolean> => {
    if (!address) {
      setError('Wallet not connected')
      return false
    }

    if (!lighthouseService.isConfigured()) {
      setError('Lighthouse storage not configured. Please check your VITE_STORAGE_API_KEY.')
      return false
    }

    setIsUploading(true)
    setError(null)

    try {
      console.log('💾 Saving data to Lighthouse storage...')
      
      const result = await lighthouseService.saveUserData(friends, groups, address)
      
      if (result.success && result.hash) {
        setLastUploadHash(result.hash)
        console.log('✅ Data saved successfully! Hash:', result.hash)
        return true
      } else {
        setError(result.error || 'Failed to save data')
        return false
      }
    } catch (err: any) {
      const errorMessage = err.message || 'Unknown error occurred'
      setError(errorMessage)
      console.error('❌ Save error:', errorMessage)
      return false
    } finally {
      setIsUploading(false)
    }
  }, [address])

  const loadData = useCallback(async (): Promise<{ friends: Friend[], groups: Group[] } | null> => {
    if (!address) {
      setError('Wallet not connected')
      return null
    }

    if (!lighthouseService.isConfigured()) {
      setError('Lighthouse storage not configured')
      return null
    }

    setIsLoading(true)
    setError(null)

    try {
      console.log('📥 Loading data from Lighthouse storage...')
      
      const result = await lighthouseService.loadUserData(address)
      
      if (result.success && result.data) {
        console.log('✅ Data loaded successfully!')
        return {
          friends: result.data.friends || [],
          groups: result.data.groups || []
        }
      } else {
        // Don't set error for "no data found" - it's normal for new users
        if (result.error?.includes('No stored data found')) {
          console.log('ℹ️ No stored data found for this user (new user)')
          return { friends: [], groups: [] }
        } else {
          setError(result.error || 'Failed to load data')
          return null
        }
      }
    } catch (err: any) {
      const errorMessage = err.message || 'Unknown error occurred'
      setError(errorMessage)
      console.error('❌ Load error:', errorMessage)
      return null
    } finally {
      setIsLoading(false)
    }
  }, [address])

  return {
    isUploading,
    isLoading,
    saveData,
    loadData,
    lastUploadHash,
    isConfigured: lighthouseService.isConfigured(),
    error,
    clearError
  }
}
