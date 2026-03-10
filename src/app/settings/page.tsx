import { redirect } from 'next/navigation';
import { TelegramSetup } from '@/components/telegram/telegram-setup';
import { getOptionalSession } from '@/lib/api/auth';

export default async function SettingsPage() {
  const { session } = await getOptionalSession();

  if (!session?.user.id) {
    redirect('/auth');
  }

  return (
    <div className="container mx-auto space-y-8 py-8">
      <h1 className="text-2xl font-bold text-white">Settings</h1>

      <div className="grid gap-8">
        <TelegramSetup userId={session.user.id} />
      </div>
    </div>
  );
}
