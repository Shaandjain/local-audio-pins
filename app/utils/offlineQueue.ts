/**
 * Offline queue for audio pins using IndexedDB.
 * When the user creates a pin while offline, it is saved locally
 * and synced to the server when connectivity returns.
 */

const DB_NAME = 'audio-pins-offline';
const DB_VERSION = 1;
const STORE_NAME = 'pending-pins';

export interface PendingPin {
  id: string;
  title: string;
  description: string;
  transcript: string;
  lat: number;
  lng: number;
  audioBlob: Blob;
  photoBlob?: Blob;
  photoName?: string;
  category: string;
  createdAt: string;
  synced: boolean;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function savePendingPin(pin: PendingPin): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(pin);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getPendingPins(): Promise<PendingPin[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const request = tx.objectStore(STORE_NAME).getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function getPendingCount(): Promise<number> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const request = tx.objectStore(STORE_NAME).count();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function removePendingPin(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Attempt to sync all pending pins to the server.
 * Returns the number of successfully synced pins.
 */
export async function syncPendingPins(
  onPinSynced?: (pin: PendingPin) => void
): Promise<number> {
  const pins = await getPendingPins();
  let syncedCount = 0;

  for (const pin of pins) {
    if (pin.synced) continue;

    try {
      const formData = new FormData();
      formData.append('lat', pin.lat.toString());
      formData.append('lng', pin.lng.toString());
      formData.append('title', pin.title);
      formData.append('description', pin.description);
      formData.append('transcript', pin.transcript);
      formData.append('audio', pin.audioBlob, 'recording.webm');
      formData.append('category', pin.category);
      if (pin.photoBlob) {
        formData.append('photo', pin.photoBlob, pin.photoName || 'photo.jpg');
      }

      const response = await fetch('/api/collections/default/pins', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        await removePendingPin(pin.id);
        syncedCount++;
        onPinSynced?.(pin);
      }
    } catch {
      // Network still unavailable or server error - skip this pin
      console.warn(`Failed to sync pin ${pin.id}, will retry later`);
    }
  }

  return syncedCount;
}

/**
 * Generate a temporary ID for offline pins.
 */
export function generateOfflineId(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = 'offline_';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}
