import { NextResponse } from 'next/server';

/** Errors thrown by requireApiAuth and mapped to HTTP statuses for the public /api/v1 routes. */
export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export function apiErrorResponse(error: unknown): NextResponse {
  if (error instanceof ApiError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  console.error('[API] Unhandled error:', error);
  return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
}
