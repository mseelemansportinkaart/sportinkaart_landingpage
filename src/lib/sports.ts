export interface SportCount {
  sport: string;
  count: number;
}

export function canonicalSport(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return '';
  return trimmed
    .toLowerCase()
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export function normalizeSportCounts(rows: (string[] | null)[]): SportCount[] {
  const counts = new Map<string, number>();
  for (const arr of rows) {
    if (!arr) continue;
    for (const raw of arr) {
      const sport = canonicalSport(raw);
      if (!sport) continue;
      counts.set(sport, (counts.get(sport) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .map(([sport, count]) => ({ sport, count }))
    .sort((a, b) => b.count - a.count || a.sport.localeCompare(b.sport, 'nl'));
}
