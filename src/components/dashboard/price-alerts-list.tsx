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
import { TrendingUp, TrendingDown, Trash2, Pause, Play, DollarSign } from 'lucide-react';
import { updatePriceAlert, deletePriceAlert } from '@/actions/alerts';
import { toast } from 'sonner';
import type { PriceAlertWithStats } from '@/types/alerts';

interface PriceAlertsListProps {
  alerts: PriceAlertWithStats[];
  onDelete: (id: string) => void;
  onToggle: (id: string) => void;
}

const cardTransition = { duration: 0.25, ease: 'easeOut' as const };

function PriceAlertCard({
  alert,
  onDelete,
  onToggle,
}: {
  alert: PriceAlertWithStats;
  onDelete: (id: string) => void;
  onToggle: (id: string) => void;
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

  const isTriggered = alert.triggered_at !== null;
  const DirectionIcon = alert.direction === 'above' ? TrendingUp : TrendingDown;

  return (
    <motion.div
      layoutId={`price-${alert.id}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={cardTransition}
    >
      <SpotlightCard className="bg-card border">
        <div className="p-4">
          {/* Row 1: Symbol + direction + badges + actions */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2">
              <span className="font-mono text-sm font-semibold uppercase">{alert.symbol}</span>
              <DirectionIcon className="text-muted-foreground h-4 w-4" />
              <Badge
                variant={(() => {
                  if (!alert.is_active) {
                    return 'secondary';
                  }
                  if (isTriggered) {
                    return 'destructive';
                  }
                  return 'default';
                })()}
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

          {/* Row 2: Target price + direction text */}
          <div className="mt-2.5 flex items-center gap-2">
            <DollarSign className="text-primary h-3.5 w-3.5" />
            <span className="text-muted-foreground text-sm">
              Alert when price goes{' '}
              <span className="text-foreground font-medium">{alert.direction}</span>{' '}
              <span className="text-foreground font-mono font-medium">
                ${alert.target_price.toLocaleString()}
              </span>
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

export function PriceAlertsList({ alerts, onDelete, onToggle }: PriceAlertsListProps) {
  const deferredAlerts = useDeferredValue(alerts);

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
                onDelete={onDelete}
                onToggle={onToggle}
              />
            ))}
          </AnimatePresence>
        )}
      </div>
    </LayoutGroup>
  );
}
