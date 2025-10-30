import React, { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
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
import { useToast } from '@/hooks/use-toast'
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
  AlertCircle,
  Wallet
} from 'lucide-react'
import { useDatabase } from '@/hooks/useDatabase'
import { useMultiChainWallet } from '@/contexts/MultiChainWalletContext'
import { calculateGroupSettlement } from '@/services/debtSettlementService'
import PaymentModal from '@/components/PaymentModal'
import { apiService } from '@/services/apiService'

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
  const { currentAccount, isConnected } = useMultiChainWallet()
  const address = currentAccount?.address
  const { groups, friends, createSplit, refreshAll, userDues, recordPayment } = useDatabase()
  const { toast } = useToast()

  const [group, setGroup] = useState<any>(null)
  const [groupMembers, setGroupMembers] = useState<any[]>([])
  const [expenses, setExpenses] = useState<any[]>([])
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false)
  const [isLoadingExpenses, setIsLoadingExpenses] = useState(false)
  const [isAllExpensesOpen, setIsAllExpensesOpen] = useState(false)
  const [isCreatingExpense, setIsCreatingExpense] = useState(false)
  const [settlementData, setSettlementData] = useState<any>(null)
  const [totalExpenses, setTotalExpenses] = useState(0)
  const [isLoadingGroup, setIsLoadingGroup] = useState(true)
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false)
  const [selectedTransaction, setSelectedTransaction] = useState<any>(null)

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
        
        console.log('🔍 Wallet connection debug:', {
          connectedAddress: address,
          isConnected,
          currentAccount,
          groupMembers: members,
          currentUser: members.find(m => m.isCurrentUser)
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

  // Fetch expenses for the group
  const fetchExpenses = useCallback(async () => {
    if (!group?.id) return

    setIsLoadingExpenses(true)
    try {
      console.log('🔄 Fetching expenses for group:', group.id)
      const data = await apiService.getGroupSplits(group.id)
      setExpenses(data)
      console.log('✅ Expenses fetched:', data.length)
    } catch (error) {
      console.error('❌ Error fetching expenses:', error)
    } finally {
      setIsLoadingExpenses(false)
    }
  }, [group?.id])

  // Fetch expenses when group changes
  useEffect(() => {
    if (group?.id) {
      fetchExpenses()
    }
  }, [group?.id, fetchExpenses])

  // Refresh data when component mounts and periodically
  useEffect(() => {
    const refreshData = async () => {
      console.log('🔄 GroupExpense: Refreshing data...')
      await refreshAll()
      if (group?.id) {
        await fetchExpenses()
      }
    }

    // Initial refresh
    refreshData()

    // Refresh every 15 seconds while on this page
    const interval = setInterval(refreshData, 15000)

    return () => clearInterval(interval)
  }, [refreshAll, fetchExpenses, group?.id])

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
      
      // Force refresh all data and expenses to get updated information from database
      console.log('🔄 Refreshing all data after expense creation...')
      await Promise.all([
        refreshAll(),
        fetchExpenses()
      ])
      console.log('✅ Data and expenses refreshed after expense creation')
      
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

  // Handle payment button click
  const handlePayClick = (transaction: any) => {
    console.log('🔥 Pay button clicked!', transaction)
    const fromMember = groupMembers.find(m => 
      m.wallet === transaction.from || m.name === transaction.from
    )
    const toMember = groupMembers.find(m => 
      m.wallet === transaction.to || m.name === transaction.to
    )

    console.log('👤 From member:', fromMember)
    console.log('👤 To member:', toMember)

    setSelectedTransaction({
      from: fromMember?.wallet || transaction.from,
      to: toMember?.wallet || transaction.to,
      amount: transaction.amount,
      fromName: fromMember?.name || transaction.from,
      toName: toMember?.name || transaction.to,
      description: `Payment for ${group.name}`
    })
    console.log('💰 Opening payment modal...')
    setIsPaymentModalOpen(true)
  }

  // Handle successful payment
  const handlePaymentSuccess = async (transactionId: string) => {
    console.log('💰 Payment successful, recording in database:', transactionId)
    
    // Record payment in the database
    try {
      if (selectedTransaction) {
        // Find the split(s) related to this transaction
        // For simplicity, we'll record it against the most recent unpaid split
        const unpaidExpense = expenses.find(exp => 
          !exp.members.find((m: any) => m.id === address)?.isPaid
        )
        
        if (unpaidExpense) {
          await recordPayment(
            unpaidExpense.id,
            selectedTransaction.amount,
            'CRYPTO',
            transactionId
          )
          
          // Show success toast
          toast({
            title: "Payment Successful! 🎉",
            description: `$${selectedTransaction.amount.toFixed(2)} paid to ${selectedTransaction.toName}`,
            duration: 5000,
          })
          
          // Refresh data to show updated status
          await refreshAll()
          
          // Wait a bit for the database to update
          setTimeout(async () => {
            await fetchExpenses()
            // Recalculate settlement after payment
            if (expenses.length > 0) {
              const settlement = calculateGroupSettlement(expenses)
              setSettlementData(settlement)
            }
          }, 1000)
          
          console.log('✅ Payment recorded successfully')
          
          // Close the payment modal
          setIsPaymentModalOpen(false)
          setSelectedTransaction(null)
        }
      }
    } catch (error) {
      console.error('❌ Failed to record payment:', error)
      toast({
        title: "Payment Recording Failed",
        description: "Payment was sent but couldn't be recorded in the database.",
        variant: "destructive",
        duration: 5000,
      })
    }
  }

  // Show loading state while fetching group
  if (isLoadingGroup) {
    return (
      <div className="flex items-center justify-center h-screen bg-black">
        <div className="text-center space-y-4">
          <motion.img
            src="/favicon.ico"
            alt="Loading"
            className="w-12 h-12 mx-auto"
            initial={{ scale: 0.8, opacity: 0.7 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ 
              duration: 1.5, 
              repeat: Infinity, 
              repeatType: "reverse",
              ease: "easeInOut"
            }}
          />
          <p className="text-white/70">Loading group...</p>
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
    <div className="min-h-screen bg-black">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full bg-black border-b border-yellow-500 shadow-2xl shadow-yellow-500/20">
        <div className="container flex h-16 sm:h-20 items-center justify-between px-3 sm:px-6">
          <div className="flex items-center space-x-3 sm:space-x-6 flex-1 min-w-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/dashboard')}
              className="text-white hover:text-yellow-400 hover:bg-yellow-500/20 transition-all duration-300 border border-yellow-500 hover:border-yellow-400 px-2 sm:px-4 py-2 rounded-lg flex-shrink-0"
            >
              <ArrowLeft className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Back to Dashboard</span>
            </Button>
            <div className="hidden sm:block h-8 w-px bg-yellow-500/50"></div>
            <div className="flex items-center space-x-3 sm:space-x-4 min-w-0 flex-1">
              <div className="w-8 h-8 sm:w-12 sm:h-12 bg-yellow-500 rounded-full flex items-center justify-center shadow-lg flex-shrink-0">
                <Users className="h-4 w-4 sm:h-6 sm:w-6 text-black" />
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="text-lg sm:text-2xl font-bold text-white truncate">{group.name}</h1>
                <p className="text-yellow-400 font-medium text-xs sm:text-sm">
                  {groupMembers.length} member{groupMembers.length !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-2 sm:space-x-4 flex-shrink-0">
            <Dialog open={isAddExpenseOpen} onOpenChange={setIsAddExpenseOpen}>
              <DialogTrigger asChild>
                <Button className="bg-yellow-500 hover:bg-yellow-400 text-black font-bold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 px-3 sm:px-6 py-2 sm:py-3 rounded-lg text-sm sm:text-base">
                  <Plus className="h-4 w-4 sm:h-5 sm:w-5 sm:mr-2" />
                  <span className="hidden sm:inline">Add Expense</span>
                </Button>
              </DialogTrigger>
            <DialogContent className="w-[95%] sm:max-w-lg max-h-[90vh] sm:max-h-[85vh] overflow-y-auto bg-black border-yellow-500">
              <DialogHeader>
                <DialogTitle className="flex items-center space-x-2 sm:space-x-3 text-white">
                  <div className="w-6 h-6 sm:w-8 sm:h-8 bg-yellow-500 rounded-full flex items-center justify-center">
                    <DollarSign className="h-3 w-3 sm:h-4 sm:w-4 text-black" />
                  </div>
                  <span className="text-lg sm:text-xl">Add New Expense</span>
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-3 sm:space-y-4">
                {/* Expense Title */}
                <div className="space-y-2">
                  <Label htmlFor="title" className="text-white font-semibold">Expense Title</Label>
                  <Input
                    id="title"
                    placeholder="e.g., Dinner at restaurant, Uber ride, Groceries"
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    className="bg-black/50 border-yellow-500/50 text-white placeholder:text-gray-400 focus:border-yellow-400"
                  />
                </div>

                {/* Amount and Payer */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="amount" className="text-white font-semibold text-sm sm:text-base">Total Amount ($)</Label>
                    <Input
                      id="amount"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={formData.amount}
                      onChange={(e) => handleAmountChange(e.target.value)}
                      className="bg-black/50 border-yellow-500/50 text-white placeholder:text-gray-400 focus:border-yellow-400 h-12 sm:h-10"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-white font-semibold text-sm sm:text-base">Who Paid?</Label>
                    <Select value={formData.paidBy} onValueChange={(value) => setFormData(prev => ({ ...prev, paidBy: value }))}>
                      <SelectTrigger className="bg-black/50 border-yellow-500/50 text-white focus:border-yellow-400 h-12 sm:h-10">
                        <SelectValue placeholder="Select payer" />
                      </SelectTrigger>
                      <SelectContent className="bg-black border-yellow-500">
                        {groupMembers.map((member) => (
                          <SelectItem key={member.wallet} value={member.wallet} className="text-white hover:bg-yellow-500/20">
                            <div className="flex items-center space-x-2">
                              <span>{member.name}</span>
                              {member.isCurrentUser && <Badge className="bg-yellow-500/30 text-yellow-300 text-xs">You</Badge>}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Split Options */}
                <div className="space-y-3 sm:space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 sm:p-4 bg-yellow-500/10 rounded-lg border border-yellow-500/30 space-y-3 sm:space-y-0">
                    <Label className="text-white font-semibold text-sm sm:text-base">Split Type</Label>
                    <div className="flex items-center justify-center sm:justify-end space-x-2 sm:space-x-3">
                      <span className={`text-xs sm:text-sm font-medium ${formData.isEqualSplit ? 'text-yellow-400' : 'text-white/60'}`}>
                        Equal Split
                      </span>
                      <Switch
                        checked={!formData.isEqualSplit}
                        onCheckedChange={(checked) => handleSplitToggle(!checked)}
                        className="data-[state=checked]:bg-yellow-500"
                      />
                      <span className={`text-xs sm:text-sm font-medium ${!formData.isEqualSplit ? 'text-yellow-400' : 'text-white/60'}`}>
                        Custom Split
                      </span>
                    </div>
                  </div>

                  {/* Custom Split Amounts */}
                  {!formData.isEqualSplit && (
                    <div className="space-y-4 p-4 bg-black/50 rounded-lg border border-yellow-500/30">
                      <Label className="text-white font-semibold">Custom Split Amounts</Label>
                      <div className="space-y-3 max-h-40 overflow-y-auto">
                        {groupMembers.map((member) => (
                          <div key={member.wallet} className="flex items-center justify-between space-x-3 p-2 bg-yellow-500/10 rounded border border-yellow-500/20">
                            <div className="flex items-center space-x-2 min-w-0 flex-1">
                              <span className="text-sm font-medium text-white truncate">{member.name}</span>
                              {member.isCurrentUser && <Badge className="bg-yellow-500/30 text-yellow-300 text-xs">You</Badge>}
                            </div>
                            <div className="w-24">
                              <Input
                                type="number"
                                step="0.01"
                                placeholder="0.00"
                                value={formData.customAmounts[member.wallet] || ''}
                                onChange={(e) => handleCustomAmountChange(member.wallet, e.target.value)}
                                className="text-right bg-black/50 border-yellow-500/50 text-white placeholder:text-gray-400 focus:border-yellow-400"
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                      
                      {/* Total Validation */}
                      <div className="flex justify-between text-sm p-2 bg-yellow-500/20 rounded border border-yellow-500/30">
                        <span className="text-white font-medium">Total Split:</span>
                        <span className={`font-bold ${totalCustomAmount === (parseFloat(formData.amount) || 0) ? 'text-yellow-400' : 'text-yellow-300/70'}`}>
                          ${totalCustomAmount.toFixed(2)} / ${(parseFloat(formData.amount) || 0).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-between pt-6 border-t border-yellow-500/30">
                  <Button
                    variant="outline"
                    onClick={() => setIsAddExpenseOpen(false)}
                    disabled={isCreatingExpense}
                    className="border-yellow-500/50 text-white hover:bg-yellow-500/20 hover:border-yellow-400"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleAddExpense}
                    disabled={!isFormValid || isCreatingExpense}
                    className="min-w-[140px] bg-yellow-500 hover:bg-yellow-400 text-black font-bold"
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
      <main className="min-h-screen bg-black">
        <div className="container mx-auto px-3 sm:px-6 py-4 sm:py-8 space-y-4 sm:space-y-8">
          {/* Group Members */}
          <Card className="bg-black border-yellow-500/40 shadow-lg">
            <CardHeader className="bg-yellow-500/10 border-b border-yellow-500/20 py-3 sm:py-4">
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-5 h-5 sm:w-6 sm:h-6 bg-yellow-500 rounded-full flex items-center justify-center">
                    <Users className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-black" />
                  </div>
                  <span className="text-base sm:text-lg font-semibold text-white">Group Members</span>
                </div>
                <div className="px-2 py-1 bg-yellow-500/30 text-yellow-200 rounded-lg text-xs font-medium">
                  {groupMembers.length} Active
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 sm:p-4 bg-black">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
                {groupMembers.map((member, index) => (
                  <div 
                    key={member.wallet} 
                    className="flex items-center space-x-2 sm:space-x-3 p-2 sm:p-3 rounded-lg bg-yellow-500/5 border border-yellow-500/20 hover:bg-yellow-500/10 transition-all duration-200"
                  >
                    <div className="relative">
                      <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-yellow-500/30 flex items-center justify-center">
                        <span className="text-xs sm:text-sm font-medium text-white">
                          {(member.name || 'U').charAt(0).toUpperCase()}
                        </span>
                      </div>
                      {member.isCurrentUser && (
                        <div className="absolute -top-0.5 -right-0.5 sm:-top-1 sm:-right-1 w-2 h-2 sm:w-3 sm:h-3 bg-yellow-500 rounded-full"></div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-white text-xs sm:text-sm truncate">
                        {member.name}
                      </p>
                      <p className="text-xs text-white/60 truncate">
                        {member.isCurrentUser ? 'You' : 'Member'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Financial Summary */}
          <Card className="bg-black border border-yellow-500 shadow-2xl shadow-yellow-500/30">
            <CardHeader className="bg-yellow-500/20 border-b border-yellow-500/30 py-4 sm:py-6">
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center space-x-2 sm:space-x-3">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-yellow-500 rounded-full flex items-center justify-center shadow-lg">
                    <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-black" />
                  </div>
                  <span className="text-lg sm:text-xl font-bold text-white">Financial Dashboard</span>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 sm:p-6 bg-black">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-4 sm:mb-6">
                <div className="text-center p-3 sm:p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/30 hover:bg-yellow-500/15 transition-all duration-200">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 mx-auto mb-2 sm:mb-3 bg-yellow-500/30 rounded-full flex items-center justify-center">
                    <DollarSign className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-400" />
                  </div>
                  <p className="text-xs font-medium text-yellow-400/80 mb-1 uppercase tracking-wide">Total Expenses</p>
                  <p className="text-lg sm:text-xl font-bold text-white">${totalExpenses.toFixed(2)}</p>
                </div>
                
                <div className="text-center p-3 sm:p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/30 hover:bg-yellow-500/15 transition-all duration-200">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 mx-auto mb-2 sm:mb-3 bg-yellow-500/30 rounded-full flex items-center justify-center">
                    <Target className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-400" />
                  </div>
                  <p className="text-xs font-medium text-yellow-400/80 mb-1 uppercase tracking-wide">Pending Payments</p>
                  <p className="text-lg sm:text-xl font-bold text-white">
                    {settlementData ? settlementData.transactions.length : 0}
                  </p>
                </div>
                
                <div className="text-center p-3 sm:p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/30 hover:bg-yellow-500/15 transition-all duration-200">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 mx-auto mb-2 sm:mb-3 bg-yellow-500/30 rounded-full flex items-center justify-center">
                    <Users className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-400" />
                  </div>
                  <p className="text-xs font-medium text-yellow-400/80 mb-1 uppercase tracking-wide">Participants</p>
                  <p className="text-lg sm:text-xl font-bold text-white">{groupMembers.length}</p>
                </div>
              </div>

              {/* Settlement Diagram */}
              {settlementData && settlementData.transactions.length > 0 && (
                <div className="space-y-4 sm:space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
                    <div className="flex items-center space-x-2 sm:space-x-3">
                      <div className="w-6 h-6 sm:w-8 sm:h-8 bg-yellow-500 rounded-full flex items-center justify-center">
                        <Target className="h-3 w-3 sm:h-4 sm:w-4 text-black" />
                      </div>
                      <h3 className="text-base sm:text-lg font-semibold text-white">Settlement Required</h3>
                    </div>
                    <div className="px-2 sm:px-3 py-1 bg-yellow-500/30 text-yellow-200 rounded-lg text-xs font-medium">
                      {settlementData.transactions.length} Payment{settlementData.transactions.length > 1 ? 's' : ''}
                    </div>
                  </div>
                  
                  <div className="space-y-3 sm:space-y-4">
                    {settlementData.transactions.map((transaction: any, index: number) => {
                      const fromMember = groupMembers.find(m => 
                        m.wallet === transaction.from || m.name === transaction.from
                      )
                      const toMember = groupMembers.find(m => 
                        m.wallet === transaction.to || m.name === transaction.to
                      )
                      
                      // Debug logs
                      console.log('🔍 Settlement transaction debug:', {
                        transaction,
                        fromMember,
                        toMember,
                        currentAddress: address,
                        currentAccount: currentAccount,
                        fromMemberIsCurrentUser: fromMember?.isCurrentUser,
                        groupMembers: groupMembers.map(m => ({ 
                          wallet: m.wallet, 
                          name: m.name, 
                          isCurrentUser: m.isCurrentUser 
                        }))
                      })
                      
                      return (
                        <div 
                          key={index} 
                          className="group p-4 sm:p-8 rounded-xl sm:rounded-2xl bg-yellow-500/10 border border-yellow-500/50 shadow-xl hover:shadow-2xl transition-all duration-300 hover:border-yellow-400"
                        >
                          <div className="flex items-center justify-center mb-4 sm:mb-8">
                            <div className="text-center p-4 sm:p-6 bg-black/30 rounded-xl sm:rounded-2xl border border-yellow-500/30 w-full sm:min-w-[280px]">
                              <p className="text-xs sm:text-sm text-white/70 font-medium uppercase tracking-wider mb-2 sm:mb-3">
                                Amount Due
                              </p>
                              <p className="text-2xl sm:text-4xl font-black text-yellow-400 mb-2">
                                ${transaction.amount.toFixed(2)}
                              </p>
                              <div className="w-12 sm:w-16 h-1 bg-gradient-to-r from-transparent via-yellow-400 to-transparent mx-auto"></div>
                            </div>
                          </div>
                          
                          {/* Pay Button - Only show if current user is the payer */}
                          {fromMember?.isCurrentUser && (
                            <div className="pt-4 sm:pt-6 border-t border-yellow-500/30">
                              <Button
                                onClick={() => handlePayClick(transaction)}
                                className="w-full bg-yellow-500 hover:bg-yellow-400 text-black font-bold shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105 px-4 sm:px-8 py-3 sm:py-4 rounded-lg sm:rounded-xl text-sm sm:text-lg"
                                size="lg"
                              >
                                <Wallet className="h-4 w-4 sm:h-6 sm:w-6 mr-2 sm:mr-3" />
                                Pay ${transaction.amount.toFixed(2)} Now
                              </Button>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>

                  {/* Current Balances */}
                  {settlementData.balances && (
                    <div className="mt-4 sm:mt-6">
                      <div className="flex items-center space-x-2 sm:space-x-3 mb-3 sm:mb-4">
                        <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-br from-yellow-400 to-yellow-500 rounded-full flex items-center justify-center shadow-md">
                          <Calculator className="h-3 w-3 sm:h-4 sm:w-4 text-black" />
                        </div>
                        <h4 className="text-base sm:text-lg font-bold text-white">Current Balances</h4>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
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
                                  ? 'bg-gradient-to-br from-yellow-500/80 to-yellow-600/80 border-yellow-400' 
                                  : isNegative 
                                    ? 'bg-gradient-to-br from-yellow-500/40 to-yellow-600/40 border-yellow-500/60'
                                    : 'bg-gradient-to-br from-yellow-500/20 to-yellow-600/20 border-yellow-500/40'
                              }`}
                              style={{ animationDelay: `${index * 50}ms` }}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-2">
                                  <div className="w-8 h-8 rounded-full bg-black/30 flex items-center justify-center shadow-sm group-hover:shadow-md transition-all duration-300">
                                    <span className="text-sm font-bold text-white">
                                      {(member?.name || person || 'U').charAt(0).toUpperCase()}
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
                <div className="text-center py-12">
                  <div className="w-24 h-24 mx-auto mb-6 bg-yellow-500/20 rounded-full flex items-center justify-center shadow-2xl border border-yellow-500/50">
                    <AlertCircle className="h-12 w-12 text-yellow-400" />
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-4">No Expenses Yet</h3>
                  <p className="text-white/70 mb-6 text-lg">Start adding expenses to see settlement calculations</p>
                  <div className="w-32 h-2 bg-yellow-500/30 rounded-full mx-auto">
                    <div className="w-16 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Expenses */}
          <Card className="bg-black border border-yellow-500/40 shadow-lg">
            <CardHeader className="bg-yellow-500/10 border-b border-yellow-500/20 py-3 sm:py-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
                <CardTitle className="flex items-center space-x-2">
                  <div className="w-5 h-5 sm:w-6 sm:h-6 bg-yellow-500 rounded-full flex items-center justify-center">
                    <History className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-black" />
                  </div>
                  <span className="text-base sm:text-lg font-semibold text-white">Recent Expenses</span>
                  <div className="px-2 py-1 bg-yellow-500/30 text-yellow-200 rounded-lg text-xs font-medium">
                    {expenses.length} Total
                  </div>
                </CardTitle>
                {expenses.length > 3 && (
                  <Dialog open={isAllExpensesOpen} onOpenChange={setIsAllExpensesOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" className="border-yellow-500 text-yellow-400 hover:bg-yellow-500/20 hover:border-yellow-400 transition-all duration-300 text-xs sm:text-sm">
                        <Eye className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" />
                        <span className="hidden sm:inline">View All Expenses</span>
                        <span className="sm:hidden">View All</span>
                      </Button>
                    </DialogTrigger>
                  <DialogContent className="w-[95%] sm:max-w-2xl max-h-[90vh] bg-black border-yellow-500">
                    <DialogHeader className="border-b border-yellow-500/30 pb-3 sm:pb-4">
                      <DialogTitle className="text-lg sm:text-2xl font-bold text-white flex items-center space-x-2 sm:space-x-3">
                        <div className="w-6 h-6 sm:w-8 sm:h-8 bg-yellow-500 rounded-full flex items-center justify-center">
                          <CreditCard className="h-3 w-3 sm:h-4 sm:w-4 text-black" />
                        </div>
                        <span>All Expenses - {group.name}</span>
                      </DialogTitle>
                    </DialogHeader>
                    <ScrollArea className="h-96 mt-4">
                      <div className="space-y-4">
                        {expenses.map((expense, index) => (
                          <div key={expense.id || index} className="p-6 rounded-xl bg-yellow-500/10 border border-yellow-500/30 shadow-lg">
                            <div className="flex items-start justify-between mb-4">
                              <div className="flex-1">
                                <h4 className="font-bold text-white text-lg mb-2">{expense.title}</h4>
                                <p className="text-white/80">
                                  Paid by <span className="text-yellow-400 font-medium">{expense.paidByName || 'Unknown'}</span>
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="font-black text-yellow-400 text-2xl mb-1">${expense.totalAmount.toFixed(2)}</p>
                                <p className="text-white/60 text-sm">
                                  {new Date(expense.createdAt).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                            <div className="space-y-2">
                              {expense.members.map((member: any) => (
                                <div key={member.id} className="flex justify-between items-center p-2 rounded-lg bg-yellow-500/20 border border-yellow-500/50">
                                  <span className="text-white font-medium">{member.name}</span>
                                  <span className={`font-bold px-3 py-1 rounded-full text-sm ${member.isPaid ? 'bg-yellow-500/30 text-yellow-300' : 'bg-yellow-500/10 text-white'}`}>
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
          <CardContent className="p-3 sm:p-6 bg-black">
            {expenses.length === 0 ? (
              <div className="text-center py-8 sm:py-12">
                <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4 sm:mb-6 bg-yellow-500/20 rounded-full flex items-center justify-center shadow-xl border border-yellow-500/50">
                  <CreditCard className="h-8 w-8 sm:h-10 sm:w-10 text-yellow-400" />
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-white mb-2 sm:mb-3">No expenses added yet</h3>
                <p className="text-white/70 mb-4 sm:mb-6 text-sm sm:text-base">Start tracking expenses with your group members</p>
                <Button onClick={() => setIsAddExpenseOpen(true)} className="bg-yellow-500 hover:bg-yellow-400 text-black font-bold px-4 sm:px-6 py-2 sm:py-3 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 text-sm sm:text-base">
                  <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
                  Add First Expense
                </Button>
              </div>
            ) : (
              <div className="space-y-2 sm:space-y-3">
                {expenses.slice(0, 3).map((expense, index) => (
                  <div key={expense.id || index} className="p-3 sm:p-4 rounded-lg bg-yellow-500/5 border border-yellow-500/20 hover:bg-yellow-500/10 transition-all duration-200">
                    <div className="flex items-start justify-between mb-2 sm:mb-3">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-white text-sm sm:text-base mb-1 truncate">{expense.title}</h4>
                        <p className="text-white/70 text-xs sm:text-sm">
                          Paid by <span className="text-yellow-400">{expense.paidByName || 'Unknown'}</span>
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="font-bold text-yellow-400 text-base sm:text-lg">${expense.totalAmount.toFixed(2)}</p>
                        <p className="text-white/50 text-xs">
                          {new Date(expense.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1 sm:gap-2">
                      {expense.members.slice(0, 3).map((member: any) => (
                        <Badge key={member.id} className={`${member.isPaid ? "bg-yellow-500/30 text-yellow-300 border-yellow-500" : "bg-yellow-500/10 text-white border-yellow-500/50"} text-xs sm:text-sm py-1 px-2 sm:px-3`}>
                          {member.name}: ${member.amount.toFixed(2)}
                        </Badge>
                      ))}
                      {expense.members.length > 3 && (
                        <Badge className="bg-yellow-500/20 text-yellow-300 border-yellow-500/50 text-xs sm:text-sm py-1 px-2 sm:px-3">
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

      {/* Payment Modal */}
      {selectedTransaction && (
        <PaymentModal
          isOpen={isPaymentModalOpen}
          onClose={() => {
            setIsPaymentModalOpen(false)
            setSelectedTransaction(null)
          }}
          transaction={{
            from: selectedTransaction.from,
            to: selectedTransaction.to,
            amount: selectedTransaction.amount,
            description: selectedTransaction.description
          }}
          groupId={groupId || ''}
          groupName={group?.name || ''}
          fromMemberName={selectedTransaction.fromName}
          toMemberName={selectedTransaction.toName}
          onPaymentSuccess={handlePaymentSuccess}
        />
      )}
    </div>
  )
}

export default GroupExpense
