import { NextResponse } from 'next/server';
import { getAuthFromCookies } from '../auth/route';
import { getRegionPricing } from '@/lib/google-play/region-pricing';

// The currency Google Play bills each region in right now. Changes rarely, so
// it is kept for a few hours per app.
const CACHE_MS = 6 * 60 * 60 * 1000;
const cache = new Map<string, { at: number; version: string; currencies: Record<string, string> }>();

// GET /api/region-currencies - currency per Google Play region, and its regions version
export async function GET() {
  const auth = await getAuthFromCookies();
  if (!auth) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const cached = cache.get(auth.packageName);
  if (cached && Date.now() - cached.at < CACHE_MS) {
    return NextResponse.json({ version: cached.version, currencies: cached.currencies });
  }

  try {
    const { version, currencies } = await getRegionPricing(auth.credentials, auth.packageName, {
      currencyCode: 'USD',
      units: '10',
    });
    cache.set(auth.packageName, { at: Date.now(), version, currencies });
    return NextResponse.json({ version, currencies });
  } catch (error) {
    console.error('Failed to read Google Play region currencies:', error);
    return NextResponse.json({ error: 'Failed to read region currencies' }, { status: 502 });
  }
}
