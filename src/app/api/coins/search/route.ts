import { type NextRequest, NextResponse } from 'next/server';
import { searchCoins } from '@/lib/services/crypto/coingecko';

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get('q') ?? '';

  if (!query.trim()) {
    return NextResponse.json({ results: [] });
  }

  const results = await searchCoins(query);

  return NextResponse.json(
    { results },
    {
      headers: {
        'Cache-Control': 'public, max-age=60',
      },
    }
  );
}
