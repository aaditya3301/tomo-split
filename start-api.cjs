#!/usr/bin/env node

// Load environment variables first
require('dotenv').config()

const { spawn } = require('child_process')
const path = require('path')

console.log('🚀 Starting TOMO-LABS API Server...')
console.log('📊 Database URL:', process.env.DATABASE_URL ? '✅ Configured' : '❌ Missing')
console.log('🔑 Project ID:', process.env.VITE_PROJECT_ID ? '✅ Configured' : '❌ Missing')
console.log('⚗️  Alchemy Key:', process.env.VITE_ALCHEMY_API_KEY ? '✅ Configured' : '❌ Missing')

// Ensure DATABASE_URL is available from VITE_DATABASE_URL if needed
if (!process.env.DATABASE_URL && process.env.VITE_DATABASE_URL) {
  process.env.DATABASE_URL = process.env.VITE_DATABASE_URL
  console.log('🔄 Using VITE_DATABASE_URL as DATABASE_URL')
}

console.log('\n📡 Starting server on port 3001...\n')

// Start the API server
const serverPath = path.join(__dirname, 'src', 'api', 'server.ts')
const child = spawn('node', ['--import', 'tsx/esm', serverPath], {
  stdio: 'inherit',
  env: process.env
})

child.on('error', (error) => {
  console.error('❌ Failed to start API server:', error)
  process.exit(1)
})

child.on('exit', (code) => {
  console.log(`\n📡 API server exited with code ${code}`)
  process.exit(code)
})

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🔄 Shutting down API server...')
  child.kill('SIGINT')
})

process.on('SIGTERM', () => {
  console.log('\n🔄 Shutting down API server...')
  child.kill('SIGTERM')
})
