'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Phone, MessageSquare, CheckCircle, AlertCircle } from 'lucide-react';

interface TelegramSetupProps {
  userId: string;
  onSetupComplete?: () => void;
}

export function TelegramSetup({ userId, onSetupComplete }: TelegramSetupProps) {
  const [step, setStep] = useState<'instructions' | 'verification' | 'complete'>('instructions');
  const [telegramUsername, setTelegramUsername] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');

  const botUsername = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || 'CryptoSentryBot';
  const botLink = `https://t.me/${botUsername}`;

  const handleStartVerification = async () => {
    setIsVerifying(true);
    try {
      const response = await fetch('/api/telegram/send-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, telegramUsername }),
      });
      if (response.ok) {
        setStep('verification');
      }
    } catch (error) {
      console.error('Error sending verification:', error);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleVerifyCode = async () => {
    try {
      const response = await fetch('/api/telegram/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, code: verificationCode }),
      });
      if (response.ok) {
        setStep('complete');
        onSetupComplete?.();
      }
    } catch (error) {
      console.error('Error verifying code:', error);
    }
  };

  if (step === 'instructions') {
    return (
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Phone className="h-6 w-6 text-primary" />
            Setup Telegram Voice Alerts
          </CardTitle>
          <CardDescription>
            Connect your Telegram account to receive instant voice alerts when crypto influencers mention your tokens.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 font-medium text-primary">
                1
              </div>
              <div>
                <h4 className="font-medium">Add our bot to your contacts</h4>
                <p className="text-sm text-muted-foreground">
                  Click the button below to open Telegram and add our bot as a contact.
                </p>
                <Button
                  className="mt-2"
                  onClick={() => window.open(botLink, '_blank', 'noopener,noreferrer')}
                >
                  <MessageSquare className="mr-2 h-4 w-4" />
                  Add @{botUsername} to Telegram
                </Button>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 font-medium text-primary">
                2
              </div>
              <div>
                <h4 className="font-medium">Start a conversation</h4>
                <p className="text-sm text-muted-foreground">
                  Send any message to our bot to start the conversation.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 font-medium text-primary">
                3
              </div>
              <div className="flex-1">
                <Label htmlFor="telegram-username">Your Telegram Username</Label>
                <Input
                  id="telegram-username"
                  placeholder="@yourusername"
                  value={telegramUsername}
                  onChange={(e) => setTelegramUsername(e.target.value)}
                  className="mt-1.5"
                />
                <p className="mt-1 text-sm text-muted-foreground">
                  Enter your Telegram username (without @)
                </p>
              </div>
            </div>
          </div>

          <Button
            onClick={handleStartVerification}
            disabled={!telegramUsername || isVerifying}
            className="w-full"
          >
            {isVerifying ? 'Sending verification...' : 'Start Verification'}
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (step === 'verification') {
    return (
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-6 w-6 text-yellow-500" />
            Verify Your Telegram
          </CardTitle>
          <CardDescription>
            We&apos;ve sent a verification code to your Telegram. Enter it below to complete the setup.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center">
            <MessageSquare className="mx-auto mb-2 h-12 w-12 text-primary" />
            <p className="text-sm text-muted-foreground">
              Check your Telegram conversation with @{botUsername}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="verification-code">Verification Code</Label>
            <Input
              id="verification-code"
              placeholder="Enter 6-digit code"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value)}
              maxLength={6}
            />
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setStep('instructions')} className="flex-1">
              Back
            </Button>
            <Button
              onClick={handleVerifyCode}
              disabled={verificationCode.length !== 6}
              className="flex-1"
            >
              Verify & Complete
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (step === 'complete') {
    return (
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-6 w-6 text-primary" />
            Telegram Connected!
          </CardTitle>
          <CardDescription>
            Your Telegram account is now connected. You&apos;ll receive instant voice alerts!
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center">
            <Phone className="mx-auto mb-2 h-12 w-12 text-primary" />
            <p className="text-sm text-muted-foreground">
              You&apos;re all set! You&apos;ll now receive instant Telegram alerts when:
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-primary" />
              <span className="text-sm text-muted-foreground">Crypto influencers mention your keywords</span>
            </div>
            <div className="flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-primary" />
              <span className="text-sm text-muted-foreground">Prices hit your target levels</span>
            </div>
            <div className="flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-primary" />
              <span className="text-sm text-muted-foreground">Important market movements occur</span>
            </div>
          </div>

          <Button onClick={onSetupComplete} className="w-full">
            Continue to Dashboard
          </Button>
        </CardContent>
      </Card>
    );
  }

  return null;
}
