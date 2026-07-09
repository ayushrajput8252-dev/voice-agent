// ============================================================
// Gemini Client — Streaming + Function Calling
// ============================================================

import { GoogleGenAI } from '@google/genai';
import { SYSTEM_PROMPT } from './system-prompt';
import { GEMINI_TOOLS, executeTool } from './tools';
import { validateToolResult, TOOL_VALIDATION_FAILURE_MESSAGE } from './tool-validator';

export interface GeminiStreamCallbacks {
  onStateChange: (state: string, label: string) => void;
  onContent: (chunk: string, accumulated: string) => void;
  onToolCall: (toolName: string, args: Record<string, unknown>) => void;
  onToolResult: (toolName: string, result: unknown, validated: boolean, executionTimeMs: number) => void;
  onError: (message: string) => void;
}

export interface GeminiStreamResult {
  fullResponse: string;
  toolsUsed: string[];
  latencyMs: number;
  model: string;
}

export async function streamGeminiResponse(
  userMessage: string,
  conversationHistory: Array<{ role: string; content: string }>,
  apiKey: string,
  callbacks: GeminiStreamCallbacks,
): Promise<GeminiStreamResult> {
  const startTime = Date.now();
  const ai = new GoogleGenAI({ apiKey });
  const toolsUsed: string[] = [];
  let fullResponse = '';
  const model = 'gemini-2.5-flash';

  // Build the conversation contents
  const contents = [
    ...conversationHistory.map((msg) => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }],
    })),
    {
      role: 'user',
      parts: [{ text: userMessage }],
    },
  ];

  try {
    // Step 1: Intent Classification + Tool Selection
    callbacks.onStateChange('intent_classification', 'Classifying Intent');

    // Step 2: Initial Gemini call with tools
    callbacks.onStateChange('reasoning', 'Thinking');

    const response = await ai.models.generateContent({
      model,
      contents,
      config: {
        systemInstruction: SYSTEM_PROMPT,
        // @ts-expect-error: New SDK type mismatch with our custom tool schema
        tools: GEMINI_TOOLS,
        temperature: 0.7,
        maxOutputTokens: 1024,
      },
    });

    // Check for function calls
    const candidate = response.candidates?.[0];
    if (!candidate) {
      throw new Error('No response from Gemini');
    }

    const parts = candidate.content?.parts || [];
    let hasFunctionCall = false;

    for (const part of parts) {
      if (part.functionCall) {
        hasFunctionCall = true;
        const { name, args } = part.functionCall;
        if (!name) continue;

        toolsUsed.push(name);
        callbacks.onStateChange('tool_execution', `Using ${name}`);
        callbacks.onToolCall(name, (args as Record<string, unknown>) || {});

        // Execute the tool
        const toolResult = await executeTool(name, (args as Record<string, string>) || {});

        // Validate tool result
        const validation = validateToolResult(name, toolResult);
        callbacks.onToolResult(name, toolResult.data, validation.valid, toolResult.executionTimeMs);

        if (!validation.valid) {
          callbacks.onError(TOOL_VALIDATION_FAILURE_MESSAGE);
        }
      }
    }

    // Step 3: If function calls were made, send results back to Gemini
    if (hasFunctionCall) {
      callbacks.onStateChange('searching', 'Processing Results');

      // Build function response parts
      const functionResponseParts = [];
      for (const part of parts) {
        if (part.functionCall && part.functionCall.name) {
          const toolResult = await executeTool(
            part.functionCall.name,
            (part.functionCall.args as Record<string, string>) || {},
          );
          functionResponseParts.push({
            functionResponse: {
              name: part.functionCall.name,
              response: toolResult.data || { error: toolResult.error },
            },
          });
        }
      }

      // Second call with tool results
      callbacks.onStateChange('reasoning', 'Formulating Response');

      // @ts-expect-error: Follow-up contents type mismatch with SDK
      const followUpContents = [
        ...contents,
        { role: 'model', parts },
        { role: 'user', parts: functionResponseParts },
      ];

      const followUpResponse = await ai.models.generateContent({
        model,
        contents: followUpContents,
        config: {
          systemInstruction: SYSTEM_PROMPT,
          temperature: 0.7,
          maxOutputTokens: 1024,
        },
      });

      const followUpText = followUpResponse?.text || '';
      fullResponse = followUpText;

      // Stream the response character by character for a natural feel
      callbacks.onStateChange('reasoning', 'Generating Response');
      const words = followUpText.split(' ');
      for (let i = 0; i < words.length; i++) {
        const chunk = (i === 0 ? '' : ' ') + words[i];
        fullResponse = words.slice(0, i + 1).join(' ');
        callbacks.onContent(chunk, fullResponse);
        // Small delay for streaming effect
        await new Promise((r) => setTimeout(r, 30));
      }
    } else {
      // No tool calls — direct response
      callbacks.onStateChange('reasoning', 'Generating Response');

      const text = response?.text || '';
      const words = text.split(' ');
      for (let i = 0; i < words.length; i++) {
        const chunk = (i === 0 ? '' : ' ') + words[i];
        fullResponse = words.slice(0, i + 1).join(' ');
        callbacks.onContent(chunk, fullResponse);
        await new Promise((r) => setTimeout(r, 30));
      }
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error occurred';
    callbacks.onError(errorMsg);
    throw error;
  }

  return {
    fullResponse,
    toolsUsed,
    latencyMs: Date.now() - startTime,
    model,
  };
}
