// ============================================================
// Tool Result Validator
// ============================================================

import { ToolExecutionResult } from '@/types';

interface ToolValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Validates tool execution results before passing them back to Gemini.
 * Checks for: response existence, required fields, API success, data freshness.
 */
export function validateToolResult(
  toolName: string,
  result: ToolExecutionResult,
): ToolValidationResult {
  const errors: string[] = [];

  // Check 1: Tool response exists
  if (!result) {
    return { valid: false, errors: ['Tool returned no response'] };
  }

  // Check 2: API success
  if (!result.success) {
    errors.push(`Tool execution failed: ${result.error || 'Unknown error'}`);
  }

  // Check 3: Data exists
  if (result.success && !result.data) {
    errors.push('Tool returned success but no data');
  }

  // Check 4: Required fields based on tool type
  if (result.success && result.data) {
    const data = result.data as Record<string, unknown>;

    switch (toolName) {
      case 'get_weather':
        if (!data.location) errors.push('Weather data missing location');
        if (!data.temperature) errors.push('Weather data missing temperature');
        if (!data.condition) errors.push('Weather data missing condition');
        break;
      case 'web_search':
        if (!data.results) errors.push('Search results missing');
        break;
      case 'get_time':
        if (!data.datetime && !data.error) errors.push('Time data missing datetime');
        break;
      case 'calculate':
        if (data.result === undefined && !data.error) errors.push('Calculation missing result');
        break;
    }
  }

  // Check 5: Data freshness (within 5 minutes)
  if (result.timestamp) {
    const age = Date.now() - result.timestamp;
    if (age > 5 * 60 * 1000) {
      errors.push('Tool data is stale (older than 5 minutes)');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Returns a user-friendly error message when tool validation fails.
 */
export const TOOL_VALIDATION_FAILURE_MESSAGE =
  'I could not verify the retrieved information. Let me try to answer based on my general knowledge instead.';
