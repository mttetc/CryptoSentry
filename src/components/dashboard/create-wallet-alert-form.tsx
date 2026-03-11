'use client';

import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { Field, FieldLabel, FieldError, FieldDescription } from '@/components/ui/field';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { createWalletAlert } from '@/actions/wallets';

const walletAlertFormSchema = z.object({
  address: z.string().min(1, 'Wallet address is required'),
  label: z.string().optional(),
  chain: z.enum(['eth', 'sol']),
  minValueUsd: z.number().positive('Minimum value must be positive'),
});

type WalletAlertFormData = z.infer<typeof walletAlertFormSchema>;

interface CreateWalletAlertFormProps {
  onClose?: () => void;
}

export function CreateWalletAlertForm({ onClose }: CreateWalletAlertFormProps) {
  const form = useForm<WalletAlertFormData>({
    resolver: zodResolver(walletAlertFormSchema),
    defaultValues: {
      address: '',
      label: '',
      chain: 'eth',
      minValueUsd: 10_000,
    },
  });

  const onSubmit = async (data: WalletAlertFormData) => {
    const displayLabel = data.label || `${data.address.slice(0, 6)}...${data.address.slice(-4)}`;
    toast.success(`Monitoring wallet ${displayLabel}`);
    form.reset();
    onClose?.();

    try {
      const result = await createWalletAlert({
        address: data.address,
        label: data.label || undefined,
        chain: data.chain,
        minValueUsd: data.minValueUsd,
      });

      if (!result.success) {
        toast.error(result.error ?? 'Failed to create wallet alert.');
      }
    } catch {
      toast.error('Failed to create wallet alert. Please try again.');
    } finally {
      window.dispatchEvent(new CustomEvent('wallet-alert-synced'));
    }
  };

  const { isSubmitting } = form.formState;

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
      {/* Address */}
      <Controller
        name="address"
        control={form.control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor={field.name}>Wallet Address</FieldLabel>
            <Input
              {...field}
              id={field.name}
              placeholder="0x1234... or So1ana..."
              aria-invalid={fieldState.invalid}
            />
            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </Field>
        )}
      />

      {/* Label */}
      <Controller
        name="label"
        control={form.control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor={field.name}>Label (optional)</FieldLabel>
            <Input
              {...field}
              id={field.name}
              placeholder="Whale wallet, Exchange hot wallet..."
              aria-invalid={fieldState.invalid}
            />
            <FieldDescription>A friendly name to identify this wallet</FieldDescription>
            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </Field>
        )}
      />

      {/* Chain */}
      <Controller
        name="chain"
        control={form.control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel>Chain</FieldLabel>
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="eth">Ethereum</SelectItem>
                <SelectItem value="sol">Solana</SelectItem>
              </SelectContent>
            </Select>
            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </Field>
        )}
      />

      {/* Min value USD */}
      <Controller
        name="minValueUsd"
        control={form.control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor={field.name}>Minimum Transfer Value (USD)</FieldLabel>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground font-mono">$</span>
              <Input
                {...field}
                id={field.name}
                type="number"
                step="any"
                min={0}
                placeholder="10000"
                value={field.value ?? ''}
                onChange={(e) => field.onChange(e.target.valueAsNumber || undefined)}
                aria-invalid={fieldState.invalid}
              />
            </div>
            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            <FieldDescription>Only alert on transfers above this value</FieldDescription>
          </Field>
        )}
      />

      {/* Submit */}
      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? (
          <>
            <Spinner className="mr-2 size-3.5" />
            Creating...
          </>
        ) : (
          'Create Wallet Alert'
        )}
      </Button>
    </form>
  );
}
