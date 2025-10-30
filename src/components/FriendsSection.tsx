import React, { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { ChevronUp, ChevronDown, Plus, Users, Loader2, CheckCircle, AlertCircle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { useMultiChainWallet } from '@/contexts/MultiChainWalletContext'
import { multiChainNameService } from '@/services/multiChainNameService'

interface Friend {
  id: string
  walletId: string
  resolvedAddress?: string // For ENS/ANS names, store the resolved address
  resolvedENS?: string // For EVM addresses, store the resolved ENS name
  resolvedANS?: string // For Aptos addresses, store the resolved ANS name
  isENS?: boolean // Legacy - for ENS names
  isANS?: boolean // For ANS names
  isNameService?: boolean // General flag for any name service
  chainType?: 'EVM' | 'APTOS'
  isSelected: boolean
}

interface FriendsSectionProps {
  friends: Friend[]
  onFriendsUpdate: (friends: Friend[]) => void
  onGroupCreate: (selectedFriends: Friend[]) => void
  onAddFriend?: (friendData: any) => Promise<boolean>
}

// Cache for name service resolutions to avoid repeated API calls
const nameResolutionCache = new Map<string, { 
  address: string | null
  name?: string
  error?: string
  timestamp: number 
  chainType: 'EVM' | 'APTOS'
}>()
const CACHE_DURATION = 30 * 60 * 1000 // 30 minutes cache

// Function to clear expired cache entries
const clearExpiredCache = () => {
  const now = Date.now()
  for (const [key, value] of nameResolutionCache.entries()) {
    if (now - value.timestamp > CACHE_DURATION) {
      nameResolutionCache.delete(key)
    }
  }
}

const FriendsSection: React.FC<FriendsSectionProps> = ({ 
  friends, 
  onFriendsUpdate, 
  onGroupCreate,
  onAddFriend
}) => {
  // Multi-chain wallet context
  const { chainType, currentAccount } = useMultiChainWallet()
  
  const [isAddFriendOpen, setIsAddFriendOpen] = useState(false)
  const [newFriend, setNewFriend] = useState({ walletId: '' })
  const [nameServiceError, setNameServiceError] = useState<string | null>(null)
  const [isResolvingName, setIsResolvingName] = useState(false)
  const [resolvedData, setResolvedData] = useState<{
    address?: string
    name?: string
    isNameService?: boolean
    chainType?: 'EVM' | 'APTOS'
    resolvedBy?: string
  } | null>(null)
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

  // Function to try address validation and ENS resolution only
  const tryAddressResolution = async (
    input: string
  ): Promise<{ 
    address: string | null
    name?: string
    error?: string 
    isNameService?: boolean
    chainType?: 'EVM' | 'APTOS'
    resolvedBy?: string
  }> => {
    const normalizedInput = input.toLowerCase().trim()
    const now = Date.now()
    
    // Check if it's a direct EVM address
    if (multiChainNameService.isValidAddress(input, 'EVM')) {
      console.log(`✅ Detected valid EVM address: ${input}`)
      return { 
        address: input, 
        isNameService: false, 
        chainType: 'EVM',
        resolvedBy: 'Direct EVM Address'
      }
    }
    
    // Check if it's a direct Aptos address
    if (multiChainNameService.isValidAddress(input, 'APTOS')) {
      console.log(`✅ Detected valid Aptos address: ${input}`)
      return { 
        address: input, 
        isNameService: false, 
        chainType: 'APTOS',
        resolvedBy: 'Direct Aptos Address'
      }
    }
    
    // Only try ENS resolution for .eth names
    if (normalizedInput.endsWith('.eth')) {
      const cacheKey = `EVM:${normalizedInput}`
      
      // Check cache first
      const cached = nameResolutionCache.get(cacheKey)
      if (cached && (now - cached.timestamp) < CACHE_DURATION && cached.chainType === 'EVM') {
        console.log(`🎯 Using cached ENS resolution for ${normalizedInput}`)
        return { 
          address: cached.address, 
          name: cached.name,
          error: cached.error,
          isNameService: !!cached.name,
          chainType: 'EVM',
          resolvedBy: 'Cached ENS'
        }
      }
      
      // Fetch new ENS resolution
      console.log(`🔄 Trying ENS resolution for ${normalizedInput}`)
      try {
        const result = await multiChainNameService.processWalletInput(input, 'EVM')
        
        // Cache the result
        nameResolutionCache.set(cacheKey, {
          address: result.resolvedAddress || null,
          name: result.resolvedName,
          error: result.error,
          timestamp: now,
          chainType: 'EVM'
        })
        
        return {
          address: result.resolvedAddress || null,
          name: result.resolvedName,
          error: result.error,
          isNameService: result.isNameService,
          chainType: 'EVM',
          resolvedBy: 'ENS Resolution'
        }
      } catch (error) {
        const errorResult = { 
          address: null, 
          error: 'ENS resolution failed',
          isNameService: false,
          chainType: 'EVM' as const,
          resolvedBy: 'Failed ENS'
        }
        nameResolutionCache.set(cacheKey, { 
          ...errorResult, 
          timestamp: now, 
          chainType: 'EVM'
        })
        return errorResult
      }
    }
    
    // If we reach here, it's not a valid format
    return { 
      address: null, 
      error: 'Please enter a valid EVM address, Aptos address, or ENS name (.eth)', 
      isNameService: false 
    }
  }

  const handleWalletIdChange = async (walletId: string) => {
    setNewFriend({ walletId })
    
    // Clear previous state when input changes
    setNameServiceError(null)
    setResolvedData(null)
    setResolutionTimestamp(0)

    // Clear any existing debounce timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
      debounceTimerRef.current = null
    }

    // Address/ENS resolution - support ETH addresses, Aptos addresses, ENS names (.eth)
    const shouldResolve = walletId.trim() && walletId.length >= 7 && (
      walletId.endsWith('.eth') || // ENS names only
      walletId.startsWith('0x') || // Hex addresses (ETH/Aptos)
      /^[a-fA-F0-9]{64}$/.test(walletId) // 64 char hex (Aptos without 0x)
    )

    if (shouldResolve) {
      // Debounce name resolution by 800ms to avoid rapid API calls while typing
      debounceTimerRef.current = setTimeout(async () => {
        setIsResolvingName(true)
        const currentInput = walletId // Capture current input to prevent race conditions
        
        try {
          const result = await tryAddressResolution(walletId)
          
          // Only update state if the input hasn't changed (prevent race conditions)
          if (newFriend.walletId === currentInput || walletId === currentInput) {
            if (result.error && !result.address) {
              setNameServiceError(result.error)
              setResolvedData(null)
              setResolutionTimestamp(0)
            } else if (result.address) {
              setResolvedData({
                address: result.address,
                name: result.name,
                isNameService: result.isNameService,
                chainType: result.chainType,
                resolvedBy: result.resolvedBy
              })
              setNameServiceError(null) // Clear any previous errors
              setResolutionTimestamp(Date.now()) // Mark when resolution succeeded
              
              console.log(`✅ ${result.resolvedBy}: ${walletId} → ${result.address}`)
            }
          }
        } catch (error) {
          // Only set error if input hasn't changed
          if (newFriend.walletId === currentInput || walletId === currentInput) {
            setNameServiceError('Failed to resolve address')
            setResolvedData(null)
            setResolutionTimestamp(0)
            console.error('Multi-chain resolution error:', error)
          }
        } finally {
          setIsResolvingName(false)
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
    
    // Process the wallet input using network-agnostic resolution
    let finalResolvedData = resolvedData
    
    // If we have a recent successful resolution (within last 10 seconds), use it
    const isRecentResolution = resolvedData && resolutionTimestamp && (Date.now() - resolutionTimestamp) < 10000
    
    if (!finalResolvedData || !isRecentResolution) {
      setIsResolvingName(true)
      try {
        const result = await tryAddressResolution(inputValue)
        if (result.error && !result.address) {
          setNameServiceError(result.error)
          setIsResolvingName(false)
          return
        }
        finalResolvedData = {
          address: result.address || undefined,
          name: result.name,
          isNameService: result.isNameService,
          chainType: result.chainType,
          resolvedBy: result.resolvedBy
        }
        setResolvedData(finalResolvedData)
        setNameServiceError(null) // Clear any previous errors when resolution succeeds
        setResolutionTimestamp(Date.now())
      } catch (error) {
        setNameServiceError('Failed to resolve address on any network')
        setIsResolvingName(false)
        return
      }
      setIsResolvingName(false)
    }
    
    // Determine the final address and chain type to use
    const finalAddress = finalResolvedData?.address
    const detectedChainType = finalResolvedData?.chainType
    
    // CRITICAL: Don't proceed if we don't have a valid address
    if (!finalAddress || !detectedChainType) {
      setNameServiceError('Cannot add friend - address not found on any supported network (EVM/Aptos)')
      return
    }
    
    // Create friend data based on detected chain type
    const friendData = {
      id: Date.now().toString(),
      name: finalResolvedData?.name || `${finalAddress.slice(0, 6)}...${finalAddress.slice(-4)}`, // Use resolved name or truncated address
      walletId: finalResolvedData?.isNameService ? inputValue : finalAddress, // Store name service input or address
      resolvedAddress: finalAddress, // Store the resolved/validated address
      ...(detectedChainType === 'EVM' && {
        resolvedENS: finalResolvedData?.isNameService ? inputValue : finalResolvedData?.name,
        isENS: finalResolvedData?.isNameService || false
      }),
      isNameService: finalResolvedData?.isNameService || false,
      chainType: detectedChainType,
      isSelected: false
    }
    
    // Use database service if available, otherwise update local state
    if (onAddFriend) {
      setIsResolvingName(true)
      const success = await onAddFriend(friendData)
      setIsResolvingName(false)
      
      if (success) {
        const serviceType = detectedChainType === 'EVM' ? 'ENS' : 'ANS'
        console.log(`✅ Added ${detectedChainType} friend to database: ${inputValue} → ${finalAddress} (via ${finalResolvedData?.resolvedBy})`)
        // Clear form on success
        setNewFriend({ walletId: '' })
        setNameServiceError(null)
        setResolvedData(null)
        setResolutionTimestamp(0)
        setIsAddFriendOpen(false)
        return // Exit early to avoid duplicate form clearing
      } else {
        setNameServiceError('Failed to add friend to database. Please check server logs.')
        return
      }
    } else {
      onFriendsUpdate([...friends, friendData])
      console.log(`✅ Added ${detectedChainType} friend locally: ${inputValue} → ${finalAddress} (via ${finalResolvedData?.resolvedBy})`)
    }
    
    // Clear form
    setNewFriend({ walletId: '' })
    setNameServiceError(null)
    setResolvedData(null)
    setResolutionTimestamp(0)
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
        <CardHeader className="flex-shrink-0 pb-2 pt-3">
          <CardTitle className="flex items-center justify-between text-sm">
            <div className="flex items-center space-x-2">
              <Users className="h-4 w-4" />
              <span>Friends</span>
              <Badge variant="outline" className="text-xs px-1.5 py-0.5">{friends.length}</Badge>
            </div>
          </CardTitle>
        </CardHeader>
        
        <CardContent className="flex-1 flex flex-col min-h-0 p-3 pt-0">
          {/* Friends List - Scrollable Container */}
          <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden scrollbar-thin smooth-scroll">
            <div className="space-y-2 pr-2 pb-2">
            {friends.length === 0 ? (
              <p className="text-muted-foreground text-center py-3 text-xs">
                No friends added yet. Add your first friend below!
              </p>
            ) : (
              friends.map((friend) => (
                <div 
                  key={friend.id} 
                  className="flex items-start space-x-2 p-2.5 rounded-md border border-border/20 hover:bg-muted/30 transition-colors min-w-0"
                >
                  <Checkbox
                    checked={friend.isSelected}
                    onCheckedChange={(checked) => 
                      handleFriendSelection(friend.id, checked as boolean)
                    }
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <p className="font-medium truncate text-sm">
                        {friend.isNameService ? friend.walletId : (
                          friend.resolvedENS || (
                            friend.walletId.length > 15 
                              ? `${friend.walletId.slice(0, 6)}...${friend.walletId.slice(-4)}`
                              : friend.walletId
                          )
                        )}
                      </p>
                      {friend.isENS && (
                        <Badge variant="outline" className="text-xs bg-blue-500/10 text-blue-600 border-blue-500/30 flex-shrink-0 px-1 py-0">
                          ENS
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {!friend.isENS && friend.resolvedENS ? (
                          <Badge variant="outline" className="text-xs bg-green-500/10 text-green-600 border-green-500/30 px-1 py-0">
                            Has ENS
                          </Badge>
                        ) : !friend.isENS && friend.chainType && (
                          <Badge variant="outline" className="text-xs px-1 py-0">
                            {friend.chainType === 'EVM' ? 'Ethereum' : 'Aptos'}
                          </Badge>
                        )}
                      </div>
                      
                      {friend.isNameService ? (
                        // For name service friends: show resolved address
                        friend.resolvedAddress && (
                          <p className="text-xs text-muted-foreground/80 font-mono truncate mt-0.5">
                            → {friend.resolvedAddress.slice(0, 6)}...{friend.resolvedAddress.slice(-4)}
                          </p>
                        )
                      ) : (
                        // For address friends: show name service if available
                        <>
                          <div className="font-mono text-xs truncate mt-0.5">
                            {friend.walletId.length > 10 
                              ? `${friend.walletId.slice(0, 6)}...${friend.walletId.slice(-4)}`
                              : friend.walletId
                            }
                          </div>

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
                      placeholder="Enter EVM address, Aptos address, or ENS name (.eth)"
                      value={newFriend.walletId}
                      onChange={(e) => handleWalletIdChange(e.target.value)}
                      className={nameServiceError ? 'border-destructive' : resolvedData?.address ? 'border-green-500' : ''}
                    />
                    {isResolvingName && (
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      </div>
                    )}
                    {!isResolvingName && resolvedData?.address && (
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      </div>
                    )}
                    {!isResolvingName && nameServiceError && (
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                        <AlertCircle className="h-4 w-4 text-destructive" />
                      </div>
                    )}
                  </div>
                  
                  {resolvedData?.address && (
                    <div className="p-3 bg-green-500/10 border border-green-500/20 rounded text-sm">
                      <div className="flex items-center space-x-2 mb-2">
                        <CheckCircle className="h-3 w-3 text-green-500" />
                        <span className="text-green-600 font-medium">
                          {resolvedData.resolvedBy || 'Address resolved successfully'}
                        </span>
                        {resolvedData.chainType && (
                          <Badge variant="outline" className="text-xs">
                            {resolvedData.chainType === 'EVM' ? 'Ethereum' : 'Aptos'}
                          </Badge>
                        )}
                      </div>
                      <div className="space-y-1">
                        <div className="text-xs">
                          <span className="text-muted-foreground">Will save as:</span> 
                          <div className="font-medium mt-1 break-all">{newFriend.walletId}</div>
                        </div>
                        <div className="text-xs">
                          <span className="text-muted-foreground">
                            {resolvedData.isNameService ? 'Resolves to' : 'Valid address'}:
                          </span>
                          <div className="font-mono mt-1 break-all text-xs">
                            {resolvedData.address.slice(0, 6)}...{resolvedData.address.slice(-4)}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}


                  
                  {nameServiceError && (
                    <div className="p-2 bg-destructive/10 border border-destructive/20 rounded text-sm">
                      <div className="flex items-center space-x-2">
                        <AlertCircle className="h-3 w-3 text-destructive" />
                        <span className="text-destructive">{nameServiceError}</span>
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="flex space-x-2">
                  <Button 
                    onClick={handleAddFriend}
                    disabled={!newFriend.walletId || isResolvingName || !!nameServiceError}
                    className="flex-1"
                  >
                    {isResolvingName ? (
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
                      setNameServiceError(null)
                      setResolvedData(null)
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
