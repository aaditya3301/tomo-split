import React, { ReactNode, useEffect, useState, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useMultiChainWallet } from '@/contexts/MultiChainWalletContext'
import { Loader2 } from 'lucide-react'

interface ProtectedRouteProps {
  children: ReactNode
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isConnected, isLoading } = useMultiChainWallet()
  const navigate = useNavigate()
  const location = useLocation()
  const [canRedirect, setCanRedirect] = useState(false)
  const redirectAttempted = useRef(false)

  useEffect(() => {
    // Allow redirection after a shorter delay to give wallets time to auto-reconnect
    const timer = setTimeout(() => {
      setCanRedirect(true)
    }, 800) // Reduced to 800ms for better UX

    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    // Only redirect if we can redirect, not loading, not connected, and haven't already redirected
    if (canRedirect && !isLoading && !isConnected && !redirectAttempted.current) {
      redirectAttempted.current = true
      console.log('🔄 ProtectedRoute: No wallet connection, redirecting to home')
      navigate('/', { replace: true })
    }
  }, [canRedirect, isLoading, isConnected, navigate])

  // Reset redirect attempt if user becomes connected
  useEffect(() => {
    if (isConnected) {
      redirectAttempted.current = false
    }
  }, [isConnected])

  if (isLoading || !canRedirect) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-yellow-400" />
          <p className="text-white/70">
            {isLoading ? 'Connecting wallet...' : 'Loading...'}
          </p>
        </div>
      </div>
    )
  }

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4 text-white">Wallet Not Connected</h2>
          <p className="text-white/70 mb-6">Please connect your wallet to access the dashboard.</p>
          <button
            onClick={() => navigate('/')}
            className="bg-gradient-to-r from-yellow-500 to-yellow-400 text-black font-bold px-6 py-3 rounded-lg hover:from-yellow-400 hover:to-yellow-300 transition-all duration-300 shadow-lg hover:shadow-xl"
          >
            Connect Wallet
          </button>
          <button
            onClick={() => navigate('/')}
            className="ml-4 px-6 py-3 rounded-lg border border-yellow-500/50 text-white hover:bg-yellow-500/20 hover:border-yellow-400 transition-all duration-300"
          >
            Back to Home
          </button>
        </div>
      </div>
    )
  }

  return <>{children}</>
}

export default ProtectedRoute
