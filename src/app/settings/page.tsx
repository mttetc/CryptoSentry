import { TelegramSetup } from '@/components/telegram/telegram-setup';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export default async function SettingsPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.user.id) {
    return <div>Please log in to access settings.</div>;
  }

  return (
    <div className="container mx-auto space-y-8 py-8">
      <h1 className="text-2xl font-bold">Settings</h1>

      <div className="grid gap-8">
        <TelegramSetup userId={session.user.id} />
        {/* Other settings components */}
      </div>
    </div>
  );
}
