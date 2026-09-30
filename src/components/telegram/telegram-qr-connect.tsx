'use client';

import { CONNECT_TOKEN_TTL_MS } from '@/lib/telegram-connect-constants';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { QRCodeSVG } from 'qrcode.react';
import { MessageSquare, CircleCheck, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  checkTelegramStatus,
  disconnectTelegram,
  getTelegramConnectLink,
} from '@/actions/telegram';

const POLL_INTERVAL_MS = 3000;
const LINK_TTL_MS = CONNECT_TOKEN_TTL_MS;

interface TelegramQrConnectProps {
  initialLink: string;
  isConnected: boolean;
}

export function TelegramQrConnect({ initialLink, isConnected }: TelegramQrConnectProps) {
  const router = useRouter();
  const [connected, setConnected] = useState(isConnected);
  const [link, setLink] = useState(initialLink);
  const [expired, setExpired] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const issuedAtRef = useRef(Date.now());

  useEffect(() => {
    setConnected(isConnected);
  }, [isConnected]);

  useEffect(() => {
    if (connected || expired) {
      return;
    }

    let cancelled = false;

    const timer = setInterval(async () => {
      if (Date.now() - issuedAtRef.current > LINK_TTL_MS) {
        setExpired(true);
        return;
      }
      const status = await checkTelegramStatus();
      if (cancelled) {
        return;
      }
      if (status.connected) {
        setConnected(true);
        toast.success('Telegram connected');
        router.refresh();
      }
    }, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [connected, expired, router]);

  const handleRefreshLink = useCallback(async () => {
    setRefreshing(true);
    const result = await getTelegramConnectLink();
    setRefreshing(false);
    if ('error' in result) {
      toast.error(result.error);
      return;
    }
    issuedAtRef.current = Date.now();
    setLink(result.link);
    setExpired(false);
  }, []);

  const handleDisconnect = useCallback(async () => {
    setDisconnecting(true);
    const result = await disconnectTelegram();
    setDisconnecting(false);
    if (!result.success) {
      toast.error(result.error ?? 'Failed to disconnect Telegram');
      return;
    }
    issuedAtRef.current = Date.now();
    setConnected(false);
    setExpired(false);
    toast.success('Telegram disconnected');
    await handleRefreshLink();
    router.refresh();
  }, [handleRefreshLink, router]);

  if (connected) {
    return (
      <Card className="flex-row items-center gap-3 border-[rgba(34,197,94,0.3)] bg-[rgba(34,197,94,0.06)] px-4 py-3">
        <CircleCheck className="text-primary h-5 w-5 shrink-0" />
        <div className="flex-1">
          <span className="text-primary text-sm font-medium">Telegram connected</span>
          <p className="text-muted-foreground text-xs">You will receive alerts via Telegram.</p>
        </div>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" size="sm" disabled={disconnecting}>
              Disconnect
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Disconnect Telegram?</AlertDialogTitle>
              <AlertDialogDescription>
                You will stop receiving alerts on Telegram until you connect again.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDisconnect}>Disconnect</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </Card>
    );
  }

  if (expired) {
    return (
      <Card className="flex-row items-center gap-5 px-4 py-3">
        <div className="flex-1 space-y-1">
          <div className="flex items-center gap-2">
            <MessageSquare className="text-primary h-4 w-4" />
            <span className="text-sm font-medium">Connect link expired</span>
          </div>
          <p className="text-muted-foreground text-xs leading-relaxed">
            Connect links are valid for 10 minutes. Generate a new one to continue.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleRefreshLink} disabled={refreshing}>
          <RefreshCw className={refreshing ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />
          New link
        </Button>
      </Card>
    );
  }

  return (
    <Card className="flex-row items-center gap-5 px-4 py-3">
      <div className="shrink-0 rounded-md bg-white p-1.5">
        <QRCodeSVG value={link} size={80} />
      </div>
      <div className="flex-1 space-y-1">
        <div className="flex items-center gap-2">
          <MessageSquare className="text-primary h-4 w-4" />
          <span className="text-sm font-medium">Connect Telegram</span>
        </div>
        <p className="text-muted-foreground text-xs leading-relaxed">
          Scan this QR code with your phone to receive alerts. Link valid 10 minutes.
        </p>
        <a
          href={link}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary inline-block text-xs hover:underline"
        >
          Or click here to open Telegram
        </a>
      </div>
    </Card>
  );
}
