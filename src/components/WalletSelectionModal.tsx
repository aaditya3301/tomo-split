import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { X } from 'lucide-react'

interface WalletSelectionModalProps {
  isOpen: boolean
  onClose: () => void
  onSelectAptos: () => void
  onSelectEVM: () => void
}

const WalletSelectionModal: React.FC<WalletSelectionModalProps> = ({
  isOpen,
  onClose,
  onSelectAptos,
  onSelectEVM
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <Dialog open={isOpen} onOpenChange={onClose}>
          <DialogContent className="bg-black border border-gray-800 text-white max-w-md mx-auto">
            <div className="relative p-6">
              <button
                onClick={onClose}
                className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
              
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-white mb-2">
                  Connect Your Wallet
                </h2>
                <p className="text-gray-400">
                  Choose your preferred blockchain
                </p>
              </div>

              <div className="space-y-4">
                {/* Aptos Option */}
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Button
                    onClick={onSelectAptos}
                    className="w-full h-16 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 border-0 text-white font-medium text-lg"
                  >
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                          <span className="text-white font-bold text-sm">A</span>
                        </div>
                        <span>Aptos Network</span>
                      </div>
                      <span className="text-sm opacity-75">Petra Wallet</span>
                    </div>
                  </Button>
                </motion.div>

                {/* EVM Option */}
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Button
                    onClick={onSelectEVM}
                    className="w-full h-16 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 border-0 text-black font-medium text-lg"
                  >
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-gray-800 rounded-full flex items-center justify-center">
                          <span className="text-yellow-400 font-bold text-sm">Ξ</span>
                        </div>
                        <span>EVM Networks</span>
                      </div>
                      <span className="text-sm opacity-75">Multiple Wallets</span>
                    </div>
                  </Button>
                </motion.div>
              </div>

              <div className="mt-6 text-center">
                <p className="text-xs text-gray-500">
                  Your choice determines available features and name services (ENS/ANS)
                </p>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </AnimatePresence>
  )
}

export default WalletSelectionModal