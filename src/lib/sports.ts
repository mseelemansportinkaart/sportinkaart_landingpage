export interface SportCount {
  sport: string;
  count: number;
}

export function canonicalSport(raw: string): string {
  if (!raw) return '';
  const trimmed = raw.trim();
  if (!trimmed) return '';
  return trimmed
    .toLowerCase()
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

// A sport gets its own /sporten-in-{city}/{sport} page only when the city has at
// least this many locations for it — below this the page would be thin content.
export const MIN_SPORT_PAGE_LOCATIONS = 3;

// URL slug for a (already canonical) sport name: "Jeu De Boules" -> "jeu-de-boules".
export function sportSlug(sport: string): string {
  return sport
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
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
