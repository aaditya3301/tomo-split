import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { databaseService } from '../services/databaseService'
// import { getPaymentEventListener } from '../services/paymentEventListener'

// Load environment variables first
dotenv.config()

// Ensure DATABASE_URL is available from VITE_DATABASE_URL if needed
if (!process.env.DATABASE_URL && process.env.VITE_DATABASE_URL) {
  process.env.DATABASE_URL = process.env.VITE_DATABASE_URL
  console.log('🔄 Using VITE_DATABASE_URL as DATABASE_URL')
}

console.log('🔗 Database URL:', process.env.DATABASE_URL ? '✅ Configured' : '❌ Missing')

const app = express()
const PORT = process.env.PORT || 3001

// CORS Configuration
const corsOptions = {
  origin: [
    'http://localhost:5173', 
    'http://localhost:5174', 
    'http://localhost:3002',
    'http://localhost:3000',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:3002',
    // Production Vercel domain
    'https://tomo-split-five.vercel.app',
    // Allow any Vercel preview deployments
    /^https:\/\/tomo-split-.*\.vercel\.app$/,
    // Production custom domain
    'https://www.tomolabs.in',
    'https://tomolabs.in'
  ],
  credentials: true,
  optionsSuccessStatus: 200
}

// Middleware
app.use(cors(corsOptions))
app.use(express.json())

// Health check with database test
app.get('/api/health', async (req, res) => {
  try {
    // Test database connection
    await databaseService.getUserByWallet('test-connection')
    res.json({ 
      status: 'OK', 
      database: 'Connected',
      timestamp: new Date().toISOString() 
    })
  } catch (error) {
    console.error('❌ Database health check failed:', error)
    res.status(500).json({ 
      status: 'ERROR', 
      database: 'Disconnected',
      error: error.message,
      timestamp: new Date().toISOString() 
    })
  }
})

// User Routes
app.post('/api/users', async (req, res) => {
  try {
    const { walletAddress, ensName, displayName } = req.body
    const user = await databaseService.createOrUpdateUser(walletAddress, ensName, displayName)
    res.json({ success: true, data: user })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

app.get('/api/users/:walletAddress', async (req, res) => {
  try {
    const { walletAddress } = req.params
    const user = await databaseService.getUserByWallet(walletAddress)
    res.json({ success: true, data: user })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

// Friend Routes
app.get('/api/friends/:walletAddress', async (req, res) => {
  try {
    const { walletAddress } = req.params
    console.log(`🔄 GET /api/friends/${walletAddress}`)
    
    const friends = await databaseService.getFriends(walletAddress)
    console.log(`✅ Retrieved ${friends.length} friends for ${walletAddress}`)
    
    res.json({ success: true, data: friends })
  } catch (error: any) {
    console.error(`❌ Error getting friends for ${req.params.walletAddress}:`, error)
    res.status(500).json({ success: false, error: error.message })
  }
})

app.post('/api/friends', async (req, res) => {
  try {
    console.log(`🔄 POST /api/friends`)
    console.log(`📤 Request body:`, req.body)
    
    const { userWallet, friendData } = req.body
    
    if (!userWallet) {
      console.error(`❌ Missing userWallet in request`)
      return res.status(400).json({ success: false, error: 'userWallet is required' })
    }
    
    if (!friendData) {
      console.error(`❌ Missing friendData in request`)
      return res.status(400).json({ success: false, error: 'friendData is required' })
    }
    
    console.log(`🔄 Adding friend for user: ${userWallet}`)
    console.log(`🔄 Friend data:`, friendData)
    
    const friendship = await databaseService.addFriend(userWallet, friendData)
    console.log(`✅ Friend added successfully:`, friendship)
    
    res.json({ success: true, data: friendship })
  } catch (error: any) {
    console.error(`❌ Error adding friend:`, error)
    res.status(500).json({ success: false, error: error.message })
  }
})

app.delete('/api/friends/:userWallet/:friendId', async (req, res) => {
  try {
    const { userWallet, friendId } = req.params
    await databaseService.removeFriend(userWallet, friendId)
    res.json({ success: true })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

// Group Routes
app.get('/api/groups/:walletAddress', async (req, res) => {
  try {
    const { walletAddress } = req.params
    const groups = await databaseService.getGroups(walletAddress)
    res.json({ success: true, data: groups })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

app.post('/api/groups', async (req, res) => {
  try {
    const { creatorWallet, name, memberWallets } = req.body
    const group = await databaseService.createGroup(creatorWallet, name, memberWallets)
    res.json({ success: true, data: group })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

// Split Routes
app.post('/api/splits', async (req, res) => {
  try {
    const { splitData } = req.body
    const split = await databaseService.createSplit(splitData)
    res.json({ success: true, data: split })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

app.get('/api/splits/group/:groupId', async (req, res) => {
  try {
    const { groupId } = req.params
    const splits = await databaseService.getGroupSplits(groupId)
    res.json({ success: true, data: splits })
  } catch (error: any) {
    console.error('❌ Error fetching group splits:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// Dues Routes
app.get('/api/dues/:walletAddress', async (req, res) => {
  try {
    const { walletAddress } = req.params
    const dues = await databaseService.getUserDues(walletAddress)
    res.json({ success: true, data: dues })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

// Payment Routes
app.post('/api/payments', async (req, res) => {
  try {
    const { splitId, fromUserWallet, amount, method, transactionId } = req.body
    const payment = await databaseService.recordPayment(
      splitId, 
      fromUserWallet, 
      amount, 
      method, 
      transactionId
    )
    res.json({ success: true, data: payment })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

// ENS Cache Routes
app.get('/api/ens/cache/:ensName', async (req, res) => {
  try {
    const { ensName } = req.params
    const cached = await databaseService.getCachedENSResolution(ensName)
    res.json({ success: true, data: cached })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

app.post('/api/ens/cache', async (req, res) => {
  try {
    const { ensName, walletAddress } = req.body
    await databaseService.cacheENSResolution(ensName, walletAddress)
    res.json({ success: true })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

// Test database connection and start server
async function startServer() {
  try {
    console.log('🔄 Testing database connection...')
    
    // Test database connection
    await databaseService.getUserByWallet('connection-test')
    console.log('✅ Database connection successful!')
    
    // Start server
    app.listen(PORT, () => {
      console.log(`🚀 API Server running on http://localhost:${PORT}`)
      console.log(`📊 Database: Connected to NeonDB`)
      console.log(`🔗 Health check: http://localhost:${PORT}/api/health`)
      
      // Start payment event listener if enabled
      // TODO: Uncomment when contracts are deployed
      /*
      if (process.env.VITE_ENABLE_EVENT_LISTENER === 'true') {
        console.log('\n🎧 Starting blockchain event listener...')
        try {
          const eventListener = getPaymentEventListener(process.env.VITE_RPC_URL)
          eventListener.startListening().then(() => {
            console.log('✅ Event listener active - monitoring for payment events')
          }).catch((error) => {
            console.error('❌ Failed to start event listener:', error)
            console.log('⚠️  Server will continue without event listening')
          })
        } catch (error) {
          console.error('❌ Event listener initialization failed:', error)
        }
      } else {
        console.log('ℹ️  Event listener disabled (set VITE_ENABLE_EVENT_LISTENER=true to enable)')
      }
      */
      console.log('ℹ️  Event listener will be available after contract deployment')
    })
    
  } catch (error) {
    console.error('❌ Database connection failed:', error.message)
    console.log('📋 Please check:')
    console.log('   1. Your VITE_DATABASE_URL in .env file')
    console.log('   2. Your Neon database is active')
    console.log('   3. Run: npx prisma db push')
    process.exit(1)
  }
}

startServer()

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('🔄 Shutting down gracefully...')
  await databaseService.disconnect()
  process.exit(0)
})

export default app