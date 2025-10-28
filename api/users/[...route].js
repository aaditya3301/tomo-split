// Users API endpoint for Vercel
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
      // Handle GET /api/users/[walletAddress]
      const { route } = req.query
      const walletAddress = Array.isArray(route) ? route[0] : route
      
      if (!walletAddress) {
        return res.status(400).json({ success: false, error: 'Wallet address is required' })
      }

      console.log(`🔄 GET /api/users/${walletAddress}`)
      
      const user = await prisma.user.findUnique({
        where: { walletAddress: walletAddress.toLowerCase() }
      })
      
      return res.json({ success: true, data: user })
      
    } else if (req.method === 'POST') {
      // Handle POST /api/users
      const { walletAddress, ensName, displayName } = req.body
      
      if (!walletAddress) {
        return res.status(400).json({ success: false, error: 'walletAddress is required' })
      }
      
      const user = await prisma.user.upsert({
        where: { walletAddress: walletAddress.toLowerCase() },
        update: { ensName, displayName },
        create: { walletAddress: walletAddress.toLowerCase(), ensName, displayName }
      })
      
      return res.json({ success: true, data: user })
    } else {
      res.status(405).json({ success: false, error: 'Method not allowed' })
    }
  } catch (error) {
    console.error('❌ Users API Error:', error)
    res.status(500).json({ success: false, error: error.message })
  }
}