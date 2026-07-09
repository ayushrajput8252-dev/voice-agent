// ============================================================
// Avatar API Route — D-ID Video Generation & Polling
// ============================================================

import { NextRequest } from 'next/server';
import { createTalkVideo, getTalkStatus } from '@/lib/did/did-client';

function getDIDApiKey(): string | null {
  return process.env.DID_API_KEY || null;
}

/**
 * POST /api/avatar — Start avatar video generation
 * Body: { text: string }
 * Returns: { success, talkId } or { success: false, error }
 */
export async function POST(request: NextRequest) {
  const apiKey = getDIDApiKey();
  if (!apiKey) {
    return Response.json(
      { success: false, error: 'DID_API_KEY is not configured' },
      { status: 500 },
    );
  }

  let body: { text?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { success: false, error: 'Invalid request body' },
      { status: 400 },
    );
  }

  const { text } = body;
  if (!text || typeof text !== 'string' || !text.trim()) {
    return Response.json(
      { success: false, error: 'Text is required' },
      { status: 400 },
    );
  }

  const result = await createTalkVideo(text, apiKey);

  if (!result.success) {
    return Response.json(
      { success: false, error: result.error },
      { status: 502 },
    );
  }

  return Response.json({
    success: true,
    talkId: result.talkId,
  });
}

/**
 * GET /api/avatar?talkId=xxx — Poll for avatar video status
 * Returns: { status, videoUrl? } or { status: "error", error }
 */
export async function GET(request: NextRequest) {
  const apiKey = getDIDApiKey();
  if (!apiKey) {
    return Response.json(
      { status: 'error', error: 'DID_API_KEY is not configured' },
      { status: 500 },
    );
  }

  const talkId = request.nextUrl.searchParams.get('talkId');
  if (!talkId) {
    return Response.json(
      { status: 'error', error: 'talkId query parameter is required' },
      { status: 400 },
    );
  }

  const result = await getTalkStatus(talkId, apiKey);

  return Response.json({
    status: result.status,
    videoUrl: result.videoUrl || null,
    error: result.error || null,
  });
}
