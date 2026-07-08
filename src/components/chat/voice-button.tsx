'use client';

// ============================================================
// Voice Button — Primary interaction control
// ============================================================

import { motion } from 'framer-motion';
import { Mic, MicOff, Loader2 } from 'lucide-react';
import { AppState } from '@/types';

interface VoiceButtonProps {
  isListening: boolean;
  isProcessing: boolean;
  isSupported: boolean;
  state: AppState;
  onClick: () => void;
}

export function VoiceButton({
  isListening,
  isProcessing,
  isSupported,
  state,
  onClick,
}: VoiceButtonProps) {
  const isDisabled = isProcessing || !isSupported;
  const isActive = isListening;
  const isBusy = state !== AppState.Idle && state !== AppState.Complete && state !== AppState.Error && state !== AppState.Blocked && !isListening;

  return (
    <div className="voice-button-container">
      {/* Outer pulse rings when listening */}
      {isActive && (
        <>
          {[0, 1].map((i) => (
            <motion.div
              key={`vb-ring-${i}`}
              className="voice-button-ring"
              animate={{ scale: [1, 2.2], opacity: [0.4, 0] }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                delay: i * 0.5,
                ease: 'easeOut',
              }}
            />
          ))}
        </>
      )}

      <motion.button
        className={`voice-button ${isActive ? 'active' : ''} ${isDisabled ? 'disabled' : ''}`}
        onClick={onClick}
        disabled={isDisabled}
        whileTap={isDisabled ? {} : { scale: 0.92 }}
        whileHover={isDisabled ? {} : { scale: 1.05 }}
        animate={{
          background: isActive
            ? 'linear-gradient(135deg, #14b8a6, #0d9488)'
            : isBusy
            ? 'linear-gradient(135deg, #374151, #1f2937)'
            : 'linear-gradient(135deg, #6366f1, #4f46e5)',
        }}
        transition={{ duration: 0.3 }}
        title={
          !isSupported
            ? 'Speech recognition not supported — use Chrome or Edge'
            : isListening
            ? 'Stop listening'
            : 'Start listening (or press Space)'
        }
      >
        {isBusy ? (
          <Loader2 size={24} className="voice-button-icon spin" />
        ) : isActive ? (
          <MicOff size={24} className="voice-button-icon" />
        ) : (
          <Mic size={24} className="voice-button-icon" />
        )}
      </motion.button>

      {/* Hint text */}
      <motion.p
        className="voice-hint"
        animate={{ opacity: isActive ? 0 : 0.5 }}
      >
        {!isSupported
          ? 'Use Chrome or Edge for voice'
          : isBusy
          ? 'Processing...'
          : 'Press Space or click to speak'}
      </motion.p>
    </div>
  );
}
