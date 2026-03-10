import { getOptionalSession } from '@/lib/api/auth';
import { TelegramSetup } from '@/components/telegram/telegram-setup';
import { NotificationChannels } from '@/components/settings/notification-channels';
import { getNotificationChannels } from '@/actions/channels';

export default async function SettingsPage() {
  const { session } = await getOptionalSession();

  // Layout already redirects if not authenticated, but guard for safety
  if (!session?.user.id) {
    return null;
  }

  const channelsResult = await getNotificationChannels();
  const channels = channelsResult.success ? channelsResult.data : [];

  return (
    <div className="grid gap-8">
      <TelegramSetup userId={session.user.id} />
      <NotificationChannels channels={channels} />
    </div>
  );
}
