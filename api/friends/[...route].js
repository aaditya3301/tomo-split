// Friends API endpoint for Vercel
const { PrismaClient } = require('@prisma/client')

// Initialize Prisma Client with environment variables
let prisma

// Ensure DATABASE_URL is available from VITE_DATABASE_URL if needed
if (!process.env.DATABASE_URL && process.env.VITE_DATABASE_URL) {
  process.env.DATABASE_URL = process.env.VITE_DATABASE_URL
}

if (process.env.NODE_ENV === 'production') {
  prisma = new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL || process.env.VITE_DATABASE_URL,
      },
    },
  })
} else {
  if (!global.__prisma) {
    global.__prisma = new PrismaClient({
      datasources: {
        db: {
          url: process.env.DATABASE_URL || process.env.VITE_DATABASE_URL,
        },
      },
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

  try {
    if (req.method === 'GET') {
      // Handle GET /api/friends/[walletAddress]
      const { route } = req.query
      const walletAddress = Array.isArray(route) ? route[0] : route
      
      if (!walletAddress) {
        return res.status(400).json({ success: false, error: 'Wallet address is required' })
      }

      console.log(`🔄 GET /api/friends/${walletAddress}`)
      
      const user = await prisma.user.findUnique({
        where: { walletAddress: walletAddress.toLowerCase() },
        include: { friends: true }
      })
      
      const friends = user?.friends || []
      console.log(`✅ Retrieved ${friends.length} friends for ${walletAddress}`)
      
      return res.json({ success: true, data: friends })
      
    } else if (req.method === 'POST') {
      // Handle POST /api/friends
      const { userWallet, friendData } = req.body
      
      if (!userWallet || !friendData) {
        return res.status(400).json({ success: false, error: 'userWallet and friendData are required' })
      }
      
      const friendship = await prisma.friend.create({
        data: {
          userWallet: userWallet.toLowerCase(),
          walletAddress: friendData.walletAddress.toLowerCase(),
          ensName: friendData.ensName,
          displayName: friendData.displayName
        }
      })
      
      return res.json({ success: true, data: friendship })
    } else {
      res.status(405).json({ success: false, error: 'Method not allowed' })
    }
  } catch (error) {
    console.error('❌ Friends API Error:', error)
    res.status(500).json({ success: false, error: error.message })
  }
}