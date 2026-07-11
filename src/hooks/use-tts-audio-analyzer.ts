'use client';

// ============================================================
// TTS Audio Analyzer Hook — Simulated mouth value from speech
// ============================================================
// The Web Speech API does NOT expose raw audio output as an
// AudioNode/MediaStream, so we simulate natural mouth movement
// based on onstart/onend/onboundary events + smooth interpolation.

import { useState, useCallback, useRef, useEffect } from 'react';

interface TTSAnalyzerState {
  mouthValue: number;    // 0–1, drives ParamMouthOpenY
  isSpeaking: boolean;
}

export function useTTSAudioAnalyzer() {
  const [state, setState] = useState<TTSAnalyzerState>({
    mouthValue: 0,
    isSpeaking: false,
  });

  const speakingRef = useRef(false);
  const targetMouthRef = useRef(0);
  const currentMouthRef = useRef(0);
  const animFrameRef = useRef<number>(0);
  const lastBoundaryRef = useRef(0);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, []);

  // Smooth interpolation loop
  const animate = useCallback(() => {
    // Determine target dynamically per frame for better responsiveness
    let target = targetMouthRef.current;
    if (speakingRef.current) {
      const now = Date.now();
      const timeSinceBoundary = now - lastBoundaryRef.current;

      // Simulate syllables (approx 200ms per syllable)
      // A full sine wave cycle is 2*PI, so PI means it peaks every 100ms and drops every 100ms
      const syllableWave = Math.sin((timeSinceBoundary / 120) * Math.PI);

      if (timeSinceBoundary < 80) {
        // Just hit a word boundary - wide open
        target = 0.7 + Math.random() * 0.3;
      } else if (syllableWave > 0.3) {
        // Peak of a syllable
        target = 0.3 + (syllableWave * 0.5) + (Math.random() * 0.2);
      } else {
        // Valley between syllables
        target = 0.1 + Math.random() * 0.15;
      }
    } else {
      target = 0;
    }

    const current = currentMouthRef.current;

    // Much faster smoothing for snappy lip sync (reacts instantly to syllables)
    const smoothing = speakingRef.current ? 0.6 : 0.2;
    const newValue = current + (target - current) * smoothing;

    // Snap to zero when very close
    const finalValue = Math.abs(newValue) < 0.01 ? 0 : newValue;
    currentMouthRef.current = finalValue;

    setState({
      mouthValue: finalValue,
      isSpeaking: speakingRef.current,
    });

    animFrameRef.current = requestAnimationFrame(animate);
  }, []);



  // Word boundary generator interval
  const boundaryIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startSpeaking = useCallback(() => {
    speakingRef.current = true;
    lastBoundaryRef.current = Date.now();

    // Start animation loop
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
    }
    animate();

    // Fallback interval to simulate boundaries in case the browser doesn't fire onboundary
    if (boundaryIntervalRef.current) {
      clearInterval(boundaryIntervalRef.current);
    }
    boundaryIntervalRef.current = setInterval(() => {
      if (!speakingRef.current) return;
      lastBoundaryRef.current = Date.now();
    }, 400 + Math.random() * 200);

    setState((prev) => ({ ...prev, isSpeaking: true }));
  }, [animate]);

  const stopSpeaking = useCallback(() => {
    speakingRef.current = false;
    targetMouthRef.current = 0;

    if (boundaryIntervalRef.current) {
      clearInterval(boundaryIntervalRef.current);
      boundaryIntervalRef.current = null;
    }

    // Let the animation loop close the mouth smoothly
    // It will settle to 0 via the lerp
  }, []);

  // Call this on onboundary events from SpeechSynthesisUtterance
  const onWordBoundary = useCallback(() => {
    lastBoundaryRef.current = Date.now();
    if (speakingRef.current) {
      // Quick mouth open on actual word boundary
      targetMouthRef.current = 0.7 + Math.random() * 0.3;
    }
  }, []);

  // Cleanup
  useEffect(() => {
    return () => {
      if (boundaryIntervalRef.current) {
        clearInterval(boundaryIntervalRef.current);
      }
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, []);

  return {
    mouthValue: state.mouthValue,
    isSpeaking: state.isSpeaking,
    startSpeaking,
    stopSpeaking,
    onWordBoundary,
  };
}
