import { ethers } from 'ethers'
import { apiService } from './apiService'

// Hook Contract ABI (only the event we need)
const SPLIT_PAYMENT_HOOK_ABI = [
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "address", "name": "from", "type": "address" },
      { "indexed": true, "internalType": "address", "name": "to", "type": "address" },
      { "indexed": false, "internalType": "uint256", "name": "amount", "type": "uint256" },
      { "indexed": false, "internalType": "string", "name": "groupId", "type": "string" },
      { "indexed": false, "internalType": "string", "name": "splitId", "type": "string" },
      { "indexed": true, "internalType": "bytes32", "name": "transactionId", "type": "bytes32" },
      { "indexed": false, "internalType": "uint256", "name": "timestamp", "type": "uint256" }
    ],
    "name": "PaymentProcessed",
    "type": "event"
  }
] as const

// Contract address
const HOOK_CONTRACT_ADDRESS = process.env.VITE_HOOK_CONTRACT_ADDRESS || '0x0000000000000000000000000000000000000000'
const RPC_URL = process.env.VITE_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/your-api-key'

export class PaymentEventListener {
  private provider: ethers.JsonRpcProvider
  private contract: ethers.Contract
  private isListening: boolean = false

  constructor(rpcUrl?: string) {
    this.provider = new ethers.JsonRpcProvider(rpcUrl || RPC_URL)
    this.contract = new ethers.Contract(
      HOOK_CONTRACT_ADDRESS,
      SPLIT_PAYMENT_HOOK_ABI,
      this.provider
    )
  }

  /**
   * Start listening for PaymentProcessed events
   */
  async startListening() {
    if (this.isListening) {
      console.log('⚠️ Already listening for payment events')
      return
    }

    console.log('🎧 Starting payment event listener...')
    console.log('📍 Hook contract address:', HOOK_CONTRACT_ADDRESS)

    try {
      // Listen for PaymentProcessed events
      this.contract.on(
        'PaymentProcessed',
        async (
          from: string,
          to: string,
          amount: bigint,
          groupId: string,
          splitId: string,
          transactionId: string,
          timestamp: bigint,
          event: ethers.EventLog
        ) => {
          console.log('🔔 Payment event received:', {
            from,
            to,
            amount: ethers.formatUnits(amount, 6),
            groupId,
            splitId,
            transactionId,
            timestamp: Number(timestamp),
            blockNumber: event.blockNumber,
            txHash: event.transactionHash
          })

          try {
            // Process the payment event
            await this.processPaymentEvent({
              from,
              to,
              amount,
              groupId,
              splitId,
              transactionId,
              timestamp,
              txHash: event.transactionHash
            })
          } catch (error) {
            console.error('❌ Error processing payment event:', error)
          }
        }
      )

      this.isListening = true
      console.log('✅ Payment event listener started successfully')
    } catch (error) {
      console.error('❌ Failed to start payment event listener:', error)
      throw error
    }
  }

  /**
   * Stop listening for events
   */
  stopListening() {
    if (!this.isListening) {
      console.log('⚠️ Not currently listening for payment events')
      return
    }

    console.log('🛑 Stopping payment event listener...')
    this.contract.removeAllListeners('PaymentProcessed')
    this.isListening = false
    console.log('✅ Payment event listener stopped')
  }

  /**
   * Process a payment event and update the database
   */
  private async processPaymentEvent(eventData: {
    from: string
    to: string
    amount: bigint
    groupId: string
    splitId: string
    transactionId: string
    timestamp: bigint
    txHash: string
  }) {
    console.log('💾 Processing payment event and updating database...')

    try {
      // Convert amount to decimal
      const amountInUSD = parseFloat(ethers.formatUnits(eventData.amount, 6))

      console.log('📝 Recording payment:', {
        splitId: eventData.splitId,
        fromUser: eventData.from,
        amount: amountInUSD,
        transactionId: eventData.txHash,
        method: 'CRYPTO'
      })

      // Record the payment in the database via API
      await apiService.recordPayment(
        eventData.splitId,
        eventData.from,
        amountInUSD,
        'CRYPTO',
        eventData.txHash
      )

      console.log('✅ Payment recorded successfully in database')
      console.log('🎉 Payment processing complete!')
    } catch (error: any) {
      console.error('❌ Failed to record payment in database:', error)
      
      // Log the error but don't throw - we don't want to crash the listener
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        eventData
      })
    }
  }

  /**
   * Get past events (for catching up on missed events)
   */
  async getPastEvents(fromBlock: number = 0, toBlock: number | string = 'latest') {
    console.log(`📜 Fetching past payment events from block ${fromBlock} to ${toBlock}...`)

    try {
      const filter = this.contract.filters.PaymentProcessed()
      const events = await this.contract.queryFilter(filter, fromBlock, toBlock)

      console.log(`✅ Found ${events.length} past payment events`)

      // Process each past event
      for (const event of events) {
        if (event instanceof ethers.EventLog) {
          const args = event.args
          await this.processPaymentEvent({
            from: args.from,
            to: args.to,
            amount: args.amount,
            groupId: args.groupId,
            splitId: args.splitId,
            transactionId: args.transactionId,
            timestamp: args.timestamp,
            txHash: event.transactionHash
          })
        }
      }

      return events
    } catch (error) {
      console.error('❌ Failed to fetch past events:', error)
      throw error
    }
  }

  /**
   * Get the current listening status
   */
  getStatus() {
    return {
      isListening: this.isListening,
      contractAddress: HOOK_CONTRACT_ADDRESS,
      rpcUrl: RPC_URL
    }
  }
}

// Singleton instance
let eventListener: PaymentEventListener | null = null

export const getPaymentEventListener = (rpcUrl?: string): PaymentEventListener => {
  if (!eventListener) {
    eventListener = new PaymentEventListener(rpcUrl)
  }
  return eventListener
}

export default PaymentEventListener
