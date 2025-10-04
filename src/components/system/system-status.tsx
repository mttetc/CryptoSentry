'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  CheckCircle,
  AlertCircle,
  XCircle,
  RefreshCw,
  Activity,
  MessageSquare,
  Smartphone,
  Database,
  Zap,
} from 'lucide-react';

interface SystemStatus {
  apify: {
    connected: boolean;
    error?: string;
  };
  telegram: {
    connected: boolean;
    error?: string;
  };
  whatsapp: {
    connected: boolean;
    error?: string;
  };
  database: {
    connected: boolean;
    error?: string;
  };
  monitoring: {
    active: boolean;
    accounts: number;
    alerts: number;
  };
}

export function SystemStatus() {
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchSystemStatus();
  }, []);

  const fetchSystemStatus = async () => {
    try {
      const response = await fetch('/api/system/status');
      if (response.ok) {
        const data = await response.json();
        setStatus(data);
      }
    } catch (error) {
      console.error('Error fetching system status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchSystemStatus();
    setRefreshing(false);
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
            <XCircle className="mx-auto mb-4 h-12 w-12 text-red-500" />
            <h3 className="mb-2 text-lg font-semibold">System Status Unavailable</h3>
            <p className="mb-4 text-muted-foreground">Unable to load system status.</p>
            <Button onClick={handleRefresh}>Try Again</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getStatusIcon = (connected: boolean) => {
    return connected ? (
      <CheckCircle className="h-5 w-5 text-green-500" />
    ) : (
      <XCircle className="h-5 w-5 text-red-500" />
    );
  };

  const getStatusBadge = (connected: boolean) => {
    return (
      <Badge variant={connected ? 'default' : 'destructive'}>
        {connected ? 'Connected' : 'Disconnected'}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">System Status</h3>
          <p className="text-sm text-muted-foreground">Monitor your CryptoSentry system health</p>
        </div>
        <Button onClick={handleRefresh} disabled={refreshing} variant="outline" size="sm">
          <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Apify Status */}
        <Card
          className={
            status.apify.connected ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
          }
        >
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Zap className="h-5 w-5 text-blue-500" />
              Apify
              {getStatusIcon(status.apify.connected)}
            </CardTitle>
            <CardDescription>Twitter monitoring service</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex items-center justify-between">
              {getStatusBadge(status.apify.connected)}
            </div>
            {status.apify.error && (
              <p className="mt-2 text-sm text-red-600">{status.apify.error}</p>
            )}
          </CardContent>
        </Card>

        {/* Database Status */}
        <Card
          className={
            status.database.connected ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
          }
        >
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Database className="h-5 w-5 text-purple-500" />
              Database
              {getStatusIcon(status.database.connected)}
            </CardTitle>
            <CardDescription>Supabase connection</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex items-center justify-between">
              {getStatusBadge(status.database.connected)}
            </div>
            {status.database.error && (
              <p className="mt-2 text-sm text-red-600">{status.database.error}</p>
            )}
          </CardContent>
        </Card>

        {/* Telegram Status */}
        <Card
          className={
            status.telegram.connected ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
          }
        >
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <MessageSquare className="h-5 w-5 text-blue-500" />
              Telegram
              {getStatusIcon(status.telegram.connected)}
            </CardTitle>
            <CardDescription>Voice alerts service</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex items-center justify-between">
              {getStatusBadge(status.telegram.connected)}
            </div>
            {status.telegram.error && (
              <p className="mt-2 text-sm text-red-600">{status.telegram.error}</p>
            )}
          </CardContent>
        </Card>

        {/* WhatsApp Status */}
        <Card
          className={
            status.whatsapp.connected ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
          }
        >
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Smartphone className="h-5 w-5 text-green-500" />
              WhatsApp
              {getStatusIcon(status.whatsapp.connected)}
            </CardTitle>
            <CardDescription>Voice alerts service</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex items-center justify-between">
              {getStatusBadge(status.whatsapp.connected)}
            </div>
            {status.whatsapp.error && (
              <p className="mt-2 text-sm text-red-600">{status.whatsapp.error}</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Monitoring Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-orange-500" />
            Monitoring Status
          </CardTitle>
          <CardDescription>Real-time monitoring statistics</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="text-center">
              <div className="text-2xl font-bold">{status.monitoring.active ? '🟢' : '🔴'}</div>
              <div className="text-sm text-muted-foreground">
                {status.monitoring.active ? 'Active' : 'Inactive'}
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{status.monitoring.accounts}</div>
              <div className="text-sm text-muted-foreground">Accounts</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{status.monitoring.alerts}</div>
              <div className="text-sm text-muted-foreground">Active Alerts</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Overall Status */}
      <Card
        className={
          status.apify.connected && status.database.connected
            ? 'border-green-200 bg-green-50'
            : 'border-yellow-200 bg-yellow-50'
        }
      >
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            {status.apify.connected && status.database.connected ? (
              <CheckCircle className="h-5 w-5 text-green-600" />
            ) : (
              <AlertCircle className="h-5 w-5 text-yellow-600" />
            )}
            <div>
              <p className="font-medium">
                {status.apify.connected && status.database.connected
                  ? 'System Operational'
                  : 'System Issues Detected'}
              </p>
              <p className="text-sm text-muted-foreground">
                {status.apify.connected && status.database.connected
                  ? 'All core services are running normally'
                  : 'Some services may be experiencing issues'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
