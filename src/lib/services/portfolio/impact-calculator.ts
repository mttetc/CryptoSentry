export interface PortfolioImpact {
  positionAmount: number;
  costBasis: number;
  currentValue: number;
  impactUsd: number;
  impactPercent: number;
}

/**
 * Calculate the P&L impact for a portfolio position given the current price.
 */
export function calculateImpact(
  amount: number,
  avgBuyPrice: number,
  currentPrice: number
): PortfolioImpact {
  const costBasis = amount * avgBuyPrice;
  const currentValue = amount * currentPrice;
  const impactUsd = currentValue - costBasis;
  const impactPercent = costBasis > 0 ? (impactUsd / costBasis) * 100 : 0;

  return {
    positionAmount: amount,
    costBasis,
    currentValue,
    impactUsd,
    impactPercent,
  };
}
