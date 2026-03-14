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
import {
  TrendingUp,
  TrendingDown,
  Trash2,
  Pause,
  Play,
  DollarSign,
  CheckCircle,
  Clock,
  Target,
  Repeat,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { updatePriceAlert, deletePriceAlert } from '@/actions/alerts';
import { toast } from 'sonner';
import type { PriceAlertWithStats } from '@/types/alerts';

interface PriceAlertsListProps {
  alerts: PriceAlertWithStats[];
  livePrices?: Record<string, number>;
  onDelete: (id: string) => void;
  onToggle: (id: string) => void;
}

const cardTransition = { duration: 0.25, ease: 'easeOut' as const };

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const DIRECTION_CYCLE: ('exact' | 'above' | 'below')[] = ['exact', 'above', 'below'];

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
  alert,
  livePrice,
  onDelete,
  onToggle,
  onUpdate,
}: {
  alert: PriceAlertWithStats;
  livePrice?: number;
  onDelete: (id: string) => void;
  onToggle: (id: string) => void;
  onUpdate: (id: string, patch: Partial<PriceAlertWithStats>) => void;
}) {
  const [isToggling, setIsToggling] = useState(false);

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

  const cycleDirection = async () => {
    const currentIdx = DIRECTION_CYCLE.indexOf(alert.direction as 'exact' | 'above' | 'below');
    const nextDirection = DIRECTION_CYCLE[(currentIdx + 1) % DIRECTION_CYCLE.length];
    onUpdate(alert.id, { direction: nextDirection });
    try {
      const result = await updatePriceAlert({ id: alert.id, direction: nextDirection });
      if (!result.success) {
        onUpdate(alert.id, { direction: alert.direction });
        toast.error('Failed to update direction');
      }
    } catch {
      onUpdate(alert.id, { direction: alert.direction });
    }
  };

  const toggleRecurring = async () => {
    const newRecurring = !alert.recurring;
    onUpdate(alert.id, { recurring: newRecurring });
    toast.success(newRecurring ? 'Alert will repeat' : 'Alert will fire once');
    try {
      const result = await updatePriceAlert({ id: alert.id, recurring: newRecurring });
      if (!result.success) {
        onUpdate(alert.id, { recurring: alert.recurring });
        toast.error('Failed to update');
      }
    } catch {
      onUpdate(alert.id, { recurring: alert.recurring });
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
                    ${alert.target_price.toLocaleString()}
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
                    ${alert.target_price.toLocaleString()}
                  </span>
                  {livePrice !== undefined && (
                    <>
                      {' '}
                      <span className="text-muted-foreground/60">&middot;</span>{' '}
                      <span className="font-mono text-xs">Now: ${livePrice.toLocaleString()}</span>
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

          {/* Row 3: Inline toggles + created at */}
          <div className="mt-2 flex items-center gap-3">
            {!isTriggered && (
              <>
                <button
                  type="button"
                  onClick={cycleDirection}
                  className="text-muted-foreground hover:text-foreground flex items-center gap-1 font-mono text-[10px] transition-colors"
                  title="Click to cycle: reaches / above / below"
                >
                  <DirectionIconComponent direction={alert.direction} />
                  {directionLabel(alert.direction)}
                </button>
                <button
                  type="button"
                  onClick={toggleRecurring}
                  className={cn(
                    'flex items-center gap-1 font-mono text-[10px] transition-colors',
                    alert.recurring ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                  )}
                  title={
                    alert.recurring
                      ? 'Recurring — click for one-shot'
                      : 'One-shot — click for recurring'
                  }
                >
                  {alert.recurring ? <Repeat className="h-3 w-3" /> : <Zap className="h-3 w-3" />}
                  {alert.recurring ? 'repeat' : 'once'}
                </button>
              </>
            )}
            <span className="text-muted-foreground/50 ml-auto flex items-center gap-1 font-mono text-[10px]">
              <Clock className="h-2.5 w-2.5" />
              {formatDateTime(alert.created_at)}
            </span>
          </div>
        </div>
      </SpotlightCard>
    </motion.div>
  );
}

function EmptyState() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="rounded-xl border border-dashed p-12 text-center"
    >
      <div className="bg-primary/10 mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full">
        <DollarSign className="text-primary h-6 w-6" />
      </div>
      <p className="text-muted-foreground text-sm">
        No price alerts. Track token prices and get notified when they cross your targets.
      </p>
    </motion.div>
  );
}

export function PriceAlertsList({ alerts, livePrices, onDelete, onToggle }: PriceAlertsListProps) {
  const [localAlerts, setLocalAlerts] = useState(alerts);
  const deferredAlerts = useDeferredValue(localAlerts);

  // Sync from parent
  if (alerts !== localAlerts && JSON.stringify(alerts) !== JSON.stringify(localAlerts)) {
    setLocalAlerts(alerts);
  }

  const handleUpdate = (id: string, patch: Partial<PriceAlertWithStats>) => {
    setLocalAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, ...patch } : a)));
  };

  return (
    <LayoutGroup>
      <div className="flex flex-col gap-2">
        {deferredAlerts.length === 0 ? (
          <EmptyState />
        ) : (
          <AnimatePresence mode="popLayout">
            {deferredAlerts.map((alert) => (
              <PriceAlertCard
                key={alert.id}
                alert={alert}
                livePrice={livePrices?.[alert.coingecko_id]}
                onDelete={onDelete}
                onToggle={onToggle}
                onUpdate={handleUpdate}
              />
            ))}
          </AnimatePresence>
        )}
      </div>
    </LayoutGroup>
  );
}
