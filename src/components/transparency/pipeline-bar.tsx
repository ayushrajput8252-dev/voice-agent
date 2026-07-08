'use client';

// ============================================================
// Pipeline Bar — Horizontal pipeline progress indicator
// ============================================================

import { motion } from 'framer-motion';
import { AppState } from '@/types';
import { getStateConfig } from '@/lib/state-machine';
import {
  Shield, Brain, Wrench, Sparkles, CheckCircle, Volume2,
} from 'lucide-react';

const PIPELINE_STAGES = [
  { key: 'safety', label: 'Safety', icon: Shield, states: [AppState.SafetyValidation] },
  { key: 'intent', label: 'Intent', icon: Brain, states: [AppState.IntentClassification] },
  { key: 'tools', label: 'Tools', icon: Wrench, states: [AppState.ToolExecution, AppState.Searching] },
  { key: 'generate', label: 'Generate', icon: Sparkles, states: [AppState.Reasoning] },
  { key: 'validate', label: 'Validate', icon: CheckCircle, states: [AppState.ResponseValidation] },
  { key: 'speak', label: 'Speak', icon: Volume2, states: [AppState.AudioGeneration, AppState.AvatarGeneration, AppState.Speaking] },
];

interface PipelineBarProps {
  currentState: AppState;
  latencyMs?: number;
  model?: string;
}

export function PipelineBar({ currentState, latencyMs, model }: PipelineBarProps) {
  const isActive = currentState !== AppState.Idle;
  const isProcessing = ![AppState.Idle, AppState.Listening, AppState.Complete, AppState.Error, AppState.Blocked].includes(currentState);

  // Determine which stages are complete, active, or pending
  const allStageStates = PIPELINE_STAGES.flatMap((s) => s.states);
  const currentIdx = allStageStates.indexOf(currentState);

  function getStageStatus(stage: typeof PIPELINE_STAGES[number]) {
    if (currentState === AppState.Complete) return 'complete';
    if (currentState === AppState.Blocked || currentState === AppState.Error) {
      // Find if we were past this stage
      const stageMaxIdx = Math.max(...stage.states.map((s) => allStageStates.indexOf(s)));
      return currentIdx > stageMaxIdx ? 'complete' : currentIdx >= 0 && stage.states.some((s) => allStageStates.indexOf(s) <= currentIdx) ? 'error' : 'pending';
    }
    if (stage.states.includes(currentState)) return 'active';
    const stageMinIdx = Math.min(...stage.states.map((s) => allStageStates.indexOf(s)));
    if (currentIdx >= 0 && stageMinIdx < currentIdx) return 'complete';
    return 'pending';
  }

  return (
    <motion.div
      className="pipeline-bar"
      animate={{ opacity: isActive ? 1 : 0.4 }}
      transition={{ duration: 0.3 }}
    >
      <div className="pipeline-stages">
        {PIPELINE_STAGES.map((stage, i) => {
          const status = getStageStatus(stage);
          const IconComp = stage.icon;
          const color =
            status === 'active'
              ? getStateConfig(currentState).color
              : status === 'complete'
              ? '#22c55e'
              : status === 'error'
              ? '#ef4444'
              : '#4b5563';

          return (
            <div key={stage.key} className="pipeline-stage-wrapper">
              {i > 0 && (
                <div
                  className="pipeline-connector"
                  style={{
                    background: status === 'complete' ? '#22c55e' : status === 'error' ? '#ef4444' : '#374151',
                  }}
                />
              )}
              <motion.div
                className={`pipeline-stage ${status}`}
                style={{ borderColor: color }}
                animate={
                  status === 'active'
                    ? { scale: [1, 1.15, 1], boxShadow: `0 0 12px ${color}40` }
                    : { scale: 1, boxShadow: 'none' }
                }
                transition={
                  status === 'active'
                    ? { duration: 1.2, repeat: Infinity }
                    : { duration: 0.2 }
                }
                title={stage.label}
              >
                <IconComp size={12} style={{ color }} />
              </motion.div>
            </div>
          );
        })}
      </div>

      {/* Meta info */}
      <div className="pipeline-meta">
        {model && (
          <span className="pipeline-model">{model}</span>
        )}
        {isProcessing && latencyMs === undefined && (
          <motion.span
            className="pipeline-processing"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            Processing
          </motion.span>
        )}
        {latencyMs !== undefined && (
          <span className="pipeline-latency">{latencyMs}ms</span>
        )}
      </div>
    </motion.div>
  );
}
