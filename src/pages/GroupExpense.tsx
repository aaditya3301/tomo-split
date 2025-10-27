import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { 
  ArrowLeft, 
  Plus, 
  DollarSign, 
  Users, 
  Calculator, 
  History, 
  Eye,
  Calendar,
  User,
  CreditCard,
  TrendingUp,
  ArrowRightLeft,
  Target,
  AlertCircle
} from 'lucide-react'
import { useDatabase } from '@/hooks/useDatabase'
import { useAccount } from 'wagmi'
import { calculateGroupSettlement } from '@/services/debtSettlementService'

interface ExpenseFormData {
  title: string
  amount: string
  paidBy: string
  isEqualSplit: boolean
  customAmounts: { [memberWallet: string]: string }
}

const GroupExpense: React.FC = () => {
  const { groupId } = useParams<{ groupId: string }>()
  const navigate = useNavigate()
  const { address } = useAccount()
  const { groups, friends, createSplit, refreshAll } = useDatabase()

  const [group, setGroup] = useState<any>(null)
  const [groupMembers, setGroupMembers] = useState<any[]>([])
  const [expenses, setExpenses] = useState<any[]>([])
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false)
  const [isAllExpensesOpen, setIsAllExpensesOpen] = useState(false)
  const [isCreatingExpense, setIsCreatingExpense] = useState(false)
  const [settlementData, setSettlementData] = useState<any>(null)
  const [totalExpenses, setTotalExpenses] = useState(0)
  const [isLoadingGroup, setIsLoadingGroup] = useState(true)

  const [formData, setFormData] = useState<ExpenseFormData>({
    title: '',
    amount: '',
    paidBy: '',
    isEqualSplit: true,
    customAmounts: {}
  })

  // Load data when component mounts
  useEffect(() => {
    refreshAll()
  }, [refreshAll])

  // Find the group and load its data
  useEffect(() => {
    setIsLoadingGroup(true)
    
    if (groupId && groups.length > 0) {
      const foundGroup = groups.find(g => g.id === groupId)
      console.log('🔍 Looking for group:', { groupId, groupsCount: groups.length, foundGroup })
      
      if (foundGroup) {
        console.log('✅ Group found:', foundGroup)
        setGroup(foundGroup)
        
        // Map group members from wallet addresses to friend data
        const members = foundGroup.members.map((memberWallet: string) => {
          const friendData = friends.find(f => 
            f.resolvedAddress === memberWallet || f.walletId === memberWallet
          )
          
          return {
            wallet: memberWallet,
            name: friendData?.name || `${memberWallet.slice(0, 6)}...${memberWallet.slice(-4)}`,
            isENS: friendData?.isENS || false,
            isCurrentUser: memberWallet === address
          }
        })
        
        setGroupMembers(members)
        
        // Set default payer to current user if they're in the group
        const currentUserMember = members.find(m => m.isCurrentUser)
        if (currentUserMember) {
          setFormData(prev => {
            const updatedFormData = { ...prev, paidBy: currentUserMember.wallet }
            
            // If we have an amount and equal split is enabled, calculate equal amounts
            if (updatedFormData.isEqualSplit && updatedFormData.amount && members.length > 0) {
              const totalAmount = parseFloat(updatedFormData.amount) || 0
              const splitAmount = (totalAmount / members.length).toFixed(2)
              const newCustomAmounts: { [key: string]: string } = {}
              
              members.forEach(member => {
                newCustomAmounts[member.wallet] = splitAmount
              })
              
              updatedFormData.customAmounts = newCustomAmounts
            }
            
            return updatedFormData
          })
        }
        setIsLoadingGroup(false)
      } else {
        console.warn('❌ Group not found:', groupId)
        setIsLoadingGroup(false)
      }
    } else if (groupId) {
      // If we have a groupId but groups haven't loaded yet, keep loading state
      console.log('⏳ Waiting for groups to load...')
    } else {
      setIsLoadingGroup(false)
    }
  }, [groupId, groups, friends, address])

  // Calculate settlement whenever expenses change
  useEffect(() => {
    if (expenses.length > 0) {
      const settlement = calculateGroupSettlement(expenses)
      setSettlementData(settlement)
      
      const total = expenses.reduce((sum, expense) => sum + expense.totalAmount, 0)
      setTotalExpenses(total)
    } else {
      setSettlementData(null)
      setTotalExpenses(0)
    }
  }, [expenses])

  const handleAmountChange = (amount: string) => {
    setFormData(prev => {
      const updatedFormData = { ...prev, amount }
      
      // If equal split and we have an amount and members, calculate equal amounts
      if (updatedFormData.isEqualSplit && amount && groupMembers.length > 0) {
        const totalAmount = parseFloat(amount) || 0
        const splitAmount = (totalAmount / groupMembers.length).toFixed(2)
        const newCustomAmounts: { [key: string]: string } = {}
        
        groupMembers.forEach(member => {
          newCustomAmounts[member.wallet] = splitAmount
        })
        
        updatedFormData.customAmounts = newCustomAmounts
      }
      
      return updatedFormData
    })
  }

  const handleCustomAmountChange = (memberWallet: string, amount: string) => {
    setFormData(prev => ({
      ...prev,
      customAmounts: {
        ...prev.customAmounts,
        [memberWallet]: amount
      }
    }))
  }

  const handleSplitToggle = (isEqual: boolean) => {
    setFormData(prev => {
      const updatedFormData = { ...prev, isEqualSplit: isEqual }
      
      // If switching to equal split and we have an amount and members, calculate equal amounts
      if (isEqual && updatedFormData.amount && groupMembers.length > 0) {
        const totalAmount = parseFloat(updatedFormData.amount) || 0
        const splitAmount = (totalAmount / groupMembers.length).toFixed(2)
        const newCustomAmounts: { [key: string]: string } = {}
        
        groupMembers.forEach(member => {
          newCustomAmounts[member.wallet] = splitAmount
        })
        
        updatedFormData.customAmounts = newCustomAmounts
      }
      
      return updatedFormData
    })
  }

  const handleAddExpense = async () => {
    if (!formData.title.trim() || !formData.amount || !formData.paidBy || !group) return

    setIsCreatingExpense(true)

    try {
      const members = groupMembers.map(member => ({
        id: member.wallet,
        name: member.name,
        walletId: member.wallet,
        amount: parseFloat(formData.customAmounts[member.wallet] || '0'),
        isPaid: member.wallet === formData.paidBy,
        paidAt: member.wallet === formData.paidBy ? new Date().toISOString() : undefined
      }))

      const splitData = {
        id: `split-${Date.now()}`,
        groupId: group.id,
        groupName: group.name,
        title: formData.title,
        description: `${formData.isEqualSplit ? 'Equal' : 'Custom'} split of $${formData.amount}`,
        totalAmount: parseFloat(formData.amount),
        paidBy: formData.paidBy,
        paidByName: groupMembers.find(m => m.wallet === formData.paidBy)?.name || 'Unknown',
        members,
        createdAt: new Date().toISOString(),
        createdBy: address || '',
        splitType: (formData.isEqualSplit ? 'equal' : 'custom') as 'equal' | 'custom',
        currency: 'USD',
        isSettled: false,
        settledAt: undefined
      }

      await createSplit(splitData)
      
      // Add to local expenses for immediate UI update
      setExpenses(prev => [splitData, ...prev])
      
      // Refresh data to get updated information
      await refreshAll()
      
      // Reset form
      setFormData({
        title: '',
        amount: '',
        paidBy: groupMembers.find(m => m.isCurrentUser)?.wallet || '',
        isEqualSplit: true,
        customAmounts: {}
      })
      
      setIsAddExpenseOpen(false)
    } catch (error) {
      console.error('Failed to create expense:', error)
    } finally {
      setIsCreatingExpense(false)
    }
  }

  const totalCustomAmount = Object.values(formData.customAmounts)
    .reduce((sum, amount) => sum + (parseFloat(amount) || 0), 0)

  const isFormValid = formData.title.trim() && 
                     formData.amount && 
                     formData.paidBy && 
                     (formData.isEqualSplit || 
                      Math.abs(totalCustomAmount - (parseFloat(formData.amount) || 0)) < 0.01)

  // Show loading state while fetching group
  if (isLoadingGroup) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Loading group...</p>
        </div>
      </div>
    )
  }

  // Show error if group not found after loading
  if (!group && !isLoadingGroup) {
    console.error('❌ Group not found after loading:', { groupId, groups })
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="text-center space-y-4">
          <AlertCircle className="h-16 w-16 text-muted-foreground mx-auto" />
          <h2 className="text-2xl font-bold">Group Not Found</h2>
          <p className="text-muted-foreground">The group you're looking for doesn't exist or you don't have access to it.</p>
          <Button onClick={() => navigate('/dashboard')} className="mt-4">
            Back to Dashboard
          </Button>
        </div>
      </div>
    )
  }

  // Show error if no group is set (safety check)
  if (!group) {
    return null
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full bg-gradient-to-r from-black via-gray-900 to-black border-b-2 border-yellow-400 shadow-xl">
        <div className="container flex h-16 items-center justify-between px-4">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/dashboard')}
              className="text-yellow-400 hover:text-yellow-300 hover:bg-yellow-400/10 transition-all duration-300 border border-yellow-400/30 hover:border-yellow-400 px-3 py-1"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">Back</span>
            </Button>
            <div className="h-6 w-px bg-yellow-400/50"></div>
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-br from-yellow-400 to-yellow-500 rounded-full flex items-center justify-center shadow-md">
                <Users className="h-4 w-4 text-black" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-white">{group.name}</h1>
                <p className="text-xs text-yellow-400 font-medium">
                  {groupMembers.length} member{groupMembers.length !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <div className="hidden sm:flex items-center space-x-1 px-2 py-1 bg-yellow-400/10 rounded border border-yellow-400/30">
              <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-xs text-yellow-400 font-medium">Live</span>
            </div>
            <Dialog open={isAddExpenseOpen} onOpenChange={setIsAddExpenseOpen}>
              <DialogTrigger asChild>
                <Button className="bg-gradient-to-r from-yellow-400 to-yellow-500 hover:from-yellow-500 hover:to-yellow-600 text-black font-semibold shadow-md hover:shadow-lg transition-all duration-300 transform hover:scale-105 px-4 py-1 text-sm">
                  <Plus className="h-4 w-4 mr-1" />
                  <span className="hidden sm:inline">Add Expense</span>
                </Button>
              </DialogTrigger>
            <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center space-x-2">
                  <DollarSign className="h-5 w-5 text-primary" />
                  <span>Add New Expense</span>
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                {/* Expense Title */}
                <div className="space-y-2">
                  <Label htmlFor="title">Expense Title</Label>
                  <Input
                    id="title"
                    placeholder="e.g., Dinner at restaurant, Uber ride, Groceries"
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  />
                </div>

                {/* Amount and Payer */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="amount">Total Amount ($)</Label>
                    <Input
                      id="amount"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={formData.amount}
                      onChange={(e) => handleAmountChange(e.target.value)}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Who Paid?</Label>
                    <Select value={formData.paidBy} onValueChange={(value) => setFormData(prev => ({ ...prev, paidBy: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select payer" />
                      </SelectTrigger>
                      <SelectContent>
                        {groupMembers.map((member) => (
                          <SelectItem key={member.wallet} value={member.wallet}>
                            <div className="flex items-center space-x-2">
                              <span>{member.name}</span>
                              {member.isCurrentUser && <Badge variant="secondary" className="text-xs">You</Badge>}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Split Options */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Split Type</Label>
                    <div className="flex items-center space-x-2">
                      <span className={`text-sm ${formData.isEqualSplit ? 'text-primary' : 'text-muted-foreground'}`}>
                        Equal
                      </span>
                      <Switch
                        checked={!formData.isEqualSplit}
                        onCheckedChange={(checked) => handleSplitToggle(!checked)}
                      />
                      <span className={`text-sm ${!formData.isEqualSplit ? 'text-primary' : 'text-muted-foreground'}`}>
                        Custom
                      </span>
                    </div>
                  </div>

                  {/* Custom Split Amounts */}
                  {!formData.isEqualSplit && (
                    <div className="space-y-3">
                      <Label>Custom Split Amounts</Label>
                      <div className="space-y-2 max-h-40 overflow-y-auto">
                        {groupMembers.map((member) => (
                          <div key={member.wallet} className="flex items-center justify-between space-x-3">
                            <div className="flex items-center space-x-2 min-w-0 flex-1">
                              <span className="text-sm font-medium truncate">{member.name}</span>
                              {member.isCurrentUser && <Badge variant="secondary" className="text-xs">You</Badge>}
                            </div>
                            <div className="w-24">
                              <Input
                                type="number"
                                step="0.01"
                                placeholder="0.00"
                                value={formData.customAmounts[member.wallet] || ''}
                                onChange={(e) => handleCustomAmountChange(member.wallet, e.target.value)}
                                className="text-right"
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                      
                      {/* Total Validation */}
                      <div className="flex justify-between text-sm">
                        <span>Total Split:</span>
                        <span className={totalCustomAmount === (parseFloat(formData.amount) || 0) ? 'text-green-600' : 'text-red-600'}>
                          ${totalCustomAmount.toFixed(2)} / ${(parseFloat(formData.amount) || 0).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-between pt-4 border-t">
                  <Button
                    variant="outline"
                    onClick={() => setIsAddExpenseOpen(false)}
                    disabled={isCreatingExpense}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleAddExpense}
                    disabled={!isFormValid || isCreatingExpense}
                    className="min-w-[120px]"
                  >
                    {isCreatingExpense ? (
                      <>
                        <DollarSign className="h-4 w-4 mr-2 animate-pulse" />
                        Adding...
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Expense
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </DialogContent>
            </Dialog>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-yellow-50/30">
        <div className="container mx-auto px-4 py-6 space-y-6">
          {/* Group Members */}
          <Card className="bg-white/80 backdrop-blur-sm border border-yellow-200 shadow-lg hover:shadow-xl transition-all duration-300">
            <CardHeader className="bg-gradient-to-r from-black to-gray-800 text-white border-b border-yellow-400 py-4">
              <CardTitle className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-gradient-to-br from-yellow-400 to-yellow-500 rounded-full flex items-center justify-center shadow-md">
                  <Users className="h-4 w-4 text-black" />
                </div>
                <span className="text-lg font-bold">Group Members</span>
                <div className="ml-auto px-2 py-1 bg-yellow-400 text-black rounded-full text-xs font-semibold">
                  {groupMembers.length} Active
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 bg-gradient-to-br from-white to-yellow-50/20">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {groupMembers.map((member, index) => (
                  <div 
                    key={member.wallet} 
                    className="group flex items-center space-x-3 p-3 rounded-lg bg-gradient-to-r from-gray-50 to-white border border-gray-200 shadow-sm hover:shadow-md transition-all duration-300 transform hover:scale-102 hover:border-yellow-300"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <div className="relative">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-500 flex items-center justify-center shadow-md group-hover:shadow-lg transition-all duration-300">
                        <span className="text-sm font-bold text-black">
                          {member.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      {member.isCurrentUser && (
                        <div className="absolute -top-1 -right-1 w-4 h-4 bg-black rounded-full flex items-center justify-center shadow-sm">
                          <span className="text-xs font-bold text-yellow-400">✓</span>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-800 text-sm truncate group-hover:text-black transition-colors duration-300">
                        {member.name}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {member.isCurrentUser ? 'You' : (member.isENS ? 'ENS Address' : 'Wallet Address')}
                      </p>
                      <div className="mt-1 flex items-center space-x-1">
                        <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></div>
                        <span className="text-xs text-green-600 font-medium">Online</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Financial Summary */}
          <Card className="bg-gradient-to-br from-black via-gray-900 to-black border border-yellow-400 shadow-xl hover:shadow-2xl transition-all duration-300">
            <CardHeader className="bg-gradient-to-r from-yellow-400 to-yellow-500 text-black border-b border-yellow-300 py-4">
              <CardTitle className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-black rounded-full flex items-center justify-center shadow-md">
                  <TrendingUp className="h-4 w-4 text-yellow-400" />
                </div>
                <span className="text-lg font-bold">Financial Dashboard</span>
                <div className="ml-auto px-2 py-1 bg-black/20 text-yellow-400 rounded-full text-xs font-semibold border border-yellow-400/30">
                  Live Data
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 bg-gradient-to-br from-gray-900 to-black">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="group text-center p-4 rounded-xl bg-gradient-to-br from-yellow-400 to-yellow-500 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105">
                  <div className="w-12 h-12 mx-auto mb-2 bg-black rounded-full flex items-center justify-center shadow-md group-hover:shadow-lg transition-all duration-300">
                    <DollarSign className="h-6 w-6 text-yellow-400" />
                  </div>
                  <p className="text-xs font-bold text-black mb-1 uppercase tracking-wider">Total Expenses</p>
                  <p className="text-2xl font-black text-black mb-2">${totalExpenses.toFixed(2)}</p>
                  <div className="w-full bg-black/20 rounded-full h-2">
                    <div className="bg-black h-2 rounded-full transition-all duration-1000 ease-out" style={{width: '100%'}}></div>
                  </div>
                </div>
                
                <div className="group text-center p-4 rounded-xl bg-gradient-to-br from-gray-800 to-black border border-yellow-400 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105">
                  <div className="w-12 h-12 mx-auto mb-2 bg-yellow-400 rounded-full flex items-center justify-center shadow-md group-hover:shadow-lg transition-all duration-300">
                    <Target className="h-6 w-6 text-black" />
                  </div>
                  <p className="text-xs font-bold text-yellow-400 mb-1 uppercase tracking-wider">Transactions</p>
                  <p className="text-2xl font-black text-white mb-2">
                    {settlementData ? settlementData.transactions.length : 0}
                  </p>
                  <div className="w-full bg-yellow-400/20 rounded-full h-2">
                    <div className="bg-yellow-400 h-2 rounded-full transition-all duration-1000 ease-out" style={{width: '100%'}}></div>
                  </div>
                </div>
                
                <div className="group text-center p-4 rounded-xl bg-gradient-to-br from-yellow-400 to-yellow-500 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105">
                  <div className="w-12 h-12 mx-auto mb-2 bg-black rounded-full flex items-center justify-center shadow-md group-hover:shadow-lg transition-all duration-300">
                    <Users className="h-6 w-6 text-yellow-400" />
                  </div>
                  <p className="text-xs font-bold text-black mb-1 uppercase tracking-wider">Participants</p>
                  <p className="text-2xl font-black text-black mb-2">{groupMembers.length}</p>
                  <div className="w-full bg-black/20 rounded-full h-2">
                    <div className="bg-black h-2 rounded-full transition-all duration-1000 ease-out" style={{width: '100%'}}></div>
                  </div>
                </div>
              </div>

              {/* Settlement Diagram */}
              {settlementData && settlementData.transactions.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-yellow-400 to-yellow-500 rounded-full flex items-center justify-center shadow-md">
                      <Target className="h-4 w-4 text-black" />
                    </div>
                    <h3 className="text-lg font-bold text-white">Optimal Settlement</h3>
                    <div className="px-2 py-1 bg-yellow-400 text-black rounded-full text-xs font-bold border border-yellow-300 shadow-sm">
                      {settlementData.transactions.length} Transaction{settlementData.transactions.length > 1 ? 's' : ''}
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    {settlementData.transactions.map((transaction: any, index: number) => {
                      const fromMember = groupMembers.find(m => 
                        m.wallet === transaction.from || m.name === transaction.from
                      )
                      const toMember = groupMembers.find(m => 
                        m.wallet === transaction.to || m.name === transaction.to
                      )
                      
                      return (
                        <div 
                          key={index} 
                          className="group flex items-center justify-between p-4 rounded-lg bg-gradient-to-r from-gray-800 to-black border border-yellow-400 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-102"
                          style={{ animationDelay: `${index * 100}ms` }}
                        >
                          <div className="flex items-center space-x-4">
                            <div className="flex items-center space-x-2">
                              <div className="relative">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center shadow-md group-hover:shadow-lg transition-all duration-300">
                                  <span className="text-sm font-bold text-white">
                                    {(fromMember?.name || transaction.from).charAt(0).toUpperCase()}
                                  </span>
                                </div>
                                {fromMember?.isCurrentUser && (
                                  <div className="absolute -top-1 -right-1 w-5 h-5 bg-black rounded-full flex items-center justify-center shadow-sm border border-yellow-400">
                                    <span className="text-xs font-bold text-yellow-400">YOU</span>
                                  </div>
                                )}
                              </div>
                              <div>
                                <span className="font-bold text-white text-sm group-hover:text-yellow-400 transition-colors duration-300">
                                  {fromMember?.name || transaction.from}
                                </span>
                                <p className="text-xs text-gray-400">Pays</p>
                              </div>
                            </div>
                            
                            <div className="flex items-center space-x-2">
                              <ArrowRightLeft className="h-4 w-4 text-yellow-400" />
                              <div className="px-2 py-1 bg-yellow-400/20 rounded border border-yellow-400/50">
                                <span className="text-xs font-semibold text-yellow-400">TRANSFER</span>
                              </div>
                            </div>
                            
                            <div className="flex items-center space-x-2">
                              <div className="relative">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center shadow-md group-hover:shadow-lg transition-all duration-300">
                                  <span className="text-sm font-bold text-white">
                                    {(toMember?.name || transaction.to).charAt(0).toUpperCase()}
                                  </span>
                                </div>
                                {toMember?.isCurrentUser && (
                                  <div className="absolute -top-1 -right-1 w-5 h-5 bg-black rounded-full flex items-center justify-center shadow-sm border border-yellow-400">
                                    <span className="text-xs font-bold text-yellow-400">YOU</span>
                                  </div>
                                )}
                              </div>
                              <div>
                                <span className="font-bold text-white text-sm group-hover:text-yellow-400 transition-colors duration-300">
                                  {toMember?.name || transaction.to}
                                </span>
                                <p className="text-xs text-gray-400">Receives</p>
                              </div>
                            </div>
                          </div>
                          
                          <div className="text-right">
                            <p className="text-xl font-black text-yellow-400 mb-1">
                              ${transaction.amount.toFixed(2)}
                            </p>
                            <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">
                              Payment Required
                            </p>
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {/* Current Balances */}
                  {settlementData.balances && (
                    <div className="mt-6">
                      <div className="flex items-center space-x-3 mb-4">
                        <div className="w-8 h-8 bg-gradient-to-br from-yellow-400 to-yellow-500 rounded-full flex items-center justify-center shadow-md">
                          <Calculator className="h-4 w-4 text-black" />
                        </div>
                        <h4 className="text-lg font-bold text-white">Current Balances</h4>
                        <div className="px-2 py-1 bg-yellow-400/20 text-yellow-400 rounded-full text-xs font-semibold border border-yellow-400/50">
                          Real-time
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {Object.entries(settlementData.balances).map(([person, balance]: [string, any], index) => {
                          const member = groupMembers.find(m => 
                            m.wallet === person || m.name === person
                          )
                          
                          const isPositive = balance > 0
                          const isNegative = balance < 0
                          const isZero = Math.abs(balance) < 0.01
                          
                          return (
                            <div 
                              key={person} 
                              className={`group p-3 rounded-lg border shadow-md hover:shadow-lg transition-all duration-300 transform hover:scale-102 ${
                                isPositive 
                                  ? 'bg-gradient-to-br from-green-500 to-green-600 border-green-400' 
                                  : isNegative 
                                    ? 'bg-gradient-to-br from-red-500 to-red-600 border-red-400'
                                    : 'bg-gradient-to-br from-gray-500 to-gray-600 border-gray-400'
                              }`}
                              style={{ animationDelay: `${index * 50}ms` }}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-2">
                                  <div className="w-8 h-8 rounded-full bg-black/30 flex items-center justify-center shadow-sm group-hover:shadow-md transition-all duration-300">
                                    <span className="text-sm font-bold text-white">
                                      {(member?.name || person).charAt(0).toUpperCase()}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="font-bold text-white text-sm group-hover:text-yellow-300 transition-colors duration-300">
                                      {member?.name || person}
                                    </span>
                                    {member?.isCurrentUser && (
                                      <div className="mt-0.5 px-1.5 py-0.5 bg-yellow-400 text-black rounded-full text-xs font-bold">
                                        YOU
                                      </div>
                                    )}
                                  </div>
                                </div>
                                <div className="text-right">
                                  <span className="text-lg font-black text-white">
                                    {isPositive ? '+' : ''}${Math.abs(balance).toFixed(2)}
                                  </span>
                                  <p className="text-xs text-white/80 font-medium uppercase tracking-wider">
                                    {isPositive 
                                      ? 'Should Receive' 
                                      : isNegative 
                                        ? 'Should Pay'
                                        : 'Settled'
                                    }
                                  </p>
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
              </div>
            )}

              {expenses.length === 0 && (
                <div className="text-center py-8">
                  <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-yellow-400 to-yellow-500 rounded-full flex items-center justify-center shadow-lg animate-pulse">
                    <AlertCircle className="h-8 w-8 text-black" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">No Expenses Yet</h3>
                  <p className="text-gray-400 mb-4">Add expenses to see settlement calculations</p>
                  <div className="w-24 h-1 bg-gray-700 rounded-full mx-auto">
                    <div className="w-12 h-1 bg-yellow-400 rounded-full animate-pulse"></div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Expenses */}
          <Card className="bg-white/90 backdrop-blur-sm border border-yellow-200 shadow-lg hover:shadow-xl transition-all duration-300">
            <CardHeader className="bg-gradient-to-r from-black to-gray-800 text-white border-b border-yellow-400 py-4">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-gradient-to-br from-yellow-400 to-yellow-500 rounded-full flex items-center justify-center shadow-md">
                    <History className="h-4 w-4 text-black" />
                  </div>
                  <span className="text-lg font-bold">Recent Expenses</span>
                  <div className="px-2 py-1 bg-yellow-400 text-black rounded-full text-xs font-semibold">
                    {expenses.length} Total
                  </div>
                </CardTitle>
                {expenses.length > 3 && (
                  <Dialog open={isAllExpensesOpen} onOpenChange={setIsAllExpensesOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" className="flex items-center space-x-1 border-yellow-400 text-yellow-400 hover:bg-yellow-400 hover:text-black transition-all duration-300 text-xs">
                        <Eye className="h-3 w-3" />
                        <span>Show All</span>
                      </Button>
                    </DialogTrigger>
                  <DialogContent className="sm:max-w-2xl max-h-[90vh]">
                    <DialogHeader>
                      <DialogTitle>All Expenses - {group.name}</DialogTitle>
                    </DialogHeader>
                    <ScrollArea className="h-96">
                      <div className="space-y-3">
                        {expenses.map((expense, index) => (
                          <div key={expense.id || index} className="p-4 rounded-lg border">
                            <div className="flex items-start justify-between mb-2">
                              <div>
                                <h4 className="font-medium">{expense.title}</h4>
                                <p className="text-sm text-muted-foreground">
                                  Paid by {expense.paidByName}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="font-bold text-lg">${expense.totalAmount.toFixed(2)}</p>
                                <p className="text-xs text-muted-foreground">
                                  {new Date(expense.createdAt).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                            <div className="space-y-1">
                              {expense.members.map((member: any) => (
                                <div key={member.id} className="flex justify-between text-sm">
                                  <span>{member.name}</span>
                                  <span className={member.isPaid ? 'text-green-600' : 'text-red-600'}>
                                    ${member.amount.toFixed(2)} {member.isPaid ? '(Paid)' : '(Owes)'}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {expenses.length === 0 ? (
              <div className="text-center py-8">
                <CreditCard className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground">No expenses added yet</p>
                <p className="text-sm text-muted-foreground mb-4">Start by adding your first expense</p>
                <Button onClick={() => setIsAddExpenseOpen(true)} className="flex items-center space-x-2">
                  <Plus className="h-4 w-4" />
                  <span>Add First Expense</span>
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {expenses.slice(0, 3).map((expense, index) => (
                  <div key={expense.id || index} className="p-4 rounded-lg border">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h4 className="font-medium">{expense.title}</h4>
                        <p className="text-sm text-muted-foreground">
                          Paid by {expense.paidByName}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-lg">${expense.totalAmount.toFixed(2)}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(expense.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {expense.members.slice(0, 3).map((member: any) => (
                        <Badge key={member.id} variant={member.isPaid ? "default" : "secondary"} className="text-xs">
                          {member.name}: ${member.amount.toFixed(2)}
                        </Badge>
                      ))}
                      {expense.members.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{expense.members.length - 3} more
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}

export default GroupExpense
