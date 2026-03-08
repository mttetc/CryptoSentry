'use server';

import { createServerSupabaseClient } from '@/lib/supabase/server';

interface UserContactPreferences {
  phone?: string;
  prefer_sms?: boolean;
  active_24h?: boolean;
  quiet_hours_start?: string;
  quiet_hours_end?: string;
  weekends_enabled?: boolean;
  canSend?: boolean;
  reason?: string;
  telegramEnabled?: boolean;
  telegramChatId?: string;
}

// --- Pure functions ---

function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6;
}

function isWithinQuietHours(prefs: UserContactPreferences, now: Date): boolean {
  if (!prefs.quiet_hours_start || !prefs.quiet_hours_end) {
    return false;
  }

  const [startHour, startMinute] = prefs.quiet_hours_start.split(':').map(Number);
  const [endHour, endMinute] = prefs.quiet_hours_end.split(':').map(Number);

  const start = new Date(now);
  start.setHours(startHour, startMinute, 0);

  const end = new Date(now);
  end.setHours(endHour, endMinute, 0);

  return now >= start && now <= end;
}

function evaluateCanSend(
  prefs: UserContactPreferences,
  now: Date
): { canSend: boolean; reason?: string } {
  if (!prefs.active_24h) {
    return { canSend: false, reason: 'Notifications are disabled' };
  }

  if (isWeekend(now) && !prefs.weekends_enabled) {
    return { canSend: false, reason: 'Weekend notifications are disabled' };
  }

  if (isWithinQuietHours(prefs, now)) {
    return { canSend: false, reason: 'Currently in quiet hours' };
  }

  return { canSend: true };
}

export function formatAlertMessage(
  type: 'price' | 'social',
  data: Record<string, unknown>
): string {
  if (type === 'price') {
    const direction = data.condition === 'above' ? 'risen above' : 'fallen below';
    return `${data.symbol} has ${direction} your target price of $${data.targetPrice}. Current price: $${data.price}`;
  }

  if (type === 'social') {
    const keywords = Array.isArray(data.keywords) ? data.keywords.join(', ') : '';
    return `New post from ${String(data.account)} matches your keywords: ${keywords}`;
  }

  return 'Alert triggered';
}

// --- I/O functions (compose pure logic above) ---

async function fetchUserPreferences(userId: string): Promise<UserContactPreferences | null> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('user_notification_settings')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error || !data) {
    return null;
  }

  return data as UserContactPreferences;
}

export async function checkUserPreferences(userId: string): Promise<UserContactPreferences | null> {
  try {
    const prefs = await fetchUserPreferences(userId);
    if (!prefs) {
      return null;
    }

    const { canSend, reason } = evaluateCanSend(prefs, new Date());
    return { ...prefs, canSend, reason };
  } catch (error) {
    console.error('Failed to check user preferences:', error);
    return null;
  }
}
