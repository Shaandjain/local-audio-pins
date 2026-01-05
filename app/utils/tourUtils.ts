import { Pin } from '../components/RecordingModal';

export interface BoundingBox {
  north: number; // max latitude
  south: number; // min latitude
  east: number;  // max longitude
  west: number;  // min longitude
}

export function isPinInBounds(pin: Pin, bounds: BoundingBox): boolean {
  return (
    pin.lat >= bounds.south &&
    pin.lat <= bounds.north &&
    pin.lng >= bounds.west &&
    pin.lng <= bounds.east
  );
}

export function getPinsInBounds(pins: Pin[], bounds: BoundingBox): Pin[] {
  return pins.filter((pin) => isPinInBounds(pin, bounds));
}

function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lng2 - lng1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

export type StartFrom = 'north' | 'west' | 'nearest';

export function generateWalkingTour(pins: Pin[], startFrom: StartFrom = 'north'): Pin[] {
  if (pins.length <= 1) return [...pins];

  const remaining = [...pins];
  const tour: Pin[] = [];

  // Find starting pin based on strategy
  let startPin: Pin;
  if (startFrom === 'north') {
    startPin = remaining.reduce((a, b) => (a.lat > b.lat ? a : b));
  } else if (startFrom === 'west') {
    startPin = remaining.reduce((a, b) => (a.lng < b.lng ? a : b));
  } else {
    // 'nearest' - start from the pin closest to the center of all pins
    const centerLat = remaining.reduce((sum, p) => sum + p.lat, 0) / remaining.length;
    const centerLng = remaining.reduce((sum, p) => sum + p.lng, 0) / remaining.length;
    startPin = remaining.reduce((closest, p) => {
      const distP = haversineDistance(centerLat, centerLng, p.lat, p.lng);
      const distClosest = haversineDistance(centerLat, centerLng, closest.lat, closest.lng);
      return distP < distClosest ? p : closest;
    });
  }

  // Add starting pin to tour
  tour.push(startPin);
  remaining.splice(remaining.indexOf(startPin), 1);

  // Nearest-neighbor algorithm
  while (remaining.length > 0) {
    const lastPin = tour[tour.length - 1];
    let nearestPin = remaining[0];
    let nearestDist = haversineDistance(lastPin.lat, lastPin.lng, nearestPin.lat, nearestPin.lng);

    for (let i = 1; i < remaining.length; i++) {
      const dist = haversineDistance(lastPin.lat, lastPin.lng, remaining[i].lat, remaining[i].lng);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearestPin = remaining[i];
      }
    }

    tour.push(nearestPin);
    remaining.splice(remaining.indexOf(nearestPin), 1);
  }

  return tour;
}

export function estimateTourDistance(pins: Pin[]): number {
  if (pins.length < 2) return 0;

  let totalDistance = 0;
  for (let i = 1; i < pins.length; i++) {
    totalDistance += haversineDistance(pins[i - 1].lat, pins[i - 1].lng, pins[i].lat, pins[i].lng);
  }

  return totalDistance;
}

export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)}m`;
  }
  return `${(meters / 1000).toFixed(1)}km`;
}
