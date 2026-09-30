import { getOptionalSession } from '@/lib/api/auth';
import { TelegramQrConnect } from '@/components/telegram/telegram-qr-connect';
import { NotificationChannels } from '@/components/settings/notification-channels';
import { getNotificationChannels } from '@/actions/channels';
import { buildTelegramConnectLink } from '@/lib/telegram-connect-token';

export default async function SettingsPage() {
  const { session, supabase } = await getOptionalSession();

  // Layout already redirects if not authenticated, but guard for safety
  if (!session?.user.id || !supabase) {
    return null;
  }

  const [channelsResult, { data: telegramSettings }] = await Promise.all([
    getNotificationChannels(),
    supabase
      .from('user_telegram_settings')
      .select('status')
      .eq('user_id', session.user.id)
      .maybeSingle(),
  ]);
  const channels = channelsResult.success ? channelsResult.data : [];

  return (
    <div className="grid gap-8">
      <TelegramQrConnect
        initialLink={buildTelegramConnectLink(session.user.id)}
        isConnected={telegramSettings?.status === 'connected'}
      />
      <NotificationChannels channels={channels} />
    </div>
  );
}
