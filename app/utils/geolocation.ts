const STORAGE_KEY = 'audio-pins-last-location';
const REVERSE_GEOCODE_CACHE_KEY = 'audio-pins-geocode-cache';

export interface GeoPosition {
  lat: number;
  lng: number;
}

// Default fallback: zoomed-out world view center
export const DEFAULT_POSITION: GeoPosition = { lat: 40.7128, lng: -74.006 }; // New York
export const DEFAULT_ZOOM = 2;
export const LOCATED_ZOOM = 12;

export function getSavedLocation(): GeoPosition | null {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (typeof parsed.lat === 'number' && typeof parsed.lng === 'number') {
        return parsed;
      }
    }
  } catch {
    // ignore
  }
  return null;
}

export function saveLocation(pos: GeoPosition): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(pos));
  } catch {
    // ignore
  }
}

export function requestGeolocation(): Promise<GeoPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation not supported'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const pos: GeoPosition = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        saveLocation(pos);
        resolve(pos);
      },
      (error) => {
        reject(error);
      },
      {
        enableHighAccuracy: false,
        timeout: 8000,
        maximumAge: 300000, // 5 min cache
      }
    );
  });
}

// Reverse geocode cache
interface GeocodeCache {
  [key: string]: { name: string; timestamp: number };
}

function getGeocodeCache(): GeocodeCache {
  try {
    const cached = localStorage.getItem(REVERSE_GEOCODE_CACHE_KEY);
    return cached ? JSON.parse(cached) : {};
  } catch {
    return {};
  }
}

function setGeocodeCache(cache: GeocodeCache): void {
  try {
    localStorage.setItem(REVERSE_GEOCODE_CACHE_KEY, JSON.stringify(cache));
  } catch {
    // ignore
  }
}

function cacheKey(lat: number, lng: number): string {
  // Round to ~1km precision to reuse cache for nearby coordinates
  return `${lat.toFixed(2)},${lng.toFixed(2)}`;
}

const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

export async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  const key = cacheKey(lat, lng);
  const cache = getGeocodeCache();

  if (cache[key] && Date.now() - cache[key].timestamp < CACHE_TTL) {
    return cache[key].name;
  }

  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&zoom=10`,
      {
        headers: {
          'User-Agent': 'AudioPins/1.0 (https://github.com/audio-pins)',
        },
      }
    );

    if (!res.ok) return null;

    const data = await res.json();
    const address = data.address;
    const name =
      address?.city ||
      address?.town ||
      address?.village ||
      address?.county ||
      address?.state ||
      data.display_name?.split(',')[0] ||
      null;

    if (name) {
      cache[key] = { name, timestamp: Date.now() };
      setGeocodeCache(cache);
    }

    return name;
  } catch {
    return null;
  }
}

export interface NominatimResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
}

export async function searchLocation(query: string): Promise<NominatimResult[]> {
  if (!query.trim()) return [];

  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5`,
      {
        headers: {
          'User-Agent': 'AudioPins/1.0 (https://github.com/audio-pins)',
        },
      }
    );

    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}
