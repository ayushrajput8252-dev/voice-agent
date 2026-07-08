'use client';

// ============================================================
// Waveform Visualizer — Audio-reactive ring around the orb
// ============================================================

import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

interface WaveformVisualizerProps {
  frequencyData: number[];
  volume: number;
  color: string;
  radius: number;
  isSpeaking: boolean;
}

export function WaveformVisualizer({
  frequencyData,
  volume,
  color,
  radius,
  isSpeaking,
}: WaveformVisualizerProps) {
  const [bars, setBars] = useState<number[]>(new Array(64).fill(0));

  useEffect(() => {
    if (frequencyData.length > 0) {
      // Interpolate frequency data to 64 bars
      const interpolated: number[] = [];
      const step = frequencyData.length / 64;
      for (let i = 0; i < 64; i++) {
        const idx = Math.floor(i * step);
        interpolated.push(frequencyData[idx] || 0);
      }
      setBars(interpolated);
    } else if (isSpeaking) {
      // Generate simulated waveform when speaking (TTS doesn't give frequency data)
      const simulated = Array.from({ length: 64 }, (_, i) => {
        const t = Date.now() / 300;
        return (
          0.3 +
          0.3 * Math.sin(t + i * 0.3) +
          0.2 * Math.sin(t * 1.5 + i * 0.5) +
          0.1 * Math.random()
        );
      });
      setBars(simulated);
    }
  }, [frequencyData, isSpeaking]);

  // Simulated animation for speaking mode
  useEffect(() => {
    if (!isSpeaking || frequencyData.length > 0) return;

    const interval = setInterval(() => {
      const simulated = Array.from({ length: 64 }, (_, i) => {
        const t = Date.now() / 300;
        return (
          0.3 +
          0.3 * Math.sin(t + i * 0.3) +
          0.2 * Math.sin(t * 1.5 + i * 0.5) +
          0.1 * Math.random()
        );
      });
      setBars(simulated);
    }, 50);

    return () => clearInterval(interval);
  }, [isSpeaking, frequencyData.length]);

  return (
    <div className="waveform-container" style={{ width: radius * 2 + 40, height: radius * 2 + 40 }}>
      <svg
        viewBox={`0 0 ${(radius + 20) * 2} ${(radius + 20) * 2}`}
        className="waveform-svg"
      >
        {bars.map((value, i) => {
          const angle = (i / 64) * Math.PI * 2 - Math.PI / 2;
          const barHeight = 8 + value * 30 * (1 + volume);
          const cx = radius + 20;
          const cy = radius + 20;
          const x1 = cx + Math.cos(angle) * radius;
          const y1 = cy + Math.sin(angle) * radius;
          const x2 = cx + Math.cos(angle) * (radius + barHeight);
          const y2 = cy + Math.sin(angle) * (radius + barHeight);

          return (
            <motion.line
              key={i}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke={color}
              strokeWidth={2.5}
              strokeLinecap="round"
              opacity={0.4 + value * 0.6}
              initial={false}
              animate={{ x2, y2 }}
              transition={{ duration: 0.05 }}
            />
          );
        })}
      </svg>
    </div>
  );
}
