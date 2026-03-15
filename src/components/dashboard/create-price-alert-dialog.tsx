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
import { CreatePriceAlertForm } from './create-price-alert-form';

interface CreatePriceAlertDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSynced?: () => void;
}

export function CreatePriceAlertDialog({
  open,
  onOpenChange,
  onSynced,
}: CreatePriceAlertDialogProps) {
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
          <DialogTitle>New Price Alert</DialogTitle>
          <DialogDescription>
            Get notified when a token price crosses your target.
          </DialogDescription>
        </DialogHeader>
        <CreatePriceAlertForm onClose={() => onOpenChange(false)} onSynced={onSynced} />
      </DialogContent>
    </Dialog>
  );
}
