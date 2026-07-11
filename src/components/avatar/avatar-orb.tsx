'use client';

// ============================================================
// Avatar Orb — Hero Component (50-60% viewport)
// Now renders a Live2D Kei model with lip-sync
// ============================================================

import { motion } from 'framer-motion';
import { AppState, StateConfig } from '@/types';
import { getStateConfig } from '@/lib/state-machine';
import { StateBadge } from './state-badge';
import { Live2DAvatar } from './live2d-avatar';

interface AvatarOrbProps {
  state: AppState;
  volume: number;
  frequencyData: number[];
  isSpeaking: boolean;
  mouthValue: number;
}

export function AvatarOrb({
  state,
  volume,
  frequencyData,
  isSpeaking,
  mouthValue,
}: AvatarOrbProps) {
  const config: StateConfig = getStateConfig(state);

  return (
    <div className="w-full flex flex-col items-center justify-center space-y-8 h-full">
      {/* ---- Live2D Model ---- */}
      <motion.div
        key="live2d"
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5, type: 'spring' }}
        style={{ width: '100%', height: '100%' }}
      >
        <Live2DAvatar
          mouthValue={mouthValue}
          state={state}
          isSpeaking={isSpeaking}
        />
      </motion.div>

      {/* State badge */}
      <StateBadge state={state} config={config} />
    </div>
  );
}
