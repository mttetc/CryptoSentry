import { listApiKeys } from '@/actions/api-keys';
import { ApiKeyManager } from '@/components/settings/api-key-manager';

export default async function ApiKeySettingsPage() {
  const result = await listApiKeys();
  const keys = result.success ? result.keys : [];

  return <ApiKeyManager initialKeys={keys} />;
}
