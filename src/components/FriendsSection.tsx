import React, { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { ChevronUp, ChevronDown, Plus, Users, Loader2, CheckCircle, AlertCircle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { alchemyENSService } from '@/services/alchemyENSService'

interface Friend {
  id: string
  walletId: string
  resolvedAddress?: string // For ENS names, store the resolved address
  resolvedENS?: string // For addresses, store the resolved ENS name
  isENS?: boolean
  isSelected: boolean
}

interface FriendsSectionProps {
  friends: Friend[]
  onFriendsUpdate: (friends: Friend[]) => void
  onGroupCreate: (selectedFriends: Friend[]) => void
  onAddFriend?: (friendData: any) => Promise<boolean>
}

// Cache for ENS resolutions to avoid repeated API calls
const ensCache = new Map<string, { address: string | null; error?: string; timestamp: number }>()
const CACHE_DURATION = 30 * 60 * 1000 // 30 minutes cache - increased from 5 minutes to prevent premature expiration

// Function to clear expired cache entries
const clearExpiredCache = () => {
  const now = Date.now()
  for (const [key, value] of ensCache.entries()) {
    if (now - value.timestamp > CACHE_DURATION) {
      ensCache.delete(key)
    }
  }
}

const FriendsSection: React.FC<FriendsSectionProps> = ({ 
  friends, 
  onFriendsUpdate, 
  onGroupCreate,
  onAddFriend
}) => {
  const [isAddFriendOpen, setIsAddFriendOpen] = useState(false)
  const [newFriend, setNewFriend] = useState({ walletId: '' })
  const [ensError, setEnsError] = useState<string | null>(null)
  const [isResolvingENS, setIsResolvingENS] = useState(false)
  const [resolvedAddress, setResolvedAddress] = useState<string | null>(null)
  const [resolutionTimestamp, setResolutionTimestamp] = useState<number>(0)
  
  // Use ref to store debounce timer
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Clean up expired cache entries periodically
  useEffect(() => {
    const cleanup = setInterval(() => {
      clearExpiredCache()
    }, 60000) // Clean every minute

    return () => clearInterval(cleanup)
  }, [])

  // Function to get cached ENS resolution or fetch new one
  const getCachedENSResolution = async (ensName: string): Promise<{ address: string | null; error?: string }> => {
    const normalizedName = ensName.toLowerCase().trim()
    const now = Date.now()
    
    // Check cache first
    const cached = ensCache.get(normalizedName)
    if (cached && (now - cached.timestamp) < CACHE_DURATION) {
      console.log(`🎯 Using cached ENS resolution for ${normalizedName}`)
      return { address: cached.address, error: cached.error }
    }
    
    // Cache miss or expired, fetch new resolution
    console.log(`🔄 Fetching new ENS resolution for ${normalizedName}`)
    try {
      const result = await alchemyENSService.resolveENSToAddress(normalizedName)
      
      // Cache the result
      ensCache.set(normalizedName, {
        address: result.address,
        error: result.error,
        timestamp: now
      })
      
      return result
    } catch (error) {
      const errorResult = { address: null, error: 'Resolution failed' }
      ensCache.set(normalizedName, { ...errorResult, timestamp: now })
      return errorResult
    }
  }

  const handleWalletIdChange = async (walletId: string) => {
    setNewFriend({ walletId })
    
    // Clear previous state when input changes
    setEnsError(null)
    setResolvedAddress(null)
    setResolutionTimestamp(0)

    // Clear any existing debounce timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
      debounceTimerRef.current = null
    }

    // Only resolve ENS names to show wallet address preview
    // Add minimum length check to avoid resolving incomplete names
    if (walletId.trim() && alchemyENSService.isENSName(walletId) && walletId.length >= 7) {
      // Debounce ENS resolution by 800ms to avoid rapid API calls while typing
      debounceTimerRef.current = setTimeout(async () => {
        setIsResolvingENS(true)
        const currentInput = walletId // Capture current input to prevent race conditions
        
        try {
          const result = await getCachedENSResolution(walletId)
          
          // Only update state if the input hasn't changed (prevent race conditions)
          if (newFriend.walletId === currentInput || walletId === currentInput) {
            if (result.error) {
              setEnsError(result.error)
              setResolvedAddress(null)
              setResolutionTimestamp(0)
            } else if (result.address) {
              setResolvedAddress(result.address)
              setEnsError(null) // Clear any previous errors
              setResolutionTimestamp(Date.now()) // Mark when resolution succeeded
              console.log(`✅ ENS ${walletId} resolved to: ${result.address}`)
            }
          }
        } catch (error) {
          // Only set error if input hasn't changed
          if (newFriend.walletId === currentInput || walletId === currentInput) {
            setEnsError('Failed to resolve ENS name')
            setResolvedAddress(null)
            setResolutionTimestamp(0)
            console.error('ENS resolution error:', error)
          }
        } finally {
          setIsResolvingENS(false)
        }
      }, 800) // 800ms debounce delay
    }
  }
  
  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [])

  const handleAddFriend = async () => {
    if (!newFriend.walletId) return
    
    const inputValue = newFriend.walletId.trim()
    
    // Check if it's an ENS name
    if (alchemyENSService.isENSName(inputValue)) {
      // For ENS names: use cached resolution or resolve if not available
      let finalResolvedAddress = resolvedAddress
      
      // If we have a recent successful resolution (within last 10 seconds), use it
      const isRecentResolution = resolvedAddress && resolutionTimestamp && (Date.now() - resolutionTimestamp) < 10000
      
      if (!finalResolvedAddress || !isRecentResolution) {
        setIsResolvingENS(true)
        try {
          const result = await getCachedENSResolution(inputValue)
          if (result.error || !result.address) {
            setEnsError(result.error || 'Failed to resolve ENS name')
            setIsResolvingENS(false)
            return
          }
          finalResolvedAddress = result.address
          setResolvedAddress(finalResolvedAddress)
          setEnsError(null) // Clear any previous errors when resolution succeeds
          setResolutionTimestamp(Date.now())
        } catch (error) {
          setEnsError('Failed to resolve ENS name')
          setIsResolvingENS(false)
          return
        }
        setIsResolvingENS(false)
      }
      
      // CRITICAL: Don't proceed if we don't have a resolved address
      if (!finalResolvedAddress) {
        setEnsError('Cannot add ENS friend without resolved address')
        return
      }
      
      const friendData = {
        id: Date.now().toString(),
        name: inputValue, // Use ENS name as display name
        walletId: inputValue, // Store the ENS name
        resolvedAddress: finalResolvedAddress, // Store the resolved wallet address
        isENS: true,
        isSelected: false
      }
      
      // Use database service if available, otherwise update local state
      if (onAddFriend) {
        setIsResolvingENS(true)
        const success = await onAddFriend(friendData)
        setIsResolvingENS(false)
        
        if (success) {
          console.log(`✅ Added ENS friend to database: ${inputValue} → ${finalResolvedAddress}`)
          // Clear form on success
          setNewFriend({ walletId: '' })
          setEnsError(null)
          setResolvedAddress(null)
          setResolutionTimestamp(0)
          setIsAddFriendOpen(false)
          return // Exit early to avoid duplicate form clearing
        } else {
          setEnsError('Failed to add friend to database. Please check server logs.')
          return
        }
      } else {
        onFriendsUpdate([...friends, friendData])
        console.log(`✅ Added ENS friend locally: ${inputValue} → ${finalResolvedAddress}`)
      }
      
    } else if (alchemyENSService.isEthereumAddress(inputValue)) {
      // For wallet addresses: store address as walletId, try to find ENS
      setIsResolvingENS(true)
      
      try {
        const ensName = await alchemyENSService.resolveAddressToENS(inputValue)
        
        const friendData = {
          id: Date.now().toString(),
          name: ensName || `${inputValue.slice(0, 6)}...${inputValue.slice(-4)}`, // Use ENS or truncated address as name
          walletId: inputValue, // Store the wallet address
          resolvedAddress: inputValue,
          resolvedENS: ensName || undefined, // Store the resolved ENS name if found
          isENS: false,
          isSelected: false
        }
        
        // Use database service if available, otherwise update local state
        if (onAddFriend) {
          const success = await onAddFriend(friendData)
          setIsResolvingENS(false)
          
          if (success) {
            console.log(`✅ Added address friend to database: ${inputValue}${ensName ? ` ← ${ensName}` : ''}`)
            // Clear form on success
            setNewFriend({ walletId: '' })
            setEnsError(null)
            setResolvedAddress(null)
            setResolutionTimestamp(0)
            setIsAddFriendOpen(false)
            return // Exit early to avoid duplicate form clearing
          } else {
            setEnsError('Failed to add friend to database')
            return
          }
        } else {
          onFriendsUpdate([...friends, friendData])
          console.log(`✅ Added address friend locally: ${inputValue}${ensName ? ` ← ${ensName}` : ''}`)
        }
        
      } catch (error) {
        // Still add the friend even if reverse ENS fails
        const friendData = {
          id: Date.now().toString(),
          name: `${inputValue.slice(0, 6)}...${inputValue.slice(-4)}`, // Truncated address as name
          walletId: inputValue,
          resolvedAddress: inputValue,
          isENS: false,
          isSelected: false
        }
        
        // Use database service if available, otherwise update local state
        if (onAddFriend) {
          const success = await onAddFriend(friendData)
          if (success) {
            console.log(`✅ Added address friend to database: ${inputValue} (no ENS found)`)
            // Clear form on success
            setNewFriend({ walletId: '' })
            setEnsError(null)
            setResolvedAddress(null)
            setResolutionTimestamp(0)
            setIsAddFriendOpen(false)
            return // Exit early to avoid duplicate form clearing
          } else {
            setEnsError('Failed to add friend to database')
            return
          }
        } else {
          onFriendsUpdate([...friends, friendData])
          console.log(`✅ Added address friend locally: ${inputValue} (no ENS found)`)
        }
      } finally {
        setIsResolvingENS(false)
      }
      
    } else {
      setEnsError('Please enter a valid ENS name or Ethereum address')
      return
    }
    
    // Clear form
    setNewFriend({ walletId: '' })
    setEnsError(null)
    setResolvedAddress(null)
    setIsAddFriendOpen(false)
  }

  const handleFriendSelection = (friendId: string, checked: boolean) => {
    const updatedFriends = friends.map(friend =>
      friend.id === friendId ? { ...friend, isSelected: checked } : friend
    )
    onFriendsUpdate(updatedFriends)
  }

  const selectedFriends = friends.filter(friend => friend.isSelected)

  const handleCreateGroup = () => {
    if (selectedFriends.length > 0) {
      onGroupCreate(selectedFriends)
      // Deselect all friends after group creation
      const updatedFriends = friends.map(friend => ({ ...friend, isSelected: false }))
      onFriendsUpdate(updatedFriends)
    }
  }

  const handleCancelSelection = () => {
    const updatedFriends = friends.map(friend => ({ ...friend, isSelected: false }))
    onFriendsUpdate(updatedFriends)
  }

  return (
    <div className="h-full flex flex-col">
      {/* Friends List Header */}
      <Card className="glass flex-1 flex flex-col min-h-0">
        <CardHeader className="flex-shrink-0 pb-4">
          <CardTitle className="flex items-center space-x-2">
            <Users className="h-5 w-5" />
            <span>Friends</span>
            <Badge variant="outline">{friends.length}</Badge>
          </CardTitle>
        </CardHeader>
        
        <CardContent className="flex-1 flex flex-col min-h-0 p-4 pt-0">
          {/* Friends List - Scrollable Container */}
          <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden scrollbar-thin smooth-scroll">
            <div className="space-y-3 pr-3 pb-2">
            {friends.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">
                No friends added yet. Add your first friend below!
              </p>
            ) : (
              friends.map((friend) => (
                <div 
                  key={friend.id} 
                  className="flex items-start space-x-3 p-4 rounded-lg border border-border/20 hover:bg-muted/30 transition-colors min-w-0"
                >
                  <Checkbox
                    checked={friend.isSelected}
                    onCheckedChange={(checked) => 
                      handleFriendSelection(friend.id, checked as boolean)
                    }
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">
                      {friend.isENS ? friend.walletId : (friend.resolvedENS || (
                        friend.walletId.length > 15 
                          ? `${friend.walletId.slice(0, 8)}...${friend.walletId.slice(-6)}`
                          : friend.walletId
                      ))}
                    </p>
                    <div className="text-sm text-muted-foreground">
                      {friend.isENS ? (
                        // For ENS friends: show the ENS name with resolved address below
                        <>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs">ENS Name</span>
                            <Badge variant="outline" className="text-xs">
                              ENS
                            </Badge>
                          </div>
                          {friend.resolvedAddress && (
                            <p className="text-xs text-muted-foreground/80 font-mono truncate">
                              → {friend.resolvedAddress.slice(0, 6)}...{friend.resolvedAddress.slice(-4)}
                            </p>
                          )}
                        </>
                      ) : (
                        // For address friends: show the address with ENS name if available
                        <>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-xs truncate">
                              {friend.walletId.length > 10 
                                ? `${friend.walletId.slice(0, 6)}...${friend.walletId.slice(-4)}`
                                : friend.walletId
                              }
                            </span>
                            {friend.resolvedENS && (
                              <Badge variant="outline" className="text-xs bg-green-500/10 text-green-600 border-green-500/30 flex-shrink-0">
                                Has ENS
                              </Badge>
                            )}
                          </div>
                          {friend.resolvedENS && (
                            <p className="text-xs text-green-600/80 truncate">
                              ← {friend.resolvedENS}
                            </p>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
            </div>
          </div>

          {/* Group Action Buttons */}
          {selectedFriends.length > 0 && (
            <div className="flex-shrink-0 flex space-x-2 pt-4 border-t border-border/20 mt-4">
              <Button 
                onClick={handleCreateGroup}
                className="flex-1 bg-gradient-to-r from-primary to-accent"
              >
                <Users className="mr-2 h-4 w-4" />
                Form Group ({selectedFriends.length})
              </Button>
              <Button 
                variant="outline" 
                onClick={handleCancelSelection}
              >
                Cancel
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Friend Section */}
      <div className="mt-6">
        <div className="relative">
          <Button
            variant="outline"
            onClick={() => setIsAddFriendOpen(!isAddFriendOpen)}
            className="w-full flex items-center justify-center space-x-2 py-3"
          >
            <Plus className="h-4 w-4" />
            <span>Add Friend</span>
            {isAddFriendOpen ? 
              <ChevronDown className="h-4 w-4" /> : 
              <ChevronUp className="h-4 w-4" />
            }
          </Button>

          {isAddFriendOpen && (
            <Card className="mt-2 glass">
              <CardContent className="p-4 space-y-3">
                <div className="space-y-2">
                  <div className="relative">
                    <Input
                      placeholder="Wallet address or ENS name (e.g., vitalik.eth)"
                      value={newFriend.walletId}
                      onChange={(e) => handleWalletIdChange(e.target.value)}
                      className={ensError ? 'border-destructive' : resolvedAddress ? 'border-green-500' : ''}
                    />
                    {isResolvingENS && (
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      </div>
                    )}
                    {!isResolvingENS && resolvedAddress && (
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      </div>
                    )}
                    {!isResolvingENS && ensError && (
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                        <AlertCircle className="h-4 w-4 text-destructive" />
                      </div>
                    )}
                  </div>
                  
                  {resolvedAddress && (
                    <div className="p-3 bg-green-500/10 border border-green-500/20 rounded text-sm">
                      <div className="flex items-center space-x-2 mb-2">
                        <CheckCircle className="h-3 w-3 text-green-500" />
                        <span className="text-green-600 font-medium">ENS resolved successfully</span>
                      </div>
                      <div className="space-y-1">
                        <div className="text-xs">
                          <span className="text-muted-foreground">Will save as:</span> 
                          <div className="font-medium mt-1 break-all">{newFriend.walletId}</div>
                        </div>
                        <div className="text-xs">
                          <span className="text-muted-foreground">Resolves to:</span>
                          <div className="font-mono mt-1 break-all text-xs">
                            {resolvedAddress.slice(0, 6)}...{resolvedAddress.slice(-4)}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {ensError && (
                    <div className="p-2 bg-destructive/10 border border-destructive/20 rounded text-sm">
                      <div className="flex items-center space-x-2">
                        <AlertCircle className="h-3 w-3 text-destructive" />
                        <span className="text-destructive">{ensError}</span>
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="flex space-x-2">
                  <Button 
                    onClick={handleAddFriend}
                    disabled={!newFriend.walletId || isResolvingENS || !!ensError}
                    className="flex-1"
                  >
                    {isResolvingENS ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Resolving...
                      </>
                    ) : (
                      'Save'
                    )}
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setIsAddFriendOpen(false)
                      setNewFriend({ walletId: '' })
                      setEnsError(null)
                      setResolvedAddress(null)
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}

export default FriendsSection
