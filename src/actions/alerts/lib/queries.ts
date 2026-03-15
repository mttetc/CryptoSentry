import { cache } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';
import type { SocialAlertWithStats } from '@/types/alerts';

interface TriggerData {
  content?: string;
  author?: string;
  tweet_url?: string;
  engagement?: {
    likes?: number;
    retweets?: number;
    replies?: number;
  };
}

export const getSocialAlertsWithStats = cache(async function getSocialAlertsWithStats(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<SocialAlertWithStats[]> {
  const { data: alerts, error } = await supabase
    .from('social_alerts')
    .select('id, user_id, platform, account, keywords, is_active, call_enabled, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching alerts:', error);
    return [];
  }

  if (!alerts || alerts.length === 0) {
    return [];
  }

  const alertIds = alerts.map((a) => a.id);
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const { data: allTriggers } = await supabase
    .from('alert_triggers')
    .select('id, alert_id, data, triggered_at')
    .in('alert_id', alertIds)
    .gte('triggered_at', cutoff)
    .order('triggered_at', { ascending: false });

  const triggersByAlert = new Map<string, NonNullable<typeof allTriggers>>();
  for (const trigger of allTriggers ?? []) {
    const id = trigger.alert_id ?? '';
    const existing = triggersByAlert.get(id) ?? [];
    if (existing.length < 10) {
      existing.push(trigger);
    }
    triggersByAlert.set(id, existing);
  }

  return alerts.map((alert) => {
    const triggers = triggersByAlert.get(alert.id) ?? [];

    const recentTweets = triggers.map((trigger) => {
      const d = trigger.data as unknown as TriggerData;
      return {
        id: trigger.id,
        text: d.content ?? '',
        author: d.author ?? alert.account,
        url: d.tweet_url ?? '',
        timestamp: trigger.triggered_at,
        engagement: {
          likes: d.engagement?.likes ?? 0,
          retweets: d.engagement?.retweets ?? 0,
          replies: d.engagement?.replies ?? 0,
        },
      };
    });

    return {
      id: alert.id,
      user_id: alert.user_id,
      platform: alert.platform,
      account: alert.account,
      keywords: alert.keywords,
      is_active: alert.is_active,
      call_enabled: alert.call_enabled,
      created_at: alert.created_at,
      tweetCount: triggers.length,
      lastActivity: triggers[0]?.triggered_at ?? alert.created_at,
      recentTweets,
    };
  });
});
