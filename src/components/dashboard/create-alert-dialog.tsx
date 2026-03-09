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
import { CreateAlertForm } from './create-alert-form';

interface CreateAlertDialogProps {
  userId: string;
  onAlertCreated?: () => void;
}

export function CreateAlertDialog({ userId, onAlertCreated }: CreateAlertDialogProps) {
  const [open, setOpen] = useState(false);

  // Allow opening from anywhere via custom event
  useEffect(() => {
    const handler = () => {
      setOpen(true);
    };
    window.addEventListener('open-create-alert', handler);
    return () => {
      window.removeEventListener('open-create-alert', handler);
    };
  }, []);

  const handleCreated = () => {
    onAlertCreated?.();
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-1.5 h-4 w-4" />
          New Alert
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>New Alert</DialogTitle>
          <DialogDescription>Monitor a Twitter account for specific keywords.</DialogDescription>
        </DialogHeader>
        <CreateAlertForm
          userId={userId}
          onAlertCreated={handleCreated}
          onClose={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
