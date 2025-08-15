import { NextResponse } from 'next/server';
import { getKeySnapshot } from '@/lib/stripe';

export const runtime = 'edge';

export async function GET() {
  const snap = getKeySnapshot();
  return NextResponse.json(snap);
}
