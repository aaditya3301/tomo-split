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
        <div className="max-w-full mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Left - Title */}
            <div className="flex items-center space-x-4">
              <div>
                <h1 className="text-xl font-bold gradient-text">{title}</h1>
                <p className="text-sm text-muted-foreground">{description}</p>
              </div>
            </div>
            
            {/* Right - Profile & Wallet Info */}
            <div className="flex items-center space-x-4">
              <div className="text-right hidden sm:block">
                <p className="text-sm text-muted-foreground">Connected to</p>
                <Badge variant="outline" className="font-mono">
                  {getNetworkName()}
                </Badge>
                {chainType && (
                  <Badge variant="secondary" className="ml-2 text-xs">
                    {chainType}
                  </Badge>
                )}
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  onClick={chainType === 'EVM' ? () => open() : undefined}
                  className="flex items-center space-x-2 cursor-default"
                  disabled={chainType === 'APTOS'}
                >
                  <Wallet className="h-4 w-4" />
                  <span className="font-mono">
                    {displayAddress ? `${displayAddress.slice(0, 6)}...${displayAddress.slice(-4)}` : 'No Address'}
                  </span>
                </Button>
                
                {/* Disconnect Button */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={disconnect}
                  className="flex items-center space-x-1 border-border/20 hover:bg-muted/20 transition-colors"
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
