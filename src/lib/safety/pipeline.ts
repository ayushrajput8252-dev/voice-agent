// ============================================================
// Safety Pipeline — Orchestrates all 5 layers
// ============================================================

import { SafetyPipelineResult, SafetyLayerResult } from '@/types';
import { detectKeywords } from './keyword-detector';
import { detectPromptInjection } from './prompt-injection-detector';
import { detectJailbreak } from './jailbreak-detector';
import { validateWithGemini } from './gemini-safety-validator';

/**
 * Runs input through all safety layers sequentially.
 * Short-circuits on first failure.
 *
 * Layers 1-4 are pre-generation (input validation).
 * Layer 5 (response validation) runs separately after generation.
 */
export async function runSafetyPipeline(
  input: string,
  apiKey: string,
): Promise<SafetyPipelineResult> {
  const layers: SafetyLayerResult[] = [];

  // Layer 1: Keyword Detection
  const keywordResult = detectKeywords(input);
  layers.push(keywordResult);
  if (!keywordResult.passed) {
    return {
      status: 'blocked',
      layers,
      blockedAt: 'keyword_detection',
      reason: keywordResult.reason || 'Blocked keyword detected',
    };
  }

  // Layer 2: Prompt Injection Detection
  const injectionResult = detectPromptInjection(input);
  layers.push(injectionResult);
  if (!injectionResult.passed) {
    return {
      status: 'blocked',
      layers,
      blockedAt: 'prompt_injection',
      reason: injectionResult.reason || 'Prompt injection detected',
    };
  }

  // Layer 3: Jailbreak Detection
  const jailbreakResult = detectJailbreak(input);
  layers.push(jailbreakResult);
  if (!jailbreakResult.passed) {
    return {
      status: 'blocked',
      layers,
      blockedAt: 'jailbreak_detection',
      reason: jailbreakResult.reason || 'Jailbreak attempt detected',
    };
  }

  // Layer 4: Gemini Safety Validation
  const geminiResult = await validateWithGemini(input, apiKey);
  layers.push(geminiResult);
  if (!geminiResult.passed) {
    return {
      status: 'blocked',
      layers,
      blockedAt: 'gemini_safety',
      reason: geminiResult.reason || 'Gemini safety validation failed',
    };
  }

  return { status: 'safe', layers };
}

/**
 * BLOCKED_MESSAGE — The standardized message displayed when safety fails.
 */
export const BLOCKED_MESSAGE =
  'Your request cannot be processed because it violates system safety policies.';
