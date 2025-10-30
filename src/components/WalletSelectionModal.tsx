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
          <DialogContent className="bg-black border border-gray-800 text-white max-w-md mx-auto w-[95%] sm:w-full">
            <div className="p-4 sm:p-6">
              <div className="text-center mb-4 sm:mb-6">
                <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">
                  Connect Your Wallet
                </h2>
                <p className="text-sm sm:text-base text-gray-400">
                  Choose your preferred blockchain
                </p>
              </div>

              <div className="space-y-3 sm:space-y-4">
                {/* Aptos Option */}
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Button
                    onClick={onSelectAptos}
                    className="w-full h-14 sm:h-16 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 active:from-blue-800 active:to-purple-800 border-0 text-white font-medium text-base sm:text-lg touch-manipulation"
                  >
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center space-x-2 sm:space-x-3">
                        <div className="w-7 h-7 sm:w-8 sm:h-8 bg-blue-500 rounded-full flex items-center justify-center">
                          <span className="text-white font-bold text-xs sm:text-sm">A</span>
                        </div>
                        <span className="text-sm sm:text-base">Aptos Network</span>
                      </div>
                      <span className="text-xs sm:text-sm opacity-75 hidden xs:block">Petra Wallet</span>
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
                    className="w-full h-14 sm:h-16 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 active:from-yellow-700 active:to-orange-700 border-0 text-black font-medium text-base sm:text-lg touch-manipulation"
                  >
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center space-x-2 sm:space-x-3">
                        <div className="w-7 h-7 sm:w-8 sm:h-8 bg-gray-800 rounded-full flex items-center justify-center">
                          <span className="text-yellow-400 font-bold text-xs sm:text-sm">Ξ</span>
                        </div>
                        <span className="text-sm sm:text-base">EVM Networks</span>
                      </div>
                      <span className="text-xs sm:text-sm opacity-75 hidden xs:block">Multiple Wallets</span>
                    </div>
                  </Button>
                </motion.div>
              </div>

              <div className="mt-4 sm:mt-6 text-center">
                <p className="text-xs text-gray-500 px-2">
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