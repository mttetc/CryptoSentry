'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Phone, MessageSquare, CheckCircle, AlertCircle, Smartphone } from 'lucide-react';
import { TelegramSetup } from '@/components/telegram/telegram-setup';
import { WhatsAppSetup } from '@/components/whatsapp/whatsapp-setup';
import { useRouter } from 'next/navigation';

interface MessagingSetupProps {
  userId: string;
  onSetupComplete?: () => void;
}

export function MessagingSetup({ userId, onSetupComplete }: MessagingSetupProps) {
  const [activeTab, setActiveTab] = useState<'telegram' | 'whatsapp'>('telegram');
  const [completedServices, setCompletedServices] = useState<Set<string>>(new Set());
  const router = useRouter();

  const handleServiceComplete = (service: string) => {
    setCompletedServices((prev) => new Set([...prev, service]));
  };

  const allServicesCompleted = completedServices.size >= 1; // At least one service required

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      <div className="text-center">
        <h2 className="mb-4 text-3xl font-bold">Connect Your Messaging Apps</h2>
        <p className="text-lg text-muted-foreground">
          Choose how you want to receive instant crypto alerts. You can connect both Telegram and
          WhatsApp.
        </p>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as 'telegram' | 'whatsapp')}
      >
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="telegram" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Telegram
            {completedServices.has('telegram') && (
              <CheckCircle className="h-4 w-4 text-green-500" />
            )}
          </TabsTrigger>
          <TabsTrigger value="whatsapp" className="flex items-center gap-2">
            <Smartphone className="h-4 w-4" />
            WhatsApp
            {completedServices.has('whatsapp') && (
              <CheckCircle className="h-4 w-4 text-green-500" />
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="telegram" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-6 w-6 text-blue-500" />
                Telegram Voice Alerts
              </CardTitle>
              <CardDescription>
                Get instant voice alerts on Telegram when crypto influencers mention your tokens.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TelegramSetup
                userId={userId}
                onSetupComplete={() => handleServiceComplete('telegram')}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="whatsapp" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Smartphone className="h-6 w-6 text-green-500" />
                WhatsApp Voice Alerts
              </CardTitle>
              <CardDescription>
                Receive instant voice messages on WhatsApp for critical crypto alerts.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <WhatsAppSetup
                userId={userId}
                onSetupComplete={() => handleServiceComplete('whatsapp')}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {allServicesCompleted && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-6">
            <div className="text-center">
              <CheckCircle className="mx-auto mb-4 h-12 w-12 text-green-500" />
              <h3 className="mb-2 text-xl font-semibold">Setup Complete!</h3>
              <p className="mb-4 text-muted-foreground">
                You're now connected to {completedServices.size} messaging service
                {completedServices.size > 1 ? 's' : ''}. You'll receive instant alerts when crypto
                influencers mention your tokens.
              </p>
              <Button 
                onClick={() => {
                  if (onSetupComplete) {
                    onSetupComplete();
                  } else {
                    router.push('/dashboard');
                  }
                }} 
                size="lg"
              >
                Continue to Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="text-center text-sm text-muted-foreground">
        <p>
          💡 <strong>Pro tip:</strong> Connect both services to never miss an alert!
        </p>
      </div>
    </div>
  );
}
