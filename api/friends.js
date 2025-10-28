// Friends POST endpoint for Vercel
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

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' })
  }

  try {
    const { userWallet, friendData } = req.body
    
    if (!userWallet || !friendData) {
      return res.status(400).json({ success: false, error: 'userWallet and friendData are required' })
    }

    console.log(`🔄 POST /api/friends - Adding friend for user: ${userWallet}`)

    // Find or create the user
    let user = await prisma.user.findUnique({
      where: { walletAddress: userWallet.toLowerCase() }
    })

    if (!user) {
      user = await prisma.user.create({
        data: { walletAddress: userWallet.toLowerCase() }
      })
    }

    // Find or create the friend
    let friend = await prisma.user.findUnique({
      where: { walletAddress: friendData.walletAddress.toLowerCase() }
    })

    if (!friend) {
      friend = await prisma.user.create({
        data: { 
          walletAddress: friendData.walletAddress.toLowerCase(),
          ensName: friendData.ensName,
          displayName: friendData.displayName
        }
      })
    }
    
    const friendship = await prisma.friend.create({
      data: {
        userId: user.id,
        friendId: friend.id,
        friendAddress: friendData.walletAddress.toLowerCase(),
        friendENS: friendData.ensName,
        nickname: friendData.displayName,
        isENS: !!friendData.ensName
      }
    })
    
    console.log(`✅ Friend added successfully for ${userWallet}`)
    return res.json({ success: true, data: friendship })

  } catch (error) {
    console.error('❌ Friends POST API Error:', error)
    res.status(500).json({ success: false, error: error.message })
  }
}