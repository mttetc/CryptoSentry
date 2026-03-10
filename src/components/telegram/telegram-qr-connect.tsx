'use client';

import { QRCodeSVG } from 'qrcode.react';
import { MessageSquare, CircleCheck } from 'lucide-react';

interface TelegramQrConnectProps {
  connectLink: string;
  isConnected?: boolean;
}

export function TelegramQrConnect({ connectLink, isConnected }: TelegramQrConnectProps) {
  if (isConnected) {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-green-500/20 bg-green-500/5 px-4 py-3">
        <CircleCheck className="h-5 w-5 shrink-0 text-green-500" />
        <div className="flex-1">
          <span className="text-sm font-medium text-green-500">Telegram connected</span>
          <p className="text-muted-foreground text-xs">You will receive alerts via Telegram.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-5 rounded-lg border px-4 py-3">
      <div className="shrink-0 rounded-md bg-white p-1.5">
        <QRCodeSVG value={connectLink} size={80} />
      </div>
      <div className="flex-1 space-y-1">
        <div className="flex items-center gap-2">
          <MessageSquare className="text-primary h-4 w-4" />
          <span className="text-sm font-medium">Connect Telegram</span>
        </div>
        <p className="text-muted-foreground text-xs leading-relaxed">
          Scan this QR code with your phone to receive alerts.
        </p>
        <a
          href={connectLink}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary inline-block text-xs hover:underline"
        >
          Or click here to open Telegram
        </a>
      </div>
    </div>
  );
}
