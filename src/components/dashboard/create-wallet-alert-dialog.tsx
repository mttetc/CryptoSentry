'use client';

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

interface CreateWalletAlertDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSynced?: () => void;
}

export function CreateWalletAlertDialog({
  open,
  onOpenChange,
  onSynced,
}: CreateWalletAlertDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm" className="bg-green-600 text-white hover:bg-green-700">
          <Plus className="mr-1.5 h-4 w-4" />
          New Alert
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>New Wallet Alert</DialogTitle>
          <DialogDescription>
            Monitor a wallet for large transfers and get notified instantly.
          </DialogDescription>
        </DialogHeader>
        <CreateWalletAlertForm onClose={() => onOpenChange(false)} onSynced={onSynced} />
      </DialogContent>
    </Dialog>
  );
}
