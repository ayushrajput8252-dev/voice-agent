'use client';

// ============================================================
// Avatar Orb — Hero Component (50-60% viewport)
// Supports both animated orb and D-ID video playback
// ============================================================

import { motion, AnimatePresence } from 'framer-motion';
import { AppState, StateConfig, AvatarStatus } from '@/types';
import { getStateConfig } from '@/lib/state-machine';
import { StateBadge } from './state-badge';
import { WaveformVisualizer } from './waveform-visualizer';
import { AvatarVideoPlayer } from './avatar-video-player';

interface AvatarOrbProps {
  state: AppState;
  volume: number;
  frequencyData: number[];
  isSpeaking: boolean;
  avatarVideoUrl?: string;
  avatarStatus?: AvatarStatus;
  onVideoEnd?: () => void;
}

export function AvatarOrb({
  state,
  volume,
  frequencyData,
  isSpeaking,
  avatarVideoUrl,
  avatarStatus,
  onVideoEnd,
}: AvatarOrbProps) {
  const config: StateConfig = getStateConfig(state);
  const isActive = state !== AppState.Idle && state !== AppState.Complete;
  const isError = state === AppState.Error || state === AppState.Blocked;
  const isListening = state === AppState.Listening;
  const isThinking = [
    AppState.SafetyValidation,
    AppState.IntentClassification,
    AppState.Reasoning,
    AppState.ResponseValidation,
    AppState.Searching,
  ].includes(state);
  const isAvatarGenerating = avatarStatus === 'generating' || state === AppState.AvatarGeneration;
  const showVideo = avatarStatus === 'ready' && avatarVideoUrl;

  // Dynamic particle count based on state
  const particleCount = isAvatarGenerating ? 32 : isThinking ? 24 : isActive ? 16 : 8;
  const particleSpeed = isAvatarGenerating ? 1.5 : isThinking ? 2 : isActive ? 4 : 8;

  return (
    <div className="avatar-container">
      {/* Ambient glow */}
      <motion.div
        className="avatar-glow"
        animate={{
          background: `radial-gradient(circle, ${config.glowColor} 0%, transparent 70%)`,
          scale: isActive || isAvatarGenerating ? [1, 1.15, 1] : 1,
        }}
        transition={{
          scale: { duration: 2, repeat: Infinity, ease: 'easeInOut' },
          background: { duration: 0.6 },
        }}
      />

      {/* Outer ring particles */}
      <div className="avatar-particles">
        {Array.from({ length: particleCount }).map((_, i) => (
          <motion.div
            key={i}
            className="avatar-particle"
            style={{
              background: config.color,
            }}
            animate={{
              rotate: 360,
              scale: [0.5, 1.2, 0.5],
              opacity: [0.3, 0.8, 0.3],
            }}
            transition={{
              rotate: {
                duration: particleSpeed,
                repeat: Infinity,
                ease: 'linear',
                delay: (i / particleCount) * particleSpeed,
              },
              scale: {
                duration: 2,
                repeat: Infinity,
                delay: (i / particleCount) * 2,
              },
              opacity: {
                duration: 2,
                repeat: Infinity,
                delay: (i / particleCount) * 2,
              },
            }}
          >
            <motion.div
              className="particle-dot"
              style={{
                background: config.color,
                boxShadow: `0 0 6px ${config.color}`,
                transform: `translateY(-${120 + (i % 3) * 15}px)`,
              }}
            />
          </motion.div>
        ))}
      </div>

      {/* Waveform ring (around orb) */}
      {(isListening || isSpeaking) && !showVideo && (
        <WaveformVisualizer
          frequencyData={frequencyData}
          volume={volume}
          color={config.color}
          radius={140}
          isSpeaking={isSpeaking}
        />
      )}

      {/* ---- D-ID Video Player (replaces orb when ready) ---- */}
      <AnimatePresence mode="wait">
        {showVideo ? (
          <AvatarVideoPlayer
            key="video"
            videoUrl={avatarVideoUrl}
            onVideoEnd={onVideoEnd}
            onError={onVideoEnd}
          />
        ) : (
          <motion.div
            key="orb"
            className="avatar-orb"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{
              opacity: 1,
              scale: isError ? [1, 1.03, 0.97, 1] : isListening ? [1, 1.05, 1] : 1,
              boxShadow: `0 0 ${isActive ? 60 : 30}px ${config.glowColor}, 0 0 ${isActive ? 120 : 60}px ${config.glowColor}40, inset 0 0 ${isActive ? 40 : 20}px ${config.glowColor}30`,
            }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{
              scale: {
                duration: isError ? 0.4 : 2,
                repeat: isError || isListening ? Infinity : 0,
                ease: 'easeInOut',
              },
              boxShadow: { duration: 0.6 },
              opacity: { duration: 0.4 },
            }}
          >
            {/* Inner gradient mesh */}
            <motion.div
              className="orb-inner"
              animate={{
                background: `
                  radial-gradient(circle at 30% 30%, ${config.color}90 0%, transparent 50%),
                  radial-gradient(circle at 70% 70%, ${config.glowColor} 0%, transparent 50%),
                  radial-gradient(circle at 50% 50%, #0a0a1a 0%, #111827 100%)
                `,
                rotate: isThinking || isAvatarGenerating ? 360 : 0,
              }}
              transition={{
                background: { duration: 0.8 },
                rotate: { duration: isAvatarGenerating ? 4 : 8, repeat: Infinity, ease: 'linear' },
              }}
            />

            {/* Pulse ring for listening */}
            <AnimatePresence>
              {isListening && (
                <>
                  {[0, 1, 2].map((i) => (
                    <motion.div
                      key={`pulse-${i}`}
                      className="pulse-ring"
                      style={{ borderColor: config.color }}
                      initial={{ scale: 1, opacity: 0.6 }}
                      animate={{ scale: 2.5, opacity: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        delay: i * 0.6,
                        ease: 'easeOut',
                      }}
                    />
                  ))}
                </>
              )}
            </AnimatePresence>

            {/* Thinking spinner */}
            <AnimatePresence>
              {(isThinking || isAvatarGenerating) && (
                <motion.div
                  className="thinking-spinner"
                  style={{ borderTopColor: config.color, borderRightColor: `${config.color}40` }}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1, rotate: 360 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{
                    rotate: { duration: isAvatarGenerating ? 1 : 1.5, repeat: Infinity, ease: 'linear' },
                    opacity: { duration: 0.3 },
                  }}
                />
              )}
            </AnimatePresence>

            {/* Center icon indicator */}
            <motion.div
              className="orb-center-icon"
              animate={{
                scale: isActive ? [1, 1.1, 1] : 1,
                opacity: isActive ? 1 : 0.7,
              }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              {isError && (
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke={config.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
              )}
              {isSpeaking && !isError && (
                <div className="speaking-bars">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <motion.div
                      key={i}
                      className="speaking-bar"
                      style={{ background: config.color }}
                      animate={{ height: ['20%', `${40 + Math.random() * 60}%`, '20%'] }}
                      transition={{
                        duration: 0.5 + Math.random() * 0.3,
                        repeat: Infinity,
                        delay: i * 0.1,
                      }}
                    />
                  ))}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* State badge */}
      <StateBadge state={state} config={config} />
    </div>
  );
}
