// ============================================================
// Main Chat API Route — SSE Streaming Pipeline
// ============================================================

import { NextRequest } from 'next/server';
import { runSafetyPipeline, BLOCKED_MESSAGE } from '@/lib/safety/pipeline';
import { validateQuery } from '@/lib/validation/query-validator';
import { streamGroqResponse } from '@/lib/groq/client';
import { validateResponse, responseValidationToLayerResult } from '@/lib/safety/response-validator';
import { ChatRequest, SSEEventType } from '@/types';
import { createTalkVideo, waitForVideoCompletion } from '@/lib/did/did-client';
import { redis } from '@/lib/cache/redis';

function createSSEMessage(type: SSEEventType, data: unknown): string {
  return `data: ${JSON.stringify({ type, data, timestamp: Date.now() })}\n\n`;
}

export async function POST(request: NextRequest) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: 'GROQ_API_KEY is not configured' }),
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
        try {
          controller.enqueue(encoder.encode(createSSEMessage(type, data)));
        } catch (err) {
          console.warn('[API/Chat] Failed to enqueue (client disconnected?)', err);
        }
      };

      try {
        const pipelineStartTime = Date.now();
        const ip = request.ip || request.headers.get('x-forwarded-for') || 'anonymous';
        
        // ============ Step 0: Check Ban Status ============
        try {
          const violationsStr = await redis.get(`violations:${ip}`);
          if (violationsStr && parseInt(violationsStr, 10) >= 3) {
            send('state_change', { state: 'blocked', label: 'Banned' });
            const banMsg = 'Your account has been banned due to repeated safety policy violations.';
            send('content', { chunk: banMsg, accumulated: banMsg });
            send('complete', {
              fullResponse: banMsg,
              metadata: { model: 'llama-3.3-70b-versatile', latencyMs: 0, toolsUsed: [], safety: { passed: false, layersPassed: 0, totalLayers: 5 } },
            });
            controller.close();
            return;
          }
        } catch (e) {
          console.warn('[Redis] Ban check failed', e);
        }

        // ============ Step 1: Safety Validation ============
        send('state_change', { state: 'safety_validation', label: 'Safety Check' });

        const safetyResult = await runSafetyPipeline(message, apiKey);

        if (safetyResult.status === 'blocked') {
          let count = 1;
          try {
            count = await redis.incr(`violations:${ip}`);
            if (count === 1) await redis.expire(`violations:${ip}`, 86400); // 24 hours
          } catch (e) {}

          const attemptMsg = count >= 3 
            ? 'You have reached 3 violations. Your account has been banned.' 
            : `Warning: This is attempt ${count} out of 3. If more violations happen, your account will be banned.`;
          
          const fullBlockedMsg = `${BLOCKED_MESSAGE} ${attemptMsg}`;

          send('state_change', { state: 'blocked', label: 'Blocked' });
          send('content', { chunk: fullBlockedMsg, accumulated: fullBlockedMsg });
          send('metadata', {
            model: 'llama-3.3-70b-versatile',
            latencyMs: Date.now() - pipelineStartTime,
            toolsUsed: [],
            safety: {
              passed: false,
              layersPassed: safetyResult.layers.filter((l) => l.passed).length,
              totalLayers: 5,
              blockedAt: safetyResult.blockedAt,
              reason: safetyResult.reason,
              details: safetyResult.layers,
            },
          });
          send('complete', {
            fullResponse: fullBlockedMsg,
            metadata: { model: 'llama-3.3-70b-versatile', latencyMs: Date.now() - pipelineStartTime },
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
              model: 'llama-3.3-70b-versatile',
              latencyMs: Date.now() - pipelineStartTime,
              toolsUsed: [],
              safety: {
                passed: true,
                layersPassed: safetyResult.layers.length,
                totalLayers: 5,
                details: safetyResult.layers,
              },
            },
          });
          controller.close();
          return;
        }

        if (queryValidation.status === 'unsafe') {
          let count = 1;
          try {
            count = await redis.incr(`violations:${ip}`);
            if (count === 1) await redis.expire(`violations:${ip}`, 86400);
          } catch (e) {}

          const attemptMsg = count >= 3 
            ? 'You have reached 3 violations. Your account has been banned.' 
            : `Warning: This is attempt ${count} out of 3. If more violations happen, your account will be banned.`;
          
          const fullBlockedMsg = `${BLOCKED_MESSAGE} ${attemptMsg}`;

          send('state_change', { state: 'blocked', label: 'Blocked' });
          send('content', { chunk: fullBlockedMsg, accumulated: fullBlockedMsg });
          send('complete', {
            fullResponse: fullBlockedMsg,
            metadata: {
              model: 'llama-3.3-70b-versatile',
              latencyMs: Date.now() - pipelineStartTime,
              toolsUsed: [],
              safety: { passed: false, layersPassed: 4, totalLayers: 5, reason: queryValidation.reason, details: safetyResult.layers },
            },
          });
          controller.close();
          return;
        }

        // ============ Step 3: LLM Generation ============
        send('state_change', { state: 'reasoning', label: 'Thinking' });

        const toolResults: Array<{ toolName: string; result: unknown }> = [];

        const aiResult = await streamGroqResponse(
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
          aiResult.fullResponse,
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
              model: aiResult.model,
              latencyMs: Date.now() - pipelineStartTime,
              toolsUsed: aiResult.toolsUsed,
              safety: { passed: false, layersPassed: 4, totalLayers: 5, reason: 'Response validation failed', details: [...safetyResult.layers, responseLayerResult] },
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
          model: aiResult.model,
          latencyMs: Date.now() - pipelineStartTime,
          toolsUsed: aiResult.toolsUsed,
          safety: {
            passed: true,
            layersPassed: allLayers.filter((l) => l.passed).length,
            totalLayers: 5,
            details: allLayers,
          },
        });

        send('complete', {
          fullResponse: aiResult.fullResponse,
          metadata: {
            model: aiResult.model,
            latencyMs: Date.now() - pipelineStartTime,
            toolsUsed: aiResult.toolsUsed,
            safety: {
              passed: true,
              layersPassed: allLayers.filter((l) => l.passed).length,
              totalLayers: 5,
              details: allLayers,
            },
          },
          responseValidation,
        });

        // ============ Step 6: D-ID Avatar Generation (async) ============
        const didApiKey = process.env.DID_API_KEY;
        if (didApiKey && aiResult.fullResponse) {
          try {
            send('state_change', { state: 'avatar_generation', label: 'Generating Avatar' });

            const avatarResult = await createTalkVideo(aiResult.fullResponse, didApiKey);

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
        console.error('[API/Chat] Pipeline error:', error);
        const msg = error instanceof Error ? error.message : 'An unexpected error occurred';
        send('state_change', { state: 'error', label: 'Error' });
        send('error', { message: msg });
      } finally {
        try {
          controller.close();
        } catch (err) {
          // Ignore error if already closed
        }
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
