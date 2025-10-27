import React, { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Users, UserCheck, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface Friend {
  id: string
  name: string
  walletId: string
  resolvedAddress?: string
  resolvedENS?: string
  isENS?: boolean
  isSelected: boolean
}

interface GroupModalProps {
  isOpen: boolean
  onClose: () => void
  friends: Friend[]
  onCreateGroup: (groupName: string, selectedFriends: Friend[]) => Promise<void>
}

const GroupModal: React.FC<GroupModalProps> = ({ 
  isOpen, 
  onClose, 
  friends,
  onCreateGroup 
}) => {
  const [groupName, setGroupName] = useState('')
  const [selectedFriends, setSelectedFriends] = useState<Set<string>>(new Set())
  const [isCreating, setIsCreating] = useState(false)

  const handleClose = () => {
    setGroupName('')
    setSelectedFriends(new Set())
    setIsCreating(false)
    onClose()
  }

  const toggleFriendSelection = (friendId: string) => {
    const newSelected = new Set(selectedFriends)
    if (newSelected.has(friendId)) {
      newSelected.delete(friendId)
    } else {
      newSelected.add(friendId)
    }
    setSelectedFriends(newSelected)
  }

  const handleCreateGroup = async () => {
    if (!groupName.trim() || selectedFriends.size === 0) return

    setIsCreating(true)
    try {
      const friendsToAdd = friends.filter(f => selectedFriends.has(f.id))
      await onCreateGroup(groupName.trim(), friendsToAdd)
      handleClose()
    } catch (error) {
      console.error('Failed to create group:', error)
    } finally {
      setIsCreating(false)
    }
  }

  const isValid = groupName.trim().length > 0 && selectedFriends.size > 0

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Users className="h-5 w-5 text-primary" />
            <span>Create New Group</span>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          <div className="space-y-6">
            {/* Group Name Input */}
            <div className="space-y-2">
              <Label htmlFor="groupName">Group Name</Label>
              <Input
                id="groupName"
                placeholder="Enter group name (e.g., 'Trip to Goa', 'House Expenses')"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                className="w-full"
              />
            </div>

            {/* Friends Selection */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Select Friends to Add</Label>
                <Badge variant="secondary" className="text-xs">
                  {selectedFriends.size} selected
                </Badge>
              </div>

              {friends.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No friends added yet</p>
                  <p className="text-sm">Add friends first to create groups</p>
                </div>
              ) : (
                <ScrollArea className="h-48 pr-4">
                  <div className="space-y-2">
                    {friends.map((friend) => (
                      <div
                        key={friend.id}
                        className={`
                          flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors
                          ${selectedFriends.has(friend.id) 
                            ? 'border-primary bg-primary/5' 
                            : 'border-border hover:bg-muted/50'
                          }
                        `}
                        onClick={() => toggleFriendSelection(friend.id)}
                      >
                        <div className="flex items-center space-x-3">
                          <div className={`
                            w-8 h-8 rounded-full flex items-center justify-center
                            ${selectedFriends.has(friend.id) 
                              ? 'bg-primary text-primary-foreground' 
                              : 'bg-muted'
                            }
                          `}>
                            {selectedFriends.has(friend.id) ? (
                              <UserCheck className="h-4 w-4" />
                            ) : (
                              <span className="text-xs font-medium">
                                {friend.name.charAt(0).toUpperCase()}
                              </span>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-medium truncate">{friend.name}</p>
                            <p className="text-sm text-muted-foreground truncate">
                              {friend.isENS ? friend.walletId : `${friend.walletId.slice(0, 6)}...${friend.walletId.slice(-4)}`}
                            </p>
                          </div>
                        </div>
                        {friend.isENS && (
                          <Badge variant="outline" className="text-xs">
                            ENS
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-4 border-t">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isCreating}
          >
            Cancel
          </Button>
          <Button
            onClick={handleCreateGroup}
            disabled={!isValid || isCreating}
            className="min-w-[120px]"
          >
            {isCreating ? (
              <>
                <Users className="h-4 w-4 mr-2 animate-pulse" />
                Creating...
              </>
            ) : (
              <>
                <Users className="h-4 w-4 mr-2" />
                Create Group
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default GroupModal
