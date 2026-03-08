import type { SSEEventType } from '@/actions/monitor/schemas/sse';
import { sseConfig } from '@/lib/config/sse';
import { rateLimit } from '@/actions/messaging/utils/rate-limit';
import { AuthError, requireAuth } from '@/lib/api/auth';
import { monitorEvent } from '@/actions/monitor/lib/core';
import type { NextRequest } from 'next/server';
import { FEATURES } from '@/lib/config/features';

export const dynamic = 'force-dynamic';

// Keep track of active connections with their cleanup functions
const CONNECTIONS = new Map<
  string,
  {
    controller: ReadableStreamController<Uint8Array<ArrayBuffer>>;
    userId: string;
    timeoutId: NodeJS.Timeout;
    heartbeatId: NodeJS.Timeout;
    lastActivity: number;
    cleanup: () => void;
  }
>();

// Keep track of connections per user
const USER_CONNECTIONS = new Map<string, Set<string>>();

/**
 * Helper function to format Server-Sent Events (SSE) messages
 */
function encodeSSE(type: SSEEventType, data: Record<string, unknown>): Uint8Array<ArrayBuffer> {
  return new TextEncoder().encode(`event: ${type}\ndata: ${JSON.stringify(data)}\n\n`);
}

/**
 * Cleanup function for connections
 */
function cleanup(connectionId: string) {
  const connection = CONNECTIONS.get(connectionId);
  if (connection) {
    // Clear all timeouts
    clearTimeout(connection.timeoutId);
    clearInterval(connection.heartbeatId);

    // Close the controller with error handling
    try {
      connection.controller.close();
    } catch (error) {
      // Ignore errors if the controller is already closed
      if (!(error instanceof TypeError && error.message.includes('already closed'))) {
        console.error('Error closing controller:', error);
      }
    }

    // Remove from connections map
    CONNECTIONS.delete(connectionId);

    // Remove from user connections
    const userConnections = USER_CONNECTIONS.get(connection.userId);
    if (userConnections) {
      userConnections.delete(connectionId);
      if (userConnections.size === 0) {
        USER_CONNECTIONS.delete(connection.userId);
      }
    }

    // Call the cleanup function if it exists
    if (connection.cleanup) {
      try {
        connection.cleanup();
      } catch (error) {
        console.error('Error in cleanup function:', error);
      }
    }
  }
}

export async function GET(request: NextRequest) {
  try {
    // Get client IP and user agent for rate limiting
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0] ||
      request.headers.get('x-real-ip') ||
      '127.0.0.1';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // Apply rate limiting
    const rateLimitResult = await rateLimit(ip, '/api/sse', userAgent);
    if (!rateLimitResult.success) {
      return Response.json(
        {
          error: 'Too many requests',
          resetAt: new Date(rateLimitResult.resetAt).toISOString(),
        },
        {
          status: 429,
          headers: {
            'Retry-After': Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000).toString(),
          },
        }
      );
    }

    let userId: string;

    if (FEATURES.isDevMode) {
      userId = 'dev-user';
    } else {
      try {
        const auth = await requireAuth();
        userId = auth.userId;
      } catch (error) {
        if (error instanceof AuthError) {
          return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }
        throw error;
      }
    }

    // Check if user has reached maximum connections
    const userConnections = USER_CONNECTIONS.get(userId) || new Set();
    if (userConnections.size >= sseConfig.maxConnectionsPerUser) {
      return Response.json(
        { error: 'Maximum connections reached', limit: sseConfig.maxConnectionsPerUser },
        { status: 429 }
      );
    }

    // Generate a unique connection ID
    const connectionId = crypto.randomUUID();

    // Create a new ReadableStream with error handling
    const stream = new ReadableStream({
      start(controller) {
        try {
          // Set up connection timeout
          const timeoutId = setTimeout(() => {
            try {
              controller.enqueue(
                encodeSSE('timeout', {
                  timestamp: Date.now(),
                  reason: 'Connection timeout reached',
                })
              );
              cleanup(connectionId);
            } catch (error) {
              console.error('Error during timeout handling:', error);
            }
          }, sseConfig.connectionTimeout);

          // Set up heartbeat interval
          const heartbeatId = setInterval(() => {
            try {
              controller.enqueue(
                encodeSSE('ping', {
                  timestamp: Date.now(),
                  connectionId,
                })
              );

              // Check for inactivity
              const connection = CONNECTIONS.get(connectionId);
              if (connection) {
                const now = Date.now();
                if (now - connection.lastActivity > sseConfig.connectionTimeout) {
                  controller.enqueue(
                    encodeSSE('timeout', {
                      timestamp: now,
                      reason: 'Connection inactive',
                    })
                  );
                  cleanup(connectionId);
                } else {
                  connection.lastActivity = now;
                }
              }
            } catch (error) {
              console.error('Error during heartbeat:', error);
              cleanup(connectionId);
            }
          }, sseConfig.heartbeatInterval);

          // Add this controller to active connections
          CONNECTIONS.set(connectionId, {
            controller,
            userId,
            timeoutId,
            heartbeatId,
            lastActivity: Date.now(),
            cleanup: () => {
              // Additional cleanup logic if needed
            },
          });

          // Add to user connections
          if (!USER_CONNECTIONS.has(userId)) {
            USER_CONNECTIONS.set(userId, new Set());
          }
          USER_CONNECTIONS.get(userId)?.add(connectionId);

          // Send initial connection message
          controller.enqueue(
            encodeSSE('init', {
              status: 'connected',
              connectionId,
              userId,
              timestamp: Date.now(),
            })
          );
        } catch (error) {
          console.error('Error in stream start:', error);
          cleanup(connectionId);
        }
      },

      cancel() {
        cleanup(connectionId);
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no', // Disable buffering in Nginx
      },
    });
  } catch (error) {
    console.error('SSE route error:', error);
    return Response.json(
      { error: 'Internal Server Error', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { userId } = await requireAuth();

    const event = await request.json();
    const result = await monitorEvent(event);

    if (!result.success) {
      return Response.json({ error: result.error }, { status: 400 });
    }

    const userConnections = USER_CONNECTIONS.get(userId);
    if (userConnections) {
      let eventType: SSEEventType;
      let eventData: Record<string, unknown>;

      if (event.type === 'price') {
        eventType = 'price_update';
        eventData = {
          timestamp: Date.now(),
          symbol: event.data.symbol,
          price: event.data.price,
        };
      } else if (event.type === 'social') {
        eventType = 'social_update';
        eventData = {
          timestamp: Date.now(),
          platform: event.data.account,
          content: event.data.content,
        };
      } else {
        return Response.json({ error: 'Invalid event type' }, { status: 400 });
      }

      for (const connectionId of userConnections) {
        const connection = CONNECTIONS.get(connectionId);
        if (connection) {
          try {
            connection.controller.enqueue(encodeSSE(eventType, eventData));
            connection.lastActivity = Date.now();
          } catch (error) {
            console.error(`Error broadcasting to connection ${connectionId}:`, error);
            cleanup(connectionId);
          }
        }
      }
    }

    return Response.json({ success: true });
  } catch (error) {
    if (error instanceof AuthError) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Error processing event:', error);
    return Response.json(
      { error: 'Failed to process event', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
