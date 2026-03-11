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
import { CreatePriceAlertForm } from './create-price-alert-form';

export function CreatePriceAlertDialog() {
  const [open, setOpen] = useState(false);

  // Allow opening from anywhere via custom event
  useEffect(() => {
    const handler = () => {
      setOpen(true);
    };
    window.addEventListener('open-create-price-alert', handler);
    return () => {
      window.removeEventListener('open-create-price-alert', handler);
    };
  }, []);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Plus className="mr-1.5 h-4 w-4" />
          New Price Alert
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>New Price Alert</DialogTitle>
          <DialogDescription>
            Get notified when a token price crosses your target.
          </DialogDescription>
        </DialogHeader>
        <CreatePriceAlertForm onClose={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}
