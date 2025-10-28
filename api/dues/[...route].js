// Dues API endpoint for Vercel
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
    
    // Get user dues - this is a complex query that calculates what user owes/is owed
    // For now, return empty array until we can implement the full settlement logic
    const dues = []
    
    console.log(`✅ Retrieved ${dues.length} dues for ${walletAddress}`)
    return res.json({ success: true, data: dues })

  } catch (error) {
    console.error('❌ Dues API Error:', error)
    res.status(500).json({ success: false, error: error.message })
  }
}