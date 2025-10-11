'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Webhook, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';

interface WebhookInfo {
  id: string;
  eventTypes: string[];
  requestUrl: string;
  isEnabled: boolean;
  createdAt: string;
}

export function WebhookStatus() {
  const [webhooks, setWebhooks] = useState<WebhookInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { toast } = useToast();

  const fetchWebhooks = useCallback(async () => {
    try {
      const response = await fetch('/api/webhooks/manage');
      if (response.ok) {
        const data = await response.json();
        setWebhooks(data.webhooks || []);
      } else {
        throw new Error('Failed to fetch webhooks');
      }
    } catch (error) {
      console.error('Error fetching webhooks:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to fetch webhook status',
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchWebhooks();
  }, [fetchWebhooks]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchWebhooks();
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Webhook className="h-5 w-5" />
            Webhook Status
          </CardTitle>
          <CardDescription>Loading webhook information...</CardDescription>
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
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Webhook className="h-5 w-5" />
            Webhook Status
          </div>
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>
        </CardTitle>
        <CardDescription>Real-time monitoring via Apify webhooks</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {webhooks.length === 0 ? (
          <div className="py-8 text-center">
            <AlertCircle className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
            <p className="text-muted-foreground">No webhooks configured</p>
            <p className="text-sm text-muted-foreground">
              Webhooks will be automatically created when monitoring starts
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {webhooks.map((webhook) => (
              <div
                key={webhook.id}
                className="flex items-center justify-between rounded-lg border p-4"
              >
                <div className="flex items-center gap-3">
                  {webhook.isEnabled ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-red-500" />
                  )}
                  <div>
                    <p className="font-medium">Apify Webhook</p>
                    <p className="text-sm text-muted-foreground">{webhook.eventTypes.join(', ')}</p>
                    <p className="text-xs text-muted-foreground">
                      Created: {new Date(webhook.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={webhook.isEnabled ? 'default' : 'secondary'}>
                    {webhook.isEnabled ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}

        {webhooks.length > 0 && (
          <div className="rounded-lg bg-muted p-4">
            <p className="text-sm text-muted-foreground">
              ✅ Real-time monitoring is active via webhooks. You&apos;ll receive instant alerts
              when influencers mention your keywords.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
