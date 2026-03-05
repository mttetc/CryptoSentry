'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Bot,
  MessageSquare,
  CheckCircle,
  Copy,
  ExternalLink,
  ArrowRight,
  Phone,
  Hash,
  Settings,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const steps = [
  {
    id: 1,
    title: 'Create a Telegram Bot',
    description: 'Start a conversation with @BotFather on Telegram',
    icon: Bot,
    details: [
      'Open Telegram and search for @BotFather',
      'Send /newbot command',
      "Choose a name for your bot (e.g., 'My Crypto Alerts')",
      "Choose a username (must end with 'bot', e.g., 'mycryptoalerts_bot')",
      'Copy the bot token you receive',
    ],
    code: '/newbot',
  },
  {
    id: 2,
    title: 'Get Your Chat ID',
    description: 'Find your Telegram chat ID for receiving alerts',
    icon: Hash,
    details: [
      'Start a conversation with your new bot',
      'Send any message to your bot',
      'Visit: https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates',
      "Find your chat ID in the response (it's a number)",
      'Copy the chat ID',
    ],
    code: 'https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates',
  },
  {
    id: 3,
    title: 'Connect to CryptoSentry',
    description: 'Link your bot to receive crypto alerts',
    icon: Settings,
    details: [
      'Enter your bot token in the settings',
      'Enter your chat ID',
      'Test the connection',
      "You're ready to receive alerts!",
    ],
    code: 'Bot Token: 123456789:ABCdefGHIjklMNOpqrsTUVwxyz\nChat ID: 123456789',
  },
];

export function TelegramTutorial() {
  const [currentStep, setCurrentStep] = useState(0);
  const [copiedItem, setCopiedItem] = useState<string | null>(null);
  const { toast } = useToast();

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedItem(label);
      toast({
        title: 'Copied!',
        description: `${label} copied to clipboard`,
      });
      setTimeout(() => setCopiedItem(null), 2000);
    } catch {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to copy to clipboard',
      });
    }
  };

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const currentStepData = steps[currentStep];
  const Icon = currentStepData.icon;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-4 text-center">
        <div className="flex items-center justify-center gap-2">
          <Bot className="h-8 w-8 text-blue-500" />
          <h2 className="text-3xl font-bold">Telegram Bot Setup</h2>
        </div>
        <p className="mx-auto max-w-2xl text-muted-foreground">
          Follow these simple steps to create your Telegram bot and start receiving instant crypto
          alerts
        </p>
      </div>

      {/* Progress Indicator */}
      <div className="flex items-center justify-center space-x-4">
        {steps.map((step, index) => (
          <div key={step.id} className="flex items-center">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full border-2 ${
                index <= currentStep
                  ? 'border-blue-500 bg-blue-500 text-white'
                  : 'border-muted-foreground text-muted-foreground'
              }`}
            >
              {index < currentStep ? (
                <CheckCircle className="h-4 w-4" />
              ) : (
                <span className="text-sm font-medium">{step.id}</span>
              )}
            </div>
            {index < steps.length - 1 && (
              <div
                className={`mx-2 h-0.5 w-16 ${
                  index < currentStep ? 'bg-blue-500' : 'bg-muted-foreground'
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Current Step Content */}
      <Card className="mx-auto max-w-4xl">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-blue-100 p-2">
              <Icon className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <CardTitle className="text-xl">{currentStepData.title}</CardTitle>
              <CardDescription>{currentStepData.description}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Step Details */}
          <div className="space-y-3">
            {currentStepData.details.map((detail, index) => (
              <div key={index} className="flex items-start gap-3">
                <div className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-blue-100">
                  <span className="text-xs font-medium text-blue-600">{index + 1}</span>
                </div>
                <p className="text-sm text-muted-foreground">{detail}</p>
              </div>
            ))}
          </div>

          {/* Code Example */}
          {currentStepData.code && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Example:</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(currentStepData.code, 'Code')}
                >
                  <Copy className="mr-2 h-4 w-4" />
                  {copiedItem === 'Code' ? 'Copied!' : 'Copy'}
                </Button>
              </div>
              <div className="overflow-x-auto rounded-lg bg-muted p-4 font-mono text-sm">
                {currentStepData.code}
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between pt-4">
            <Button variant="outline" onClick={prevStep} disabled={currentStep === 0}>
              Previous
            </Button>

            <div className="flex items-center gap-2">
              <Badge variant="outline">
                Step {currentStep + 1} of {steps.length}
              </Badge>
            </div>

            {currentStep < steps.length - 1 ? (
              <Button onClick={nextStep}>
                Next Step
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button onClick={() => (window.location.href = '/settings')}>
                <Settings className="mr-2 h-4 w-4" />
                Go to Settings
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Quick Links */}
      <div className="mx-auto grid max-w-4xl grid-cols-1 gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ExternalLink className="h-5 w-5" />
              Need Help?
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-sm text-muted-foreground">
              Having trouble setting up your bot? Check out our detailed guide.
            </p>
            <Button variant="outline" size="sm">
              <ExternalLink className="mr-2 h-4 w-4" />
              View Full Guide
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Test Connection
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-sm text-muted-foreground">
              Once you&apos;ve set up your bot, test the connection to make sure everything works.
            </p>
            <Button variant="outline" size="sm">
              <Phone className="mr-2 h-4 w-4" />
              Test Bot
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
