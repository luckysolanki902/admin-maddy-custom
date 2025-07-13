/**
 * GET /api/admin/rto/test-data
 * 
 * Test data endpoint - DISABLED for production
 */
export async function GET(req) {
  return Response.json(
    { error: 'Test data endpoint is disabled. Use real data only.' },
    { status: 403 }
  );
}
