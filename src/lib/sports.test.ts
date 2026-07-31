import { describe, it, expect } from 'vitest';
import { canonicalSport, normalizeSportCounts, sportSlug } from './sports';

describe('sportSlug', () => {
  it('slugifies multi-word and casing', () => {
    expect(sportSlug('Jeu De Boules')).toBe('jeu-de-boules');
    expect(sportSlug('Fitness')).toBe('fitness');
    expect(sportSlug('Crossfit')).toBe('crossfit');
  });
});

describe('canonicalSport', () => {
  it('title-cases and trims', () => {
    expect(canonicalSport('  fitness ')).toBe('Fitness');
  });
  it('merges casing variants', () => {
    expect(canonicalSport('Jeu de Boules')).toBe(canonicalSport('Jeu De Boules'));
  });
  it('returns empty for blank', () => {
    expect(canonicalSport('   ')).toBe('');
  });
});

describe('normalizeSportCounts', () => {
  it('counts and merges casing duplicates', () => {
    const result = normalizeSportCounts([
      ['Fitness', 'Jeu de Boules'],
      ['fitness', 'Jeu De Boules'],
      null,
    ]);
    expect(result).toEqual([
      { sport: 'Fitness', count: 2 },
      { sport: 'Jeu De Boules', count: 2 },
    ]);
  });
  it('sorts by count desc then name', () => {
    const result = normalizeSportCounts([['Yoga'], ['Yoga'], ['Boksen']]);
    expect(result[0]).toEqual({ sport: 'Yoga', count: 2 });
    expect(result[1]).toEqual({ sport: 'Boksen', count: 1 });
  });
  it('skips null elements inside a sport array', () => {
    expect(normalizeSportCounts([['Fitness', null as unknown as string]])).toEqual([{ sport: 'Fitness', count: 1 }]);
  });
});
