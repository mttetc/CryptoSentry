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
import { CreateAlertForm, type OptimisticAlertData } from './create-alert-form';

interface CreateAlertDialogProps {
  userId: string;
  onAlertCreated?: (data: OptimisticAlertData) => void;
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

  const handleCreated = (data: OptimisticAlertData) => {
    onAlertCreated?.(data);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {/* Desktop: inline button */}
      <DialogTrigger asChild>
        <Button
          size="sm"
          className="hidden bg-green-600 text-white hover:bg-green-700 sm:inline-flex"
        >
          <Plus className="mr-1.5 h-4 w-4" />
          New Alert
        </Button>
      </DialogTrigger>
      {/* Mobile: FAB */}
      <DialogTrigger asChild>
        <Button
          size="icon"
          className="fixed right-4 bottom-4 z-50 h-11 w-11 rounded-full bg-green-600 text-white shadow-lg hover:bg-green-700 sm:hidden"
        >
          <Plus className="h-5 w-5" />
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
