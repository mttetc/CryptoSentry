import { MessagingSetup } from '@/components/messaging/messaging-setup';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export default async function SetupPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.user.id) {
    redirect('/auth');
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <MessagingSetup userId={session.user.id} />
    </div>
  );
}
