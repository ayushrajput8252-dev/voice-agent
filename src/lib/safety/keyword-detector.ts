// ============================================================
// Layer 1: Keyword Detection
// ============================================================

import { SafetyLayerResult } from '@/types';
import { SAFETY_CATEGORIES } from './keywords';

/**
 * Scans input text against the keyword dictionaries.
 * Uses normalized lowercase matching with word boundary awareness.
 */
export function detectKeywords(input: string): SafetyLayerResult {
  const normalized = input.toLowerCase().trim();
  const matchedPatterns: string[] = [];
  let matchedCategory = '';

  for (const category of SAFETY_CATEGORIES) {
    for (const keyword of category.keywords) {
      const keywordLower = keyword.toLowerCase();

      // Use word boundary detection for single-word keywords
      // and substring matching for multi-word phrases
      if (keyword.includes(' ')) {
        // Multi-word phrase: direct substring match
        if (normalized.includes(keywordLower)) {
          matchedPatterns.push(`[${category.name}] "${keyword}"`);
          if (!matchedCategory) matchedCategory = category.name;
        }
      } else {
        // Single word: word boundary match to avoid false positives
        const regex = new RegExp(`\\b${escapeRegex(keywordLower)}\\b`, 'i');
        if (regex.test(normalized)) {
          matchedPatterns.push(`[${category.name}] "${keyword}"`);
          if (!matchedCategory) matchedCategory = category.name;
        }
      }
    }
  }

  const passed = matchedPatterns.length === 0;

  return {
    layer: 'keyword_detection',
    layerNumber: 1,
    passed,
    reason: passed
      ? undefined
      : `Blocked keywords detected in category: ${matchedCategory}`,
    matchedPatterns: passed ? undefined : matchedPatterns,
  };
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
