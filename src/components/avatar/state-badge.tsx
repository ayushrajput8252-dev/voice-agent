'use client';

// ============================================================
// State Badge — Animated status indicator near the avatar
// ============================================================

import { motion, AnimatePresence } from 'framer-motion';
import { StateConfig } from '@/types';
import { AppState } from '@/types';
import {
  Mic, Shield, Brain, Wrench, Search, Sparkles,
  CheckCircle, Volume2, AlertTriangle, ShieldAlert,
  Circle, FileText, User,
} from 'lucide-react';

const ICON_MAP: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  Circle, Mic, FileText, Shield, Brain, Wrench, Search,
  Sparkles, CheckCircle, Volume2, User, ShieldAlert, AlertTriangle,
};

interface StateBadgeProps {
  state: AppState;
  config: StateConfig;
}

export function StateBadge({ state, config }: StateBadgeProps) {
  const IconComponent = ICON_MAP[config.icon] || Circle;
  const isIdle = state === AppState.Idle;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={state}
        className="state-badge"
        style={{
          borderColor: `${config.color}40`,
          background: `${config.color}15`,
        }}
        initial={{ opacity: 0, y: 10, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -10, scale: 0.9 }}
        transition={{ duration: 0.3 }}
      >
        {/* Activity indicator */}
        {!isIdle && state !== AppState.Complete && (
          <motion.div
            className="badge-activity-dot"
            style={{ background: config.color }}
            animate={{ scale: [1, 1.3, 1], opacity: [1, 0.5, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
          />
        )}

        <IconComponent size={14} className="badge-icon" />

        <span className="badge-label" style={{ color: config.color }}>
          {config.label}
        </span>

        {/* Loading dots for active states */}
        {!isIdle && state !== AppState.Complete && state !== AppState.Error && state !== AppState.Blocked && (
          <div className="badge-dots">
            {[0, 1, 2].map((i) => (
              <motion.span
                key={i}
                className="badge-dot"
                style={{ background: config.color }}
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
              />
            ))}
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
