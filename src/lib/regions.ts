/**
 * Where Sportinkaart actually has coverage today. The audit flagged the homepage for
 * claiming "Nederland" while the dataset is four regions, so both the homepage and the
 * /steden hub group the cities by their real province/streek.
 */
export interface RegionGroup {
  /** Heading form, e.g. "Provincie Utrecht". */
  name: string;
  /** Mid-sentence form, e.g. "de provincie Utrecht". */
  inlineName: string;
  /** Short line used under the region heading. */
  blurb: string;
  slugs: string[];
}

export const REGION_GROUPS: RegionGroup[] = [
  {
    name: 'Flevoland',
    inlineName: 'Flevoland',
    blurb: 'Van Almere en Lelystad tot de Noordoostpolder en Urk.',
    slugs: ['almere', 'lelystad', 'dronten', 'zeewolde', 'emmeloord', 'urk'],
  },
  {
    name: 'Provincie Utrecht',
    inlineName: 'de provincie Utrecht',
    blurb: 'De stad Utrecht plus Amersfoort, de Heuvelrug en het Groene Hart.',
    slugs: ['utrecht', 'amersfoort', 'veenendaal', 'nieuwegein', 'zeist', 'houten', 'woerden'],
  },
  {
    name: 'Het Gooi',
    inlineName: 'het Gooi',
    blurb: 'Hilversum, Bussum en Huizen in het Noord-Hollandse Gooi.',
    slugs: ['hilversum', 'bussum', 'huizen'],
  },
  {
    name: 'Veluwerand',
    inlineName: 'de Gelderse Veluwerand',
    blurb: 'Ede en Harderwijk aan de Gelderse kant.',
    slugs: ['ede', 'harderwijk'],
  },
];

/**
 * Groups cities by region, preserving each group's curated order. Any city that is not
 * mapped yet (a new `regions` row in Supabase) lands in a trailing "Overige steden"
 * group rather than silently disappearing from the hub page.
 */
export function groupCitiesByRegion<T extends { slug: string }>(
  cities: T[],
): { name: string; inlineName: string; blurb: string; cities: T[] }[] {
  const bySlug = new Map(cities.map((c) => [c.slug, c]));
  const claimed = new Set<string>();
  const groups = REGION_GROUPS.map((group) => {
    const members: T[] = [];
    for (const slug of group.slugs) {
      const city = bySlug.get(slug);
      if (!city) continue;
      members.push(city);
      claimed.add(slug);
    }
    return { name: group.name, inlineName: group.inlineName, blurb: group.blurb, cities: members };
  }).filter((g) => g.cities.length > 0);

  const rest = cities.filter((c) => !claimed.has(c.slug));
  if (rest.length > 0) {
    groups.push({
      name: 'Overige steden',
      inlineName: 'overige steden',
      blurb: 'Ook al te vinden op Sportinkaart.',
      cities: rest,
    });
  }
  return groups;
}
