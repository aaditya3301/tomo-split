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
      
      const groups = await databaseService.getGroups(walletAddress)
      res.json({ success: true, data: groups })
    } else if (req.method === 'POST') {
      const { creatorWallet, name, memberWallets } = req.body
      const group = await databaseService.createGroup(creatorWallet, name, memberWallets)
      res.json({ success: true, data: group })
    } else {
      res.status(405).json({ success: false, error: 'Method not allowed' })
    }
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
}