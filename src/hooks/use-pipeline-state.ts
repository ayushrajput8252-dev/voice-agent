'use client';

// ============================================================
// Pipeline State Hook — Wraps state machine for React
// ============================================================

import { useState, useCallback, useRef } from 'react';
import { AppState } from '@/types';
import { getStateConfig } from '@/lib/state-machine';

export interface StateHistoryEntry {
  state: AppState;
  label: string;
  timestamp: number;
  durationMs?: number;
}

export function usePipelineState() {
  const [currentState, setCurrentState] = useState<AppState>(AppState.Idle);
  const [stateHistory, setStateHistory] = useState<StateHistoryEntry[]>([]);
  const lastTransitionTime = useRef<number>(Date.now());

  const transitionTo = useCallback((newState: AppState, label?: string) => {
    const now = Date.now();
    const duration = now - lastTransitionTime.current;
    lastTransitionTime.current = now;

    setStateHistory((prev) => {
      const updated = [...prev];
      // Update duration of last entry
      if (updated.length > 0) {
        updated[updated.length - 1] = {
          ...updated[updated.length - 1],
          durationMs: duration,
        };
      }
      // Add new entry
      updated.push({
        state: newState,
        label: label || getStateConfig(newState).label,
        timestamp: now,
      });
      return updated;
    });

    setCurrentState(newState);
  }, []);

  const reset = useCallback(() => {
    setCurrentState(AppState.Idle);
    setStateHistory([]);
    lastTransitionTime.current = Date.now();
  }, []);

  const config = getStateConfig(currentState);

  return {
    currentState,
    stateConfig: config,
    stateHistory,
    transitionTo,
    reset,
  };
}
