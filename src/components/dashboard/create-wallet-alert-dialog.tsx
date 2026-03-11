'use client';

import { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { CreateWalletAlertForm } from './create-wallet-alert-form';

export function CreateWalletAlertDialog() {
  const [open, setOpen] = useState(false);

  // Allow opening from anywhere via custom event
  useEffect(() => {
    const handler = () => {
      setOpen(true);
    };
    window.addEventListener('open-create-wallet-alert', handler);
    return () => {
      window.removeEventListener('open-create-wallet-alert', handler);
    };
  }, []);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Plus className="mr-1.5 h-4 w-4" />
          New Wallet Alert
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>New Wallet Alert</DialogTitle>
          <DialogDescription>
            Monitor a wallet for large transfers and get notified instantly.
          </DialogDescription>
        </DialogHeader>
        <CreateWalletAlertForm onClose={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}
