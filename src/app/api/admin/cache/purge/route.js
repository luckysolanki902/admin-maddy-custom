import { clearAllCaches } from '@/lib/cache/serverCache';

export async function POST() {
  clearAllCaches();
  return new Response(
    JSON.stringify({ message: 'Server caches cleared' }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
}
