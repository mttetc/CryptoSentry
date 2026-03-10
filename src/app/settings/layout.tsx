import { redirect } from 'next/navigation';
import { getOptionalSession } from '@/lib/api/auth';
import { SettingsNav } from '@/components/settings/settings-nav';

export default async function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { session } = await getOptionalSession();

  if (!session?.user.id) {
    redirect('/auth');
  }

  return (
    <div className="container mx-auto space-y-6 py-8">
      <h1 className="text-2xl font-bold text-white">Settings</h1>
      <SettingsNav />
      {children}
    </div>
  );
}
