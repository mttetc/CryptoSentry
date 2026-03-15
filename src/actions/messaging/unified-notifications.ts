'use server';

import { sendTelegramAlert } from '@/actions/messaging/providers/telegram/alert-notifications';
import { sendEmailAlert } from '@/actions/messaging/providers/email';
import { sendDiscordAlert } from '@/actions/messaging/providers/discord';
import { sendSmsAlert } from '@/actions/messaging/providers/sms';
import { createServiceSupabaseClient } from '@/lib/supabase/server';
import type { AlertNotification, ChannelResult, NotificationResult } from '@/types/notifications';

// --- Pure functions ---

interface ChannelRow {
  id: string;
  channel_type: string;
  config: Record<string, unknown>;
  alert_types: string[];
  is_active: boolean;
}

function buildNotificationResult(
  channelResults: Record<string, ChannelResult>
): NotificationResult {
  const overallSuccess = Object.values(channelResults).some((r) => r.success);

  return { channels: channelResults, overallSuccess };
}

import type { Database } from '@/types/database';

type DeliveryLogInsert = Database['public']['Tables']['alert_delivery_logs']['Insert'];

function buildDeliveryLogEntry(
  notification: AlertNotification,
  channel: string,
  result: ChannelResult
): DeliveryLogInsert {
  return {
    alert_id: notification.alertId ?? notification.userId,
    user_id: notification.userId,
    type: notification.alertType,
    channel,
    message_id: '',
    data: {
      ...notification.data,
      channel_success: result.success,
      channel_error: result.error,
    },
  };
}

// --- Single-responsibility I/O ---

async function checkTelegramConnected(userId: string): Promise<boolean> {
  const supabase = createServiceSupabaseClient();
  const { data } = await supabase
    .from('user_telegram_settings')
    .select('status')
    .eq('user_id', userId)
    .eq('status', 'connected')
    .single();

  return data?.status === 'connected';
}

async function fetchActiveChannels(userId: string, alertType: string): Promise<ChannelRow[]> {
  const supabase = createServiceSupabaseClient();
  const { data, error } = await supabase
    .from('notification_channels')
    .select('id, channel_type, config, alert_types, is_active')
    .eq('user_id', userId)
    .eq('is_active', true)
    .contains('alert_types', [alertType]);

  if (error) {
    console.error('[Unified] Error fetching channels:', error);
    return [];
  }

  return (data as ChannelRow[]) ?? [];
}

async function persistDeliveryLog(entry: DeliveryLogInsert): Promise<void> {
  const supabase = createServiceSupabaseClient();
  await supabase.from('alert_delivery_logs').insert(entry);
}

// --- Channel dispatch ---

async function dispatchToChannel(
  channel: ChannelRow,
  notification: AlertNotification
): Promise<ChannelResult> {
  switch (channel.channel_type) {
    case 'email': {
      const address = channel.config.address as string | undefined;
      if (!address) {
        return { success: false, error: 'No email address configured' };
      }
      const success = await sendEmailAlert(address, notification);
      return { success, error: success ? undefined : 'Failed to send email' };
    }
    case 'discord': {
      const webhookUrl = channel.config.webhook_url as string | undefined;
      if (!webhookUrl) {
        return { success: false, error: 'No Discord webhook configured' };
      }
      const success = await sendDiscordAlert(webhookUrl, notification);
      return { success, error: success ? undefined : 'Failed to send Discord message' };
    }
    case 'sms': {
      const phone = channel.config.phone as string | undefined;
      if (!phone) {
        return { success: false, error: 'No phone number configured' };
      }
      const success = await sendSmsAlert(phone, notification);
      return { success, error: success ? undefined : 'Failed to send SMS' };
    }
    default: {
      return { success: false, error: `Unsupported channel type: ${channel.channel_type}` };
    }
  }
}

async function dispatchTelegram(notification: AlertNotification): Promise<ChannelResult> {
  const connected = await checkTelegramConnected(notification.userId);
  if (!connected) {
    return { success: false, error: 'Telegram not connected' };
  }

  const success = await sendTelegramAlert(notification);
  return { success, error: success ? undefined : 'Failed to send Telegram alert' };
}

// --- Legacy fallback for users with no notification_channels rows ---

async function sendLegacyTelegramOnly(
  notification: AlertNotification
): Promise<NotificationResult> {
  const telegramResult = await dispatchTelegram(notification);
  const result = buildNotificationResult({ telegram: telegramResult });

  // Fire-and-forget delivery log
  persistDeliveryLog(buildDeliveryLogEntry(notification, 'telegram', telegramResult)).catch(
    (error) => {
      console.error('Failed to log delivery:', error);
    }
  );

  return result;
}

// --- I/O orchestrator ---

export async function sendUnifiedAlert(
  notification: AlertNotification
): Promise<NotificationResult> {
  try {
    const channels = await fetchActiveChannels(notification.userId, notification.alertType);

    // Backward compatibility: no configured channels means legacy Telegram-only
    if (channels.length === 0) {
      return sendLegacyTelegramOnly(notification);
    }

    // Separate Telegram channels (handled via user_telegram_settings) from others
    const telegramChannels = channels.filter((c) => c.channel_type === 'telegram');
    const otherChannels = channels.filter((c) => c.channel_type !== 'telegram');

    // Build dispatch promises for all channels
    const dispatches: { key: string; promise: Promise<ChannelResult> }[] = [];

    // Telegram: only dispatch once even if multiple rows exist
    if (telegramChannels.length > 0) {
      dispatches.push({
        key: 'telegram',
        promise: dispatchTelegram(notification),
      });
    }

    // Other channels: dispatch each
    for (const channel of otherChannels) {
      dispatches.push({
        key: `${channel.channel_type}_${channel.id}`,
        promise: dispatchToChannel(channel, notification),
      });
    }

    // Run all dispatches in parallel
    const settled = await Promise.allSettled(dispatches.map((d) => d.promise));

    // Build per-channel results
    const channelResults: Record<string, ChannelResult> = {};

    for (let i = 0; i < dispatches.length; i++) {
      const dispatch = dispatches[i];
      const outcome = settled[i];

      channelResults[dispatch.key] =
        outcome.status === 'fulfilled'
          ? outcome.value
          : {
              success: false,
              error: outcome.reason instanceof Error ? outcome.reason.message : 'Dispatch failed',
            };
    }

    const result = buildNotificationResult(channelResults);

    // Fire-and-forget delivery logs for each channel
    for (const [channelKey, channelResult] of Object.entries(channelResults)) {
      const channelName = channelKey.includes('_') ? channelKey.split('_')[0] : channelKey;

      persistDeliveryLog(buildDeliveryLogEntry(notification, channelName, channelResult)).catch(
        (error) => {
          console.error('Failed to log delivery:', error);
        }
      );
    }

    return result;
  } catch (error) {
    console.error('Error sending unified alert:', error);
    return buildNotificationResult({});
  }
}
