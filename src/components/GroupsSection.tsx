import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Users, Hash, Plus, Sparkles, Crown, Calendar, User } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

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
    <div className="min-h-screen bg-black p-6 space-y-6">
      {/* Header Section */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-center space-y-4"
      >
        <div className="flex items-center justify-center space-x-3">
          <div className="p-3 rounded-full bg-gradient-to-r from-yellow-400 to-yellow-500">
            <Users className="h-8 w-8 text-black" />
          </div>
          <h1 className="text-4xl font-bold text-white">
            Your Groups
          </h1>
          <Badge className="bg-yellow-500/30 text-yellow-300 border-yellow-500 text-lg px-3 py-1">
            {groups.length}
          </Badge>
        </div>
        <p className="text-white/80 text-lg max-w-2xl mx-auto">
          Manage your expense groups and create smart splits with your friends
        </p>
      </motion.div>

      {/* Main Groups Container */}
      <div className="max-w-7xl mx-auto">
        <Card className="bg-black border-yellow-500/50 shadow-2xl shadow-yellow-500/20">
          <CardHeader className="border-b border-yellow-500/30 bg-yellow-500/10">
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Sparkles className="h-6 w-6 text-yellow-400" />
                <span className="text-2xl text-white">Active Groups</span>
              </div>
              <div className="flex items-center space-x-4 text-sm">
                <div className="flex items-center space-x-2 text-white">
                  <Crown className="h-4 w-4 text-yellow-400" />
                  <span>{groups.length} Groups</span>
                </div>
                <div className="flex items-center space-x-2 text-white">
                  <User className="h-4 w-4 text-yellow-400" />
                  <span>{groups.reduce((total, group) => total + group.members.length, 0)} Members</span>
                </div>
              </div>
            </CardTitle>
          </CardHeader>
          
          <CardContent className="p-8 bg-black">
            {/* Groups Grid */}
            <div className="space-y-6">
              {groups.length === 0 ? (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5 }}
                  className="text-center py-16"
                >
                  <div className="relative">
                    <div className="absolute inset-0 bg-yellow-500/30 rounded-full blur-3xl"></div>
                    <Users className="relative h-24 w-24 mx-auto text-yellow-400 mb-6" />
                  </div>
                  <h3 className="text-2xl font-semibold text-white mb-3">No Groups Yet</h3>
                  <p className="text-white/70 text-lg max-w-md mx-auto">
                    Create your first group by selecting friends and start splitting expenses together!
                  </p>
                </motion.div>
              ) : (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  <AnimatePresence>
                    {groups.map((group, index) => (
                      <motion.div
                        key={group.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: index * 0.1 }}
                        className={`group relative p-6 rounded-2xl border transition-all duration-300 cursor-pointer transform hover:scale-105 ${
                          selectedGroup?.id === group.id
                            ? 'border-yellow-400 bg-yellow-500/20 shadow-xl shadow-yellow-500/40'
                            : 'border-yellow-500/30 bg-black/80 hover:border-yellow-400/60 hover:shadow-lg hover:shadow-yellow-500/20'
                        }`}
                        onClick={() => setSelectedGroup(group)}
                        whileHover={{ y: -5 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        {/* Group Header */}
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1">
                            <h3 className="text-xl font-bold text-white group-hover:text-yellow-300 transition-colors">
                              {group.name}
                            </h3>
                            <div className="flex items-center space-x-2 mt-2">
                              <Hash className="h-4 w-4 text-yellow-400" />
                              <span className="font-mono text-sm text-white/80">
                                {group.hash}
                              </span>
                            </div>
                          </div>
                          <Badge className="bg-yellow-500/30 text-yellow-300 border-yellow-500 font-semibold">
                            {group.members.length} members
                          </Badge>
                        </div>
                        
                        {/* Members */}
                        <div className="space-y-3 mb-4">
                          <div className="flex flex-wrap gap-2">
                            {group.members.slice(0, 3).map((member, memberIndex) => (
                              <Badge 
                                key={memberIndex} 
                                className="bg-black/60 text-white border-yellow-500/40 text-xs py-1"
                              >
                                {member}
                              </Badge>
                            ))}
                            {group.members.length > 3 && (
                              <Badge className="bg-yellow-500/30 text-yellow-300 border-yellow-500 text-xs py-1">
                                +{group.members.length - 3} more
                              </Badge>
                            )}
                          </div>
                        </div>
                        
                        {/* Date */}
                        <div className="flex items-center space-x-2 text-sm text-white/70 mb-4">
                          <Calendar className="h-4 w-4 text-yellow-400" />
                          <span>Created {group.createdAt.toLocaleDateString()}</span>
                        </div>

                        {/* Selection Indicator */}
                        {selectedGroup?.id === group.id && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="absolute -top-2 -right-2 w-6 h-6 bg-yellow-400 rounded-full flex items-center justify-center"
                          >
                            <Sparkles className="h-3 w-3 text-black" />
                          </motion.div>
                        )}
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </div>

            {/* Create Split Button */}
            <AnimatePresence>
              {selectedGroup && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                  className="mt-8 pt-8 border-t border-yellow-500/30"
                >
                  <div className="max-w-md mx-auto space-y-4">
                    <div className="text-center">
                      <h4 className="text-lg font-semibold text-white mb-2">
                        Ready to split expenses?
                      </h4>
                      <p className="text-white/70 text-sm">
                        Create a new split for <span className="text-yellow-300 font-medium">{selectedGroup.name}</span>
                      </p>
                    </div>
                    <Button
                      onClick={() => onCreateSplit(selectedGroup)}
                      className="w-full bg-yellow-500 hover:bg-yellow-400 text-black font-bold py-3 px-6 rounded-xl shadow-lg shadow-yellow-500/40 transition-all duration-300 transform hover:scale-105"
                    >
                      <Plus className="mr-2 h-5 w-5" />
                      Create Split for {selectedGroup.name}
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <Card className="bg-black border-yellow-500/50 shadow-lg shadow-yellow-500/20">
              <CardContent className="p-6 text-center">
                <div className="flex items-center justify-center space-x-3 mb-3">
                  <Users className="h-8 w-8 text-yellow-400" />
                  <div>
                    <p className="text-3xl font-bold text-yellow-400">
                      {groups.length}
                    </p>
                    <p className="text-white font-medium">Active Groups</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <Card className="bg-black border-yellow-500/50 shadow-lg shadow-yellow-500/20">
              <CardContent className="p-6 text-center">
                <div className="flex items-center justify-center space-x-3 mb-3">
                  <Crown className="h-8 w-8 text-yellow-400" />
                  <div>
                    <p className="text-3xl font-bold text-yellow-400">
                      {groups.reduce((total, group) => total + group.members.length, 0)}
                    </p>
                    <p className="text-white font-medium">Total Members</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  )
}

export default GroupsSection
