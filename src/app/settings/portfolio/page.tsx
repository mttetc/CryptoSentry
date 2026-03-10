import { getPortfolio } from '@/actions/portfolio';
import { PortfolioManager } from '@/components/settings/portfolio-manager';

export default async function PortfolioSettingsPage() {
  const result = await getPortfolio();
  const positions = result.success ? (result.positions ?? []) : [];

  return <PortfolioManager initialPositions={positions} />;
}
