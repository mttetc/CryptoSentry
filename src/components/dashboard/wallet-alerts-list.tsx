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
import { Trash2, Pause, Play, Plus } from 'lucide-react';
import { updateWalletAlert, deleteWalletAlert } from '@/actions/wallets';
import { formatDistance } from 'date-fns';
import { useNow } from '@/hooks/use-now';
import { toast } from 'sonner';
import { plural } from '@/lib/utils/plural';
import type { WalletAlertWithStats } from '@/types/alerts';

interface WalletAlertsListProps {
  alerts: WalletAlertWithStats[];
  onDelete: (id: string) => void;
  onToggle: (id: string) => void;
  onRequestCreate?: () => void;
}

const cardTransition = { duration: 0.25, ease: 'easeOut' as const };

function truncateAddress(address: string): string {
  if (address.length <= 12) {
    return address;
  }
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function WalletAlertCard({
  alert,
  onDelete,
  onToggle,
}: {
  alert: WalletAlertWithStats;
  onDelete: (id: string) => void;
  onToggle: (id: string) => void;
}) {
  const [isToggling, setIsToggling] = useState(false);
  const now = useNow();

  const handleDelete = async () => {
    onDelete(alert.id);
    toast.success('Wallet alert removed');
    try {
      const result = await deleteWalletAlert(alert.id);
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
      const result = await updateWalletAlert({
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

  return (
    <motion.div
      layoutId={`wallet-${alert.id}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={cardTransition}
    >
      <SpotlightCard className="bg-card border">
        <div className="p-4">
          {/* Row 1: Address + chain badge + status + actions */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2">
              <span className="truncate font-mono text-sm font-medium">
                {truncateAddress(alert.address)}
              </span>
              <Badge variant="outline" className="font-mono text-[10px] uppercase">
                {alert.chain}
              </Badge>
              <Badge variant={alert.is_active ? 'default' : 'secondary'}>
                {alert.is_active ? 'Active' : 'Paused'}
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
                    <DialogTitle>Delete wallet alert?</DialogTitle>
                    <DialogDescription>
                      This will permanently delete the wallet alert for{' '}
                      {alert.label ?? truncateAddress(alert.address)}. This action cannot be undone.
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

          {/* Row 2: Label + min value + stats */}
          <div className="mt-2.5 flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2">
              {alert.label && (
                <span className="text-muted-foreground truncate text-sm">{alert.label}</span>
              )}
              <span className="text-muted-foreground font-mono text-xs">
                Min ${alert.min_value_usd.toLocaleString()}
              </span>
            </div>
            <div className="text-muted-foreground flex shrink-0 items-center gap-3 text-xs">
              <span className="font-mono">{plural(alert.triggerCount, 'trigger')}</span>
              {alert.lastActivity && (
                <span>
                  {formatDistance(new Date(alert.lastActivity), now, { addSuffix: true })}
                </span>
              )}
            </div>
          </div>

          {/* Row 3: Created at */}
          <div className="text-muted-foreground/50 mt-2 font-mono text-[10px]">
            {formatDistance(new Date(alert.created_at), now, { addSuffix: true })}
          </div>
        </div>
      </SpotlightCard>
    </motion.div>
  );
}

function AddWalletAlertCard({ onRequestCreate }: { onRequestCreate?: () => void }) {
  return (
    <motion.div layoutId="add-wallet-alert-card" layout transition={cardTransition}>
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

export function WalletAlertsList({
  alerts,
  onDelete,
  onToggle,
  onRequestCreate,
}: WalletAlertsListProps) {
  const deferredAlerts = useDeferredValue(alerts);

  return (
    <LayoutGroup>
      <div className="flex flex-col gap-2">
        <AnimatePresence mode="popLayout">
          {deferredAlerts.map((alert) => (
            <WalletAlertCard key={alert.id} alert={alert} onDelete={onDelete} onToggle={onToggle} />
          ))}
        </AnimatePresence>
        <AddWalletAlertCard onRequestCreate={onRequestCreate} />
      </div>
    </LayoutGroup>
  );
}
