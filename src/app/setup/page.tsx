import { TelegramQrConnect } from '@/components/telegram/telegram-qr-connect';
import { getOptionalSession } from '@/lib/api/auth';
import { buildTelegramConnectLink } from '@/lib/telegram-connect-token';
import { redirect } from 'next/navigation';

export default async function SetupPage() {
  const { session, supabase } = await getOptionalSession();

  if (!session?.user.id || !supabase) {
    redirect('/auth');
  }

  const { data: telegramSettings } = await supabase
    .from('user_telegram_settings')
    .select('status')
    .eq('user_id', session.user.id)
    .maybeSingle();

  return (
    <div className="container mx-auto max-w-2xl space-y-8 py-8">
      <div className="space-y-2 text-center">
        <h1 className="text-3xl font-bold text-white">Welcome to CryptoSentry</h1>
        <p className="text-neutral-400">
          Connect your Telegram account to start receiving crypto alerts.
        </p>
      </div>

      <TelegramQrConnect
        initialLink={buildTelegramConnectLink(session.user.id)}
        isConnected={telegramSettings?.status === 'connected'}
      />
    </div>
  );
}
