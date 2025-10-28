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
    if (req.method === 'POST') {
      const { splitData } = req.body
      const split = await databaseService.createSplit(splitData)
      res.json({ success: true, data: split })
    } else if (req.method === 'GET') {
      const { groupId } = req.query
      if (!groupId || typeof groupId !== 'string') {
        return res.status(400).json({ success: false, error: 'groupId is required' })
      }
      
      const splits = await databaseService.getGroupSplits(groupId)
      res.json({ success: true, data: splits })
    } else {
      res.status(405).json({ success: false, error: 'Method not allowed' })
    }
  } catch (error: any) {
    console.error('❌ Error in splits API:', error)
    res.status(500).json({ success: false, error: error.message })
  }
}