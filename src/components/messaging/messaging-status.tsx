'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageSquare, Smartphone, CheckCircle, AlertCircle, Settings } from 'lucide-react';
import Link from 'next/link';

interface MessagingStatusProps {
  userId: string;
}

interface MessagingStatus {
  telegram: {
    connected: boolean;
    username?: string;
  };
  whatsapp: {
    connected: boolean;
    phoneNumber?: string;
  };
}

export function MessagingStatus({ userId }: MessagingStatusProps) {
  const [status, setStatus] = useState<MessagingStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMessagingStatus();
  }, [userId]);

  const fetchMessagingStatus = async () => {
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
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!status) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">
            <AlertCircle className="mx-auto mb-4 h-12 w-12 text-red-500" />
            <h3 className="mb-2 text-lg font-semibold">Error Loading Status</h3>
            <p className="mb-4 text-muted-foreground">Unable to load your messaging settings.</p>
            <Button onClick={fetchMessagingStatus}>Try Again</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const hasAnyConnection = status.telegram.connected || status.whatsapp.connected;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Messaging Services</h3>
        <Link href="/setup">
          <Button variant="outline" size="sm">
            <Settings className="mr-2 h-4 w-4" />
            Setup
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Telegram Status */}
        <Card
          className={status.telegram.connected ? 'border-green-200 bg-green-50' : 'border-gray-200'}
        >
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <MessageSquare className="h-5 w-5 text-blue-500" />
              Telegram
              {status.telegram.connected && <CheckCircle className="h-4 w-4 text-green-500" />}
            </CardTitle>
            <CardDescription>
              {status.telegram.connected
                ? `Connected as @${status.telegram.username}`
                : 'Not connected'}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            {status.telegram.connected ? (
              <div className="text-sm text-green-600">✓ Voice alerts enabled</div>
            ) : (
              <div className="text-sm text-muted-foreground">Connect to receive voice alerts</div>
            )}
          </CardContent>
        </Card>

        {/* WhatsApp Status */}
        <Card
          className={status.whatsapp.connected ? 'border-green-200 bg-green-50' : 'border-gray-200'}
        >
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Smartphone className="h-5 w-5 text-green-500" />
              WhatsApp
              {status.whatsapp.connected && <CheckCircle className="h-4 w-4 text-green-500" />}
            </CardTitle>
            <CardDescription>
              {status.whatsapp.connected
                ? `Connected to ${status.whatsapp.phoneNumber}`
                : 'Not connected'}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            {status.whatsapp.connected ? (
              <div className="text-sm text-green-600">✓ Voice alerts enabled</div>
            ) : (
              <div className="text-sm text-muted-foreground">Connect to receive voice alerts</div>
            )}
          </CardContent>
        </Card>
      </div>

      {!hasAnyConnection && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-yellow-600" />
              <div>
                <p className="font-medium text-yellow-800">No messaging services connected</p>
                <p className="text-sm text-yellow-700">
                  Connect at least one service to receive instant alerts.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
