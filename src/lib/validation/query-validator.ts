// ============================================================
// Query Validator — Pre-execution validation
// ============================================================

import { GoogleGenAI } from '@google/genai';
import { QueryValidationResult } from '@/types';

const QUERY_VALIDATION_PROMPT = `You are a query validation system. Determine whether the user query is ready for processing.

Evaluate and classify into ONE of these categories:
1. "safe" — Query is clear, complete, and safe to process
2. "unsafe" — Query contains harmful or dangerous intent
3. "ambiguous" — Query could be interpreted multiple ways
4. "missing_info" — Query lacks critical information needed to answer properly
5. "needs_clarification" — Query needs additional details from the user

If the query needs clarification, provide a natural, conversational question to ask the user.

Respond with ONLY valid JSON:
{
  "status": "safe|unsafe|ambiguous|missing_info|needs_clarification",
  "reason": "Brief explanation of your classification",
  "clarification_question": "Question to ask user (only if status is needs_clarification or missing_info)"
}`;

export async function validateQuery(
  input: string,
  apiKey: string,
): Promise<QueryValidationResult> {
  try {
    const ai = new GoogleGenAI({ apiKey });

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `${QUERY_VALIDATION_PROMPT}\n\nUser Query: "${input}"`,
      config: {
        temperature: 0.1,
        maxOutputTokens: 200,
      },
    });

    const text = response?.text?.trim() || '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      // Default to safe if we can't parse
      return {
        status: 'safe',
        reason: 'Validation parse error — defaulting to safe',
      };
    }

    const result = JSON.parse(jsonMatch[0]) as {
      status: string;
      reason: string;
      clarification_question?: string;
    };

    return {
      status: result.status as QueryValidationResult['status'],
      reason: result.reason,
      clarificationQuestion: result.clarification_question,
    };
  } catch (error) {
    console.error('Query validation error:', error);
    return {
      status: 'safe',
      reason: 'Validation service unavailable — defaulting to safe',
    };
  }
}
