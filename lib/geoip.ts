// lib/geoip.ts
export interface GeoCoord {
  lat: number;
  lng: number;
  country: string;
  city?: string;
}

const CACHE = new Map<string, GeoCoord | null>();

export async function lookupIP(ip: string): Promise<GeoCoord | null> {
  if (CACHE.has(ip)) return CACHE.get(ip) || null;

  try {
    // Using free ip-api.com (rate limit: 45 req/min)
    const response = await fetch(`http://ip-api.com/json/${ip}?fields=status,country,countryCode,lat,lon,city`);
    const data = await response.json();

    if (data.status !== "success") {
      CACHE.set(ip, null);
      return null;
    }

    const coord: GeoCoord = {
      lat: data.lat,
      lng: data.lon,
      country: data.countryCode,
      city: data.city,
    };

    CACHE.set(ip, coord);
    return coord;
  } catch (error) {
    console.error(`GeoIP lookup failed for ${ip}:`, error);
    CACHE.set(ip, null);
    return null;
  }
}
