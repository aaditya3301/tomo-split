#!/usr/bin/env node

require('dotenv').config()

console.log('🔍 TOMO-LABS Database Configuration Check')
console.log('=========================================\n')

// Check environment variables
const requiredVars = {
  'DATABASE_URL or VITE_DATABASE_URL': process.env.DATABASE_URL || process.env.VITE_DATABASE_URL,
  'VITE_PROJECT_ID': process.env.VITE_PROJECT_ID,
  'VITE_ALCHEMY_API_KEY': process.env.VITE_ALCHEMY_API_KEY
}

let hasErrors = false

console.log('📋 Environment Variables:')
for (const [name, value] of Object.entries(requiredVars)) {
  if (value) {
    if (name.includes('DATABASE_URL')) {
      // Mask password in database URL
      const maskedUrl = value.replace(/:[^:@]*@/, ':****@')
      console.log(`✅ ${name}: ${maskedUrl}`)
    } else if (name.includes('API_KEY')) {
      console.log(`✅ ${name}: ${value.substring(0, 8)}...`)
    } else {
      console.log(`✅ ${name}: ${value}`)
    }
  } else {
    console.log(`❌ ${name}: Missing`)
    hasErrors = true
  }
}

if (hasErrors) {
  console.log('\n❌ Missing required environment variables!')
  console.log('\n📝 Please add the missing variables to your .env file:')
  
  if (!requiredVars['DATABASE_URL or VITE_DATABASE_URL']) {
    console.log('   DATABASE_URL="postgresql://username:password@host/database?sslmode=require"')
    console.log('   (Get from: https://console.neon.tech)')
  }
  
  if (!requiredVars['VITE_PROJECT_ID']) {
    console.log('   VITE_PROJECT_ID="your_project_id"')
    console.log('   (Get from: https://dashboard.reown.com)')
  }
  
  if (!requiredVars['VITE_ALCHEMY_API_KEY']) {
    console.log('   VITE_ALCHEMY_API_KEY="your_api_key"')
    console.log('   (Get from: https://dashboard.alchemy.com)')
  }
  
  process.exit(1)
}

console.log('\n🔄 Testing database connection...')

async function testDatabase() {
  try {
    const { execSync } = require('child_process')
    
    // Set environment variable for this process
    process.env.DATABASE_URL = process.env.DATABASE_URL || process.env.VITE_DATABASE_URL
    
    console.log('📊 Pushing schema to database...')
    execSync('npx prisma db push --accept-data-loss', { 
      stdio: 'pipe',
      env: process.env
    })
    
    console.log('✅ Database connection successful!')
    console.log('📋 Database tables created/updated')
    
    // Generate Prisma client
    console.log('🔄 Generating Prisma client...')
    execSync('npx prisma generate', { stdio: 'pipe' })
    
    console.log('\n🎉 Database setup complete!')
    console.log('\n🚀 Next steps:')
    console.log('   1. Start API server: node start-api.cjs')
    console.log('   2. Start frontend: npm run dev')
    console.log('   3. Test friend saving at: http://localhost:8080/dashboard')
    
  } catch (error) {
    console.log('\n❌ Database connection failed!')
    console.log('Error:', error.message)
    console.log('\n🔧 Troubleshooting:')
    console.log('   1. Check your DATABASE_URL is correct')
    console.log('   2. Ensure your Neon database is active')
    console.log('   3. Verify network connectivity')
    process.exit(1)
  }
}

testDatabase()
