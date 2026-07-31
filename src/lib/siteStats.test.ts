import { describe, expect, it } from 'vitest';
import { formatNl, joinNl, summariseCities } from './siteStats';
import { groupCitiesByRegion } from './regions';
import type { City } from './cityData';

function city(slug: string, name: string, locationCount: number, sports: [string, number][]): City {
  return {
    slug,
    name,
    latitude: 0,
    longitude: 0,
    locationCount,
    sports: sports.map(([sport, count]) => ({ sport, count })),
    topLocations: [],
    locations: [],
  };
}

describe('summariseCities', () => {
  const cities = [
    city('utrecht', 'Utrecht', 391, [['Fitness', 100], ['Yoga', 53]]),
    city('urk', 'Urk', 24, [['Fitness', 5], ['Voetbal', 3]]),
  ];

  it('sums locations and counts distinct categories across cities', () => {
    const stats = summariseCities(cities);
    expect(stats.totalLocations).toBe(415);
    expect(stats.cityCount).toBe(2);
    expect(stats.categoryCount).toBe(3);
  });

  it('merges per-sport counts and orders them by size', () => {
    expect(summariseCities(cities).sports).toEqual([
      { sport: 'Fitness', count: 105 },
      { sport: 'Yoga', count: 53 },
      { sport: 'Voetbal', count: 3 },
    ]);
  });

  it('identifies the largest city', () => {
    expect(summariseCities(cities).largestCity).toEqual({
      name: 'Utrecht',
      slug: 'utrecht',
      locationCount: 391,
    });
  });

  it('handles an empty city list', () => {
    const stats = summariseCities([]);
    expect(stats).toMatchObject({ totalLocations: 0, cityCount: 0, categoryCount: 0, largestCity: null });
  });
});

describe('formatNl', () => {
  it('groups thousands with a dot', () => {
    expect(formatNl(1902)).toBe('1.902');
    expect(formatNl(391)).toBe('391');
    expect(formatNl(1234567)).toBe('1.234.567');
    expect(formatNl(0)).toBe('0');
  });
});

describe('joinNl', () => {
  it('joins with commas and a final "en"', () => {
    expect(joinNl(['Fitness', 'Yoga', 'Dansen'])).toBe('Fitness, Yoga en Dansen');
    expect(joinNl(['Fitness'])).toBe('Fitness');
    expect(joinNl([])).toBe('');
  });
});

describe('groupCitiesByRegion', () => {
  it('places cities in their region and drops empty regions', () => {
    const groups = groupCitiesByRegion([{ slug: 'urk' }, { slug: 'utrecht' }]);
    expect(groups.map((g) => g.name)).toEqual(['Flevoland', 'Provincie Utrecht']);
  });

  it('keeps unmapped cities in a trailing group instead of losing them', () => {
    const groups = groupCitiesByRegion([{ slug: 'utrecht' }, { slug: 'nieuwestad' }]);
    expect(groups.at(-1)).toMatchObject({ name: 'Overige steden', cities: [{ slug: 'nieuwestad' }] });
  });
});
