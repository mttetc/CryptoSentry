'use client';

import { useState, useRef } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { Field, FieldLabel, FieldError, FieldDescription } from '@/components/ui/field';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { X } from 'lucide-react';
import { toast } from 'sonner';
import { createSocialAlert, validateXAccount } from '@/actions/alerts';

const alertSchema = z.object({
  account: z.string().min(1, 'Account is required').max(50, 'Account name too long'),
  keywords: z
    .array(z.object({ value: z.string().min(1, 'Keyword cannot be empty') }))
    .min(1, 'At least one keyword is required'),
  sentimentFilter: z.enum(['bullish', 'bearish', 'neutral']).nullable().optional(),
});

type AlertFormData = z.infer<typeof alertSchema>;

export interface OptimisticAlertData {
  account: string;
  keywords: string[];
  platform: string;
}

interface CreateAlertFormProps {
  userId: string;
  onAlertCreated?: (data: OptimisticAlertData) => void;
  onClose?: () => void;
}

export function CreateAlertForm({ onAlertCreated, onClose }: CreateAlertFormProps) {
  const [newKeyword, setNewKeyword] = useState('');
  const keywordInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<AlertFormData>({
    resolver: zodResolver(alertSchema),
    defaultValues: {
      account: '',
      keywords: [],
      sentimentFilter: null,
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'keywords',
  });

  const addKeyword = (raw?: string) => {
    const trimmed = (raw ?? newKeyword).trim();
    if (trimmed && !fields.some((f) => f.value === trimmed)) {
      append({ value: trimmed });
    }
    setNewKeyword('');
  };

  const onSubmit = async (data: AlertFormData) => {
    const keywords = data.keywords.map((k) => k.value);

    // Validate account exists on X
    const { exists } = await validateXAccount(data.account);
    if (!exists) {
      form.setError('account', { message: 'This account does not exist on X' });
      return;
    }

    // Optimistic: close dialog and show alert immediately
    toast.success(`Now monitoring @${data.account}`);
    form.reset();
    onAlertCreated?.({ account: data.account, keywords, platform: 'twitter' });
    onClose?.();

    // Server action runs async — dispatch event when done so dashboard can reconcile
    try {
      const result = await createSocialAlert({
        account: data.account,
        keywords,
        platform: 'twitter',
        sentimentFilter: data.sentimentFilter ?? undefined,
      });

      if (!result.success) {
        toast.error(result.error || 'Failed to create alert.');
      }
    } catch {
      toast.error('Failed to create alert. Please try again.');
    } finally {
      window.dispatchEvent(new CustomEvent('alert-synced'));
    }
  };

  const {
    errors: { keywords: keywordsError },
    isSubmitting,
  } = form.formState;

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
              <span className="text-muted-foreground font-mono">@</span>
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
        <div
          className="border-input focus-within:ring-ring/50 focus-within:border-ring flex min-h-9 flex-wrap items-center gap-1.5 rounded-md border px-3 py-1.5 focus-within:ring-[3px]"
          onClick={() => keywordInputRef.current?.focus()}
        >
          <AnimatePresence mode="popLayout">
            {fields.map((field, index) => (
              <motion.div
                key={field.id}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.15 }}
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
          </AnimatePresence>
          <input
            ref={keywordInputRef}
            className="placeholder:text-muted-foreground min-w-[120px] flex-1 bg-transparent text-sm outline-none"
            placeholder={fields.length === 0 ? 'bitcoin, ethereum...' : ''}
            value={newKeyword}
            onChange={(e) => {
              const val = e.target.value;
              if (val.endsWith(' ') || val.endsWith(',')) {
                addKeyword(val.slice(0, -1));
              } else {
                setNewKeyword(val);
              }
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addKeyword();
              }
              if (e.key === 'Backspace' && newKeyword === '' && fields.length > 0) {
                remove(fields.length - 1);
              }
            }}
            onBlur={() => addKeyword()}
          />
        </div>
        {keywordsError && <FieldError errors={[keywordsError]} />}
        <FieldDescription>Press space or comma to add a keyword</FieldDescription>
      </Field>

      {/* Sentiment filter */}
      <Controller
        name="sentimentFilter"
        control={form.control}
        render={({ field }) => (
          <Field>
            <FieldLabel>Sentiment Filter</FieldLabel>
            <FieldDescription>Only trigger when tweet sentiment matches</FieldDescription>
            <Select
              value={field.value ?? 'any'}
              onValueChange={(v) => field.onChange(v === 'any' ? null : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Any sentiment" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Any sentiment</SelectItem>
                <SelectItem value="bullish">Bullish only</SelectItem>
                <SelectItem value="bearish">Bearish only</SelectItem>
                <SelectItem value="neutral">Neutral only</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        )}
      />

      {/* Submit */}
      <Button type="submit" className="w-full" disabled={isSubmitting || fields.length === 0}>
        {isSubmitting ? (
          <>
            <Spinner className="mr-2 size-3.5" />
            Creating...
          </>
        ) : (
          'Create Alert'
        )}
      </Button>
    </form>
  );
}
