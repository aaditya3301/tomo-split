import { VercelRequest, VercelResponse } from '@vercel/node'
import { databaseService } from '../src/services/databaseService'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

// Ensure DATABASE_URL is available from VITE_DATABASE_URL if needed
if (!process.env.DATABASE_URL && process.env.VITE_DATABASE_URL) {
  process.env.DATABASE_URL = process.env.VITE_DATABASE_URL
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  try {
    if (req.method === 'GET') {
      const { walletAddress } = req.query
      if (!walletAddress || typeof walletAddress !== 'string') {
        return res.status(400).json({ success: false, error: 'walletAddress is required' })
      }
      
      console.log(`🔄 GET /api/friends/${walletAddress}`)
      const friends = await databaseService.getFriends(walletAddress)
      console.log(`✅ Retrieved ${friends.length} friends for ${walletAddress}`)
      
      res.json({ success: true, data: friends })
    } else if (req.method === 'POST') {
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
    } else if (req.method === 'DELETE') {
      const { userWallet, friendId } = req.query
      if (!userWallet || !friendId || typeof userWallet !== 'string' || typeof friendId !== 'string') {
        return res.status(400).json({ success: false, error: 'userWallet and friendId are required' })
      }
      
      await databaseService.removeFriend(userWallet, friendId)
      res.json({ success: true })
    } else {
      res.status(405).json({ success: false, error: 'Method not allowed' })
    }
  } catch (error: any) {
    console.error(`❌ Error in friends API:`, error)
    res.status(500).json({ success: false, error: error.message })
  }
}