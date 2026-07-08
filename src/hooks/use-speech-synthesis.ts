'use client';

// ============================================================
// Speech Synthesis Hook — Web Speech API (TTS)
// ============================================================

import { useState, useCallback, useRef, useEffect } from 'react';
import { config } from '@/lib/config';

interface UseSpeechSynthesisOptions {
  onStart?: () => void;
  onEnd?: () => void;
  onBoundary?: (charIndex: number) => void;
  onError?: (error: string) => void;
}

export function useSpeechSynthesis(options: UseSpeechSynthesisOptions = {}) {
  const { onStart, onEnd, onBoundary, onError } = options;

  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null);
  const [progress, setProgress] = useState(0);

  const callbackRefs = useRef({ onStart, onEnd, onBoundary, onError });
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const textLengthRef = useRef(0);

  useEffect(() => {
    callbackRefs.current = { onStart, onEnd, onBoundary, onError };
  }, [onStart, onEnd, onBoundary, onError]);

  // Load voices
  useEffect(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    const loadVoices = () => {
      const available = speechSynthesis.getVoices();
      setVoices(available);

      // Auto-select best voice
      if (available.length > 0 && !selectedVoice) {
        const preferred = config.voice.preferredVoices;
        const found = preferred
          .map((name) => available.find((v) => v.name.includes(name)))
          .find(Boolean);

        setSelectedVoice(found || available.find((v) => v.lang.startsWith('en')) || available[0]);
      }
    };

    loadVoices();
    speechSynthesis.onvoiceschanged = loadVoices;

    return () => {
      speechSynthesis.onvoiceschanged = null;
    };
  }, [selectedVoice]);

  const speak = useCallback((text: string) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      callbackRefs.current.onError?.('Speech synthesis not available');
      return;
    }

    // Cancel any ongoing speech
    speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utteranceRef.current = utterance;
    textLengthRef.current = text.length;

    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }
    utterance.rate = config.voice.rate;
    utterance.pitch = config.voice.pitch;

    utterance.onstart = () => {
      setIsSpeaking(true);
      setProgress(0);
      callbackRefs.current.onStart?.();
    };

    utterance.onend = () => {
      setIsSpeaking(false);
      setProgress(100);
      callbackRefs.current.onEnd?.();
    };

    utterance.onboundary = (event) => {
      const charIndex = event.charIndex;
      const p = Math.min(100, (charIndex / textLengthRef.current) * 100);
      setProgress(p);
      callbackRefs.current.onBoundary?.(charIndex);
    };

    utterance.onerror = (event) => {
      setIsSpeaking(false);
      callbackRefs.current.onError?.(`Speech error: ${event.error}`);
    };

    speechSynthesis.speak(utterance);
  }, [selectedVoice]);

  const cancel = useCallback(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      speechSynthesis.cancel();
      setIsSpeaking(false);
      setProgress(0);
    }
  }, []);

  const pause = useCallback(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      speechSynthesis.pause();
    }
  }, []);

  const resume = useCallback(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      speechSynthesis.resume();
    }
  }, []);

  return {
    speak,
    cancel,
    pause,
    resume,
    isSpeaking,
    voices,
    selectedVoice,
    setSelectedVoice,
    progress,
    isSupported: typeof window !== 'undefined' && 'speechSynthesis' in window,
  };
}
