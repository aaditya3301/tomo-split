#!/usr/bin/env node

// Simple Node.js script to run the API server
import { spawn } from 'child_process'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const projectRoot = join(__dirname, '..')

console.log('🚀 Starting TOMO-LABS API Server...')

// Use node --loader to run TypeScript directly
const child = spawn('node', [
  '--loader', 'tsx/esm', 
  join(projectRoot, 'src/api/server.ts')
], {
  stdio: 'inherit',
  cwd: projectRoot
})

child.on('error', (error) => {
  console.error('❌ Failed to start API server:', error)
  process.exit(1)
})

child.on('exit', (code) => {
  console.log(`API server exited with code ${code}`)
  process.exit(code)
})
