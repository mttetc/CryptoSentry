'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Mail, MessageSquare, Phone, Trash2 } from 'lucide-react';
import {
  addNotificationChannel,
  updateNotificationChannel,
  removeNotificationChannel,
} from '@/actions/channels';

// --- Types ---

interface NotificationChannelRow {
  id: string;
  channel_type: string;
  config: Record<string, unknown>;
  is_active: boolean;
  alert_types: string[];
}

interface NotificationChannelsProps {
  channels: Record<string, unknown>[];
}

// --- Constants ---

const ALERT_TYPE_OPTIONS = ['social', 'price', 'whale', 'composite'] as const;

const CHANNEL_LABELS: Record<string, string> = {
  email: 'Email address',
  discord: 'Webhook URL',
  sms: 'Phone number',
};

const CHANNEL_DEFS = [
  {
    type: 'email',
    label: 'Email',
    icon: Mail,
    placeholder: 'you@example.com',
    configKey: 'address',
    validate: (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
    errorMessage: 'Please enter a valid email address',
  },
  {
    type: 'discord',
    label: 'Discord',
    icon: MessageSquare,
    placeholder: 'https://discord.com/api/webhooks/...',
    configKey: 'webhook_url',
    validate: (value: string) => value.startsWith('https://discord.com/api/webhooks/'),
    errorMessage: 'Please enter a valid Discord webhook URL',
  },
  {
    type: 'sms',
    label: 'SMS',
    icon: Phone,
    placeholder: '+1234567890',
    configKey: 'phone',
    validate: (value: string) => /^\+[1-9]\d{1,14}$/.test(value),
    errorMessage: 'Please enter a valid phone number in E.164 format (e.g. +1234567890)',
  },
] as const;

// --- Helper ---

function castChannel(raw: Record<string, unknown>): NotificationChannelRow {
  return {
    id: String(raw.id),
    channel_type: String(raw.channel_type),
    config: (raw.config ?? {}) as Record<string, unknown>,
    is_active: Boolean(raw.is_active),
    alert_types: (raw.alert_types ?? []) as string[],
  };
}

function omitKey<T>(record: Record<string, T>, key: string): Record<string, T> {
  return Object.fromEntries(Object.entries(record).filter(([k]) => k !== key));
}

function getSaveButtonLabel(isSaving: boolean, hasExisting: boolean): string {
  if (isSaving) {
    return 'Saving...';
  }
  if (hasExisting) {
    return 'Update';
  }
  return 'Add';
}

// --- Component ---

export function NotificationChannels({ channels: rawChannels }: NotificationChannelsProps) {
  const [channels, setChannels] = useState<NotificationChannelRow[]>(
    rawChannels.map((ch) => castChannel(ch))
  );
  const [pendingInputs, setPendingInputs] = useState<Record<string, string>>({});
  const [pendingAlertTypes, setPendingAlertTypes] = useState<Record<string, string[]>>({});
  const [savingStates, setSavingStates] = useState<Record<string, boolean>>({});

  function getChannelForType(channelType: string): NotificationChannelRow | undefined {
    return channels.find((c) => c.channel_type === channelType);
  }

  function getInputValue(channelType: string, configKey: string): string {
    if (pendingInputs[channelType] !== undefined) {
      return pendingInputs[channelType];
    }
    const existing = getChannelForType(channelType);
    if (existing) {
      return String(existing.config[configKey] ?? '');
    }
    return '';
  }

  function getAlertTypes(channelType: string): string[] {
    if (pendingAlertTypes[channelType]) {
      return pendingAlertTypes[channelType];
    }
    const existing = getChannelForType(channelType);
    if (existing) {
      return existing.alert_types;
    }
    return ['social', 'price', 'whale', 'composite'];
  }

  function toggleAlertType(channelType: string, alertType: string) {
    const current = getAlertTypes(channelType);
    const updated = current.includes(alertType)
      ? current.filter((t) => t !== alertType)
      : [...current, alertType];
    setPendingAlertTypes((prev) => ({ ...prev, [channelType]: updated }));
  }

  async function handleSave(
    channelType: string,
    configKey: string,
    validateFn: (v: string) => boolean,
    errorMsg: string
  ) {
    const value = getInputValue(channelType, configKey);
    if (!validateFn(value)) {
      toast.error(errorMsg);
      return;
    }

    const alertTypes = getAlertTypes(channelType);
    const existing = getChannelForType(channelType);

    setSavingStates((prev) => ({ ...prev, [channelType]: true }));

    try {
      if (existing) {
        // Update existing channel
        const result = await updateNotificationChannel({
          id: existing.id,
          config: { [configKey]: value },
          alertTypes: alertTypes as ('social' | 'price' | 'whale' | 'composite')[],
        });

        if (!result.success) {
          toast.error(result.error ?? 'Failed to update channel');
          return;
        }

        setChannels((prev) =>
          prev.map((c) =>
            c.id === existing.id
              ? { ...c, config: { [configKey]: value }, alert_types: alertTypes }
              : c
          )
        );
        toast.success(`${channelType} channel updated`);
      } else {
        // Add new channel
        const result = await addNotificationChannel({
          channelType: channelType as 'email' | 'discord' | 'sms',
          config: { [configKey]: value },
          alertTypes: alertTypes as ('social' | 'price' | 'whale' | 'composite')[],
        });

        if (!result.success) {
          toast.error(result.error ?? 'Failed to add channel');
          return;
        }

        // Refresh with optimistic update (id will be stale but page will revalidate)
        setChannels((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            channel_type: channelType,
            config: { [configKey]: value },
            is_active: true,
            alert_types: alertTypes,
          },
        ]);
        toast.success(`${channelType} channel added`);
      }

      // Clear pending state
      setPendingInputs((prev) => omitKey(prev, channelType));
      setPendingAlertTypes((prev) => omitKey(prev, channelType));
    } catch {
      toast.error('An unexpected error occurred');
    } finally {
      setSavingStates((prev) => ({ ...prev, [channelType]: false }));
    }
  }

  async function handleRemove(channelType: string) {
    const existing = getChannelForType(channelType);
    if (!existing) {
      return;
    }

    setSavingStates((prev) => ({ ...prev, [channelType]: true }));

    try {
      const result = await removeNotificationChannel(existing.id);

      if (!result.success) {
        toast.error(result.error ?? 'Failed to remove channel');
        return;
      }

      setChannels((prev) => prev.filter((c) => c.id !== existing.id));
      setPendingInputs((prev) => omitKey(prev, channelType));
      toast.success(`${channelType} channel removed`);
    } catch {
      toast.error('An unexpected error occurred');
    } finally {
      setSavingStates((prev) => ({ ...prev, [channelType]: false }));
    }
  }

  async function handleToggleActive(channelType: string) {
    const existing = getChannelForType(channelType);
    if (!existing) {
      return;
    }

    const newActive = !existing.is_active;
    setSavingStates((prev) => ({ ...prev, [channelType]: true }));

    try {
      const result = await updateNotificationChannel({
        id: existing.id,
        isActive: newActive,
      });

      if (!result.success) {
        toast.error(result.error ?? 'Failed to toggle channel');
        return;
      }

      setChannels((prev) =>
        prev.map((c) => (c.id === existing.id ? { ...c, is_active: newActive } : c))
      );
    } catch {
      toast.error('An unexpected error occurred');
    } finally {
      setSavingStates((prev) => ({ ...prev, [channelType]: false }));
    }
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-white">Notification Channels</h2>
      <p className="text-muted-foreground text-sm">
        Configure additional notification channels beyond Telegram voice calls.
      </p>

      <div className="grid gap-4 md:grid-cols-3">
        {CHANNEL_DEFS.map((def) => {
          const existing = getChannelForType(def.type);
          const Icon = def.icon;
          const isSaving = savingStates[def.type] ?? false;
          const inputValue = getInputValue(def.type, def.configKey);
          const alertTypes = getAlertTypes(def.type);

          return (
            <Card key={def.type}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Icon className="text-primary h-5 w-5" />
                    {def.label}
                  </CardTitle>
                  {existing && (
                    <Switch
                      checked={existing.is_active}
                      onCheckedChange={() => handleToggleActive(def.type)}
                      disabled={isSaving}
                    />
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor={`channel-${def.type}`} className="text-muted-foreground text-xs">
                    {CHANNEL_LABELS[def.type]}
                  </Label>
                  <Input
                    id={`channel-${def.type}`}
                    placeholder={def.placeholder}
                    value={inputValue}
                    onChange={(e) =>
                      setPendingInputs((prev) => ({ ...prev, [def.type]: e.target.value }))
                    }
                    disabled={isSaving}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-muted-foreground text-xs">Alert types</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {ALERT_TYPE_OPTIONS.map((alertType) => {
                      const isSelected = alertTypes.includes(alertType);
                      return (
                        <Badge
                          key={alertType}
                          variant={isSelected ? 'default' : 'outline'}
                          className="cursor-pointer select-none"
                          onClick={() => toggleAlertType(def.type, alertType)}
                        >
                          {alertType}
                        </Badge>
                      );
                    })}
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="flex-1"
                    onClick={() =>
                      handleSave(def.type, def.configKey, def.validate, def.errorMessage)
                    }
                    disabled={isSaving || !inputValue}
                  >
                    {getSaveButtonLabel(isSaving, Boolean(existing))}
                  </Button>
                  {existing && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleRemove(def.type)}
                      disabled={isSaving}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
