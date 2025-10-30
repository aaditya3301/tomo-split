import React from 'react'
import { createPortal } from 'react-dom'
import WormholeConnect from '@wormhole-foundation/wormhole-connect'
import { createTheme, ThemeProvider } from '@mui/material/styles'

interface WormholePortalProps {
  isOpen: boolean
  onClose: () => void
  targetAmount?: number
  recipient?: string
  sourceChain?: string
  destinationChain?: string
  currentAccount?: any
}

export const WormholePortal: React.FC<WormholePortalProps> = ({ 
  isOpen, 
  onClose, 
  targetAmount, 
  recipient, 
  sourceChain = 'Aptos',
  destinationChain = 'Ethereum',
  currentAccount 
}) => {
  if (!isOpen) return null

  // Ensure portal takes focus when opened and simulate the "click outside" fix
  React.useEffect(() => {
    if (isOpen) {
      // Remove focus from any active elements in the background
      const activeElement = document.activeElement as HTMLElement
      if (activeElement && activeElement.blur) {
        activeElement.blur()
      }
      
      // Simulate the "click outside" behavior that fixes the interaction
      setTimeout(() => {
        // Create and dispatch a synthetic click event on the document
        const clickEvent = new MouseEvent('click', {
          bubbles: true,
          cancelable: true,
          view: window
        })
        document.dispatchEvent(clickEvent)
        
        // Then focus the portal container
        const portalElement = document.querySelector('[data-wormhole-portal]') as HTMLElement
        if (portalElement) {
          portalElement.focus()
        }
      }, 300)
    }
  }, [isOpen])

  // Add CSS to make dropdowns appear on top
  React.useEffect(() => {
    const style = document.createElement('style')
    style.innerHTML = `
      /* Force all Material-UI dropdowns and menus to highest z-index */
      .MuiPopover-root,
      .MuiMenu-root,
      .MuiSelect-root,
      .MuiAutocomplete-popper,
      .MuiPopper-root,
      .MuiMenuList-root,
      [role="listbox"],
      [role="menu"],
      [role="combobox"],
      [data-testid*="select"],
      [data-testid*="dropdown"],
      [class*="popover"],
      [class*="dropdown"],
      [class*="menu"],
      [class*="select"] {
        z-index: 9999999 !important;
      }
      
      /* Specific for select dropdowns */
      .MuiSelect-select ~ .MuiPopover-root {
        z-index: 9999999 !important;
      }

      /* Force token and network selection dropdowns to appear on top */
      .MuiAutocomplete-listbox,
      .MuiAutocomplete-paper,
      .MuiAutocomplete-popper,
      .MuiAutocomplete-option,
      [role="presentation"],
      [role="listbox"],
      [data-popper-placement],
      [class*="TokenSelectModal"],
      [class*="NetworkSelectModal"],
      [class*="tokenList"],
      [class*="networkList"],
      [class*="Select"],
      [class*="Option"],
      [class*="List"],
      div[style*="position: absolute"],
      div[style*="position: fixed"] {
        z-index: 99999999 !important;
      }

      /* Override any lower z-index values */
      * {
        z-index: inherit !important;
      }
      
      /* Specific override for Wormhole components */
      div[class*="wormhole"] [role="listbox"],
      div[class*="wormhole"] .MuiPopover-root,
      div[class*="wormhole"] .MuiAutocomplete-popper {
        z-index: 99999999 !important;
        position: fixed !important;
      }

      /* Add smooth animations */
      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }

      @keyframes slideUp {
        from { 
          opacity: 0;
          transform: translateY(30px) scale(0.96);
        }
        to { 
          opacity: 1;
          transform: translateY(0) scale(1);
        }
      }

      /* Custom scrollbar for the modal */
      [data-wormhole-portal] *::-webkit-scrollbar {
        width: 6px;
      }

      [data-wormhole-portal] *::-webkit-scrollbar-track {
        background: rgba(255, 255, 255, 0.1);
        border-radius: 3px;
      }

      [data-wormhole-portal] *::-webkit-scrollbar-thumb {
        background: rgba(255, 255, 255, 0.3);
        border-radius: 3px;
      }

      [data-wormhole-portal] *::-webkit-scrollbar-thumb:hover {
        background: rgba(255, 255, 255, 0.5);
      }
    `
    document.head.appendChild(style)
    
    return () => {
      if (document.head.contains(style)) {
        document.head.removeChild(style)
      }
    }
  }, [])

  // Minimal Material-UI theme - required by WormholeConnect
  const theme = createTheme({
    palette: {
      mode: 'dark',
    },
    components: {
      MuiPopover: {
        defaultProps: {
          style: { zIndex: 9999999 }
        }
      },
      MuiMenu: {
        defaultProps: {
          style: { zIndex: 9999999 }
        }
      }
    }
  })

  // Enhanced config with auto-populated data
  const config = {
    networks: ['aptos', 'ethereum', 'polygon', 'arbitrum'],
    tokens: ['APT', 'ETH', 'USDC'],
    mode: 'dark',
    env: 'mainnet',
    // Auto-populate bridge settings
    bridgeDefaults: {
      fromNetwork: sourceChain?.toLowerCase() || 'aptos',
      toNetwork: destinationChain?.toLowerCase() || 'ethereum',
      token: sourceChain?.toLowerCase() === 'aptos' ? 'APT' : 'ETH',
      amount: targetAmount?.toString() || '',
      toAddress: recipient || '',
      fromAddress: currentAccount?.address || ''
    },
    // Pre-fill form fields
    initialValues: {
      sourceChain: sourceChain?.toLowerCase() || 'aptos',
      targetChain: destinationChain?.toLowerCase() || 'ethereum', 
      amount: targetAmount || 0,
      recipientAddress: recipient || '',
      sourceAddress: currentAccount?.address || ''
    }
  } as any

  return createPortal(
    <div 
      data-wormhole-portal
      tabIndex={-1}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        backdropFilter: 'blur(8px)',
        zIndex: 999999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        outline: 'none',
        pointerEvents: 'auto',
        animation: 'fadeIn 0.3s ease-out'
      }}
      onClick={(e) => {
        // Only close if clicking directly on the backdrop, not on child elements
        if (e.target === e.currentTarget) {
          onClose()
        }
        // Don't prevent event bubbling - let clicks through to the widget
      }}
    >
      <div 
        style={{
          backgroundColor: '#1a1b23',
          background: 'linear-gradient(135deg, #1a1b23 0%, #2d2e3f 100%)',
          borderRadius: '20px',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: '0 25px 50px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.05)',
          width: '90%',
          maxWidth: '650px',
          height: '80%',
          maxHeight: '750px',
          overflow: 'hidden',
          position: 'relative',
          pointerEvents: 'auto',
          transform: 'scale(1)',
          animation: 'slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
        onClick={(e) => {
          // Allow all clicks within the widget to work normally
          e.stopPropagation()
        }}
      >
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            background: 'rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(10px)',
            color: 'white',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '12px',
            width: '40px',
            height: '40px',
            cursor: 'pointer',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '18px',
            fontWeight: 'bold',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)'
            e.currentTarget.style.transform = 'scale(1.1)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'
            e.currentTarget.style.transform = 'scale(1)'
          }}
        >
          ×
        </button>
        
        <div style={{ 
          padding: '24px',
          height: '100%',
          overflow: 'auto',
          background: 'transparent'
        }}>
          <div style={{
            marginBottom: '16px',
            textAlign: 'center',
            color: 'rgba(255, 255, 255, 0.9)',
            fontSize: '20px',
            fontWeight: '600',
            letterSpacing: '-0.02em'
          }}>
             Cross-Chain Bridge
          </div>
          <div style={{
            background: 'rgba(255, 255, 255, 0.02)',
            borderRadius: '16px',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            overflow: 'hidden',
            minHeight: '500px'
          }}>
            <ThemeProvider theme={theme}>
              <WormholeConnect config={config} />
            </ThemeProvider>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}