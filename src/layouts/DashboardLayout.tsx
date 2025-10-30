import React, { ReactNode } from 'react'
import { useAccount } from 'wagmi'
import { useAppKit } from '@reown/appkit/react'
import { useMultiChainWallet } from '@/contexts/MultiChainWalletContext'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Wallet } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import ParticleBackground from '@/components/ParticleBackground'
import ProfileDropdown from '@/components/ProfileDropdown'
import { UserDues } from '@/services/databaseService'

interface Group {
  id: string
  name: string
  hash: string
  members: string[]
  createdAt: Date
  isSettled?: boolean
  totalAmount?: number
  yourShare?: number
  isPaid?: boolean
}

interface DashboardLayoutProps {
  children: ReactNode
  title?: string
  description?: string
  groups?: Group[]
  userDues?: UserDues | null
  // splits?: any[]
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ 
  children, 
  title = "Dashboard",
  description = "Manage your account and settings",
  groups = [],
  userDues = null
  // splits = []
}) => {
  // Multi-chain wallet context
  const { currentAccount, chainType, disconnect } = useMultiChainWallet()
  
  // EVM chain info fallback
  const { chain } = useAccount()
  const { open } = useAppKit()
  const navigate = useNavigate()

  // Determine network name based on chain type
  const getNetworkName = () => {
    if (chainType === 'APTOS') return 'Aptos'
    if (chainType === 'EVM' && chain) return chain.name
    return 'Connected'
  }

  // Get display address
  const displayAddress = currentAccount?.address

  return (
    <div className="min-h-screen bg-background text-foreground">
      <ParticleBackground />
      
      {/* Fixed Header */}
      <div className="fixed top-0 left-0 right-0 z-50 glass border-b border-border/20">
        <div className="max-w-full mx-auto px-3 sm:px-4 lg:px-6 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            {/* Left - Title */}
            <div className="flex items-center space-x-2 sm:space-x-4 flex-1 min-w-0">
              <div className="min-w-0 flex-1">
                <h1 className="text-base sm:text-lg lg:text-xl font-bold gradient-text truncate">{title}</h1>
                <p className="text-xs sm:text-sm text-muted-foreground truncate hidden sm:block">{description}</p>
              </div>
            </div>
            
            {/* Right - Profile & Wallet Info */}
            <div className="flex items-center space-x-1 sm:space-x-2 lg:space-x-4 flex-shrink-0">
              {/* Network Info - Hidden on mobile */}
              <div className="text-right hidden lg:block">
                <p className="text-sm text-muted-foreground">Connected to</p>
                <div className="flex items-center space-x-2">
                  <Badge variant="outline" className="font-mono text-xs">
                    {getNetworkName()}
                  </Badge>
                  {chainType && (
                    <Badge variant="secondary" className="text-xs">
                      {chainType}
                    </Badge>
                  )}
                </div>
              </div>
              
              {/* Wallet Button */}
              <div className="flex items-center space-x-1 sm:space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={chainType === 'EVM' ? () => open() : undefined}
                  className="flex items-center space-x-1 sm:space-x-2 cursor-default p-2 sm:px-3 sm:py-2 touch-manipulation"
                  disabled={chainType === 'APTOS'}
                >
                  <Wallet className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                  <span className="font-mono text-xs sm:text-sm hidden xs:inline">
                    {displayAddress ? `${displayAddress.slice(0, 4)}...${displayAddress.slice(-3)}` : 'No Address'}
                  </span>
                </Button>
                
                {/* Disconnect Button */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={disconnect}
                  className="flex items-center space-x-1 border-border/20 hover:bg-muted/20 transition-colors touch-manipulation px-2 sm:px-3"
                >
                  <span className="text-xs">Disconnect</span>
                </Button>
              </div>
              
              {/* Profile Dropdown */}
              <ProfileDropdown 
                key={userDues?.lastUpdated || 'no-dues'}
                groups={groups} 
                userDues={userDues}
                // splits={splits}
                onHomeClick={() => navigate('/')}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="pt-24">
        {children}
      </div>
    </div>
  )
}

export default DashboardLayout
