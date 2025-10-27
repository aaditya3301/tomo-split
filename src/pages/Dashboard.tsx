import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import DashboardLayout from '@/layouts/DashboardLayout'
import FriendsSection from '@/components/FriendsSection'
import GroupModal from '@/components/GroupModal'
import { useDatabase } from '@/hooks/useDatabase'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle, Loader2 } from 'lucide-react'
// import StorageStatus from '@/components/StorageStatus'
// import { useStorage } from '@/hooks/useStorage'
// import { type SplitData } from '@/services/splitStorageService'

interface Friend {
  id: string
  name: string
  walletId: string
  resolvedAddress?: string // For ENS names, store the resolved address
  resolvedENS?: string // For addresses, store the resolved ENS name
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

const Dashboard: React.FC = () => {
  const navigate = useNavigate()

  // Database hook for all data operations
  const {
    isLoading,
    isSaving,
    friends,
    groups,
    userDues,
    addFriend,
    removeFriend,
    createGroup,
    createSplit,
    recordPayment,
    refreshAll,
    isConnected,
    error,
    clearError
  } = useDatabase()

  // Local state for friend selections (not stored in database)
  const [selectedFriendIds, setSelectedFriendIds] = useState<Set<string>>(new Set())

  // Convert database friends to component format with selection state
  const componentFriends: Friend[] = friends.map(friend => ({
    id: friend.id,
    name: friend.name,
    walletId: friend.walletId,
    resolvedAddress: friend.resolvedAddress,
    resolvedENS: friend.resolvedENS,
    isENS: friend.isENS,
    isSelected: selectedFriendIds.has(friend.id)
  }))

  // Convert database groups to component format
  const componentGroups: Group[] = groups.map(group => ({
    id: group.id,
    name: group.name,
    hash: group.hash,
    members: group.members,
    createdAt: group.createdAt,
    isSettled: group.isSettled,
    totalAmount: group.totalAmount,
    yourShare: group.yourShare,
    isPaid: group.isPaid
  }))

  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false)
  // const [splits, setSplits] = useState<SplitData[]>([])

  // Handle friend selection changes
  const handleFriendsUpdate = (updatedFriends: Friend[]) => {
    // Extract the selected friend IDs and update local state
    const newSelectedIds = new Set(
      updatedFriends.filter(friend => friend.isSelected).map(friend => friend.id)
    )
    setSelectedFriendIds(newSelectedIds)
  }

  // Clear friend selections
  const clearFriendSelections = () => {
    setSelectedFriendIds(new Set())
  }

  const mockMetrics = {
    totalEarnings: "1,234.56",
    activeHooks: 3,
    referrals: 42,
    volumeGenerated: "98,765"
  }

  // Legacy handlers removed - using database operations now

  // Group creation handler
  const handleCreateGroup = async (groupName: string, selectedFriends: Friend[]) => {
    const memberWallets = selectedFriends
      .map(f => f.resolvedAddress || f.walletId)
      .filter(Boolean)

    if (memberWallets.length > 0) {
      console.log('🔄 Creating group:', { groupName, memberWallets })

      const success = await createGroup(groupName, memberWallets)
      if (success) {
        console.log('✅ Group created successfully')
        clearFriendSelections()
      } else {
        console.error('❌ Failed to create group')
      }
    }
  }

  // Handle group click to navigate to expense page
  const handleGroupClick = (groupId: string) => {
    navigate(`/group/${groupId}`)
  }

  // Load data on component mount - COMMENTED OUT FOR NOW
  // useEffect(() => {
  //   handleLoadData()
  // }, [])

  // Storage handlers - COMMENTED OUT FOR NOW
  // const handleSaveData = async () => {
  //   const success = await saveData(friends, groups)
  //   if (success) {
  //     console.log('✅ Data saved to Filecoin storage!')
  //   }
  // }

  // const handleLoadData = async () => {
  //   const data = await loadData()
  //   if (data) {
  //     setFriends(data.friends)
  //     setGroups(data.groups)
  //     console.log('✅ Data loaded from Filecoin storage!')
  //   }
  // }

  // Auto-save when friends or groups change (debounced) - COMMENTED OUT FOR NOW
  // useEffect(() => {
  //   const timeoutId = setTimeout(() => {
  //     if (friends.length > 0 || groups.length > 0) {
  //       handleSaveData()
  //     }
  //   }, 2000) // Auto-save 2 seconds after changes

  //   return () => clearTimeout(timeoutId)
  // }, [friends, groups, handleSaveData])

  // Show connection status if not connected
  if (!isConnected) {
    return (
      <DashboardLayout
        title="Bill Splitting Dashboard"
        description="Connect your wallet to start splitting bills"
        groups={[]}
      >
        <div className="flex flex-col items-center justify-center py-12">
          <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">Wallet Not Connected</h3>
          <p className="text-muted-foreground text-center">
            Please connect your wallet to access the bill splitting dashboard.
          </p>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout
      title="Bill Splitting Dashboard"
      description="Split bills with friends and manage group expenses"
      groups={componentGroups}
      userDues={userDues}
    // splits={splits}
    >
      {/* Database Connection Status */}
      {isConnected && !error && !isLoading && friends.length === 0 && groups.length === 0 && (
        <Alert className="mb-4" variant="default">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>🗄️ Connected to database. Start by adding friends to create groups and splits.</span>
            <button
              onClick={() => {
                console.log('🔄 Manual refresh triggered')
                refreshAll()
              }}
              disabled={isLoading}
              className="ml-4 px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? '⏳' : '🔄'} Refresh
            </button>
          </AlertDescription>
        </Alert>
      )}

      {/* Database Error Alert */}
      {error && (
        <Alert className="mb-4" variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Error: {error}
            <button
              onClick={clearError}
              className="ml-2 text-sm underline hover:no-underline"
            >
              Dismiss
            </button>
          </AlertDescription>
        </Alert>
      )}

      {/* Loading Indicator */}
      {isLoading && (
        <div className="mb-4 p-3 rounded-lg border border-border/20 bg-card/50">
          <div className="flex items-center">
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
            <span className="text-sm">Loading data from database...</span>
          </div>
        </div>
      )}

      {/* Main Content with Left-Aligned Friends/Groups */}
      <div className="relative min-h-[calc(100vh-96px)] flex flex-col lg:flex-row">
        {/* Fixed Left Panel - Friends Only */}
        <div className="fixed left-0 top-24 w-80 h-[calc(100vh-96px)] p-4 bg-background/95 backdrop-blur-sm border-r border-border/20 overflow-hidden hidden lg:flex lg:flex-col z-10">
          {/* Storage Status - COMMENTED OUT FOR NOW */}
          {/* <div className="mb-4 p-3 rounded-lg border border-border/20 bg-card/50">
            <StorageStatus
              isConfigured={isConfigured}
              isUploading={isUploading}
              isLoading={isLoading}
              lastUploadHash={lastUploadHash}
              error={error}
              onSave={handleSaveData}
              onLoad={handleLoadData}
              onClearError={clearError}
            />
          </div> */}

          {/* Friends Section - Full Height */}
          <div className="flex-1 min-h-0">
            <FriendsSection
              friends={componentFriends}
              onFriendsUpdate={handleFriendsUpdate}
              onGroupCreate={(selectedFriends) => {
                // Open group creation modal with selected friends
                setIsGroupModalOpen(true)
              }}
              onAddFriend={addFriend}
            />
          </div>
        </div>

        {/* Mobile Friends Panel - Collapsible */}
        <div className="lg:hidden">
          <div className="p-4 border-b border-border/20 space-y-4">
            {/* Mobile Storage Status - COMMENTED OUT FOR NOW */}
            {/* <div className="p-3 rounded-lg border border-border/20 bg-card/50">
              <StorageStatus
                isConfigured={isConfigured}
                isUploading={isUploading}
                isLoading={isLoading}
                lastUploadHash={lastUploadHash}
                error={error}
                onSave={handleSaveData}
                onLoad={handleLoadData}
                onClearError={clearError}
              />
            </div> */}

            <details className="group">
              <summary className="flex items-center justify-between cursor-pointer list-none">
                <span className="font-medium">Friends & Groups</span>
                <div className="w-5 h-5 transition-transform group-open:rotate-180">
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-full h-full">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </summary>
              <div className="mt-4 max-h-96 overflow-y-auto">
                <FriendsSection
                  friends={componentFriends}
                  onFriendsUpdate={handleFriendsUpdate}
                  onGroupCreate={(selectedFriends) => {
                    // Open group creation modal with selected friends
                    setIsGroupModalOpen(true)
                  }}
                  onAddFriend={addFriend}
                />
              </div>
            </details>
          </div>
        </div>

        {/* Main Dashboard Content - Right Side */}
        <div className="lg:ml-80 flex-1 h-full flex flex-col">
          {/* Active Groups Buttons */}
          <div className="p-4 sm:p-6 pb-4 border-b border-border/20">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-muted-foreground">Active Groups</h3>
              {groups.length > 0 && (
                <div className="text-xs text-muted-foreground bg-muted/30 px-2 py-1 rounded">
                  {groups.length} group{groups.length !== 1 ? 's' : ''} available
                </div>
              )}
            </div>
            {groups.length === 0 ? (
              <div className="text-center py-4">
                <p className="text-muted-foreground text-sm">
                  No groups created yet. Form your first group from the friends panel.
                </p>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {componentGroups.map((group) => (
                  <button
                    key={group.id}
                    onClick={() => handleGroupClick(group.id)}
                    className="group relative px-3 py-2 sm:px-4 sm:py-3 rounded-lg bg-gradient-to-r from-primary/20 to-accent/20 border border-primary/30 hover:border-primary/50 transition-all duration-200 hover:scale-105 hover:shadow-lg hover:shadow-primary/20"
                  >
                    <div className="flex items-center space-x-2 sm:space-x-3">
                      <div className="flex items-center space-x-1 sm:space-x-2">
                        <div className="w-2 h-2 rounded-full bg-accent"></div>
                        <span className="font-medium text-xs sm:text-sm truncate max-w-[150px] sm:max-w-none">{group.name}</span>
                      </div>
                      <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                        <span>{group.members.length}</span>
                        <span>👥</span>
                      </div>
                      <div className="hidden sm:block text-xs text-muted-foreground font-mono">
                        {group.hash}
                      </div>
                    </div>
                    <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-primary/10 to-accent/10 opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>

                    {/* Tooltip on hover */}
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-card border border-border rounded text-xs opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
                      Click to create split • Members: {group.members.join(', ')}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Welcome Content */}
          <div className="flex-1 flex items-center justify-center p-4 sm:p-6">
            <div className="text-center space-y-4 sm:space-y-6 w-full max-w-4xl">
              <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold gradient-text">Welcome!</h2>
              <p className="text-base sm:text-xl text-muted-foreground px-4">
                Manage your friends using the left panel and access your groups via the buttons above.
              </p>
              <div className="space-y-3 sm:space-y-4 text-left max-w-2xl mx-auto px-4">
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 rounded-full bg-accent mt-1.5 flex-shrink-0"></div>
                  <span className="text-sm sm:text-base">Add friends using wallet addresses or ENS names</span>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 rounded-full bg-accent mt-1.5 flex-shrink-0"></div>
                  <span className="text-sm sm:text-base">Select friends to form groups</span>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 rounded-full bg-accent mt-1.5 flex-shrink-0"></div>
                  <span className="text-sm sm:text-base">Click group buttons above to create bill splits</span>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 rounded-full bg-accent mt-1.5 flex-shrink-0"></div>
                  <span className="text-sm sm:text-base">Enjoy seamless bill splitting with friends</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Group Creation Modal */}
      <GroupModal
        isOpen={isGroupModalOpen}
        onClose={() => setIsGroupModalOpen(false)}
        friends={componentFriends}
        onCreateGroup={handleCreateGroup}
      />
      
      {/* Debug: Show friends count */}
      {isGroupModalOpen && (
        <div style={{position: 'fixed', top: '10px', right: '10px', background: 'red', color: 'white', padding: '5px', zIndex: 9999}}>
          Debug: {componentFriends.length} friends available
        </div>
      )}
    </DashboardLayout>
  )
}

export default Dashboard
