import { TelegramSetup } from '@/components/telegram/telegram-setup';
import { getOptionalSession } from '@/lib/api/auth';
import { redirect } from 'next/navigation';
import { checkUserSetupStatus } from '@/lib/auth/setup-flow';

export default async function SetupPage() {
  const { session } = await getOptionalSession();

  if (!session?.user.id) {
    redirect('/auth');
  }

  const setupStatus = await checkUserSetupStatus(session.user.id);

  if (!setupStatus.needsSetup) {
    redirect('/dashboard');
  }

  return (
    <div className="container mx-auto max-w-2xl space-y-8 py-8">
      <div className="space-y-2 text-center">
        <h1 className="text-3xl font-bold">Welcome to CryptoSentry</h1>
        <p className="text-muted-foreground">
          Connect your Telegram account to start receiving crypto alerts.
        </p>
      </div>

      <TelegramSetup userId={session.user.id} />
    </div>
  );
}
