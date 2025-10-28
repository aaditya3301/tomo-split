// Groups POST endpoint for Vercel
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
    const { creatorWallet, name, memberWallets } = req.body
    
    if (!creatorWallet || !name) {
      return res.status(400).json({ success: false, error: 'creatorWallet and name are required' })
    }

    console.log(`🔄 POST /api/groups - Creating group "${name}" for ${creatorWallet}`)

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

    // Add creator as a member with ADMIN role
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
    
    console.log(`✅ Group "${name}" created successfully with ID: ${group.id}`)
    return res.json({ success: true, data: group })

  } catch (error) {
    console.error('❌ Groups POST API Error:', error)
    res.status(500).json({ success: false, error: error.message })
  }
}