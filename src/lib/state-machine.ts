// ============================================================
// State Machine — 15 Application States
// ============================================================

import { AppState, StateConfig } from '@/types';

export const STATE_CONFIGS: Record<AppState, StateConfig> = {
  [AppState.Idle]: {
    label: 'Ready',
    color: '#6366f1',
    glowColor: 'rgba(99, 102, 241, 0.4)',
    icon: 'Circle',
    animationPreset: 'pulse',
  },
  [AppState.Listening]: {
    label: 'Listening...',
    color: '#14b8a6',
    glowColor: 'rgba(20, 184, 166, 0.5)',
    icon: 'Mic',
    animationPreset: 'wave',
  },
  [AppState.Transcribing]: {
    label: 'Transcribing...',
    color: '#06b6d4',
    glowColor: 'rgba(6, 182, 212, 0.4)',
    icon: 'FileText',
    animationPreset: 'pulse',
  },
  [AppState.SafetyValidation]: {
    label: 'Safety Check',
    color: '#f59e0b',
    glowColor: 'rgba(245, 158, 11, 0.4)',
    icon: 'Shield',
    animationPreset: 'spin',
  },
  [AppState.IntentClassification]: {
    label: 'Understanding...',
    color: '#8b5cf6',
    glowColor: 'rgba(139, 92, 246, 0.4)',
    icon: 'Brain',
    animationPreset: 'spin',
  },
  [AppState.ToolExecution]: {
    label: 'Using Tools',
    color: '#f97316',
    glowColor: 'rgba(249, 115, 22, 0.4)',
    icon: 'Wrench',
    animationPreset: 'bounce',
  },
  [AppState.Searching]: {
    label: 'Searching...',
    color: '#3b82f6',
    glowColor: 'rgba(59, 130, 246, 0.4)',
    icon: 'Search',
    animationPreset: 'spin',
  },
  [AppState.Reasoning]: {
    label: 'Thinking...',
    color: '#a855f7',
    glowColor: 'rgba(168, 85, 247, 0.5)',
    icon: 'Sparkles',
    animationPreset: 'spin',
  },
  [AppState.ResponseValidation]: {
    label: 'Validating Response',
    color: '#eab308',
    glowColor: 'rgba(234, 179, 8, 0.4)',
    icon: 'CheckCircle',
    animationPreset: 'spin',
  },
  [AppState.AudioGeneration]: {
    label: 'Generating Audio',
    color: '#ec4899',
    glowColor: 'rgba(236, 72, 153, 0.4)',
    icon: 'Volume2',
    animationPreset: 'pulse',
  },
  [AppState.AvatarGeneration]: {
    label: 'Preparing Avatar',
    color: '#d946ef',
    glowColor: 'rgba(217, 70, 239, 0.4)',
    icon: 'User',
    animationPreset: 'pulse',
  },
  [AppState.Speaking]: {
    label: 'Speaking',
    color: '#a855f7',
    glowColor: 'rgba(168, 85, 247, 0.6)',
    icon: 'Volume2',
    animationPreset: 'wave',
  },
  [AppState.Complete]: {
    label: 'Complete',
    color: '#22c55e',
    glowColor: 'rgba(34, 197, 94, 0.4)',
    icon: 'CheckCircle',
    animationPreset: 'none',
  },
  [AppState.Blocked]: {
    label: 'Blocked',
    color: '#ef4444',
    glowColor: 'rgba(239, 68, 68, 0.5)',
    icon: 'ShieldAlert',
    animationPreset: 'shake',
  },
  [AppState.Error]: {
    label: 'Error',
    color: '#ef4444',
    glowColor: 'rgba(239, 68, 68, 0.4)',
    icon: 'AlertTriangle',
    animationPreset: 'shake',
  },
};

/**
 * Valid state transitions — ensures the state machine only moves through valid paths.
 */
export const VALID_TRANSITIONS: Partial<Record<AppState, AppState[]>> = {
  [AppState.Idle]: [AppState.Listening, AppState.Error],
  [AppState.Listening]: [AppState.Transcribing, AppState.Idle, AppState.Error],
  [AppState.Transcribing]: [AppState.SafetyValidation, AppState.Error],
  [AppState.SafetyValidation]: [AppState.IntentClassification, AppState.Blocked, AppState.Error],
  [AppState.IntentClassification]: [AppState.ToolExecution, AppState.Reasoning, AppState.Error],
  [AppState.ToolExecution]: [AppState.Searching, AppState.Reasoning, AppState.Error],
  [AppState.Searching]: [AppState.Reasoning, AppState.Error],
  [AppState.Reasoning]: [AppState.ResponseValidation, AppState.Error],
  [AppState.ResponseValidation]: [AppState.AudioGeneration, AppState.Blocked, AppState.Error],
  [AppState.AudioGeneration]: [AppState.AvatarGeneration, AppState.Speaking, AppState.Error],
  [AppState.AvatarGeneration]: [AppState.Speaking, AppState.Error],
  [AppState.Speaking]: [AppState.Complete, AppState.Error],
  [AppState.Complete]: [AppState.Idle],
  [AppState.Blocked]: [AppState.Idle],
  [AppState.Error]: [AppState.Idle],
};

export function getStateConfig(state: AppState): StateConfig {
  return STATE_CONFIGS[state];
}
