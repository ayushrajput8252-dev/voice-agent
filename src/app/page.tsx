'use client';

// ============================================================
// Main Application Page — Voice AI Assistant
// ============================================================

import { useState, useCallback, useEffect, useRef } from 'react';
import { AppState, Message, SafetyInfo } from '@/types';
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

  // ---- Hooks ----
  const pipeline = usePipelineState();
  const audioAnalyzer = useAudioAnalyzer();

  // Accumulate final transcripts across the session
  const accumulatedTranscript = useRef('');

  const speechSynthesis = useSpeechSynthesis({
    onStart: () => pipeline.transitionTo(AppState.Speaking),
    onEnd: () => {
      pipeline.transitionTo(AppState.Complete);
      setTimeout(() => pipeline.transitionTo(AppState.Idle), 2000);
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
                  // Clarification is handled via content
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
    [pipeline, speechSynthesis],
  );

  // ---- Send Message ----
  const handleSendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || isProcessing) return;
      setIsProcessing(true);

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
    [isProcessing, messages, pipeline, processStream],
  );

  // ---- Toggle Listening ----
  const handleToggleListening = useCallback(() => {
    if (isProcessing) return;

    if (speechRecognition.isListening) {
      speechRecognition.stopListening();
    } else {
      // Cancel any ongoing speech
      speechSynthesis.cancel();
      // Reset accumulated transcript
      accumulatedTranscript.current = '';
      pipeline.transitionTo(AppState.Listening);
      speechRecognition.startListening();
      audioAnalyzer.start();
    }
  }, [isProcessing, speechRecognition, speechSynthesis, pipeline, audioAnalyzer]);

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
