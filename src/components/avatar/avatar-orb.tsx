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
import { DigiMascot } from './digi-mascot';

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
    <div className="flex flex-col items-center justify-center space-y-8 h-full">
      {/* ---- D-ID Video Player (replaces mascot when ready) ---- */}
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
            key="mascot"
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -20 }}
            transition={{ duration: 0.5, type: 'spring' }}
          >
            <DigiMascot state={state} isSpeaking={isSpeaking} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* State badge */}
      <StateBadge state={state} config={config} />
    </div>
  );
}
