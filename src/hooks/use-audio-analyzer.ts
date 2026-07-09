'use client';

// ============================================================
// Audio Analyzer Hook — Real-time microphone frequency data
// ============================================================

import { useState, useCallback, useRef, useEffect } from 'react';

interface AudioAnalyzerState {
  volume: number;
  frequencyData: number[];
  isActive: boolean;
}

export function useAudioAnalyzer() {
  const [state, setState] = useState<AudioAnalyzerState>({
    volume: 0,
    frequencyData: [],
    isActive: false,
  });

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number>(0);
  const lastUpdateTimeRef = useRef<number>(0);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const analyze = useCallback(() => {
    if (!analyserRef.current || !mountedRef.current) return;

    const analyser = analyserRef.current;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    analyser.getByteFrequencyData(dataArray);

    // Calculate volume (RMS)
    let sum = 0;
    for (let i = 0; i < bufferLength; i++) {
      sum += dataArray[i] * dataArray[i];
    }
    const volume = Math.sqrt(sum / bufferLength) / 255;

    // Sample frequency data (reduce to 32 bars for visualization)
    const sampledData: number[] = [];
    const step = Math.floor(bufferLength / 32);
    for (let i = 0; i < 32; i++) {
      sampledData.push(dataArray[i * step] / 255);
    }

    // Throttle state updates to avoid React maximum update depth errors (approx 20fps)
    const now = Date.now();
    if (!lastUpdateTimeRef.current || now - lastUpdateTimeRef.current > 50) {
      lastUpdateTimeRef.current = now;
      setState({
        volume,
        frequencyData: sampledData,
        isActive: true,
      });
    }

    animationFrameRef.current = requestAnimationFrame(analyze);
  }, []);

  const start = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;

      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.8;

      source.connect(analyser);
      analyserRef.current = analyser;

      analyze();
    } catch (error) {
      console.error('Failed to access microphone:', error);
    }
  }, [analyze]);

  const stop = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    analyserRef.current = null;

    setState({ volume: 0, frequencyData: [], isActive: false });
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stop();
    };
  }, [stop]);

  return {
    ...state,
    start,
    stop,
  };
}
