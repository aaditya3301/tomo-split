import { useState, useEffect, useCallback } from 'react'
import { useAccount } from 'wagmi'
import { apiService } from '@/services/apiService'
import { FriendData, GroupData, SplitData, UserDues } from '@/services/databaseService'

interface UseDatabaseReturn {
  // Loading states
  isLoading: boolean
  isSaving: boolean
  
  // Data
  friends: FriendData[]
  groups: GroupData[]
  userDues: UserDues | null
  
  // Operations
  addFriend: (friendData: FriendData) => Promise<boolean>
  removeFriend: (friendId: string) => Promise<boolean>
  createGroup: (name: string, memberWallets: string[]) => Promise<boolean>
  createSplit: (splitData: SplitData) => Promise<boolean>
  recordPayment: (splitId: string, amount: number, method?: string, transactionId?: string) => Promise<boolean>
  
  // Refresh functions
  refreshFriends: () => Promise<void>
  refreshGroups: () => Promise<void>
  refreshDues: () => Promise<void>
  refreshAll: () => Promise<void>
  
  // Status
  isConnected: boolean
  error: string | null
  clearError: () => void
}

export const useDatabase = (): UseDatabaseReturn => {
  const { address, isConnected } = useAccount()
  
  // State
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [friends, setFriends] = useState<FriendData[]>([])
  const [groups, setGroups] = useState<GroupData[]>([])
  const [userDues, setUserDues] = useState<UserDues | null>(null)
  const [error, setError] = useState<string | null>(null)

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  // Create or update user when wallet connects
  useEffect(() => {
    if (address && isConnected) {
      apiService.createOrUpdateUser(address)
        .catch(err => console.warn('Failed to create/update user:', err))
    }
  }, [address, isConnected])

  // Refresh functions
  const refreshFriends = useCallback(async () => {
    if (!address) return
    
    try {
      setIsLoading(true)
      setError(null)
      
      const friendsData = await apiService.getFriends(address)
      setFriends(friendsData)
      console.log('✅ Friends refreshed from database:', friendsData.length)
    } catch (err: any) {
      console.error('❌ Failed to refresh friends from database:', err)
      setError(`Database connection failed: ${err.message}. Please check your API server and database connection.`)
      setFriends([]) // Clear friends on error
    } finally {
      setIsLoading(false)
    }
  }, [address])

  const refreshGroups = useCallback(async () => {
    if (!address) return
    
    try {
      setIsLoading(true)
      setError(null)
      
      const groupsData = await apiService.getGroups(address)
      setGroups(groupsData)
      console.log('✅ Groups refreshed from database:', groupsData.length)
    } catch (err: any) {
      console.error('❌ Failed to refresh groups from database:', err)
      setError(`Database connection failed: ${err.message}. Please check your API server and database connection.`)
      setGroups([]) // Clear groups on error
    } finally {
      setIsLoading(false)
    }
  }, [address])

  const refreshDues = useCallback(async () => {
    if (!address) return
    
    try {
      setError(null)
      
      const duesData = await apiService.getUserDues(address)
      
      // Force state update by creating a new object with timestamp
      setUserDues(prevDues => {
        const newDues = { 
          ...duesData, 
          lastUpdated: Date.now() // Force React to detect change
        }
        console.log('✅ Dues refreshed from database:', newDues)
        console.log('🔄 Previous dues:', prevDues)
        console.log('🔄 Dues changed:', JSON.stringify(prevDues) !== JSON.stringify(newDues))
        return newDues
      })
    } catch (err: any) {
      console.error('❌ Failed to refresh dues from database:', err)
      setError(`Database connection failed: ${err.message}. Please check your API server and database connection.`)
      setUserDues(null) // Clear dues on error
    }
  }, [address])

  const refreshAll = useCallback(async () => {
    if (!address) return
    
    setIsLoading(true)
    try {
      await Promise.all([
        refreshFriends(),
        refreshGroups(),
        refreshDues()
      ])
    } finally {
      setIsLoading(false)
    }
  }, [address, refreshFriends, refreshGroups, refreshDues])

  // Load data when wallet connects
  useEffect(() => {
    if (address && isConnected) {
      refreshAll()
    } else {
      // Clear data when wallet disconnects
      setFriends([])
      setGroups([])
      setUserDues(null)
    }
  }, [address, isConnected, refreshAll])

  // Auto-refresh data every 15 seconds and when page becomes visible
  useEffect(() => {
    if (!address || !isConnected) return

    const interval = setInterval(() => {
      console.log('🔄 Auto-refreshing data...')
      refreshAll()
    }, 15000) // Refresh every 15 seconds (faster for testing)

    const handleVisibilityChange = () => {
      if (!document.hidden && address && isConnected) {
        console.log('🔄 Page became visible, refreshing data...')
        refreshAll()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [address, isConnected, refreshAll])

  // Operation functions
  const addFriend = useCallback(async (friendData: FriendData): Promise<boolean> => {
    if (!address) {
      setError('Wallet not connected')
      return false
    }

    setIsSaving(true)
    setError(null)

    try {
      console.log('🔄 Adding friend to database:', friendData)
      
      await apiService.addFriend(address, friendData)
      console.log('✅ Friend added to database')
      
      // Immediately refresh friends list to show the new friend
      await refreshFriends()
      console.log('✅ Friend added successfully and list refreshed')
      return true
    } catch (err: any) {
      console.error('❌ Failed to add friend to database:', err)
      setError(`Unable to add friend: ${err.message}. Please check your database connection.`)
      return false
    } finally {
      setIsSaving(false)
    }
  }, [address, refreshFriends])

  const removeFriend = useCallback(async (friendId: string): Promise<boolean> => {
    if (!address) {
      setError('Wallet not connected')
      return false
    }

    setIsSaving(true)
    setError(null)

    try {
      await apiService.removeFriend(address, friendId)
      await refreshFriends()
      console.log('✅ Friend removed successfully')
      return true
    } catch (err: any) {
      console.error('❌ Failed to remove friend:', err)
      setError(err.message)
      return false
    } finally {
      setIsSaving(false)
    }
  }, [address, refreshFriends])

  const createGroup = useCallback(async (name: string, memberWallets: string[]): Promise<boolean> => {
    if (!address) {
      setError('Wallet not connected')
      return false
    }

    setIsSaving(true)
    setError(null)

    try {
      console.log('🔄 Creating group in database:', { name, memberWallets })
      
      await apiService.createGroup(address, name, memberWallets)
      console.log('✅ Group created in database')
      
      await refreshGroups()
      console.log('✅ Group created successfully')
      return true
    } catch (err: any) {
      console.error('❌ Failed to create group in database:', err)
      setError(`Unable to create group: ${err.message}. Please check your database connection.`)
      return false
    } finally {
      setIsSaving(false)
    }
  }, [address, refreshGroups])

  const createSplit = useCallback(async (splitData: SplitData): Promise<boolean> => {
    if (!address) {
      setError('Wallet not connected')
      return false
    }

    setIsSaving(true)
    setError(null)

    try {
      console.log('🔄 Creating split in database:', splitData)
      
      await apiService.createSplit(splitData)
      console.log('✅ Split created in database')
      
      // Force multiple refreshes to ensure UI updates
      console.log('🔄 Refreshing data after split creation...')
      await Promise.all([refreshGroups(), refreshDues()])
      
      // Wait a bit and refresh again to ensure data is updated
      setTimeout(async () => {
        console.log('🔄 Second refresh after split creation...')
        await Promise.all([refreshGroups(), refreshDues()])
      }, 1000)
      
      console.log('✅ Split created successfully')
      return true
    } catch (err: any) {
      console.error('❌ Failed to create split in database:', err)
      setError(`Unable to create split: ${err.message}. Please check your database connection.`)
      return false
    } finally {
      setIsSaving(false)
    }
  }, [address, refreshGroups, refreshDues])

  const recordPayment = useCallback(async (
    splitId: string, 
    amount: number, 
    method: string = 'MANUAL',
    transactionId?: string
  ): Promise<boolean> => {
    if (!address) {
      setError('Wallet not connected')
      return false
    }

    setIsSaving(true)
    setError(null)

    try {
      await apiService.recordPayment(splitId, address, amount, method, transactionId)
      await refreshDues() // Refresh dues after payment
      console.log('✅ Payment recorded successfully')
      return true
    } catch (err: any) {
      console.error('❌ Failed to record payment:', err)
      setError(err.message)
      return false
    } finally {
      setIsSaving(false)
    }
  }, [address, refreshDues])

  return {
    // Loading states
    isLoading,
    isSaving,
    
    // Data
    friends,
    groups,
    userDues,
    
    // Operations
    addFriend,
    removeFriend,
    createGroup,
    createSplit,
    recordPayment,
    
    // Refresh functions
    refreshFriends,
    refreshGroups,
    refreshDues,
    refreshAll,
    
    // Status
    isConnected: isConnected && !!address,
    error,
    clearError
  }
}
