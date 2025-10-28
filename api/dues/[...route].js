// Dues API endpoint for Vercel
import { PrismaClient } from '@prisma/client'

// Initialize Prisma Client with environment variables
let prisma

// Use DATABASE_URL from environment (for Prisma) or VITE_DATABASE_URL (for Vite apps)
const databaseUrl = process.env.DATABASE_URL || process.env.VITE_DATABASE_URL

if (process.env.NODE_ENV === 'production') {
  prisma = new PrismaClient({
    datasources: {
      db: {
        url: databaseUrl
      }
    }
  })
} else {
  if (!global.__prisma) {
    global.__prisma = new PrismaClient({
      datasources: {
        db: {
          url: databaseUrl
        }
      }
    })
  }
  prisma = global.__prisma
}

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' })
  }

  try {
    // Handle GET /api/dues/[walletAddress]
    const { route } = req.query
    const walletAddress = Array.isArray(route) ? route[0] : route
    
    if (!walletAddress) {
      return res.status(400).json({ success: false, error: 'Wallet address is required' })
    }

    console.log(`🔄 GET /api/dues/${walletAddress}`)
    
    // Get user from database
    const user = await prisma.user.findUnique({
      where: { walletAddress: walletAddress.toLowerCase() }
    })

    if (!user) {
      // Return empty dues structure for non-existent user
      const emptyDues = {
        userWallet: walletAddress,
        totalOwed: 0,
        totalOwedToUser: 0,
        netBalance: 0,
        pendingGroups: [],
        globalOptimalTransactions: []
      }
      console.log(`✅ User not found, returning empty dues for ${walletAddress}`)
      return res.json({ success: true, data: emptyDues })
    }

    // For now, return basic empty dues structure until we implement full settlement logic
    const dues = {
      userWallet: walletAddress,
      totalOwed: 0,
      totalOwedToUser: 0,
      netBalance: 0,
      pendingGroups: [],
      globalOptimalTransactions: []
    }
    
    console.log(`✅ Retrieved dues for ${walletAddress}`)
    return res.json({ success: true, data: dues })

  } catch (error) {
    console.error('❌ Dues API Error:', error)
    res.status(500).json({ success: false, error: error.message })
  }
}