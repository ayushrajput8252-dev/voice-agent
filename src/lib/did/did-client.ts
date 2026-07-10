// ============================================================
// D-ID REST API Client — Talking Avatar Video Generation
// ============================================================

const DID_API_BASE = 'https://api.d-id.com';

const DEFAULT_AVATAR_IMAGE =
  'https://d-id-public-bucket.s3.us-west-2.amazonaws.com/alice.jpg';

// ---- Types ----

export interface DIDTalkRequest {
  source_url: string;
  script: {
    type: 'text';
    input: string;
    provider: {
      type: string;
      voice_id: string;
    };
  };
  config?: {
    result_format?: string;
    stitch?: boolean;
  };
}

export type DIDTalkStatus = 'created' | 'started' | 'done' | 'error' | 'rejected';

export interface DIDTalkResponse {
  id: string;
  status: DIDTalkStatus;
  result_url?: string;
  error?: {
    kind: string;
    description: string;
  };
  created_at?: string;
  started_at?: string;
}

export interface AvatarGenerationResult {
  success: boolean;
  talkId?: string;
  videoUrl?: string;
  error?: string;
  durationMs?: number;
}

// ---- Logging ----

function log(level: 'info' | 'warn' | 'error', message: string, data?: Record<string, unknown>) {
  const prefix = `[D-ID] [${level.toUpperCase()}]`;
  const timestamp = new Date().toISOString();
  const extra = data ? ` ${JSON.stringify(data)}` : '';
  if (level === 'error') {
    console.error(`${prefix} ${timestamp} ${message}${extra}`);
  } else if (level === 'warn') {
    console.warn(`${prefix} ${timestamp} ${message}${extra}`);
  } else {
    console.log(`${prefix} ${timestamp} ${message}${extra}`);
  }
}

// ---- Retry Helper ----

const RETRYABLE_STATUS_CODES = [429, 500, 502, 503, 504];
const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;

async function fetchWithRetry(
  url: string,
  options: RequestInit,
  retries = MAX_RETRIES,
): Promise<Response> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, options);

      if (response.ok || !RETRYABLE_STATUS_CODES.includes(response.status)) {
        return response;
      }

      // Retryable error
      if (attempt < retries) {
        const delay = BASE_DELAY_MS * Math.pow(2, attempt);
        const jitter = Math.random() * 500;
        log('warn', `Retryable HTTP ${response.status}, attempt ${attempt + 1}/${retries}`, {
          url,
          delay: delay + jitter,
        });
        await new Promise((r) => setTimeout(r, delay + jitter));
      } else {
        return response; // Return the last error response
      }
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt < retries) {
        const delay = BASE_DELAY_MS * Math.pow(2, attempt);
        log('warn', `Network error, attempt ${attempt + 1}/${retries}: ${lastError.message}`, { url });
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  }

  throw lastError || new Error('Request failed after retries');
}

// ---- Auth Headers ----

function getAuthHeaders(apiKey: string): Record<string, string> {
  return {
    Authorization: `Basic ${apiKey}`,
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };
}

// ---- Core API Methods ----

/**
 * Create a talking avatar video via D-ID.
 * Returns the talk ID for polling.
 */
export async function createTalkVideo(
  text: string,
  apiKey: string,
  avatarImageUrl: string = DEFAULT_AVATAR_IMAGE,
): Promise<AvatarGenerationResult> {
  const startTime = Date.now();

  if (!text.trim()) {
    return { success: false, error: 'Empty text provided' };
  }

  // Truncate very long text (D-ID has limits)
  const truncatedText = text.length > 1000 ? text.slice(0, 997) + '...' : text;

  const requestBody: DIDTalkRequest = {
    source_url: avatarImageUrl,
    script: {
      type: 'text',
      input: truncatedText,
      provider: {
        type: 'microsoft',
        voice_id: 'en-US-JennyNeural',
      },
    },
    config: {
      stitch: true,
    },
  };

  log('info', 'Creating talk video', { textLength: truncatedText.length });

  try {
    const response = await fetchWithRetry(`${DID_API_BASE}/talks`, {
      method: 'POST',
      headers: getAuthHeaders(apiKey),
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      const durationMs = Date.now() - startTime;

      if (response.status === 401 || response.status === 403) {
        log('error', 'Authentication failed', { status: response.status, body: errorBody });
        return { success: false, error: 'D-ID authentication failed. Check your API key.', durationMs };
      }

      if (response.status === 402) {
        log('error', 'Insufficient credits', { body: errorBody });
        return { success: false, error: 'D-ID credits exhausted.', durationMs };
      }

      log('error', `Create talk failed: HTTP ${response.status}`, { body: errorBody });
      return { success: false, error: `D-ID API error: ${response.status}`, durationMs };
    }

    const data: DIDTalkResponse = await response.json();
    const durationMs = Date.now() - startTime;

    log('info', 'Talk video created', { talkId: data.id, durationMs });

    return {
      success: true,
      talkId: data.id,
      durationMs,
    };
  } catch (error) {
    const durationMs = Date.now() - startTime;
    const msg = error instanceof Error ? error.message : 'Unknown error';
    log('error', `Create talk error: ${msg}`, { durationMs });
    return { success: false, error: msg, durationMs };
  }
}

/**
 * Get the status of a talk video.
 */
export async function getTalkStatus(
  talkId: string,
  apiKey: string,
): Promise<{ status: DIDTalkStatus; videoUrl?: string; error?: string }> {
  try {
    const response = await fetchWithRetry(`${DID_API_BASE}/talks/${talkId}`, {
      method: 'GET',
      headers: getAuthHeaders(apiKey),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      log('error', `Get talk status failed: HTTP ${response.status}`, { talkId, body: errorBody });
      return { status: 'error', error: `HTTP ${response.status}` };
    }

    const data: DIDTalkResponse = await response.json();

    if (data.status === 'done' && data.result_url) {
      log('info', 'Talk video completed', { talkId, videoUrl: data.result_url });
      return { status: 'done', videoUrl: data.result_url };
    }

    if (data.status === 'error' || data.status === 'rejected') {
      const errorMsg = data.error?.description || 'Video generation failed';
      log('error', `Talk video failed: ${errorMsg}`, { talkId });
      return { status: 'error', error: errorMsg };
    }

    return { status: data.status };
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    log('error', `Get talk status error: ${msg}`, { talkId });
    return { status: 'error', error: msg };
  }
}

/**
 * Poll until video is complete or timeout.
 * Polls every 2s with a 90s maximum timeout.
 */
export async function waitForVideoCompletion(
  talkId: string,
  apiKey: string,
  timeoutMs: number = 90000,
  pollIntervalMs: number = 2000,
): Promise<AvatarGenerationResult> {
  const startTime = Date.now();
  let pollCount = 0;

  log('info', 'Waiting for video completion', { talkId, timeoutMs });

  while (Date.now() - startTime < timeoutMs) {
    pollCount++;
    const result = await getTalkStatus(talkId, apiKey);

    if (result.status === 'done' && result.videoUrl) {
      const durationMs = Date.now() - startTime;
      log('info', 'Video ready', { talkId, durationMs, pollCount });
      return {
        success: true,
        talkId,
        videoUrl: result.videoUrl,
        durationMs,
      };
    }

    if (result.status === 'error') {
      const durationMs = Date.now() - startTime;
      log('error', 'Video generation failed', { talkId, error: result.error, durationMs, pollCount });
      return {
        success: false,
        talkId,
        error: result.error,
        durationMs,
      };
    }

    // Still processing — wait and poll again
    log('info', `Poll #${pollCount}: status=${result.status}`, { talkId });
    await new Promise((r) => setTimeout(r, pollIntervalMs));
  }

  // Timeout
  const durationMs = Date.now() - startTime;
  log('warn', 'Video generation timed out', { talkId, durationMs, pollCount });
  return {
    success: false,
    talkId,
    error: `Video generation timed out after ${timeoutMs / 1000}s`,
    durationMs,
  };
}
