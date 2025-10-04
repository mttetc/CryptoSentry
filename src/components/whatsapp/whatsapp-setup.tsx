'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Smartphone, CheckCircle, AlertCircle, QrCode } from 'lucide-react';

interface WhatsAppSetupProps {
  userId: string;
  onSetupComplete?: () => void;
}

export function WhatsAppSetup({ userId, onSetupComplete }: WhatsAppSetupProps) {
  const [step, setStep] = useState<'instructions' | 'qr' | 'complete'>('instructions');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState('');

  const handleStartQR = async () => {
    setIsVerifying(true);

    try {
      // Generate QR code for WhatsApp connection
      const response = await fetch('/api/whatsapp/generate-qr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          phoneNumber,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setQrCodeUrl(data.qrCodeUrl);
        setStep('qr');
      } else {
        console.error('Failed to generate QR code');
      }
    } catch (error) {
      console.error('Error generating QR code:', error);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleVerifyConnection = async () => {
    try {
      const response = await fetch('/api/whatsapp/verify-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
        }),
      });

      if (response.ok) {
        setStep('complete');
        onSetupComplete?.();
      } else {
        console.error('Verification failed');
      }
    } catch (error) {
      console.error('Error verifying connection:', error);
    }
  };

  if (step === 'instructions') {
    return (
      <div className="space-y-6">
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-green-100">
              <Smartphone className="h-4 w-4 text-green-600" />
            </div>
            <div>
              <h4 className="font-medium">Connect WhatsApp Business</h4>
              <p className="text-sm text-muted-foreground">
                We'll connect to your WhatsApp account to send voice alerts.
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone-number">Your WhatsApp Phone Number</Label>
            <Input
              id="phone-number"
              placeholder="+1234567890"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              type="tel"
            />
            <p className="text-sm text-muted-foreground">
              Enter your phone number with country code (e.g., +1234567890)
            </p>
          </div>
        </div>

        <Button onClick={handleStartQR} disabled={!phoneNumber || isVerifying} className="w-full">
          {isVerifying ? 'Generating QR code...' : 'Connect WhatsApp'}
        </Button>
      </div>
    );
  }

  if (step === 'qr') {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <QrCode className="mx-auto mb-4 h-12 w-12 text-green-500" />
          <h4 className="mb-2 font-medium">Scan QR Code with WhatsApp</h4>
          <p className="mb-4 text-sm text-muted-foreground">
            Open WhatsApp on your phone and scan this QR code to connect your account.
          </p>
        </div>

        {qrCodeUrl && (
          <div className="flex justify-center">
            <img
              src={qrCodeUrl}
              alt="WhatsApp QR Code"
              className="rounded-lg border bg-white p-4"
              style={{ maxWidth: '200px', maxHeight: '200px' }}
            />
          </div>
        )}

        <div className="space-y-2">
          <Button onClick={handleVerifyConnection} className="w-full">
            I've scanned the QR code
          </Button>
          <Button variant="outline" onClick={() => setStep('instructions')} className="w-full">
            Back
          </Button>
        </div>
      </div>
    );
  }

  if (step === 'complete') {
    return (
      <div className="space-y-4 text-center">
        <CheckCircle className="mx-auto h-12 w-12 text-green-500" />
        <h3 className="text-xl font-semibold">WhatsApp Connected!</h3>
        <p className="text-muted-foreground">
          You'll now receive instant voice alerts on WhatsApp when crypto influencers mention your
          tokens.
        </p>
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <span>Voice alerts enabled</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <span>Instant notifications</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <span>Priority messaging</span>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
