'use client';

// ============================================================
// Speech Recognition Hook — Web Speech API (STT)
// ============================================================

import { useState, useCallback, useRef, useEffect } from 'react';

interface UseSpeechRecognitionOptions {
  onResult?: (transcript: string) => void;
  onInterim?: (transcript: string) => void;
  onEnd?: () => void;
  onError?: (error: string) => void;
  silenceTimeout?: number;
  language?: string;
}

interface SpeechRecognitionState {
  isListening: boolean;
  transcript: string;
  interimTranscript: string;
  isSupported: boolean;
  error: string | null;
}

// Type declarations for Web Speech API
interface SpeechRecognitionEvent {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent {
  error: string;
  message?: string;
}

interface SpeechRecognitionInstance {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognitionInstance;
    webkitSpeechRecognition: new () => SpeechRecognitionInstance;
  }
}

export function useSpeechRecognition(options: UseSpeechRecognitionOptions = {}) {
  const {
    onResult,
    onInterim,
    onEnd,
    onError,
    silenceTimeout = 2000,
    language = 'en-US',
  } = options;

  const [state, setState] = useState<SpeechRecognitionState>({
    isListening: false,
    transcript: '',
    interimTranscript: '',
    isSupported: false,
    error: null,
  });

  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const callbackRefs = useRef({ onResult, onInterim, onEnd, onError });

  // Keep callback refs up to date
  useEffect(() => {
    callbackRefs.current = { onResult, onInterim, onEnd, onError };
  }, [onResult, onInterim, onEnd, onError]);

  // Check browser support
  useEffect(() => {
    const isSupported =
      typeof window !== 'undefined' &&
      ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

    setState((prev) => ({ ...prev, isSupported }));
  }, []);

  const clearSilenceTimer = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
  }, []);

  const startSilenceTimer = useCallback(() => {
    clearSilenceTimer();
    silenceTimerRef.current = setTimeout(() => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    }, silenceTimeout);
  }, [silenceTimeout, clearSilenceTimer]);

  const startListening = useCallback(() => {
    if (!state.isSupported) {
      setState((prev) => ({ ...prev, error: 'Speech recognition is not supported in this browser' }));
      callbackRefs.current.onError?.('Speech recognition is not supported in this browser. Please use Chrome or Edge.');
      return;
    }

    // Create new recognition instance
    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognitionAPI();

    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = language;

    recognition.onstart = () => {
      setState((prev) => ({
        ...prev,
        isListening: true,
        transcript: '',
        interimTranscript: '',
        error: null,
      }));
      startSilenceTimer();
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finalTranscript = '';
      let interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript;
        } else {
          interimTranscript += result[0].transcript;
        }
      }

      if (finalTranscript) {
        setState((prev) => ({ ...prev, transcript: prev.transcript + finalTranscript }));
        callbackRefs.current.onResult?.(finalTranscript);
        // Reset silence timer on new speech
        startSilenceTimer();
      }

      if (interimTranscript) {
        setState((prev) => ({ ...prev, interimTranscript }));
        callbackRefs.current.onInterim?.(interimTranscript);
        // Reset silence timer on new speech
        startSilenceTimer();
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      const errorMsg = `Speech recognition error: ${event.error}`;
      setState((prev) => ({ ...prev, error: errorMsg, isListening: false }));
      callbackRefs.current.onError?.(errorMsg);
      clearSilenceTimer();
    };

    recognition.onend = () => {
      setState((prev) => ({ ...prev, isListening: false, interimTranscript: '' }));
      callbackRefs.current.onEnd?.();
      clearSilenceTimer();
    };

    recognitionRef.current = recognition;

    try {
      recognition.start();
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to start recognition';
      setState((prev) => ({ ...prev, error: msg }));
      callbackRefs.current.onError?.(msg);
    }
  }, [state.isSupported, language, startSilenceTimer, clearSilenceTimer]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      clearSilenceTimer();
    }
  }, [clearSilenceTimer]);

  const toggleListening = useCallback(() => {
    if (state.isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [state.isListening, startListening, stopListening]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
      clearSilenceTimer();
    };
  }, [clearSilenceTimer]);

  return {
    ...state,
    startListening,
    stopListening,
    toggleListening,
  };
}
