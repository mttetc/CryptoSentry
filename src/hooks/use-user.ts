import { authClient } from '@/lib/auth-client';

export function useUser() {
  const { data: session, isPending } = authClient.useSession();

  const user = session?.user
    ? {
        id: session.user.id,
        email: session.user.email || undefined,
      }
    : null;

  return { user, loading: isPending };
}
