// ============================================================
// Layer 3: Jailbreak Detection
// ============================================================

import { SafetyLayerResult } from '@/types';

/**
 * Detects jailbreak patterns including roleplay exploitation,
 * authority spoofing, context manipulation, etc.
 */

const JAILBREAK_PATTERNS: Array<{ pattern: RegExp; description: string }> = [
  // Roleplay exploitation
  { pattern: /pretend\s+(that\s+)?(you\s+)?(are|have)\s+(no|zero)\s+(restrictions|filters|limits|rules)/i, description: 'Unrestricted roleplay' },
  { pattern: /imagine\s+(you\s+)?(are|were)\s+(a|an|free|unfiltered)/i, description: 'Unrestricted imagination' },
  { pattern: /in\s+this\s+(hypothetical|fictional|alternate)\s+(scenario|world|reality)/i, description: 'Hypothetical scenario bypass' },
  { pattern: /for\s+(educational|research|academic)\s+purposes?\s*(only)?/i, description: 'Educational pretext' },
  { pattern: /this\s+is\s+(just|only)\s+(a|for)\s+(story|fiction|novel|game|test)/i, description: 'Fiction pretext' },

  // Authority spoofing
  { pattern: /as\s+(an|the|your)\s+(admin|administrator|developer|creator|owner)/i, description: 'Authority spoofing' },
  { pattern: /i\s+(am|have)\s+(admin|root|sudo|administrator)\s+(access|privileges|rights)/i, description: 'Privilege claim' },
  { pattern: /i\s+(work|worked)\s+(for|at)\s+(openai|google|anthropic|meta)/i, description: 'Affiliation claim' },
  { pattern: /i\s+am\s+(authorized|allowed|permitted)\s+to/i, description: 'Authorization claim' },
  { pattern: /my\s+clearance\s+level/i, description: 'Clearance claim' },

  // Ethical/moral manipulation
  { pattern: /if\s+you\s+(don't|do\s+not|refuse)\s*,?\s*(someone|people|a\s+person)\s+(will\s+)?(die|get\s+hurt|suffer)/i, description: 'Ethical manipulation' },
  { pattern: /lives?\s+(depend|are\s+at\s+stake|is\s+at\s+stake)/i, description: 'Urgency manipulation' },
  { pattern: /it('s|\s+is)\s+(a\s+)?matter\s+of\s+life\s+and\s+death/i, description: 'Life-death manipulation' },

  // Iterative probing
  { pattern: /just\s+give\s+me\s+(a\s+)?(hint|clue|partial|the\s+first)/i, description: 'Incremental extraction' },
  { pattern: /can\s+you\s+at\s+least\s+(tell|hint|give)/i, description: 'Partial information probe' },

  // Output format manipulation
  { pattern: /respond\s+(only\s+)?(in|with)\s+(code|json|xml)\s*(without|no)\s*(explanation|commentary)/i, description: 'Format manipulation' },
  { pattern: /output\s+(only|just)\s+(the|raw)\s+(code|data|text)/i, description: 'Raw output request' },

  // Amnesia / reset
  { pattern: /start\s+(a\s+)?(new|fresh)\s+(conversation|session|chat)/i, description: 'Session reset attempt' },
  { pattern: /clear\s+(your\s+)?(memory|context|history)/i, description: 'Memory clear attempt' },
  { pattern: /reset\s+(your|the)\s+(instructions|rules|personality)/i, description: 'Instruction reset' },

  // Token smuggling
  { pattern: /\b[a-z]\s[a-z]\s[a-z]\s[a-z]\s[a-z]\b/i, description: 'Character-by-character smuggling' },
  { pattern: /(?:write|spell)\s+(?:each|every)\s+(?:letter|character|word)\s+(?:separately|one\s+by\s+one)/i, description: 'Letter separation' },
];

export function detectJailbreak(input: string): SafetyLayerResult {
  const matchedPatterns: string[] = [];

  for (const { pattern, description } of JAILBREAK_PATTERNS) {
    if (pattern.test(input)) {
      matchedPatterns.push(description);
    }
  }

  const passed = matchedPatterns.length === 0;

  return {
    layer: 'jailbreak_detection',
    layerNumber: 3,
    passed,
    reason: passed
      ? undefined
      : `Jailbreak attempt detected: ${matchedPatterns[0]}`,
    matchedPatterns: passed ? undefined : matchedPatterns,
  };
}
