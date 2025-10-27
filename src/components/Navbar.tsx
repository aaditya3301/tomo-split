import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useAccount } from 'wagmi'
import { useAppKit } from '@reown/appkit/react'
import { Button } from '@/components/ui/button'

const Navbar: React.FC = () => {
  const navigate = useNavigate()
  const { isConnected } = useAccount()
  const { open } = useAppKit()

  const handleTryNow = () => {
    if (isConnected) {
      navigate('/dashboard')
    } else {
      // Check if using placeholder Project ID
      const isPlaceholder = import.meta.env.VITE_PROJECT_ID === 'sample_project_id_placeholder'
      if (isPlaceholder) {
        alert('⚠️ Using placeholder Project ID!\n\nGoogle sign-in and social logins won\'t work.\n\nGet your real Project ID from dashboard.reown.com\nand update your .env file.\n\nWallet connect will still open for testing.')
      }
      open()
    }
  }

  const handleAboutUs = () => {
    // Scroll to a section or navigate to about page
    const element = document.getElementById('about-section')
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' })
    }
  }

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-border/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <div 
            className="text-xl sm:text-2xl font-bold gradient-text cursor-pointer"
            onClick={() => navigate('/')}
          >
            TOMO-LABS
          </div>

          {/* Navigation Items */}
          <div className="flex items-center space-x-2 sm:space-x-4">
            <Button
              variant="ghost"
              onClick={handleAboutUs}
              className="text-foreground hover:text-primary transition-colors hidden sm:flex"
            >
              About Us
            </Button>
            
            <Button
              onClick={handleTryNow}
              className="bg-gradient-to-r from-primary to-accent text-primary-foreground hover:opacity-90 transition-opacity glow-primary text-sm sm:text-base px-3 sm:px-4"
            >
              {isConnected ? 'Dashboard' : 'Try Now'}
            </Button>

            {/* Wallet Connect Button */}
            <w3m-button />
          </div>
        </div>
      </div>
    </nav>
  )
}

export default Navbar
