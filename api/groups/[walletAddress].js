// Groups API endpoint for Vercel
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

  try {
    if (req.method === 'GET') {
      // Handle GET /api/groups/[walletAddress]
      const { walletAddress } = req.query
      
      if (!walletAddress || typeof walletAddress !== 'string') {
        return res.status(400).json({ success: false, error: 'Wallet address is required' })
      }

      console.log(`🔄 GET /api/groups/${walletAddress}`)
      
      // First find the user by wallet address
      const user = await prisma.user.findUnique({
        where: { walletAddress: walletAddress.toLowerCase() }
      })

      if (!user) {
        console.log(`✅ User not found, returning empty groups for ${walletAddress}`)
        return res.json({ success: true, data: [] })
      }

      // Get groups where user is creator or member
      const groups = await prisma.group.findMany({
        where: {
          OR: [
            { creatorId: user.id },
            { members: { some: { userId: user.id } } }
          ]
        },
        include: {
          creator: true,
          members: {
            include: { user: true }
          }
        }
      })
      
      console.log(`✅ Retrieved ${groups.length} groups for ${walletAddress}`)
      return res.json({ success: true, data: groups })
      
    } else if (req.method === 'POST') {
    } else if (req.method === 'POST') {
      const { creatorWallet, name, memberWallets } = req.body
      
      if (!creatorWallet || !name) {
        return res.status(400).json({ success: false, error: 'creatorWallet and name are required' })
      }

      // Find or create the creator user
      let creator = await prisma.user.findUnique({
        where: { walletAddress: creatorWallet.toLowerCase() }
      })

      if (!creator) {
        creator = await prisma.user.create({
          data: { walletAddress: creatorWallet.toLowerCase() }
        })
      }
      
      const group = await prisma.group.create({
        data: {
          creatorId: creator.id,
          name
        }
      })

      // Add creator as a member
      await prisma.groupMember.create({
        data: {
          groupId: group.id,
          userId: creator.id,
          role: 'ADMIN'
        }
      })

      // Add other members if provided
      if (memberWallets && memberWallets.length > 0) {
        for (const walletAddress of memberWallets) {
          let member = await prisma.user.findUnique({
            where: { walletAddress: walletAddress.toLowerCase() }
          })

          if (!member) {
            member = await prisma.user.create({
              data: { walletAddress: walletAddress.toLowerCase() }
            })
          }

          await prisma.groupMember.create({
            data: {
              groupId: group.id,
              userId: member.id
            }
          })
        }
      }
      
      return res.json({ success: true, data: group })
    } else {
      res.status(405).json({ success: false, error: 'Method not allowed' })
    }
  } catch (error) {
    console.error('❌ Groups API Error:', error)
    res.status(500).json({ success: false, error: error.message })
  }
}