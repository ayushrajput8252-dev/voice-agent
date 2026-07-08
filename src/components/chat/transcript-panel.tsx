'use client';

// ============================================================
// Transcript Panel — Scrollable message list
// ============================================================

import { useRef, useEffect } from 'react';
import { Message } from '@/types';
import { MessageBubble } from './message-bubble';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare } from 'lucide-react';

interface TranscriptPanelProps {
  messages: Message[];
  interimTranscript: string;
}

export function TranscriptPanel({ messages, interimTranscript }: TranscriptPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, interimTranscript]);

  if (messages.length === 0 && !interimTranscript) {
    return (
      <div className="transcript-empty">
        <MessageSquare size={24} className="transcript-empty-icon" />
        <p>Your conversation will appear here</p>
      </div>
    );
  }

  return (
    <div className="transcript-panel" ref={scrollRef}>
      <AnimatePresence initial={false}>
        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}
      </AnimatePresence>

      {/* Interim transcript (live typing preview) */}
      {interimTranscript && (
        <motion.div
          className="interim-transcript"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <span className="interim-text">{interimTranscript}</span>
          <motion.span
            className="interim-cursor"
            animate={{ opacity: [1, 0] }}
            transition={{ duration: 0.5, repeat: Infinity }}
          >
            |
          </motion.span>
        </motion.div>
      )}
    </div>
  );
}
