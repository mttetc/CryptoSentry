'use client';

import { useState, useDeferredValue } from 'react';
import { motion, AnimatePresence, LayoutGroup } from 'motion/react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { SpotlightCard } from '@/components/ui/spotlight';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  TrendingUp,
  TrendingDown,
  Trash2,
  Pause,
  Play,
  DollarSign,
  CheckCircle,
  Target,
  Plus,
} from 'lucide-react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { updatePriceAlert, deletePriceAlert } from '@/actions/alerts';
import { formatDistance } from 'date-fns';
import { toast } from 'sonner';
import type { PriceAlertWithStats } from '@/types/alerts';

interface PriceAlertsListProps {
  alerts: PriceAlertWithStats[];
  livePrices?: Record<string, number>;
  onDelete: (id: string) => void;
  onToggle: (id: string) => void;
  onRequestCreate?: () => void;
}

const cardTransition = { duration: 0.25, ease: 'easeOut' as const };

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatPrice(n: number): string {
  return n.toLocaleString('en-US');
}

function directionLabel(d: string): string {
  if (d === 'exact') {
    return 'reaches';
  }
  return d;
}

function DirectionIconComponent({ direction }: { direction: string }) {
  if (direction === 'above') {
    return <TrendingUp className="h-3 w-3" />;
  }
  if (direction === 'below') {
    return <TrendingDown className="h-3 w-3" />;
  }
  return <Target className="h-3 w-3" />;
}

function PriceAlertCard({
  alert: initialAlert,
  livePrice,
  onDelete,
  onToggle,
}: {
  alert: PriceAlertWithStats;
  livePrice?: number;
  onDelete: (id: string) => void;
  onToggle: (id: string) => void;
}) {
  const [alert, setAlert] = useState(initialAlert);
  const [isToggling, setIsToggling] = useState(false);

  // Sync parent changes (e.g. after refresh)
  if (
    initialAlert.is_active !== alert.is_active ||
    initialAlert.triggered_at !== alert.triggered_at
  ) {
    setAlert(initialAlert);
  }

  const handleDelete = async () => {
    onDelete(alert.id);
    toast.success(`${alert.symbol} price alert removed`);
    try {
      const result = await deletePriceAlert(alert.id);
      if (!result.success) {
        toast.error('Failed to delete alert');
      }
    } catch {
      toast.error('Failed to delete alert');
    }
  };

  const handleToggle = async () => {
    const wasActive = alert.is_active;
    onToggle(alert.id);
    setIsToggling(true);
    toast.success(wasActive ? 'Alert paused' : 'Alert resumed');
    try {
      const result = await updatePriceAlert({
        id: alert.id,
        isActive: !wasActive,
      });
      if (!result.success) {
        onToggle(alert.id);
        toast.error('Failed to update alert');
      }
    } catch {
      onToggle(alert.id);
      toast.error('Failed to update alert');
    } finally {
      setIsToggling(false);
    }
  };

  const changeDirection = async (nextDirection: 'exact' | 'above' | 'below') => {
    const prev = {
      direction: alert.direction,
      last_triggered_at: alert.last_triggered_at,
      triggered_at: alert.triggered_at,
      is_active: alert.is_active,
    };
    setAlert((a) => ({
      ...a,
      direction: nextDirection,
      last_triggered_at: null,
      triggered_at: null,
      is_active: true,
    }));
    try {
      const result = await updatePriceAlert({ id: alert.id, direction: nextDirection });
      if (!result.success) {
        setAlert((a) => ({ ...a, ...prev }));
        toast.error('Failed to update direction');
      }
    } catch {
      setAlert((a) => ({ ...a, ...prev }));
    }
  };

  const changeRecurring = async (next: boolean) => {
    const prevRecurring = alert.recurring;
    const prevLastTriggered = alert.last_triggered_at;
    setAlert((a) => ({ ...a, recurring: next, last_triggered_at: null }));
    toast.success(next ? 'Alert will repeat' : 'Alert will fire once');
    try {
      const result = await updatePriceAlert({ id: alert.id, recurring: next });
      if (!result.success) {
        setAlert((a) => ({ ...a, recurring: prevRecurring, last_triggered_at: prevLastTriggered }));
        toast.error('Failed to update');
      }
    } catch {
      setAlert((a) => ({ ...a, recurring: prevRecurring, last_triggered_at: prevLastTriggered }));
    }
  };

  const isTriggered = alert.triggered_at !== null && !alert.recurring;
  const lastTriggered = alert.last_triggered_at;

  return (
    <motion.div
      layoutId={`price-${alert.id}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={cardTransition}
      className={cn(isTriggered && 'opacity-50')}
    >
      <SpotlightCard className={cn('bg-card border', isTriggered && 'border-dashed')}>
        <div className="p-4">
          {/* Row 1: Symbol + badges + actions */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2">
              {alert.logo && (
                <Image
                  src={alert.logo}
                  alt=""
                  width={20}
                  height={20}
                  className="rounded-full"
                  referrerPolicy="no-referrer"
                />
              )}
              <span
                className={cn(
                  'font-mono text-sm font-semibold uppercase',
                  isTriggered && 'line-through'
                )}
              >
                {alert.symbol}
              </span>
              {isTriggered ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <DirectionIconComponent direction={alert.direction} />
              )}
              <Badge
                variant={(() => {
                  if (isTriggered) {
                    return 'secondary';
                  }
                  if (!alert.is_active) {
                    return 'secondary';
                  }
                  return 'default';
                })()}
                className={cn(isTriggered && 'border-green-500/20 text-green-600')}
              >
                {(() => {
                  if (isTriggered) {
                    return 'Triggered';
                  }
                  if (alert.is_active) {
                    return 'Active';
                  }
                  return 'Paused';
                })()}
              </Badge>
            </div>

            <div className="flex shrink-0 items-center gap-1">
              {!isTriggered && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleToggle}
                  disabled={isToggling}
                  aria-label={alert.is_active ? 'Pause alert' : 'Resume alert'}
                  className="h-7 w-7"
                >
                  {(() => {
                    if (isToggling) {
                      return <Spinner className="size-3.5" />;
                    }
                    if (alert.is_active) {
                      return <Pause className="h-3.5 w-3.5" />;
                    }
                    return <Play className="h-3.5 w-3.5" />;
                  })()}
                </Button>
              )}
              <Dialog>
                <DialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Delete alert"
                    className="text-muted-foreground hover:text-destructive h-7 w-7"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </DialogTrigger>
                <DialogContent showCloseButton={false}>
                  <DialogHeader>
                    <DialogTitle>Delete price alert?</DialogTitle>
                    <DialogDescription>
                      This will permanently delete the {alert.symbol} price alert. This action
                      cannot be undone.
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <DialogClose asChild>
                      <Button variant="outline">Cancel</Button>
                    </DialogClose>
                    <DialogClose asChild>
                      <Button variant="destructive" onClick={handleDelete}>
                        Delete
                      </Button>
                    </DialogClose>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Row 2: Target price + live price */}
          <div className="mt-2.5 flex items-center gap-2">
            {isTriggered ? (
              <CheckCircle className="h-3.5 w-3.5 text-green-500" />
            ) : (
              <DollarSign className="text-primary h-3.5 w-3.5" />
            )}
            <span className="text-muted-foreground text-sm">
              {isTriggered ? (
                <>
                  Price {directionLabel(alert.direction)}{' '}
                  <span className="font-mono font-medium line-through">
                    ${formatPrice(alert.target_price)}
                  </span>
                  {alert.triggered_at && (
                    <>
                      {' '}
                      <span className="text-muted-foreground/60">&middot;</span>{' '}
                      <span className="font-mono text-xs">
                        {formatDateTime(alert.triggered_at)}
                      </span>
                    </>
                  )}
                </>
              ) : (
                <>
                  Alert when price {directionLabel(alert.direction)}{' '}
                  <span className="text-foreground font-mono font-medium">
                    ${formatPrice(alert.target_price)}
                  </span>
                  {livePrice !== undefined && (
                    <>
                      {' '}
                      <span className="text-muted-foreground/60">&middot;</span>{' '}
                      <span className="font-mono text-xs">Now: ${formatPrice(livePrice)}</span>
                    </>
                  )}
                  {lastTriggered && (
                    <>
                      {' '}
                      <span className="text-muted-foreground/60">&middot;</span>{' '}
                      <span className="font-mono text-xs">
                        Last: {formatDateTime(lastTriggered)}
                      </span>
                    </>
                  )}
                </>
              )}
            </span>
          </div>

          {/* Row 3: Direction select + recurring switch + created at */}
          <div className="mt-2 flex items-center gap-3">
            {!isTriggered && (
              <>
                <Select
                  value={alert.direction}
                  onValueChange={(v) => {
                    changeDirection(v as 'exact' | 'above' | 'below');
                  }}
                >
                  <SelectTrigger className="h-6 w-[110px] text-[11px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="exact">
                      <span className="flex items-center gap-1.5">
                        <Target className="h-3 w-3" /> reaches
                      </span>
                    </SelectItem>
                    <SelectItem value="above">
                      <span className="flex items-center gap-1.5">
                        <TrendingUp className="h-3 w-3" /> above
                      </span>
                    </SelectItem>
                    <SelectItem value="below">
                      <span className="flex items-center gap-1.5">
                        <TrendingDown className="h-3 w-3" /> below
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
                <label className="flex items-center gap-1.5">
                  <span className="text-muted-foreground text-[11px]">
                    {alert.recurring ? 'repeat' : 'once'}
                  </span>
                  <Switch
                    checked={alert.recurring}
                    onCheckedChange={changeRecurring}
                    className="scale-75"
                  />
                </label>
              </>
            )}
            <span className="text-muted-foreground/50 ml-auto font-mono text-[10px]">
              {formatDistance(new Date(alert.created_at), new Date(), {
                addSuffix: true,
              })}
            </span>
          </div>
        </div>
      </SpotlightCard>
    </motion.div>
  );
}

function AddPriceAlertCard({ onRequestCreate }: { onRequestCreate?: () => void }) {
  return (
    <motion.div layoutId="add-price-alert-card" layout transition={cardTransition}>
      <button
        type="button"
        onClick={() => onRequestCreate?.()}
        className="border-primary/20 hover:border-primary/40 hover:bg-primary/5 flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed p-6 transition-colors"
      >
        <div className="bg-primary/10 flex h-8 w-8 items-center justify-center rounded-full">
          <Plus className="text-primary h-4 w-4" />
        </div>
        <span className="text-muted-foreground text-sm font-medium">Add alert</span>
      </button>
    </motion.div>
  );
}

export function PriceAlertsList({
  alerts,
  livePrices,
  onDelete,
  onToggle,
  onRequestCreate,
}: PriceAlertsListProps) {
  const deferredAlerts = useDeferredValue(alerts);

  return (
    <LayoutGroup>
      <div className="flex flex-col gap-2">
        <AnimatePresence mode="popLayout">
          {deferredAlerts.map((alert) => (
            <PriceAlertCard
              key={alert.id}
              alert={alert}
              livePrice={livePrices?.[alert.binance_symbol]}
              onDelete={onDelete}
              onToggle={onToggle}
            />
          ))}
        </AnimatePresence>
        <AddPriceAlertCard onRequestCreate={onRequestCreate} />
      </div>
    </LayoutGroup>
  );
}
