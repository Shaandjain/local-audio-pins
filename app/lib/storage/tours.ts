import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'fs';
import path from 'path';
import { GeneratedTour } from '../types/tour';
import { Pin, CollectionsData } from '../types/pin';

const TOURS_DIR = path.join(process.cwd(), 'data', 'tours');
const DATA_PATH = path.join(process.cwd(), 'data', 'collections.json');

function ensureToursDir(): void {
  if (!existsSync(TOURS_DIR)) {
    mkdirSync(TOURS_DIR, { recursive: true });
  }
}

function getTourPath(tourId: string): string {
  return path.join(TOURS_DIR, `${tourId}.json`);
}

function generateTourId(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = 'tour_';
  for (let i = 0; i < 10; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export function createTour(
  deviceId: string,
  name: string,
  pins: Pin[],
  center: { lat: number; lng: number },
  generationJobId: string,
  estimatedDuration: number,
  totalDistance: number
): GeneratedTour {
  ensureToursDir();

  const tour: GeneratedTour = {
    id: generateTourId(),
    deviceId,
    name,
    pins,
    center,
    generationJobId,
    estimatedDuration,
    totalDistance,
    createdAt: new Date().toISOString(),
  };

  saveTour(tour);
  return tour;
}

export function getTour(tourId: string): GeneratedTour | null {
  const filePath = getTourPath(tourId);

  if (!existsSync(filePath)) {
    return null;
  }

  try {
    const data = readFileSync(filePath, 'utf-8');
    return JSON.parse(data) as GeneratedTour;
  } catch (error) {
    console.error(`Error reading tour ${tourId}:`, error);
    return null;
  }
}

export function saveTour(tour: GeneratedTour): void {
  ensureToursDir();
  const filePath = getTourPath(tour.id);
  writeFileSync(filePath, JSON.stringify(tour, null, 2));
}

export function getToursByDevice(deviceId: string): GeneratedTour[] {
  ensureToursDir();

  const files = readdirSync(TOURS_DIR).filter((f) => f.endsWith('.json'));
  const tours: GeneratedTour[] = [];

  for (const file of files) {
    const tour = getTour(file.replace('.json', ''));
    if (tour && tour.deviceId === deviceId) {
      tours.push(tour);
    }
  }

  return tours.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export function deleteTour(tourId: string): boolean {
  const filePath = getTourPath(tourId);

  if (!existsSync(filePath)) {
    return false;
  }

  try {
    const { unlinkSync } = require('fs');
    unlinkSync(filePath);
    return true;
  } catch (error) {
    console.error(`Error deleting tour ${tourId}:`, error);
    return false;
  }
}

// Add pins to a collection (for AI-generated pins)
export function addPinsToCollection(
  collectionId: string,
  pins: Pin[]
): { success: boolean; error?: string } {
  try {
    const data: CollectionsData = JSON.parse(readFileSync(DATA_PATH, 'utf-8'));
    const collectionIndex = data.collections.findIndex((c) => c.id === collectionId);

    if (collectionIndex === -1) {
      return { success: false, error: 'Collection not found' };
    }

    data.collections[collectionIndex].pins.push(...pins);
    writeFileSync(DATA_PATH, JSON.stringify(data, null, 2));

    return { success: true };
  } catch (error) {
    console.error('Error adding pins to collection:', error);
    return { success: false, error: 'Failed to update collection' };
  }
}

// Get pins within a bounding radius
export function getPinsInRadius(
  collectionId: string,
  center: { lat: number; lng: number },
  radiusMeters: number
): Pin[] {
  try {
    const data: CollectionsData = JSON.parse(readFileSync(DATA_PATH, 'utf-8'));
    const collection = data.collections.find((c) => c.id === collectionId);

    if (!collection) {
      return [];
    }

    return collection.pins.filter((pin) => {
      const distance = haversineDistance(center.lat, center.lng, pin.lat, pin.lng);
      return distance <= radiusMeters;
    });
  } catch (error) {
    console.error('Error getting pins in radius:', error);
    return [];
  }
}

function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371e3; // Earth's radius in meters
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lng2 - lng1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}
