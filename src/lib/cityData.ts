import { supabase } from './supabase';
import { normalizeSportCounts, type SportCount } from './sports';

export interface CityLocation {
  name: string;
  address: string | null;
  sport_nl: string[] | null;
  website: string | null;
  rating: number | null;
  is_featured: boolean | null;
  is_partner: boolean | null;
}

export interface City {
  slug: string;
  name: string;
  latitude: number;
  longitude: number;
  locationCount: number;
  sports: SportCount[];
  topLocations: CityLocation[];
}

async function getActiveRegions() {
  const { data, error } = await supabase
    .from('regions')
    .select('region_name, slug, latitude, longitude')
    .eq('is_active', true)
    .order('region_name');
  if (error) throw new Error(`regions query failed: ${error.message}`);
  return data ?? [];
}

async function getCity(
  slug: string,
  name: string,
  latitude: number,
  longitude: number,
): Promise<City> {
  const { data, error } = await supabase
    .from(slug)
    .select('name, address, sport_nl, website, is_featured, is_partner')
    .eq('is_active', true);
  if (error) throw new Error(`city '${slug}' query failed: ${error.message}`);
  // The 'rating' column does not exist in the current schema; default to null
  // so the CityLocation contract (needed by downstream city-page tasks) still holds.
  const rows = (data ?? []).map((r) => ({ ...r, rating: null })) as CityLocation[];
  const sports = normalizeSportCounts(rows.map((r) => r.sport_nl));
  const topLocations = [...rows]
    .sort(
      (a, b) =>
        Number(b.is_partner) - Number(a.is_partner) ||
        Number(b.is_featured) - Number(a.is_featured) ||
        (b.rating ?? 0) - (a.rating ?? 0) ||
        a.name.localeCompare(b.name, 'nl'),
    )
    .slice(0, 12);
  return { slug, name, latitude, longitude, locationCount: rows.length, sports, topLocations };
}

export async function getAllCities(): Promise<City[]> {
  const regions = await getActiveRegions();
  return Promise.all(
    regions.map((r) => getCity(r.slug, r.region_name, r.latitude, r.longitude)),
  );
}
