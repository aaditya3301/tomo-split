import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { User, Home, CreditCard, Users, CheckCircle, Clock, DollarSign, AlertCircle } from 'lucide-react'
// import { useAccount } from 'wagmi'
// import { splitStorageService, type UserDues } from '@/services/splitStorageService'
import { UserDues } from '@/services/databaseService'

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

interface ProfileDropdownProps {
  groups: Group[]
  userDues?: UserDues | null
  onHomeClick: () => void
  // splits?: any[] // Array of split data
}

const ProfileDropdown: React.FC<ProfileDropdownProps> = ({ groups, userDues, onHomeClick }) => {
  // Debug logging to see if userDues is updating
  console.log('🔍 ProfileDropdown render - userDues:', userDues)
  console.log('🔍 ProfileDropdown render - timestamp:', userDues?.lastUpdated)
  
  // const { address } = useAccount()
  // const [userDues, setUserDues] = useState<UserDues>({
  //   totalOwed: 0,
  //   totalOwedToUser: 0,
  //   netBalance: 0,
  //   pendingGroups: []
  // })
  // const [isLoading, setIsLoading] = useState(false)

  // Calculate dues from actual split data - COMMENTED OUT FOR NOW
  // useEffect(() => {
  //   if (address && splits.length > 0) {
  //     setIsLoading(true)
  //     try {
  //       const dues = splitStorageService.calculateUserDues(splits, address)
  //       setUserDues(dues)
  //     } catch (error) {
  //       console.error('Error calculating dues:', error)
  //     } finally {
  //       setIsLoading(false)
  //     }
  //   }
  // }, [address, splits])

  // Calculate group statistics
  const settledGroups = groups.filter(group => group.isSettled)
  const unsettledGroups = groups.filter(group => !group.isSettled)
  
  // Use database userDues data or fallback to mock calculations
  const pendingDues = userDues?.totalOwed || unsettledGroups.reduce((total, group) => {
    return total + (group.yourShare || 0)
  }, 0)
  
  const totalOwed = userDues?.totalOwedToUser || unsettledGroups.reduce((total, group) => {
    // Mock: amount others owe you
    return total + ((group.totalAmount || 0) - (group.yourShare || 0)) / (group.members.length - 1)
  }, 0)
  
  const netBalance = userDues?.netBalance || (totalOwed - pendingDues)

  return (
    <div className="flex items-center space-x-2">
      {/* Home Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={onHomeClick}
        className="flex items-center space-x-2"
      >
        <Home className="h-4 w-4" />
        <span className="hidden sm:inline">Home</span>
      </Button>

      {/* Profile Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="relative h-8 w-8 rounded-full">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-gradient-to-r from-primary to-accent text-primary-foreground">
                <User className="h-4 w-4" />
              </AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-80" align="end" forceMount>
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium leading-none">Your Profile</p>
              <p className="text-xs leading-none text-muted-foreground">
                Manage your groups and expenses
              </p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          
          {/* Groups Overview */}
          <div className="p-2">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-medium flex items-center">
                <Users className="h-4 w-4 mr-2" />
                Groups Overview
              </h4>
              <Badge variant="outline" className="text-xs">
                {groups.length} total
              </Badge>
            </div>
            
            <div className="grid grid-cols-2 gap-2 mb-3">
              {/* Settled Groups */}
              <div className="flex items-center space-x-2 p-2 rounded-lg bg-green-500/10 border border-green-500/20">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <div>
                  <p className="text-xs font-medium text-green-700">Settled</p>
                  <p className="text-lg font-bold text-green-600">{settledGroups.length}</p>
                </div>
              </div>
              
              {/* Unsettled Groups */}
              <div className="flex items-center space-x-2 p-2 rounded-lg bg-red-500/10 border border-red-500/20">
                <Clock className="h-4 w-4 text-red-600" />
                <div>
                  <p className="text-xs font-medium text-red-700">Pending</p>
                  <p className="text-lg font-bold text-red-600">{unsettledGroups.length}</p>
                </div>
              </div>
            </div>
          </div>

          <DropdownMenuSeparator />
          
          {/* Financial Summary */}
          <div className="p-2">
            <h4 className="text-sm font-medium flex items-center mb-3">
              <DollarSign className="h-4 w-4 mr-2" />
              Financial Summary
            </h4>
            
            <div className="space-y-2">
              {/* Amount You Owe */}
              <div className="flex items-center justify-between p-2 rounded-lg bg-red-500/10">
                <span className="text-sm text-red-700">You owe</span>
                <span className="font-bold text-red-600">
                  ${pendingDues.toFixed(2)}
                </span>
              </div>
              
              {/* Amount Owed to You */}
              <div className="flex items-center justify-between p-2 rounded-lg bg-green-500/10">
                <span className="text-sm text-green-700">Owed to you</span>
                <span className="font-bold text-green-600">
                  ${totalOwed.toFixed(2)}
                </span>
              </div>
              
              {/* Net Balance */}
              <div className="flex items-center justify-between p-2 rounded-lg bg-muted">
                <span className="text-sm font-medium">Net balance</span>
                <span className={`font-bold ${totalOwed - pendingDues >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  ${(totalOwed - pendingDues).toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* Debug Info */}
          {userDues?.lastUpdated && (
            <div className="px-2 py-1 text-xs text-muted-foreground border-t">
              Last updated: {new Date(userDues.lastUpdated).toLocaleTimeString()}
            </div>
          )}

          {/* Optimal Settlement Transactions */}
          {userDues?.globalOptimalTransactions && userDues.globalOptimalTransactions.length > 0 && (
            <>
              <DropdownMenuSeparator />
              <div className="p-2">
                <h4 className="text-sm font-medium mb-2 flex items-center">
                  <AlertCircle className="h-4 w-4 mr-2 text-blue-500" />
                  Optimal Settlement
                </h4>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {userDues.globalOptimalTransactions.map((transaction, index) => (
                    <div key={index} className="p-2 rounded-lg bg-muted/30 border">
                      <div className="text-xs">
                        <span className={transaction.from === userDues.userWallet ? 'text-red-600' : 'text-green-600'}>
                          {transaction.description}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Group-wise Settlement Details */}
          {userDues?.pendingGroups && userDues.pendingGroups.some(g => g.optimalTransactions?.length > 0) && (
            <>
              <DropdownMenuSeparator />
              <div className="p-2">
                <h4 className="text-sm font-medium mb-2 flex items-center">
                  <Users className="h-4 w-4 mr-2 text-purple-500" />
                  Group Settlement Details
                </h4>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {userDues.pendingGroups
                    .filter(group => group.optimalTransactions?.length > 0)
                    .map((group) => (
                    <div key={group.groupId} className="p-2 rounded-lg bg-muted/30 border">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium truncate max-w-[120px]">
                          {group.groupName}
                        </span>
                        <Badge 
                          variant={group.netAmount >= 0 ? "default" : "destructive"} 
                          className="text-xs"
                        >
                          {group.netAmount >= 0 ? '+' : ''}${Math.abs(group.netAmount).toFixed(2)}
                        </Badge>
                      </div>
                      
                      <div className="space-y-1">
                        {group.optimalTransactions?.map((transaction, idx) => (
                          <div key={idx} className="text-xs">
                            <span className={transaction.from === userDues.userWallet ? 'text-red-600' : 'text-green-600'}>
                              {transaction.description}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
          
          {/* Recent Groups */}
          {groups.length > 0 && (
            <>
              <div className="p-2">
                <h4 className="text-sm font-medium mb-2">Recent Groups</h4>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {groups.slice(0, 3).map((group) => (
                    <div key={group.id} className="flex items-center justify-between p-2 rounded hover:bg-muted/50">
                      <div className="flex items-center space-x-2">
                        <div className={`w-2 h-2 rounded-full ${group.isSettled ? 'bg-green-500' : 'bg-red-500'}`} />
                        <span className="text-sm truncate max-w-[120px]">{group.name}</span>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {group.members.length} members
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
              <DropdownMenuSeparator />
            </>
          )}
          
          {/* Action Items */}
          <DropdownMenuItem className="cursor-pointer">
            <CreditCard className="mr-2 h-4 w-4" />
            <span>Payment History</span>
          </DropdownMenuItem>
          <DropdownMenuItem className="cursor-pointer">
            <Users className="mr-2 h-4 w-4" />
            <span>Manage Groups</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

export default ProfileDropdown
