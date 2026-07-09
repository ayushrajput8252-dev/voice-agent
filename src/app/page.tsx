'use client';

// ============================================================
// Main Application Page — Voice AI Assistant with D-ID Avatar
// ============================================================

import { useState, useCallback, useEffect, useRef } from 'react';
import { AppState, Message, SafetyInfo, AvatarStatus } from '@/types';
import { usePipelineState } from '@/hooks/use-pipeline-state';
import { useSpeechRecognition } from '@/hooks/use-speech-recognition';
import { useSpeechSynthesis } from '@/hooks/use-speech-synthesis';
import { useAudioAnalyzer } from '@/hooks/use-audio-analyzer';
import { AvatarOrb } from '@/components/avatar/avatar-orb';
import { VoiceButton } from '@/components/chat/voice-button';
import { TranscriptPanel } from '@/components/chat/transcript-panel';
import { PipelineBar } from '@/components/transparency/pipeline-bar';
import { MetadataFooter } from '@/components/transparency/metadata-footer';
import { config } from '@/lib/config';
import { AlertTriangle } from 'lucide-react';

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export default function Home() {
  // ---- State ----
  const [messages, setMessages] = useState<Message[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastMetadata, setLastMetadata] = useState<{
    model?: string;
    latencyMs?: number;
    toolsUsed?: string[];
    safety?: SafetyInfo;
  }>({});

  // ---- Avatar State ----
  const [avatarVideoUrl, setAvatarVideoUrl] = useState<string | undefined>();
  const [avatarStatus, setAvatarStatus] = useState<AvatarStatus>('idle');
  const avatarPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const currentAvatarMsgIdRef = useRef<string | null>(null);

  // ---- Hooks ----
  const pipeline = usePipelineState();
  const audioAnalyzer = useAudioAnalyzer();

  // Accumulate final transcripts across the session
  const accumulatedTranscript = useRef('');

  const speechSynthesis = useSpeechSynthesis({
    onStart: () => pipeline.transitionTo(AppState.Speaking),
    onEnd: () => {
      pipeline.transitionTo(AppState.Complete);
      // Don't auto-reset to idle if avatar is still generating
      if (avatarStatus !== 'generating') {
        setTimeout(() => pipeline.transitionTo(AppState.Idle), 2000);
      }
    },
  });

  const speechRecognition = useSpeechRecognition({
    silenceTimeout: config.voice.silenceTimeout,
    onResult: (transcript: string) => {
      accumulatedTranscript.current += transcript;
    },
    onEnd: () => {
      const finalTranscript = accumulatedTranscript.current.trim();
      if (finalTranscript) {
        pipeline.transitionTo(AppState.Transcribing);
        handleSendMessage(finalTranscript);
      } else {
        pipeline.transitionTo(AppState.Idle);
      }
      audioAnalyzer.stop();
    },
    onError: (error: string) => {
      console.error('Speech recognition error:', error);
      pipeline.transitionTo(AppState.Error);
      audioAnalyzer.stop();
      setTimeout(() => pipeline.transitionTo(AppState.Idle), 3000);
    },
  });

  // ---- Avatar Polling ----
  const stopAvatarPolling = useCallback(() => {
    if (avatarPollRef.current) {
      clearInterval(avatarPollRef.current);
      avatarPollRef.current = null;
    }
  }, []);

  const startAvatarPolling = useCallback(
    (talkId: string, msgId: string) => {
      stopAvatarPolling();
      currentAvatarMsgIdRef.current = msgId;

      let pollCount = 0;
      const maxPolls = 45; // 45 * 2s = 90s max

      avatarPollRef.current = setInterval(async () => {
        pollCount++;

        if (pollCount > maxPolls) {
          stopAvatarPolling();
          setAvatarStatus('error');
          setMessages((prev) =>
            prev.map((m) =>
              m.id === msgId ? { ...m, avatarStatus: 'error' } : m,
            ),
          );
          return;
        }

        try {
          const response = await fetch(`/api/avatar?talkId=${encodeURIComponent(talkId)}`);
          const data = await response.json();

          if (data.status === 'done' && data.videoUrl) {
            stopAvatarPolling();
            setAvatarVideoUrl(data.videoUrl);
            setAvatarStatus('ready');
            pipeline.transitionTo(AppState.AvatarGeneration, 'Avatar Ready');
            setMessages((prev) =>
              prev.map((m) =>
                m.id === msgId
                  ? { ...m, avatarVideoUrl: data.videoUrl, avatarStatus: 'ready' }
                  : m,
              ),
            );
          } else if (data.status === 'error') {
            stopAvatarPolling();
            setAvatarStatus('error');
            setMessages((prev) =>
              prev.map((m) =>
                m.id === msgId ? { ...m, avatarStatus: 'error' } : m,
              ),
            );
          }
          // else: still processing, keep polling
        } catch (error) {
          console.error('Avatar poll error:', error);
          // Don't stop polling on transient network errors
        }
      }, 2000);
    },
    [stopAvatarPolling, pipeline],
  );

  // Cleanup polling on unmount
  useEffect(() => {
    return () => stopAvatarPolling();
  }, [stopAvatarPolling]);

  // ---- Handle avatar video end ----
  const handleVideoEnd = useCallback(() => {
    setAvatarVideoUrl(undefined);
    setAvatarStatus('idle');
    pipeline.transitionTo(AppState.Idle);
  }, [pipeline]);

  // ---- Process SSE Stream ----
  const processStream = useCallback(
    async (response: Response, assistantMsgId: string) => {
      const reader = response.body?.getReader();
      if (!reader) return;

      const decoder = new TextDecoder();
      let buffer = '';

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;

            try {
              const event = JSON.parse(line.slice(6));
              const { type, data } = event;

              switch (type) {
                case 'state_change': {
                  const stateKey = data.state as AppState;
                  if (Object.values(AppState).includes(stateKey)) {
                    pipeline.transitionTo(stateKey, data.label);
                  }
                  break;
                }
                case 'content': {
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === assistantMsgId
                        ? { ...m, content: data.accumulated, isStreaming: true }
                        : m,
                    ),
                  );
                  break;
                }
                case 'tool_call': {
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === assistantMsgId
                        ? {
                            ...m,
                            toolCalls: [
                              ...(m.toolCalls || []),
                              {
                                id: generateId(),
                                name: data.toolName,
                                args: data.args,
                                validated: false,
                              },
                            ],
                          }
                        : m,
                    ),
                  );
                  break;
                }
                case 'tool_result': {
                  setMessages((prev) =>
                    prev.map((m) => {
                      if (m.id !== assistantMsgId) return m;
                      const toolCalls = (m.toolCalls || []).map((tc) =>
                        tc.name === data.toolName && !tc.result
                          ? {
                              ...tc,
                              result: data.result,
                              validated: data.validated,
                              executionTimeMs: data.executionTimeMs,
                            }
                          : tc,
                      );
                      return { ...m, toolCalls };
                    }),
                  );
                  break;
                }
                case 'metadata': {
                  setLastMetadata(data);
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === assistantMsgId ? { ...m, metadata: data } : m,
                    ),
                  );
                  break;
                }
                case 'clarification': {
                  break;
                }
                case 'error': {
                  pipeline.transitionTo(AppState.Error, 'Error');
                  break;
                }
                case 'complete': {
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === assistantMsgId
                        ? {
                            ...m,
                            content: data.fullResponse || m.content,
                            isStreaming: false,
                            metadata: data.metadata || m.metadata,
                          }
                        : m,
                    ),
                  );

                  // Speak the response
                  if (data.fullResponse) {
                    pipeline.transitionTo(AppState.AudioGeneration, 'Generating Audio');
                    setTimeout(() => {
                      speechSynthesis.speak(data.fullResponse);
                    }, 300);
                  }
                  break;
                }

                // ---- D-ID Avatar Events ----
                case 'avatar_started': {
                  setAvatarStatus('generating');
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === assistantMsgId
                        ? { ...m, avatarStatus: 'generating', avatarTalkId: data.talkId }
                        : m,
                    ),
                  );
                  // Start polling in case the stream closes before completion
                  startAvatarPolling(data.talkId, assistantMsgId);
                  break;
                }
                case 'avatar_ready': {
                  stopAvatarPolling();
                  setAvatarVideoUrl(data.videoUrl);
                  setAvatarStatus('ready');
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === assistantMsgId
                        ? { ...m, avatarVideoUrl: data.videoUrl, avatarStatus: 'ready' }
                        : m,
                    ),
                  );
                  break;
                }
              }
            } catch {
              // Skip malformed JSON lines
            }
          }
        }
      } catch (error) {
        console.error('Stream processing error:', error);
        pipeline.transitionTo(AppState.Error);
      }
    },
    [pipeline, speechSynthesis, startAvatarPolling, stopAvatarPolling],
  );

  // ---- Send Message ----
  const handleSendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || isProcessing) return;
      setIsProcessing(true);

      // Reset avatar state for new turn
      stopAvatarPolling();
      setAvatarVideoUrl(undefined);
      setAvatarStatus('idle');

      // Add user message
      const userMsg: Message = {
        id: generateId(),
        role: 'user',
        content: text.trim(),
        timestamp: Date.now(),
      };

      // Create assistant placeholder
      const assistantMsgId = generateId();
      const assistantMsg: Message = {
        id: assistantMsgId,
        role: 'assistant',
        content: '',
        timestamp: Date.now(),
        isStreaming: true,
      };

      setMessages((prev) => [...prev, userMsg, assistantMsg]);

      // Build conversation history
      const history = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      try {
        pipeline.transitionTo(AppState.SafetyValidation, 'Safety Check');

        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: text.trim(),
            conversationHistory: history,
          }),
        });

        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }

        await processStream(response, assistantMsgId);
      } catch (error) {
        console.error('Error:', error);
        pipeline.transitionTo(AppState.Error, 'Error');

        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMsgId
              ? {
                  ...m,
                  content: 'Sorry, something went wrong. Please try again.',
                  isStreaming: false,
                }
              : m,
          ),
        );

        setTimeout(() => pipeline.transitionTo(AppState.Idle), 3000);
      } finally {
        setIsProcessing(false);
      }
    },
    [isProcessing, messages, pipeline, processStream, stopAvatarPolling],
  );

  // ---- Toggle Listening ----
  const handleToggleListening = useCallback(() => {
    if (isProcessing) return;

    if (speechRecognition.isListening) {
      speechRecognition.stopListening();
    } else {
      // Cancel any ongoing speech & avatar
      speechSynthesis.cancel();
      stopAvatarPolling();
      setAvatarVideoUrl(undefined);
      setAvatarStatus('idle');
      // Reset accumulated transcript
      accumulatedTranscript.current = '';
      pipeline.transitionTo(AppState.Listening);
      speechRecognition.startListening();
      audioAnalyzer.start();
    }
  }, [isProcessing, speechRecognition, speechSynthesis, pipeline, audioAnalyzer, stopAvatarPolling]);

  // ---- Keyboard Shortcut (Space) ----
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.code === 'Space' &&
        !e.repeat &&
        document.activeElement?.tagName !== 'INPUT' &&
        document.activeElement?.tagName !== 'TEXTAREA'
      ) {
        e.preventDefault();
        handleToggleListening();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleToggleListening]);

  // ---- Browser support check ----
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const showBrowserWarning =
    mounted && !speechRecognition.isSupported;

  return (
    <div className="app-container">
      {/* Browser Warning */}
      {showBrowserWarning && (
        <div className="browser-warning">
          <AlertTriangle size={14} />
          <span>
            Speech recognition is not supported in this browser. Please use Chrome or Edge for the full experience.
          </span>
        </div>
      )}

      {/* Pipeline Progress Bar */}
      <PipelineBar
        currentState={pipeline.currentState}
        latencyMs={lastMetadata.latencyMs}
        model={lastMetadata.model}
      />

      {/* Avatar Section (50-55% of viewport) */}
      <div className="avatar-section">
        <AvatarOrb
          state={pipeline.currentState}
          volume={audioAnalyzer.volume}
          frequencyData={audioAnalyzer.frequencyData}
          isSpeaking={speechSynthesis.isSpeaking}
          avatarVideoUrl={avatarVideoUrl}
          avatarStatus={avatarStatus}
          onVideoEnd={handleVideoEnd}
        />
      </div>

      {/* Voice Button */}
      <div className="voice-button-section">
        <VoiceButton
          isListening={speechRecognition.isListening}
          isProcessing={isProcessing}
          isSupported={speechRecognition.isSupported}
          state={pipeline.currentState}
          onClick={handleToggleListening}
        />
      </div>

      {/* Transcript Panel */}
      <div className="transcript-section">
        <TranscriptPanel
          messages={messages}
          interimTranscript={speechRecognition.interimTranscript}
        />
      </div>

      {/* Metadata Footer */}
      <MetadataFooter
        model={lastMetadata.model}
        latencyMs={lastMetadata.latencyMs}
        toolsUsed={lastMetadata.toolsUsed}
        safety={lastMetadata.safety}
      />
    </div>
  );
}
