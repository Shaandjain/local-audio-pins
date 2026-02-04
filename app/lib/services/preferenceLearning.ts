import { readFileSync } from 'fs';
import path from 'path';
import { UserPreferences, DEFAULT_CATEGORY_WEIGHTS } from '../types/preferences';
import { Pin, PinCategory, CollectionsData, PIN_CATEGORIES } from '../types/pin';
import { savePreferences } from '../storage/preferences';

const DATA_PATH = path.join(process.cwd(), 'data', 'collections.json');

function getAllPins(): Pin[] {
  try {
    const data: CollectionsData = JSON.parse(readFileSync(DATA_PATH, 'utf-8'));
    return data.collections.flatMap((c) => c.pins);
  } catch (error) {
    console.error('Error reading pins:', error);
    return [];
  }
}

function getPinById(pinId: string): Pin | null {
  const pins = getAllPins();
  return pins.find((p) => p.id === pinId) || null;
}

export async function recalculateCategoryWeights(
  preferences: UserPreferences
): Promise<UserPreferences> {
  const { favoritePinIds } = preferences;

  // If no favorites, return default weights
  if (favoritePinIds.length === 0) {
    preferences.categoryWeights = { ...DEFAULT_CATEGORY_WEIGHTS };
    savePreferences(preferences);
    return preferences;
  }

  // Count categories from favorited pins
  const categoryCounts: Record<string, number> = {};
  PIN_CATEGORIES.forEach((cat) => {
    categoryCounts[cat] = 0;
  });

  let totalWithCategory = 0;

  for (const pinId of favoritePinIds) {
    const pin = getPinById(pinId);
    if (pin) {
      const category = (pin.category as PinCategory) || 'General';
      categoryCounts[category] = (categoryCounts[category] || 0) + 1;
      totalWithCategory++;
    }
  }

  // Calculate weights
  if (totalWithCategory === 0) {
    preferences.categoryWeights = { ...DEFAULT_CATEGORY_WEIGHTS };
  } else {
    const newWeights: Record<PinCategory, number> = {} as Record<PinCategory, number>;

    // Use Laplace smoothing to avoid zero weights
    // Add 1 to each category count before normalizing
    const smoothingFactor = 0.5;
    const totalWithSmoothing = totalWithCategory + smoothingFactor * PIN_CATEGORIES.length;

    for (const category of PIN_CATEGORIES) {
      const count = categoryCounts[category] || 0;
      newWeights[category] = (count + smoothingFactor) / totalWithSmoothing;
    }

    preferences.categoryWeights = newWeights;
  }

  savePreferences(preferences);
  return preferences;
}

export function getTopCategories(
  preferences: UserPreferences,
  count: number = 3
): PinCategory[] {
  const weights = preferences.categoryWeights;
  const sorted = PIN_CATEGORIES.sort(
    (a, b) => (weights[b] || 0) - (weights[a] || 0)
  );
  return sorted.slice(0, count);
}

export function getCategoryWeight(
  preferences: UserPreferences,
  category: PinCategory
): number {
  return preferences.categoryWeights[category] || DEFAULT_CATEGORY_WEIGHTS[category];
}
