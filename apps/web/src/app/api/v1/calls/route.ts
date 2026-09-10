import { NextResponse } from 'next/server';
import { getCallsWithCache, revalidateCallsCacheInBackground, rebuildCallsCache } from '@/lib/cache-service';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const forceRefresh = searchParams.get('refresh') === 'true';

    if (forceRefresh) {
      const calls = await rebuildCallsCache();
      const res = NextResponse.json(calls || []);
      res.headers.set('Access-Control-Allow-Origin', '*');
      res.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      res.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      res.headers.set('Cache-Control', 'no-store');
      res.headers.set('X-Cache', 'REBUILT');
      return res;
    }

    const { calls, cacheHit } = await getCallsWithCache();

    const res = NextResponse.json(calls || []);
    res.headers.set('Access-Control-Allow-Origin', '*');
    res.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.headers.set('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=60');
    res.headers.set('X-Cache', cacheHit ? 'HIT' : 'MISS');
    return res;
  } catch (err: any) {
    console.error('Error in GET /api/v1/calls:', err);
    const errRes = NextResponse.json([], { status: 200 });
    errRes.headers.set('Access-Control-Allow-Origin', '*');
    return errRes;
  }
}
