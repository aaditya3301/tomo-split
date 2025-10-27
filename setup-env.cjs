#!/usr/bin/env node

const fs = require('fs')
const path = require('path')

console.log('🔧 TOMO-LABS Environment Setup')
console.log('===============================\n')

try {
  // Read current .env file
  const envPath = path.join(__dirname, '.env')
  const envContent = fs.readFileSync(envPath, 'utf8')
  
  console.log('📄 Reading current .env file...')
  
  // Parse existing env vars
  const envVars = {}
  const lines = []
  
  envContent.split('\n').forEach(line => {
    if (line.includes('=') && !line.startsWith('#')) {
      const [key, ...valueParts] = line.split('=')
      const cleanKey = key.trim()
      const value = valueParts.join('=').trim()
      envVars[cleanKey] = value
      lines.push(line)
    } else {
      lines.push(line)
    }
  })
  
  console.log('✅ Found variables:')
  console.log(`   VITE_PROJECT_ID: ${envVars.VITE_PROJECT_ID ? '✅' : '❌'}`)
  console.log(`   VITE_ALCHEMY_API_KEY: ${envVars.VITE_ALCHEMY_API_KEY ? '✅' : '❌'}`)
  console.log(`   VITE_DATABASE_URL: ${envVars.VITE_DATABASE_URL ? '✅' : '❌'}`)
  console.log(`   DATABASE_URL: ${envVars.DATABASE_URL ? '✅' : '❌'}`)
  
  // Copy VITE_DATABASE_URL to DATABASE_URL if missing
  if (envVars.VITE_DATABASE_URL && !envVars.DATABASE_URL) {
    console.log('\n🔄 Adding DATABASE_URL for Prisma compatibility...')
    lines.push(`DATABASE_URL=${envVars.VITE_DATABASE_URL}`)
    
    // Write updated .env file
    fs.writeFileSync(envPath, lines.join('\n'))
    console.log('✅ Added DATABASE_URL to .env file')
  } else if (envVars.DATABASE_URL) {
    console.log('\n✅ DATABASE_URL already exists')
  } else {
    console.log('\n❌ No VITE_DATABASE_URL found!')
    console.log('Please add your Neon database URL to .env file:')
    console.log('VITE_DATABASE_URL="postgresql://username:password@host/database?sslmode=require"')
    process.exit(1)
  }
  
  console.log('\n🎉 Environment setup complete!')
  console.log('\n📋 Next steps:')
  console.log('1. Push schema to database: npx prisma db push')
  console.log('2. Start API server: node start-api.cjs')
  console.log('3. Start frontend: npm run dev')
  
} catch (error) {
  console.error('❌ Error reading .env file:', error.message)
  console.log('\nPlease ensure you have a .env file with:')
  console.log('VITE_DATABASE_URL="your_neon_database_url"')
  process.exit(1)
}
