import { createServerSupabaseClient } from '@/lib/supabase/server';
import type { SocialAlertWithStats } from '@/types/alerts';

export async function getSocialAlertsWithStats(userId: string): Promise<SocialAlertWithStats[]> {
  const supabase = await createServerSupabaseClient();

  const { data: alerts, error } = await supabase
    .from('social_alerts')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching alerts:', error);
    return [];
  }

  return Promise.all(
    (alerts || []).map(async (alert) => {
      const { data: triggers } = await supabase
        .from('alert_triggers')
        .select('*')
        .eq('alert_id', alert.id)
        .gte('triggered_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .order('triggered_at', { ascending: false })
        .limit(10);

      const recentTweets = (triggers || []).map((trigger) => ({
        id: String(trigger.id),
        text: String(trigger.data?.content ?? ''),
        author: String(trigger.data?.author ?? alert.account),
        url: String(trigger.data?.tweet_url ?? ''),
        timestamp: String(trigger.triggered_at),
        engagement: {
          likes: Number(trigger.data?.engagement?.likes ?? 0),
          retweets: Number(trigger.data?.engagement?.retweets ?? 0),
          replies: Number(trigger.data?.engagement?.replies ?? 0),
        },
      }));

      return {
        id: String(alert.id),
        user_id: String(alert.user_id),
        platform: String(alert.platform),
        account: String(alert.account),
        keywords: alert.keywords ?? [],
        is_active: Boolean(alert.is_active),
        telegram_conversation_id: alert.telegram_conversation_id ?? null,
        created_at: String(alert.created_at),
        tweetCount: triggers?.length ?? 0,
        lastActivity: String(triggers?.[0]?.triggered_at ?? alert.created_at),
        recentTweets,
      };
    })
  );
}
