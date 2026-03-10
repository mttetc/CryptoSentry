import { getPortfolio } from '@/actions/portfolio';
import { PortfolioManager } from '@/components/settings/portfolio-manager';

export const dynamic = 'force-dynamic';

export default async function PortfolioSettingsPage() {
  const result = await getPortfolio();
  const positions = result.success ? (result.positions ?? []) : [];

  return <PortfolioManager initialPositions={positions} />;
}
