// ============================================================
// Application Configuration
// ============================================================

export const config = {
  // Gemini
  gemini: {
    model: 'gemini-2.5-flash',
    temperature: 0.7,
    maxOutputTokens: 1024,
  },

  // Voice
  voice: {
    rate: 1.0,
    pitch: 1.0,
    silenceTimeout: 2000, // ms of silence before auto-stop
    preferredVoices: [
      'Google UK English Female',
      'Microsoft Zira',
      'Samantha',
      'Google US English',
    ],
  },

  // Safety
  safety: {
    enableKeywordDetection: true,
    enablePromptInjectionDetection: true,
    enableJailbreakDetection: true,
    enableGeminiSafetyValidation: true,
    enableResponseValidation: true,
  },

  // UI
  ui: {
    avatarSize: 55, // percentage of viewport height
    animationDuration: 0.3,
    streamingDelay: 30, // ms between word chunks
  },

  // Assistant
  assistant: {
    name: 'Nova',
    greeting: "Hi, I'm Nova. How can I help you today?",
  },
} as const;
