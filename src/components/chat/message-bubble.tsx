'use client';

// ============================================================
// Message Bubble — Individual message display with video support
// ============================================================

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Message } from '@/types';
import { ToolCallCard } from './tool-call-card';
import { User, Sparkles, Shield, ShieldAlert, Video, Loader2 } from 'lucide-react';

interface MessageBubbleProps {
  message: Message;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user';
  const isStreaming = message.isStreaming;
  const [showVideo, setShowVideo] = useState(false);

  return (
    <motion.div
      className={`message-bubble ${isUser ? 'user' : 'assistant'}`}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Avatar */}
      <div className={`message-avatar ${isUser ? 'user-avatar' : 'assistant-avatar'}`}>
        {isUser ? <User size={14} /> : <Sparkles size={14} />}
      </div>

      <div className="message-content-wrapper">
        {/* Role label */}
        <div className="message-role">
          <span>{isUser ? 'You' : 'Nova'}</span>
          <span className="message-time">
            {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>

        {/* Content */}
        <div className="message-text">
          {message.content}
          {isStreaming && (
            <motion.span
              className="typing-cursor"
              animate={{ opacity: [1, 0] }}
              transition={{ duration: 0.5, repeat: Infinity }}
            >
              ▋
            </motion.span>
          )}
        </div>

        {/* Tool calls */}
        {message.toolCalls && message.toolCalls.length > 0 && (
          <div className="message-tools">
            {message.toolCalls.map((tool) => (
              <ToolCallCard key={tool.id} toolCall={tool} />
            ))}
          </div>
        )}

        {/* Avatar video badge / thumbnail */}
        {!isUser && message.avatarStatus && message.avatarStatus !== 'idle' && (
          <div className="message-avatar-section">
            {message.avatarStatus === 'generating' && (
              <div className="message-avatar-badge generating">
                <Loader2 size={12} className="spin" />
                <span>Generating avatar video...</span>
              </div>
            )}
            {message.avatarStatus === 'ready' && message.avatarVideoUrl && (
              <>
                <button
                  className="message-video-thumb"
                  onClick={() => setShowVideo(!showVideo)}
                >
                  <Video size={14} />
                  <span>{showVideo ? 'Hide Video' : 'Watch Avatar Video'}</span>
                </button>
                <AnimatePresence>
                  {showVideo && (
                    <motion.div
                      className="message-video-embed"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <video
                        src={message.avatarVideoUrl}
                        controls
                        autoPlay
                        playsInline
                        className="message-video"
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </>
            )}
            {message.avatarStatus === 'error' && (
              <div className="message-avatar-badge error">
                <span>Avatar generation failed</span>
              </div>
            )}
          </div>
        )}

        {/* Safety badge */}
        {message.metadata?.safety && !isUser && (
          <div className="message-safety-badge">
            {message.metadata.safety.passed ? (
              <>
                <Shield size={12} className="text-emerald-400" />
                <span className="text-emerald-400">
                  Verified ({message.metadata.safety.layersPassed}/{message.metadata.safety.totalLayers} layers)
                </span>
              </>
            ) : (
              <>
                <ShieldAlert size={12} className="text-red-400" />
                <span className="text-red-400">Safety check failed</span>
              </>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}
