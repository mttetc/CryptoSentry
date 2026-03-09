import { TelegramSetup } from '@/components/telegram/telegram-setup';
import { getOptionalSession } from '@/lib/api/auth';
import { redirect } from 'next/navigation';

export default async function SetupPage() {
  const { session } = await getOptionalSession();

  if (!session?.user.id) {
    redirect('/auth');
  }

  return (
    <div className="container mx-auto max-w-2xl space-y-8 py-8">
      <div className="space-y-2 text-center">
        <h1 className="text-3xl font-bold text-white">Welcome to CryptoSentry</h1>
        <p className="text-neutral-400">
          Connect your Telegram account to start receiving crypto alerts.
        </p>
      </div>

      <TelegramSetup userId={session.user.id} />
    </div>
  );
}
