import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import PlaceholderWarning from "@/components/PlaceholderWarning";
import { useAppKit } from "@reown/appkit/react";
import { useAccount } from "wagmi";
import { useNavigate } from "react-router-dom";

const Index = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isVideoLoaded, setIsVideoLoaded] = useState(false);
  const [showCTA, setShowCTA] = useState(false);
  const headline = "On-chain splits • ENS support";
  const subline = "Track expenses, earn incentives";

  const { open } = useAppKit();
  const { isConnected } = useAccount();
  const navigate = useNavigate();

  // no feature list; keep it simple

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const fallbackTimer = window.setTimeout(() => {
      setIsVideoLoaded(true);
    }, 1500);

    const tryPlay = async () => {
      try {
        await video.play();
        setIsVideoLoaded(true);
      } catch (err) {
        setIsVideoLoaded(true);
        console.warn('Video autoplay blocked, showing UI without playback:', err);
      }
    };

    const handleLoadedData = () => {
      tryPlay();
    };

    const handleCanPlay = () => {
      tryPlay();
    };

    video.addEventListener('loadeddata', handleLoadedData);
    video.addEventListener('canplay', handleCanPlay);

    return () => {
      window.clearTimeout(fallbackTimer);
      video.removeEventListener('loadeddata', handleLoadedData);
      video.removeEventListener('canplay', handleCanPlay);
    };
  }, []);

  // Reveal CTA after video is ready
  useEffect(() => {
    if (!isVideoLoaded) return;
    const id = window.setTimeout(() => setShowCTA(true), 600);
    return () => window.clearTimeout(id);
  }, [isVideoLoaded]);

  useEffect(() => {
    if (isConnected) {
      navigate("/dashboard");
    }
  }, [isConnected, navigate]);

  return (
    <div className="min-h-screen bg-black text-white overflow-hidden relative">
      <PlaceholderWarning />
      
      <div className="fixed inset-0 z-0">
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          autoPlay
          loop
          muted
          playsInline
          preload="metadata"
          onError={() => {
            setIsVideoLoaded(true);
          }}
        >
          <source src="/liquid_flow.mp4" type="video/mp4" />
        </video>

        <div className="pointer-events-none absolute inset-0 bg-black/25" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/50" />
      </div>
          
      <div className="relative z-10 min-h-screen flex flex-col">
        <section className="flex-1 px-6">
          <div className="max-w-6xl mx-auto h-full">
            <div className="absolute left-6 bottom-28 md:left-12 md:bottom-24">
              
            {/* Clean static text */}
            <div className="mb-3">
              <h1 className="text-4xl md:text-7xl font-light text-white tracking-tight">
                {headline}
              </h1>
            </div>
            <p className="text-lg md:text-2xl text-white/80 mb-8">
              {subline}
            </p>
            {showCTA && (
              <motion.button
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                onClick={() => open?.()}
                className="px-6 py-3 md:px-8 md:py-4 rounded-xl bg-yellow-400 text-black font-medium hover:bg-yellow-300 transition-colors"
              >
                Try now
              </motion.button>
            )}
              
            </div>
          </div>
        </section>
      </div>

      {!isVideoLoaded && (
        <div className="fixed inset-0 z-20 bg-black flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center"
          >
            <motion.img
              src="/favicon.ico"
              alt="Site Logo"
              className="w-16 h-16 mx-auto mb-4"
              initial={{ scale: 0.8, opacity: 0.7 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ 
                duration: 1.5, 
                repeat: Infinity, 
                repeatType: "reverse",
                ease: "easeInOut"
              }}
            />
            <p className="text-white/70">Loading experience...</p>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default Index;