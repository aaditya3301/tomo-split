import React, { ReactNode } from 'react'
import { useAccount } from 'wagmi'
import { useAppKit } from '@reown/appkit/react'
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
  const { address, chain } = useAccount()
  const { open } = useAppKit()
  const navigate = useNavigate()

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
                  {chain?.name || 'Unknown Network'}
                </Badge>
              </div>
              <Button
                variant="outline"
                onClick={() => open()}
                className="flex items-center space-x-2"
              >
                <Wallet className="h-4 w-4" />
                <span className="font-mono">
                  {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : 'No Address'}
                </span>
              </Button>
              
              {/* Profile Dropdown */}
              <ProfileDropdown 
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
