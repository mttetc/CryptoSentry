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
import { CreateAlertForm, type OptimisticAlertData } from './create-alert-form';

interface CreateAlertDialogProps {
  userId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAlertCreated?: (data: OptimisticAlertData) => void;
  onSynced?: () => void;
}

export function CreateAlertDialog({
  userId,
  open,
  onOpenChange,
  onAlertCreated,
  onSynced,
}: CreateAlertDialogProps) {
  const handleCreated = (data: OptimisticAlertData) => {
    onAlertCreated?.(data);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
          onClose={() => onOpenChange(false)}
          onSynced={onSynced}
        />
      </DialogContent>
    </Dialog>
  );
}
