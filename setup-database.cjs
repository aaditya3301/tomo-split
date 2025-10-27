#!/usr/bin/env node

const fs = require('fs')
const path = require('path')
const readline = require('readline')

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

console.log('🚀 TOMO-LABS Database Setup')
console.log('================================\n')

async function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve)
  })
}

async function setup() {
  try {
    // Check if .env already exists
    const envPath = path.join(__dirname, '.env')
    let envContent = ''
    
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, 'utf8')
      console.log('✅ Found existing .env file')
    } else {
      console.log('📄 Creating new .env file')
    }

    // Parse existing env
    const envVars = {}
    envContent.split('\n').forEach(line => {
      if (line.includes('=') && !line.startsWith('#')) {
        const [key, ...valueParts] = line.split('=')
        envVars[key.trim()] = valueParts.join('=').trim()
      }
    })

    console.log('\n📋 Please provide the following information:')
    console.log('(Press Enter to keep existing values)\n')

    // Get database URL
    const currentDb = envVars.VITE_DATABASE_URL || envVars.DATABASE_URL || ''
    console.log('🗄️  NeonDB Connection String:')
    console.log('   Format: postgresql://username:password@host/database?sslmode=require')
    console.log('   Get from: https://console.neon.tech -> Your Project -> Connection Details')
    if (currentDb) {
      console.log(`   Current: ${currentDb.replace(/:[^:@]*@/, ':****@')}`)
    }
    
    const dbUrl = await question('   Enter DATABASE_URL: ')
    if (dbUrl.trim()) {
      envVars.DATABASE_URL = dbUrl.trim()
      envVars.VITE_DATABASE_URL = dbUrl.trim() // Keep both for compatibility
    } else if (!envVars.DATABASE_URL && envVars.VITE_DATABASE_URL) {
      envVars.DATABASE_URL = envVars.VITE_DATABASE_URL
    }

    // Get other required vars
    const currentProjectId = envVars.VITE_PROJECT_ID || ''
    if (!currentProjectId) {
      console.log('\n🔑 Reown Project ID:')
      console.log('   Get from: https://dashboard.reown.com')
      const projectId = await question('   Enter VITE_PROJECT_ID: ')
      if (projectId.trim()) {
        envVars.VITE_PROJECT_ID = projectId.trim()
      }
    }

    const currentAlchemy = envVars.VITE_ALCHEMY_API_KEY || ''
    if (!currentAlchemy) {
      console.log('\n⚗️  Alchemy API Key (for ENS resolution):')
      console.log('   Get from: https://dashboard.alchemy.com')
      const alchemyKey = await question('   Enter VITE_ALCHEMY_API_KEY: ')
      if (alchemyKey.trim()) {
        envVars.VITE_ALCHEMY_API_KEY = alchemyKey.trim()
      }
    }

    // Write updated .env file
    const newEnvContent = Object.entries(envVars)
      .map(([key, value]) => `${key}=${value}`)
      .join('\n')

    fs.writeFileSync(envPath, newEnvContent)
    console.log('\n✅ .env file updated successfully!')

    // Test database connection
    if (envVars.DATABASE_URL || envVars.VITE_DATABASE_URL) {
      console.log('\n🔍 Testing database connection...')
      
      try {
        const { execSync } = require('child_process')
        
        // Set environment variable for this process
        process.env.DATABASE_URL = envVars.DATABASE_URL || envVars.VITE_DATABASE_URL
        
        // Test connection
        execSync('npx prisma db push --accept-data-loss', { 
          stdio: 'inherit',
          env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL }
        })
        
        console.log('\n🎉 Database connected successfully!')
        console.log('📊 Tables created/updated in your NeonDB database')
        
        // Generate Prisma client
        console.log('\n🔄 Generating Prisma client...')
        execSync('npx prisma generate', { stdio: 'inherit' })
        
        console.log('\n✅ Setup complete! Your database is ready.')
        console.log('\n🚀 Next steps:')
        console.log('   1. Start your frontend: npm run dev')
        console.log('   2. Start API server: node --loader tsx/esm src/api/server.ts')
        console.log('   3. Test friend saving in your app!')
        
      } catch (error) {
        console.log('\n❌ Database connection failed!')
        console.log('Please check your DATABASE_URL and try again.')
        console.log('Error:', error.message)
      }
    } else {
      console.log('\n⚠️  No database URL provided. App will use local storage fallback.')
    }

  } catch (error) {
    console.error('❌ Setup failed:', error.message)
  } finally {
    rl.close()
  }
}

setup()
