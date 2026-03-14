import { type NextRequest, NextResponse } from 'next/server';
import { cryptoProvider } from '@/lib/services/crypto';

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get('q') ?? '';

  if (!query.trim()) {
    return NextResponse.json({ results: [] });
  }

  const results = await cryptoProvider.searchCoins(query);

  return NextResponse.json(
    { results },
    {
      headers: {
        'Cache-Control': 'public, max-age=60',
      },
    }
  );
}
