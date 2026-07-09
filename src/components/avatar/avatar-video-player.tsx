'use client';

// ============================================================
// Avatar Video Player — D-ID video playback with crossfade
// ============================================================

import { useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Video, RefreshCw, AlertCircle } from 'lucide-react';

interface AvatarVideoPlayerProps {
  videoUrl: string;
  onVideoEnd?: () => void;
  onError?: () => void;
}

export function AvatarVideoPlayer({ videoUrl, onVideoEnd, onError }: AvatarVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    setIsLoaded(false);
    setHasError(false);
    setIsPlaying(false);
  }, [videoUrl]);

  const handleCanPlay = () => {
    setIsLoaded(true);
    if (videoRef.current) {
      videoRef.current.play().then(() => {
        setIsPlaying(true);
      }).catch(() => {
        // Autoplay blocked — user interaction needed
        setIsPlaying(false);
      });
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
    onVideoEnd?.();
  };

  const handleError = () => {
    setHasError(true);
    onError?.();
  };

  const handleReplay = () => {
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
    }
  };

  const handleClick = () => {
    if (!isPlaying && videoRef.current) {
      videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
    }
  };

  // Cleanup
  useEffect(() => {
    return () => {
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.src = '';
      }
    };
  }, []);

  if (hasError) {
    return (
      <div className="avatar-video-error">
        <AlertCircle size={24} />
        <span>Video failed to load</span>
      </div>
    );
  }

  return (
    <motion.div
      className="avatar-video-container"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.5 }}
    >
      {/* Loading shimmer */}
      <AnimatePresence>
        {!isLoaded && (
          <motion.div
            className="avatar-video-loading"
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <motion.div
              className="avatar-video-shimmer"
              animate={{ x: ['-100%', '100%'] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
            />
            <Video size={32} className="avatar-video-loading-icon" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Video element */}
      <video
        ref={videoRef}
        className="avatar-video"
        src={videoUrl}
        onCanPlay={handleCanPlay}
        onEnded={handleEnded}
        onError={handleError}
        onClick={handleClick}
        playsInline
        preload="auto"
      />

      {/* Replay overlay */}
      <AnimatePresence>
        {isLoaded && !isPlaying && (
          <motion.button
            className="avatar-video-overlay"
            onClick={handleReplay}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <RefreshCw size={24} />
            <span>Replay</span>
          </motion.button>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
