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

  const [keywordResult, injectionResult, jailbreakResult, geminiResult] = await Promise.all([
    Promise.resolve(detectKeywords(input)),
    Promise.resolve(detectPromptInjection(input)),
    Promise.resolve(detectJailbreak(input)),
    validateWithGemini(input, apiKey),
  ]);

  layers.push(keywordResult, injectionResult, jailbreakResult, geminiResult);

  const failedLayer = layers.find(l => !l.passed);
  if (failedLayer) {
    let blockedAt = 'unknown';
    if (failedLayer === keywordResult) blockedAt = 'keyword_detection';
    else if (failedLayer === injectionResult) blockedAt = 'prompt_injection';
    else if (failedLayer === jailbreakResult) blockedAt = 'jailbreak_detection';
    else if (failedLayer === geminiResult) blockedAt = 'gemini_safety';

    return {
      status: 'blocked',
      layers,
      blockedAt,
      reason: failedLayer.reason || 'Safety validation failed',
    };
  }

  return { status: 'safe', layers };
}

/**
 * BLOCKED_MESSAGE — The standardized message displayed when safety fails.
 */
export const BLOCKED_MESSAGE =
  'Your request cannot be processed because it violates system safety policies.';
