'use client';

import { QRCodeSVG } from 'qrcode.react';
import { MessageSquare } from 'lucide-react';

interface TelegramQrConnectProps {
  connectLink: string;
}

export function TelegramQrConnect({ connectLink }: TelegramQrConnectProps) {
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
