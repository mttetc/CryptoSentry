'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Twitter, Plus, X, Hash, MessageSquare, CheckCircle, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const alertSchema = z.object({
  account: z.string().min(1, 'Account is required').max(50, 'Account name too long'),
  keywords: z
    .array(z.string().min(1, 'Keyword cannot be empty'))
    .min(1, 'At least one keyword is required'),
  telegramConversationId: z.string().min(1, 'Telegram conversation ID is required'),
});

type AlertFormData = z.infer<typeof alertSchema>;

interface CreateAlertFormProps {
  userId: string;
}

export function CreateAlertForm({ userId }: CreateAlertFormProps) {
  const [keywords, setKeywords] = useState<string[]>([]);
  const [newKeyword, setNewKeyword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    reset,
  } = useForm<AlertFormData>({
    resolver: zodResolver(alertSchema),
    defaultValues: {
      keywords: [],
      telegramConversationId: '',
    },
  });

  const addKeyword = () => {
    if (newKeyword.trim() && !keywords.includes(newKeyword.trim())) {
      const updatedKeywords = [...keywords, newKeyword.trim()];
      setKeywords(updatedKeywords);
      setValue('keywords', updatedKeywords);
      setNewKeyword('');
    }
  };

  const removeKeyword = (keywordToRemove: string) => {
    const updatedKeywords = keywords.filter((k) => k !== keywordToRemove);
    setKeywords(updatedKeywords);
    setValue('keywords', updatedKeywords);
  };

  const onSubmit = async (data: AlertFormData) => {
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/alerts/social', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...data,
          userId,
          platform: 'twitter',
        }),
      });

      if (response.ok) {
        toast({
          title: 'Alert Created!',
          description: `Now monitoring @${data.account} for your keywords`,
        });
        reset();
        setKeywords([]);
      } else {
        throw new Error('Failed to create alert');
      }
    } catch {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to create alert. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-4 text-center">
        <div className="flex items-center justify-center gap-2">
          <Twitter className="h-8 w-8 text-blue-500" />
          <h2 className="text-3xl font-bold">Create X Alert</h2>
        </div>
        <p className="mx-auto max-w-2xl text-muted-foreground">
          Monitor any X (Twitter) account and get instant Telegram alerts when they mention your
          keywords
        </p>
      </div>

      {/* Form */}
      <Card className="mx-auto max-w-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            New Alert Configuration
          </CardTitle>
          <CardDescription>Fill in the details below to start monitoring</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* X Account */}
            <div className="space-y-2">
              <Label htmlFor="account" className="flex items-center gap-2">
                <Twitter className="h-4 w-4" />X Account to Monitor
              </Label>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">@</span>
                <Input
                  id="account"
                  placeholder="elonmusk"
                  {...register('account')}
                  className={errors.account ? 'border-red-500' : ''}
                />
              </div>
              {errors.account && <p className="text-sm text-red-500">{errors.account.message}</p>}
              <p className="text-xs text-muted-foreground">
                Enter the username without the @ symbol
              </p>
            </div>

            <Separator />

            {/* Keywords */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Hash className="h-4 w-4" />
                Keywords to Monitor
              </Label>
              <div className="flex gap-2">
                <Input
                  placeholder="bitcoin, crypto, ethereum..."
                  value={newKeyword}
                  onChange={(e) => setNewKeyword(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addKeyword())}
                />
                <Button type="button" onClick={addKeyword} variant="outline">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {errors.keywords && <p className="text-sm text-red-500">{errors.keywords.message}</p>}

              {/* Keywords List */}
              {keywords.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Selected Keywords:</p>
                  <div className="flex flex-wrap gap-2">
                    {keywords.map((keyword) => (
                      <Badge key={keyword} variant="secondary" className="flex items-center gap-1">
                        {keyword}
                        <button
                          type="button"
                          onClick={() => removeKeyword(keyword)}
                          className="ml-1 hover:text-red-500"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                Add keywords separated by commas or press Enter after each keyword
              </p>
            </div>

            <Separator />

            {/* Telegram Conversation ID */}
            <div className="space-y-2">
              <Label htmlFor="telegramConversationId" className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Telegram Conversation ID
              </Label>
              <Input
                id="telegramConversationId"
                placeholder="123456789"
                {...register('telegramConversationId')}
                className={errors.telegramConversationId ? 'border-red-500' : ''}
              />
              {errors.telegramConversationId && (
                <p className="text-sm text-red-500">{errors.telegramConversationId.message}</p>
              )}
              <p className="text-xs text-muted-foreground">
                The chat ID where you want to receive alerts (get this from your bot setup)
              </p>
            </div>

            <Separator />

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full"
              disabled={isSubmitting || keywords.length === 0}
            >
              {isSubmitting ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-b-2 border-white" />
                  Creating Alert...
                </>
              ) : (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Create Alert
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Help Section */}
      <Card className="mx-auto max-w-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            Need Help?
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <h4 className="font-medium">How to get your Telegram Conversation ID:</h4>
            <ol className="list-inside list-decimal space-y-1 text-sm text-muted-foreground">
              <li>Start a conversation with your bot</li>
              <li>Send any message to your bot</li>
              <li>
                Visit:{' '}
                <code className="rounded bg-muted px-1">
                  https://api.telegram.org/bot&lt;YOUR_BOT_TOKEN&gt;/getUpdates
                </code>
              </li>
              <li>Find your chat ID in the response (it&apos;s a number)</li>
            </ol>
          </div>

          <div className="space-y-2">
            <h4 className="font-medium">Tips for effective monitoring:</h4>
            <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
              <li>Use specific keywords related to your interests</li>
              <li>Monitor multiple accounts for comprehensive coverage</li>
              <li>Test your setup with a few keywords first</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
