// Debt Settlement Service - Implements optimal debt settlement algorithm
// Based on the C++ algorithm for minimizing payment transactions

interface Balance {
  name: string
  amount: number
}

interface Transaction {
  from: string
  to: string
  amount: number
  description: string
}

interface ExpenseShare {
  person: string
  amount: number
}

export class DebtSettlementService {
  private balances: Map<string, number> = new Map()

  constructor() {
    this.balances = new Map()
  }

  /**
   * Add an expense to the settlement calculation
   * @param payer - Person who paid the expense
   * @param totalAmount - Total amount of the expense
   * @param shares - How the expense should be split among participants
   */
  addExpense(payer: string, totalAmount: number, shares: ExpenseShare[]): boolean {
    // Validate that shares add up to total amount (with small tolerance for floating point)
    const totalShares = shares.reduce((sum, share) => sum + share.amount, 0)
    const tolerance = 0.02 // Increased tolerance for floating point precision issues
    
    if (Math.abs(totalShares - totalAmount) > tolerance) {
      console.error(`Error: Shares (${totalShares}) do not add up to total amount (${totalAmount})!`)
      return false
    }

    // Subtract each person's share from their balance (they owe this amount)
    for (const share of shares) {
      const currentBalance = this.balances.get(share.person) || 0
      this.balances.set(share.person, currentBalance - share.amount)
    }

    // Add the total amount to the payer's balance (they are owed this amount)
    const payerBalance = this.balances.get(payer) || 0
    this.balances.set(payer, payerBalance + totalAmount)

    return true
  }

  /**
   * Calculate optimal settlement transactions
   * Returns the minimum number of transactions needed to settle all debts
   */
  calculateSettlement(): Transaction[] {
    const tolerance = 1e-9
    
    // Separate people into those who owe money (debtors) and those who are owed money (creditors)
    const debtors: Balance[] = []
    const creditors: Balance[] = []

    for (const [name, balance] of this.balances) {
      if (balance < -tolerance) {
        // Person owes money (negative balance)
        debtors.push({ name, amount: -balance })
      } else if (balance > tolerance) {
        // Person is owed money (positive balance)
        creditors.push({ name, amount: balance })
      }
    }

    const transactions: Transaction[] = []
    let i = 0, j = 0

    // Greedy algorithm to minimize transactions
    while (i < debtors.length && j < creditors.length) {
      const debtor = debtors[i]
      const creditor = creditors[j]
      
      const debtAmount = debtor.amount
      const creditAmount = creditor.amount
      
      // Pay the minimum of what the debtor owes and what the creditor is owed
      const paymentAmount = Math.min(debtAmount, creditAmount)
      
      transactions.push({
        from: debtor.name,
        to: creditor.name,
        amount: Math.round(paymentAmount * 100) / 100, // Round to 2 decimal places
        description: `${debtor.name} pays $${(Math.round(paymentAmount * 100) / 100).toFixed(2)} to ${creditor.name}`
      })

      // Update remaining amounts
      debtor.amount -= paymentAmount
      creditor.amount -= paymentAmount

      // Move to next debtor/creditor if current one is settled
      if (debtor.amount < tolerance) i++
      if (creditor.amount < tolerance) j++
    }

    return transactions
  }

  /**
   * Get current balances for all participants
   */
  getBalances(): { [name: string]: number } {
    const result: { [name: string]: number } = {}
    for (const [name, balance] of this.balances) {
      result[name] = Math.round(balance * 100) / 100 // Round to 2 decimal places
    }
    return result
  }

  /**
   * Clear all balances (reset the calculator)
   */
  reset(): void {
    this.balances.clear()
  }

  /**
   * Get summary statistics
   */
  getSummary(): {
    totalDebt: number
    totalCredit: number
    isBalanced: boolean
    participantCount: number
  } {
    let totalDebt = 0
    let totalCredit = 0
    
    for (const balance of this.balances.values()) {
      if (balance < 0) {
        totalDebt += Math.abs(balance)
      } else if (balance > 0) {
        totalCredit += balance
      }
    }

    return {
      totalDebt: Math.round(totalDebt * 100) / 100,
      totalCredit: Math.round(totalCredit * 100) / 100,
      isBalanced: Math.abs(totalDebt - totalCredit) < 1e-6,
      participantCount: this.balances.size
    }
  }
}

/**
 * Calculate optimal debt settlement for a group's splits
 * @param splits - Array of split data for a group
 * @returns Optimal settlement transactions
 */
export function calculateGroupSettlement(splits: any[]): {
  transactions: Transaction[]
  balances: { [name: string]: number }
  summary: {
    totalDebt: number
    totalCredit: number
    isBalanced: boolean
    participantCount: number
  }
} {
  const settlement = new DebtSettlementService()

  // Add each split as an expense
  for (const split of splits) {
    const shares: ExpenseShare[] = split.members.map((member: any) => ({
      person: member.name || member.walletId,
      amount: Number(member.amount)
    }))

    settlement.addExpense(
      split.paidByName || split.paidBy,
      Number(split.totalAmount),
      shares
    )
  }

  return {
    transactions: settlement.calculateSettlement(),
    balances: settlement.getBalances(),
    summary: settlement.getSummary()
  }
}

export default DebtSettlementService
