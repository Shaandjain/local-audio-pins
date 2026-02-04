import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import path from 'path';
import { UserPreferences, createDefaultPreferences } from '../types/preferences';

const PREFERENCES_DIR = path.join(process.cwd(), 'data', 'preferences');

function ensurePreferencesDir(): void {
  if (!existsSync(PREFERENCES_DIR)) {
    mkdirSync(PREFERENCES_DIR, { recursive: true });
  }
}

function getPreferencesPath(deviceId: string): string {
  return path.join(PREFERENCES_DIR, `${deviceId}.json`);
}

export function getPreferences(deviceId: string): UserPreferences | null {
  const filePath = getPreferencesPath(deviceId);

  if (!existsSync(filePath)) {
    return null;
  }

  try {
    const data = readFileSync(filePath, 'utf-8');
    return JSON.parse(data) as UserPreferences;
  } catch (error) {
    console.error(`Error reading preferences for ${deviceId}:`, error);
    return null;
  }
}

export function savePreferences(preferences: UserPreferences): void {
  ensurePreferencesDir();
  const filePath = getPreferencesPath(preferences.deviceId);
  preferences.updatedAt = new Date().toISOString();
  writeFileSync(filePath, JSON.stringify(preferences, null, 2));
}

export function getOrCreatePreferences(deviceId: string): UserPreferences {
  const existing = getPreferences(deviceId);
  if (existing) {
    return existing;
  }

  const newPreferences = createDefaultPreferences(deviceId);
  savePreferences(newPreferences);
  return newPreferences;
}

export function addFavorite(deviceId: string, pinId: string): UserPreferences {
  const preferences = getOrCreatePreferences(deviceId);

  if (!preferences.favoritePinIds.includes(pinId)) {
    preferences.favoritePinIds.push(pinId);
    savePreferences(preferences);
  }

  return preferences;
}

export function removeFavorite(deviceId: string, pinId: string): UserPreferences {
  const preferences = getOrCreatePreferences(deviceId);

  const index = preferences.favoritePinIds.indexOf(pinId);
  if (index !== -1) {
    preferences.favoritePinIds.splice(index, 1);
    savePreferences(preferences);
  }

  return preferences;
}

export function deletePreferences(deviceId: string): boolean {
  const filePath = getPreferencesPath(deviceId);

  if (!existsSync(filePath)) {
    return false;
  }

  try {
    const { unlinkSync } = require('fs');
    unlinkSync(filePath);
    return true;
  } catch (error) {
    console.error(`Error deleting preferences for ${deviceId}:`, error);
    return false;
  }
}
