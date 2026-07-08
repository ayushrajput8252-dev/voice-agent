'use client';

// ============================================================
// Tool Call Card — Expandable tool execution details
// ============================================================

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ToolCallInfo } from '@/types';
import {
  Cloud, Search, Clock, Calculator, ChevronDown,
  CheckCircle, AlertCircle, Wrench,
} from 'lucide-react';

const TOOL_ICONS: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  get_weather: Cloud,
  web_search: Search,
  get_time: Clock,
  calculate: Calculator,
};

const TOOL_LABELS: Record<string, string> = {
  get_weather: 'Weather',
  web_search: 'Web Search',
  get_time: 'Time',
  calculate: 'Calculator',
};

interface ToolCallCardProps {
  toolCall: ToolCallInfo;
}

export function ToolCallCard({ toolCall }: ToolCallCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const IconComponent = TOOL_ICONS[toolCall.name] || Wrench;
  const label = TOOL_LABELS[toolCall.name] || toolCall.name;

  return (
    <motion.div
      className="tool-call-card"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
    >
      <button
        className="tool-call-header"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="tool-call-info">
          <IconComponent size={14} className="tool-call-icon" />
          <span className="tool-call-name">{label}</span>
          {toolCall.executionTimeMs !== undefined && (
            <span className="tool-call-time">{toolCall.executionTimeMs}ms</span>
          )}
        </div>
        <div className="tool-call-status">
          {toolCall.validated ? (
            <CheckCircle size={14} className="text-emerald-400" />
          ) : (
            <AlertCircle size={14} className="text-amber-400" />
          )}
          <motion.div
            animate={{ rotate: isExpanded ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronDown size={14} />
          </motion.div>
        </div>
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            className="tool-call-details"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="tool-detail-section">
              <span className="tool-detail-label">Input</span>
              <pre className="tool-detail-code">
                {JSON.stringify(toolCall.args, null, 2)}
              </pre>
            </div>
            {toolCall.result !== undefined && (
              <div className="tool-detail-section">
                <span className="tool-detail-label">Output</span>
                <pre className="tool-detail-code">
                  {JSON.stringify(toolCall.result, null, 2)}
                </pre>
              </div>
            )}
            {toolCall.validationError && (
              <div className="tool-detail-error">
                <AlertCircle size={12} />
                <span>{toolCall.validationError}</span>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
