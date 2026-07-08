// ============================================================
// Health Check API Route
// ============================================================

export async function GET() {
  return Response.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    model: 'gemini-2.5-flash',
    hasApiKey: !!process.env.GEMINI_API_KEY,
  });
}
