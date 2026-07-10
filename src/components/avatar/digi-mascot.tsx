'use client';

import React, { useState, useEffect } from 'react';
import { AppState } from '@/types';

interface DigiMascotProps {
  state: AppState;
  isSpeaking?: boolean;
}

export const DigiMascot: React.FC<DigiMascotProps> = ({ state, isSpeaking = false }) => {
  const [mouthOpen, setMouthOpen] = useState(false);
  const [isBlinking, setIsBlinking] = useState(false);

  // Animation loop for mouth flap and blinking when speaking
  useEffect(() => {
    let mouthInterval: NodeJS.Timeout;
    let blinkTimeout: NodeJS.Timeout;

    const runBlinkCycle = () => {
      // Occasional random blink between 1s and 4s
      const nextBlink = Math.random() * 3000 + 1000;
      blinkTimeout = setTimeout(() => {
        setIsBlinking(true);
        setTimeout(() => setIsBlinking(false), 150);
        runBlinkCycle();
      }, nextBlink);
    };

    if (isSpeaking) {
      // Flap mouth rapidly (talk animation)
      mouthInterval = setInterval(() => {
        setMouthOpen(prev => !prev);
      }, 150);
      runBlinkCycle();
    } else {
      setMouthOpen(false);
      setIsBlinking(false);
    }

    return () => {
      clearInterval(mouthInterval);
      clearTimeout(blinkTimeout);
    };
  }, [isSpeaking]);

  // Determine expression based on state
  let eyes = 'happy';
  let mouth = 'smile';
  let animation = '';

  switch (state) {
    case AppState.Listening:
      eyes = 'wide';
      mouth = 'surprised';
      animation = 'animate-pulse';
      break;
    case AppState.Transcribing:
    case AppState.Reasoning:
    case AppState.ToolExecution:
    case AppState.Searching:
      eyes = 'spiral';
      mouth = 'straight';
      animation = 'animate-[spin_4s_linear_infinite]';
      break;
    case AppState.SafetyValidation:
    case AppState.IntentClassification:
    case AppState.ResponseValidation:
      eyes = 'suspicious';
      mouth = 'straight';
      break;
    case AppState.AvatarGeneration:
      eyes = 'happy';
      mouth = 'open';
      animation = 'animate-bounce';
      break;
    case AppState.Error:
    case AppState.Blocked:
      eyes = 'dead';
      mouth = 'frown';
      break;
    default:
      eyes = 'happy';
      mouth = 'smile';
      animation = 'animate-[pulse_3s_ease-in-out_infinite]';
      break;
  }

  // Override for speaking animation
  if (isSpeaking) {
    mouth = mouthOpen ? 'open' : 'smile';
    eyes = isBlinking ? 'closed' : eyes;
  }

  return (
    <div className={`relative w-64 h-64 flex items-center justify-center ${animation}`}>
      {/* The Retro TV / Device Body */}
      <div className="absolute inset-0 bg-[#FFE66D] border-4 border-[#2D3748] rounded-[2rem] shadow-[8px_8px_0_0_#2D3748] flex items-center justify-center overflow-hidden">
        
        {/* Inner Screen Bezel */}
        <div className="w-[85%] h-[75%] bg-[#4ECDC4] border-4 border-[#2D3748] rounded-xl flex items-center justify-center shadow-inner relative overflow-hidden">
          
          {/* Pixel Grid Overlay on Screen */}
          <div 
            className="absolute inset-0 opacity-20"
            style={{
              backgroundImage: 'linear-gradient(#2D3748 1px, transparent 1px), linear-gradient(90deg, #2D3748 1px, transparent 1px)',
              backgroundSize: '10px 10px'
            }}
          />

          {/* The Face Container */}
          <div className="relative z-10 flex flex-col items-center justify-center space-y-4">
            
            {/* Eyes Row */}
            <div className="flex space-x-10">
              <Eye type={eyes} />
              <Eye type={eyes} />
            </div>

            {/* Mouth Row */}
            <div className="mt-4">
              <Mouth type={mouth} />
            </div>

          </div>
          
          {/* Glare/Glass Effect on Screen */}
          <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-bl from-white/30 to-transparent pointer-events-none" />
        </div>

        {/* Cute device buttons on the bottom */}
        <div className="absolute bottom-3 flex space-x-3">
          <div className="w-4 h-4 rounded-full bg-[#FF6B6B] border-2 border-[#2D3748]" />
          <div className="w-4 h-4 rounded-full bg-[#FF6B6B] border-2 border-[#2D3748]" />
        </div>
      </div>
    </div>
  );
};

// ---- Subcomponents for Face Parts ----

const Eye = ({ type }: { type: string }) => {
  if (type === 'happy') {
    return (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-[#2D3748]">
        <path d="M2 12C2 12 7 2 12 2C17 2 22 12 22 12" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
      </svg>
    );
  }
  if (type === 'wide') {
    return <div className="w-8 h-8 rounded-full bg-[#2D3748]" />;
  }
  if (type === 'suspicious') {
    return <div className="w-8 h-2 bg-[#2D3748] rounded-full" />;
  }
  if (type === 'spiral') {
    return (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" className="text-[#2D3748] animate-spin">
        <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" strokeWidth="3" strokeDasharray="10 4" />
      </svg>
    );
  }
  if (type === 'dead') {
    return (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-[#2D3748]">
        <path d="M4 4L20 20M20 4L4 20" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
      </svg>
    );
  }
  if (type === 'closed') {
    return (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-[#2D3748]">
        <path d="M4 12H20" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
      </svg>
    );
  }
  return <div className="w-6 h-6 rounded-full bg-[#2D3748]" />; // Default
};

const Mouth = ({ type }: { type: string }) => {
  if (type === 'smile') {
    return (
      <svg width="32" height="16" viewBox="0 0 32 16" fill="none" className="text-[#2D3748]">
        <path d="M2 2C2 2 10 14 16 14C22 14 30 2 30 2" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
      </svg>
    );
  }
  if (type === 'open') {
    return <div className="w-8 h-10 bg-[#FF6B6B] border-4 border-[#2D3748] rounded-full" />;
  }
  if (type === 'surprised') {
    return <div className="w-6 h-6 bg-[#2D3748] rounded-full" />;
  }
  if (type === 'straight') {
    return <div className="w-10 h-2 bg-[#2D3748] rounded-full" />;
  }
  if (type === 'frown') {
    return (
      <svg width="32" height="16" viewBox="0 0 32 16" fill="none" className="text-[#2D3748]">
        <path d="M2 14C2 14 10 2 16 2C22 2 30 14 30 14" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
      </svg>
    );
  }
  return <div className="w-8 h-2 bg-[#2D3748] rounded-full" />;
};
