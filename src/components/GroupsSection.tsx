import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Users, Hash, Plus } from 'lucide-react'

interface Group {
  id: string
  name: string
  hash: string
  members: string[]
  createdAt: Date
}

interface GroupsSectionProps {
  groups: Group[]
  onCreateSplit: (group: Group) => void
}

const GroupsSection: React.FC<GroupsSectionProps> = ({ groups, onCreateSplit }) => {
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null)

  const generateGroupHash = (groupName: string, members: string[]) => {
    const combined = groupName + members.join('')
    return `0x${combined.slice(0, 8).padEnd(8, '0').replace(/[^a-zA-Z0-9]/g, '').toLowerCase()}...`
  }

  return (
    <div className="h-full flex flex-col">
      {/* Groups Header */}
      <Card className="glass flex-1 flex flex-col">
        <CardHeader className="flex-shrink-0">
          <CardTitle className="flex items-center space-x-2">
            <Users className="h-5 w-5" />
            <span>Groups</span>
            <Badge variant="outline">{groups.length}</Badge>
          </CardTitle>
        </CardHeader>
        
        <CardContent className="flex-1 flex flex-col space-y-4 min-h-0">
          {/* Groups List - Scrollable */}
          <div className="flex-1 space-y-3 overflow-y-auto overflow-x-hidden pr-2">
            {groups.length === 0 ? (
              <div className="text-center py-8">
                <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  No groups created yet. Select friends to form your first group!
                </p>
              </div>
            ) : (
              groups.map((group) => (
                <div
                  key={group.id}
                  className={`p-4 rounded-lg border transition-all cursor-pointer ${
                    selectedGroup?.id === group.id
                      ? 'border-primary bg-primary/10'
                      : 'border-border/20 hover:bg-muted/30'
                  }`}
                  onClick={() => setSelectedGroup(group)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-medium">{group.name}</h3>
                    <Badge variant="outline" className="text-xs">
                      {group.members.length} members
                    </Badge>
                  </div>
                  
                  <div className="flex items-center space-x-2 text-sm text-muted-foreground mb-2">
                    <Hash className="h-3 w-3" />
                    <span className="font-mono">{group.hash}</span>
                  </div>
                  
                  <div className="flex flex-wrap gap-1">
                    {group.members.map((member, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {member}
                      </Badge>
                    ))}
                  </div>
                  
                  <p className="text-xs text-muted-foreground mt-2">
                    Created {group.createdAt.toLocaleDateString()}
                  </p>
                </div>
              ))
            )}
          </div>

          {/* Create Split Button */}
          {selectedGroup && (
            <div className="flex-shrink-0 pt-4 border-t border-border/20">
              <Button
                onClick={() => onCreateSplit(selectedGroup)}
                className="w-full bg-gradient-to-r from-primary to-accent"
              >
                <Plus className="mr-2 h-4 w-4" />
                Create Split for {selectedGroup.name}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <Card className="mt-4 glass">
        <CardContent className="p-4">
          <div className="grid grid-cols-2 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold gradient-text">{groups.length}</p>
              <p className="text-sm text-muted-foreground">Total Groups</p>
            </div>
            <div>
              <p className="text-2xl font-bold gradient-text">
                {groups.reduce((total, group) => total + group.members.length, 0)}
              </p>
              <p className="text-sm text-muted-foreground">Total Members</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default GroupsSection
