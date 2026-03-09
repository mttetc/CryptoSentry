/**
 * Returns "N word(s)" with correct singular/plural.
 * `plural(3, 'alert')` → `"3 alerts"`
 * `plural(1, 'match', 'matches')` → `"1 match"`
 */
export function plural(count: number, singular: string, pluralForm?: string): string {
  return `${count} ${pluralWord(count, singular, pluralForm)}`;
}

/** Returns just the word (no number). */
export function pluralWord(count: number, singular: string, pluralForm?: string): string {
  return count === 1 ? singular : (pluralForm ?? `${singular}s`);
}
