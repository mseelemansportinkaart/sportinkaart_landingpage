import type { City } from './cityData';
import type { SportCount } from './sports';

export interface SiteStats {
  totalLocations: number;
  cityCount: number;
  /** Distinct sport categories across every city, after casing is canonicalised. */
  categoryCount: number;
  /** All categories, most locations first. */
  sports: SportCount[];
  largestCity: { name: string; slug: string; locationCount: number } | null;
}

/**
 * Rolls the per-city aggregates up into the site-wide numbers used in homepage copy.
 * Derived at build time so the copy can never drift from the database.
 */
export function summariseCities(cities: City[]): SiteStats {
  const totals = new Map<string, number>();
  for (const city of cities) {
    for (const { sport, count } of city.sports) {
      totals.set(sport, (totals.get(sport) ?? 0) + count);
    }
  }
  const sports = [...totals.entries()]
    .map(([sport, count]) => ({ sport, count }))
    .sort((a, b) => b.count - a.count || a.sport.localeCompare(b.sport, 'nl'));

  const largest = cities.reduce<City | null>(
    (best, c) => (best === null || c.locationCount > best.locationCount ? c : best),
    null,
  );

  return {
    totalLocations: cities.reduce((sum, c) => sum + c.locationCount, 0),
    cityCount: cities.length,
    categoryCount: sports.length,
    sports,
    largestCity: largest
      ? { name: largest.name, slug: largest.slug, locationCount: largest.locationCount }
      : null,
  };
}

/** 1902 -> "1.902". Explicit rather than toLocaleString so the build never depends on ICU data. */
export function formatNl(n: number): string {
  const digits = String(Math.trunc(Math.abs(n)));
  let out = '';
  for (let i = 0; i < digits.length; i++) {
    if (i > 0 && (digits.length - i) % 3 === 0) out += '.';
    out += digits[i];
  }
  return (n < 0 ? '-' : '') + out;
}

/** "Fitness, Yoga en Dansen" — Dutch list with an "en" before the last item. */
export function joinNl(items: string[]): string {
  if (items.length === 0) return '';
  if (items.length === 1) return items[0];
  return `${items.slice(0, -1).join(', ')} en ${items[items.length - 1]}`;
}
