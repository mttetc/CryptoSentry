// Extract token symbols from tweet text (e.g., $SOL, $BTC, $ETH)
const TOKEN_PATTERN = /\$([A-Z]{2,10})\b/g;

export function detectTokens(text: string): string[] {
  const matches = text.match(TOKEN_PATTERN);
  if (!matches) {
    return [];
  }
  // Remove $ prefix and deduplicate
  return [...new Set(matches.map((m) => m.slice(1)))];
}
