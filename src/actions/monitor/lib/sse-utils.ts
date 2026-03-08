import type { SSEEventType } from '../schemas/sse';

export function encodeSSE(type: SSEEventType, data: Record<string, unknown>): Uint8Array<ArrayBuffer> {
  return new TextEncoder().encode(`event: ${type}\ndata: ${JSON.stringify(data)}\n\n`);
}
