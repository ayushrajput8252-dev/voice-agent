'use client';

// ============================================================
// Metadata Footer — Model info, latency, tools, safety status
// ============================================================

import { motion } from 'framer-motion';
import { SafetyInfo } from '@/types';
import { Shield, Clock, Cpu, Wrench } from 'lucide-react';

interface MetadataFooterProps {
  model?: string;
  latencyMs?: number;
  toolsUsed?: string[];
  safety?: SafetyInfo;
}

export function MetadataFooter({ model, latencyMs, toolsUsed, safety }: MetadataFooterProps) {
  const hasData = model || latencyMs !== undefined || (toolsUsed && toolsUsed.length > 0) || safety;

  if (!hasData) {
    return (
      <div className="metadata-footer">
        <div className="metadata-item">
          <Cpu size={12} />
          <span>gemini-2.5-flash</span>
        </div>
        <div className="metadata-item">
          <Shield size={12} className="text-emerald-400" />
          <span>5-Layer Safety Active</span>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      className="metadata-footer"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {model && (
        <div className="metadata-item">
          <Cpu size={12} />
          <span>{model}</span>
        </div>
      )}

      {latencyMs !== undefined && (
        <div className="metadata-item">
          <Clock size={12} />
          <span>{latencyMs}ms</span>
        </div>
      )}

      {toolsUsed && toolsUsed.length > 0 && (
        <div className="metadata-item">
          <Wrench size={12} />
          <span>{toolsUsed.join(', ')}</span>
        </div>
      )}

      {safety && (
        <div className={`metadata-item ${safety.passed ? 'safety-passed' : 'safety-failed'}`}>
          <Shield size={12} />
          <span>
            {safety.passed
              ? `✓ Passed (${safety.layersPassed}/${safety.totalLayers})`
              : `✗ Failed at ${safety.blockedAt}`}
          </span>
        </div>
      )}
    </motion.div>
  );
}
