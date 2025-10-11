'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageSquare, CheckCircle, AlertCircle, Settings } from 'lucide-react';
import Link from 'next/link';

interface MessagingStatusProps {
  userId: string;
}

interface MessagingStatus {
  telegram: {
    connected: boolean;
    username?: string;
  };
}

export function MessagingStatus({ userId }: MessagingStatusProps) {
  const [status, setStatus] = useState<MessagingStatus>({
    telegram: { connected: false },
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStatus() {
      try {
        const response = await fetch('/api/messaging/status');
        if (response.ok) {
          const data = await response.json();
          setStatus(data);
        }
      } catch (error) {
        console.error('Error fetching messaging status:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchStatus();
  }, [userId]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Messaging Status</CardTitle>
          <CardDescription>Loading messaging service status...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 w-3/4 rounded bg-muted"></div>
            <div className="h-4 w-1/2 rounded bg-muted"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Messaging Status</CardTitle>
        <CardDescription>Your connected messaging services</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Telegram Status */}
        <div className="flex items-center justify-between rounded-lg border p-4">
          <div className="flex items-center gap-3">
            <MessageSquare className="h-6 w-6 text-blue-500" />
            <div>
              <h3 className="font-medium">Telegram</h3>
              <p className="text-sm text-muted-foreground">
                {status.telegram.connected
                  ? `Connected as @${status.telegram.username || 'user'}`
                  : 'Not connected'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {status.telegram.connected ? (
              <CheckCircle className="h-5 w-5 text-green-500" />
            ) : (
              <AlertCircle className="h-5 w-5 text-red-500" />
            )}
            <Button variant="outline" size="sm" asChild>
              <Link href="/settings">
                <Settings className="mr-2 h-4 w-4" />
                Setup
              </Link>
            </Button>
          </div>
        </div>

        {!status.telegram.connected && (
          <div className="rounded-lg bg-muted p-4">
            <p className="text-sm text-muted-foreground">
              Connect Telegram to receive instant crypto alerts when influencers mention your
              keywords.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
