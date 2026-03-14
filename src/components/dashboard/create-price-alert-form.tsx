'use client';

import { useState, useRef, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { Field, FieldLabel, FieldError, FieldDescription } from '@/components/ui/field';
import { toast } from 'sonner';
import { createPriceAlert } from '@/actions/alerts';
import { useDebounce } from '@/hooks/use-debounce';
import { cn } from '@/lib/utils';

interface CoinResult {
  id: string;
  symbol: string;
  name: string;
  thumb: string;
}

const priceAlertFormSchema = z.object({
  symbol: z.string().min(1, 'Coin is required'),
  coingeckoId: z.string().min(1, 'Coin selection is required'),
  targetPrice: z.number().positive('Price must be positive'),
});

type PriceAlertFormData = z.infer<typeof priceAlertFormSchema>;

interface CreatePriceAlertFormProps {
  onClose?: () => void;
}

export function CreatePriceAlertForm({ onClose }: CreatePriceAlertFormProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<CoinResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const form = useForm<PriceAlertFormData>({
    resolver: zodResolver(priceAlertFormSchema),
    defaultValues: {
      symbol: '',
      coingeckoId: '',
      targetPrice: undefined,
    },
  });

  const debouncedSearch = useDebounce(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      setShowDropdown(false);
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch(`/api/coins/search?q=${encodeURIComponent(searchQuery)}`);
      if (response.ok) {
        const data = (await response.json()) as { results: CoinResult[] };
        setResults(data.results ?? []);
        setShowDropdown(true);
      }
    } catch {
      // Silent failure on search
    } finally {
      setIsSearching(false);
    }
  }, 300);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const selectCoin = (coin: CoinResult) => {
    form.setValue('symbol', coin.symbol.toUpperCase());
    form.setValue('coingeckoId', coin.id);
    form.clearErrors('symbol');
    form.clearErrors('coingeckoId');
    setQuery(`${coin.name} (${coin.symbol.toUpperCase()})`);
    setShowDropdown(false);
  };

  const onSubmit = async (data: PriceAlertFormData) => {
    toast.success(`Tracking ${data.symbol} price`);
    form.reset();
    setQuery('');
    onClose?.();

    try {
      const result = await createPriceAlert({
        symbol: data.symbol,
        coingeckoId: data.coingeckoId,
        targetPrice: data.targetPrice,
        direction: 'exact',
        recurring: true,
      });

      if (!result.success) {
        toast.error(result.error ?? 'Failed to create price alert.');
      }
    } catch {
      toast.error('Failed to create price alert. Please try again.');
    } finally {
      window.dispatchEvent(new CustomEvent('price-alert-synced'));
    }
  };

  const { isSubmitting } = form.formState;

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
      {/* Coin search */}
      <Controller
        name="coingeckoId"
        control={form.control}
        render={({ fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel>Coin</FieldLabel>
            <div ref={dropdownRef} className="relative">
              <Input
                placeholder="Search Bitcoin, Ethereum..."
                value={query}
                onChange={(e) => {
                  const val = e.target.value;
                  setQuery(val);
                  form.setValue('coingeckoId', '');
                  form.setValue('symbol', '');
                  debouncedSearch(val);
                }}
                onFocus={() => {
                  if (results.length > 0) {
                    setShowDropdown(true);
                  }
                }}
                aria-invalid={fieldState.invalid}
              />
              {isSearching && (
                <div className="absolute top-1/2 right-3 -translate-y-1/2">
                  <Spinner className="size-3.5" />
                </div>
              )}
              {showDropdown && results.length > 0 && (
                <div className="bg-popover border-border absolute top-full z-50 mt-1 w-full overflow-hidden rounded-md border shadow-md">
                  {results.map((coin) => (
                    <button
                      key={coin.id}
                      type="button"
                      className={cn(
                        'hover:bg-accent flex w-full cursor-pointer items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors'
                      )}
                      onClick={() => selectCoin(coin)}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={coin.thumb}
                        alt=""
                        className="h-5 w-5 rounded-full"
                        width={20}
                        height={20}
                      />
                      <span className="font-medium">{coin.name}</span>
                      <span className="text-muted-foreground font-mono text-xs uppercase">
                        {coin.symbol}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            <FieldDescription>Search by name or symbol</FieldDescription>
          </Field>
        )}
      />

      {/* Target price */}
      <Controller
        name="targetPrice"
        control={form.control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor={field.name}>Target Price (USD)</FieldLabel>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground font-mono">$</span>
              <Input
                {...field}
                id={field.name}
                type="number"
                step="any"
                min={0}
                placeholder="50000"
                value={field.value ?? ''}
                onChange={(e) => field.onChange(e.target.valueAsNumber || undefined)}
                aria-invalid={fieldState.invalid}
              />
            </div>
            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </Field>
        )}
      />

      {/* Submit */}
      <Button
        type="submit"
        className="w-full"
        disabled={isSubmitting || !form.watch('coingeckoId')}
      >
        {isSubmitting ? (
          <>
            <Spinner className="mr-2 size-3.5" />
            Creating...
          </>
        ) : (
          'Create Price Alert'
        )}
      </Button>
    </form>
  );
}
