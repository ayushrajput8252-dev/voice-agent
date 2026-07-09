// ============================================================
// Main Chat API Route — SSE Streaming Pipeline
// ============================================================

import { NextRequest } from 'next/server';
import { runSafetyPipeline, BLOCKED_MESSAGE } from '@/lib/safety/pipeline';
import { validateQuery } from '@/lib/validation/query-validator';
import { streamGeminiResponse } from '@/lib/gemini/client';
import { validateResponse, responseValidationToLayerResult } from '@/lib/safety/response-validator';
import { ChatRequest, SSEEventType } from '@/types';
import { createTalkVideo, waitForVideoCompletion } from '@/lib/did/did-client';

function createSSEMessage(type: SSEEventType, data: unknown): string {
  return `data: ${JSON.stringify({ type, data, timestamp: Date.now() })}\n\n`;
}

export async function POST(request: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: 'GEMINI_API_KEY or GOOGLE_API_KEY is not configured' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }

  let body: ChatRequest;
  try {
    body = await request.json();
  } catch {
    return new Response(
      JSON.stringify({ error: 'Invalid request body' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    );
  }

  const { message, conversationHistory } = body;

  if (!message || typeof message !== 'string') {
    return new Response(
      JSON.stringify({ error: 'Message is required' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    );
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (type: SSEEventType, data: unknown) => {
        controller.enqueue(encoder.encode(createSSEMessage(type, data)));
      };

      try {
        const pipelineStartTime = Date.now();

        // ============ Step 1: Safety Validation ============
        send('state_change', { state: 'safety_validation', label: 'Safety Check' });

        const safetyResult = await runSafetyPipeline(message, apiKey);

        if (safetyResult.status === 'blocked') {
          send('state_change', { state: 'blocked', label: 'Blocked' });
          send('content', { chunk: BLOCKED_MESSAGE, accumulated: BLOCKED_MESSAGE });
          send('metadata', {
            model: 'gemini-2.5-flash',
            latencyMs: Date.now() - pipelineStartTime,
            toolsUsed: [],
            safety: {
              passed: false,
              layersPassed: safetyResult.layers.filter((l) => l.passed).length,
              totalLayers: 5,
              blockedAt: safetyResult.blockedAt,
              reason: safetyResult.reason,
            },
          });
          send('complete', {
            fullResponse: BLOCKED_MESSAGE,
            metadata: { model: 'gemini-2.5-flash', latencyMs: Date.now() - pipelineStartTime },
          });
          controller.close();
          return;
        }

        // ============ Step 2: Query Validation ============
        send('state_change', { state: 'intent_classification', label: 'Understanding Query' });

        const queryValidation = await validateQuery(message, apiKey);

        if (queryValidation.status === 'needs_clarification' || queryValidation.status === 'missing_info') {
          const question = queryValidation.clarificationQuestion || 'Could you provide more details?';
          send('clarification', { question, reason: queryValidation.reason });
          send('state_change', { state: 'complete', label: 'Awaiting Clarification' });
          send('content', { chunk: question, accumulated: question });
          send('complete', {
            fullResponse: question,
            metadata: {
              model: 'gemini-2.5-flash',
              latencyMs: Date.now() - pipelineStartTime,
              toolsUsed: [],
              safety: {
                passed: true,
                layersPassed: safetyResult.layers.length,
                totalLayers: 5,
              },
            },
          });
          controller.close();
          return;
        }

        if (queryValidation.status === 'unsafe') {
          send('state_change', { state: 'blocked', label: 'Blocked' });
          send('content', { chunk: BLOCKED_MESSAGE, accumulated: BLOCKED_MESSAGE });
          send('complete', {
            fullResponse: BLOCKED_MESSAGE,
            metadata: {
              model: 'gemini-2.5-flash',
              latencyMs: Date.now() - pipelineStartTime,
              toolsUsed: [],
              safety: { passed: false, layersPassed: 4, totalLayers: 5, reason: queryValidation.reason },
            },
          });
          controller.close();
          return;
        }

        // ============ Step 3: Gemini Generation ============
        send('state_change', { state: 'reasoning', label: 'Thinking' });

        const toolResults: Array<{ toolName: string; result: unknown }> = [];

        const geminiResult = await streamGeminiResponse(
          message,
          conversationHistory || [],
          apiKey,
          {
            onStateChange: (state, label) => send('state_change', { state, label }),
            onContent: (chunk, accumulated) => send('content', { chunk, accumulated }),
            onToolCall: (toolName, args) => send('tool_call', { toolName, args }),
            onToolResult: (toolName, result, validated, executionTimeMs) => {
              toolResults.push({ toolName, result });
              send('tool_result', { toolName, result, validated, executionTimeMs });
            },
            onError: (errorMessage) => send('error', { message: errorMessage }),
          },
        );

        // ============ Step 4: Response Validation ============
        send('state_change', { state: 'response_validation', label: 'Validating Response' });

        const responseValidation = await validateResponse(
          message,
          geminiResult.fullResponse,
          toolResults.length > 0 ? toolResults : undefined,
          apiKey,
        );

        const responseLayerResult = responseValidationToLayerResult(responseValidation);

        if (!responseValidation.approved) {
          send('state_change', { state: 'blocked', label: 'Response Rejected' });
          const rejectionMsg = 'I apologize, but I could not verify the accuracy of my response. Please try rephrasing your question.';
          send('content', { chunk: rejectionMsg, accumulated: rejectionMsg });
          send('complete', {
            fullResponse: rejectionMsg,
            metadata: {
              model: geminiResult.model,
              latencyMs: Date.now() - pipelineStartTime,
              toolsUsed: geminiResult.toolsUsed,
              safety: { passed: false, layersPassed: 4, totalLayers: 5, reason: 'Response validation failed' },
            },
            responseValidation,
          });
          controller.close();
          return;
        }

        // ============ Step 5: Complete ============
        send('state_change', { state: 'audio_generation', label: 'Preparing Audio' });

        // Small delay to show the audio generation state
        await new Promise((r) => setTimeout(r, 200));

        send('state_change', { state: 'complete', label: 'Complete' });

        const allLayers = [...safetyResult.layers, responseLayerResult];

        send('metadata', {
          model: geminiResult.model,
          latencyMs: Date.now() - pipelineStartTime,
          toolsUsed: geminiResult.toolsUsed,
          safety: {
            passed: true,
            layersPassed: allLayers.filter((l) => l.passed).length,
            totalLayers: 5,
          },
        });

        send('complete', {
          fullResponse: geminiResult.fullResponse,
          metadata: {
            model: geminiResult.model,
            latencyMs: Date.now() - pipelineStartTime,
            toolsUsed: geminiResult.toolsUsed,
            safety: {
              passed: true,
              layersPassed: allLayers.filter((l) => l.passed).length,
              totalLayers: 5,
            },
          },
          responseValidation,
        });

        // ============ Step 6: D-ID Avatar Generation (async) ============
        const didApiKey = process.env.DID_API_KEY;
        if (didApiKey && geminiResult.fullResponse) {
          try {
            send('state_change', { state: 'avatar_generation', label: 'Generating Avatar' });

            const avatarResult = await createTalkVideo(geminiResult.fullResponse, didApiKey);

            if (avatarResult.success && avatarResult.talkId) {
              send('avatar_started', { talkId: avatarResult.talkId });

              // Try to wait for completion within the stream (up to 30s)
              const videoResult = await waitForVideoCompletion(avatarResult.talkId, didApiKey, 30000, 2000);

              if (videoResult.success && videoResult.videoUrl) {
                send('avatar_ready', { talkId: avatarResult.talkId, videoUrl: videoResult.videoUrl });
              }
              // If timed out within 30s, frontend will continue polling via /api/avatar
            } else {
              console.warn('[D-ID] Avatar creation failed:', avatarResult.error);
            }
          } catch (avatarError) {
            console.error('[D-ID] Avatar generation error:', avatarError);
            // Non-fatal: don't break the stream
          }
        }
      } catch (error) {
        const msg = error instanceof Error ? error.message : 'An unexpected error occurred';
        send('state_change', { state: 'error', label: 'Error' });
        send('error', { message: msg });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
