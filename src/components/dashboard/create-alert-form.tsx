'use client';

import { useState } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Spinner } from '@/components/ui/spinner';
import {
  Field,
  FieldLabel,
  FieldError,
  FieldDescription,
} from '@/components/ui/field';
import { Plus, X, Phone } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { createSocialAlert } from '@/actions/alerts';

const alertSchema = z.object({
  account: z.string().min(1, 'Account is required').max(50, 'Account name too long'),
  keywords: z
    .array(z.object({ value: z.string().min(1, 'Keyword cannot be empty') }))
    .min(1, 'At least one keyword is required'),
  telegramConversationId: z.string().optional(),
  callEnabled: z.boolean(),
});

type AlertFormData = z.infer<typeof alertSchema>;

interface CreateAlertFormProps {
  userId: string;
  onAlertCreated?: () => void;
  onClose?: () => void;
}

export function CreateAlertForm({ onAlertCreated, onClose }: CreateAlertFormProps) {
  const [newKeyword, setNewKeyword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const form = useForm<AlertFormData>({
    resolver: zodResolver(alertSchema),
    defaultValues: {
      account: '',
      keywords: [],
      telegramConversationId: '',
      callEnabled: true,
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'keywords',
  });

  const addKeyword = () => {
    const trimmed = newKeyword.trim();
    if (trimmed && !fields.some((f) => f.value === trimmed)) {
      append({ value: trimmed });
      setNewKeyword('');
    }
  };

  const onSubmit = async (data: AlertFormData) => {
    setIsSubmitting(true);
    try {
      const result = await createSocialAlert({
        account: data.account,
        keywords: data.keywords.map((k) => k.value),
        platform: 'twitter',
        telegramConversationId: data.telegramConversationId,
        callEnabled: data.callEnabled,
      });

      if (result.success) {
        toast({ title: 'Alert created', description: `Now monitoring @${data.account}` });
        form.reset();
        onAlertCreated?.();
        onClose?.();
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: result.error || 'Failed to create alert.',
        });
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

  const keywordsError = form.formState.errors.keywords;

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
      {/* Account */}
      <Controller
        name="account"
        control={form.control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor={field.name}>Account</FieldLabel>
            <div className="flex items-center gap-2">
              <span className="font-mono text-muted-foreground">@</span>
              <Input
                {...field}
                id={field.name}
                placeholder="elonmusk"
                aria-invalid={fieldState.invalid}
              />
            </div>
            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </Field>
        )}
      />

      {/* Keywords */}
      <Field data-invalid={Boolean(keywordsError)}>
        <FieldLabel>Keywords</FieldLabel>
        <div className="flex gap-2">
          <Input
            placeholder="bitcoin, ethereum..."
            value={newKeyword}
            onChange={(e) => setNewKeyword(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addKeyword();
              }
            }}
          />
          <Button type="button" onClick={addKeyword} variant="secondary" size="icon">
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        {keywordsError && <FieldError errors={[keywordsError]} />}
        <AnimatePresence mode="popLayout">
          {fields.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="flex flex-wrap gap-1.5 pt-1"
            >
              {fields.map((field, index) => (
                <motion.div
                  key={field.id}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.2 }}
                >
                  <Badge variant="default" className="font-mono">
                    {field.value}
                    <button
                      type="button"
                      onClick={() => remove(index)}
                      className="ml-1.5 cursor-pointer opacity-60 hover:opacity-100"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </Field>

      {/* Telegram Conversation ID */}
      <Controller
        name="telegramConversationId"
        control={form.control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor={field.name}>
              Telegram Conversation ID{' '}
              <span className="text-muted-foreground font-normal">(optional)</span>
            </FieldLabel>
            <Input
              {...field}
              id={field.name}
              placeholder="123456789"
              aria-invalid={fieldState.invalid}
            />
            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            <FieldDescription>
              Start a conversation with @CryptoSentryBot on Telegram, then paste the chat ID here.
            </FieldDescription>
          </Field>
        )}
      />

      {/* Call Toggle */}
      <Controller
        name="callEnabled"
        control={form.control}
        render={({ field }) => (
          <Field orientation="horizontal" className="rounded-lg border p-3.5">
            <div className="flex items-center gap-3">
              <Phone className="h-4 w-4 text-primary" />
              <div>
                <p className="text-sm font-medium">Telegram Call</p>
                <p className="text-xs text-muted-foreground">Ring when keywords match</p>
              </div>
            </div>
            <Switch
              id={field.name}
              checked={field.value}
              onCheckedChange={field.onChange}
            />
          </Field>
        )}
      />

      {/* Submit */}
      <Button type="submit" className="w-full" disabled={isSubmitting || fields.length === 0}>
        {isSubmitting ? (
          <>
            <Spinner size="sm" className="mr-2" />
            Creating...
          </>
        ) : (
          'Create Alert'
        )}
      </Button>
    </form>
  );
}
