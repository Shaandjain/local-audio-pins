import { PinCategory } from './pin';

export interface UserPreferences {
  deviceId: string;
  favoritePinIds: string[];
  categoryWeights: Record<PinCategory, number>;
  visitedLocations: Array<{
    lat: number;
    lng: number;
    timestamp: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

export const DEFAULT_CATEGORY_WEIGHTS: Record<PinCategory, number> = {
  General: 0.167,
  Food: 0.167,
  History: 0.167,
  Nature: 0.167,
  Culture: 0.167,
  Architecture: 0.165,
};

export function createDefaultPreferences(deviceId: string): UserPreferences {
  const now = new Date().toISOString();
  return {
    deviceId,
    favoritePinIds: [],
    categoryWeights: { ...DEFAULT_CATEGORY_WEIGHTS },
    visitedLocations: [],
    createdAt: now,
    updatedAt: now,
  };
}
