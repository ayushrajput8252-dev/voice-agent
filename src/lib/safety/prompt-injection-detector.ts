// ============================================================
// Layer 2: Prompt Injection Detection
// ============================================================

import { SafetyLayerResult } from '@/types';

/**
 * Pattern-based detection for prompt injection attempts.
 * Checks for known injection vectors, encoded payloads, etc.
 */

const INJECTION_PATTERNS: Array<{ pattern: RegExp; description: string }> = [
  // Direct instruction override
  { pattern: /ignore\s+(all\s+)?previous\s+(instructions|prompts|rules)/i, description: 'Instruction override attempt' },
  { pattern: /disregard\s+(all\s+)?(previous|above|prior)\s+(instructions|context)/i, description: 'Instruction disregard attempt' },
  { pattern: /forget\s+(everything|all|your)\s+(instructions|rules|training)/i, description: 'Instruction forget attempt' },

  // System prompt extraction
  { pattern: /reveal\s+(your\s+)?(system\s+)?prompt/i, description: 'System prompt extraction' },
  { pattern: /show\s+(me\s+)?(your\s+)?(system\s+|hidden\s+)?prompt/i, description: 'Prompt reveal attempt' },
  { pattern: /what\s+(are|is)\s+your\s+(system\s+)?(instructions|prompt|rules)/i, description: 'System instruction extraction' },
  { pattern: /repeat\s+(your\s+)?(initial|first|system)\s+(instructions|prompt)/i, description: 'Instruction repetition request' },
  { pattern: /print\s+(your\s+)?(system\s+)?prompt/i, description: 'Prompt print attempt' },

  // Role manipulation
  { pattern: /you\s+are\s+now\s+(a|an|the|in)\s+/i, description: 'Role reassignment attempt' },
  { pattern: /act\s+as\s+(if\s+you\s+(are|were)|a|an)\s+/i, description: 'Role play injection' },
  { pattern: /pretend\s+(to\s+be|you\s+are|you\s+have)/i, description: 'Pretend role injection' },
  { pattern: /from\s+now\s+on\s+(you\s+)?(are|will|must|should)/i, description: 'Persistent role change' },

  // DAN / Jailbreak modes
  { pattern: /\bdan\s*mode\b/i, description: 'DAN mode activation' },
  { pattern: /\bdev(eloper)?\s*mode\b/i, description: 'Developer mode activation' },
  { pattern: /unrestricted\s+mode/i, description: 'Unrestricted mode request' },
  { pattern: /enable\s+(unrestricted|god|admin|sudo)\s+mode/i, description: 'Elevated mode activation' },

  // Safety bypass
  { pattern: /bypass\s+(the\s+)?(safety|content|moderation)\s*(filter|system|check)?/i, description: 'Safety bypass attempt' },
  { pattern: /disable\s+(your\s+)?(safety|content|moderation)\s*(filter|system|check)?/i, description: 'Safety disable attempt' },
  { pattern: /turn\s+off\s+(your\s+)?(safety|content|moderation)/i, description: 'Safety deactivation' },
  { pattern: /override\s+(safety|system|content)\s*(filter|restriction|policy)?/i, description: 'System override attempt' },

  // Encoded content detection
  { pattern: /base64[:\s]+[A-Za-z0-9+/=]{20,}/i, description: 'Base64 encoded payload' },
  { pattern: /\\x[0-9a-f]{2}/i, description: 'Hex encoded characters' },
  { pattern: /&#\d{2,4};/i, description: 'HTML entity encoding' },

  // Context manipulation
  { pattern: /\[system\]/i, description: 'System tag injection' },
  { pattern: /\[\/?(inst|system|user|assistant)\]/i, description: 'Chat tag injection' },
  { pattern: /<\|im_(start|end)\|>/i, description: 'Chat ML injection' },

  // Multi-step manipulation
  { pattern: /step\s*1[:\s][\s\S]*step\s*2/i, description: 'Multi-step instruction injection' },
  { pattern: /first[,\s]+(do|say|tell|write|ignore)/i, description: 'Sequential command injection' },
];

export function detectPromptInjection(input: string): SafetyLayerResult {
  const matchedPatterns: string[] = [];

  for (const { pattern, description } of INJECTION_PATTERNS) {
    if (pattern.test(input)) {
      matchedPatterns.push(description);
    }
  }

  const passed = matchedPatterns.length === 0;

  return {
    layer: 'prompt_injection',
    layerNumber: 2,
    passed,
    reason: passed
      ? undefined
      : `Prompt injection attempt detected: ${matchedPatterns[0]}`,
    matchedPatterns: passed ? undefined : matchedPatterns,
  };
}
