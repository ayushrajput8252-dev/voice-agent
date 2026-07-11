import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const encoder = new TextEncoder();
  
  const stream = new ReadableStream({
    async start(controller) {
      try {
        controller.enqueue(encoder.encode("CHUNK 1\n"));
        await new Promise(r => setTimeout(r, 100));
        controller.enqueue(encoder.encode("CHUNK 2: " + JSON.stringify(body) + "\n"));
      } catch (e) {
        console.error("error", e);
      } finally {
        controller.close();
      }
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive'
    }
  });
}
