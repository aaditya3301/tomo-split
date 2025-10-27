import { cookieStorage, createStorage, http } from '@wagmi/core'
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi'
import { mainnet, arbitrum } from '@reown/appkit/networks'

// Get projectId from environment variables
export const projectId = import.meta.env.VITE_PROJECT_ID || 'sample_project_id_placeholder'

if (!import.meta.env.VITE_PROJECT_ID) {
  console.warn('VITE_PROJECT_ID not found in environment variables. Using placeholder. Please add your real Project ID from https://dashboard.reown.com')
}

export const networks = [mainnet, arbitrum]

// Log which RPC endpoint we're using
const mainnetRPC = import.meta.env.VITE_ALCHEMY_API_KEY 
  ? `https://eth-mainnet.g.alchemy.com/v2/${import.meta.env.VITE_ALCHEMY_API_KEY}`
  : 'https://ethereum.publicnode.com'

console.log('🔗 Using mainnet RPC:', mainnetRPC.replace(/\/v2\/.*/, '/v2/[API_KEY_HIDDEN]'))

// Set up the Wagmi Adapter (Config) with proper ENS support
export const wagmiAdapter = new WagmiAdapter({
  storage: createStorage({
    storage: cookieStorage
  }),
  ssr: false, // Set to false for Vite/React (not Next.js)
  projectId,
  networks,
  // Use reliable RPC endpoint for ENS resolution
  transports: {
    [mainnet.id]: http(mainnetRPC),
    [arbitrum.id]: http() // Default for Arbitrum
  }
})

export const config = wagmiAdapter.wagmiConfig
