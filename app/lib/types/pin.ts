export type PinCategory = 'General' | 'Food' | 'History' | 'Nature' | 'Culture' | 'Architecture';

export interface Pin {
  id: string;
  lat: number;
  lng: number;
  title: string;
  description: string;
  transcript: string;
  audioFile: string;
  photoFile?: string;
  category?: PinCategory;
  createdAt: string;

  // AI-generated pin fields
  isAiGenerated?: boolean;
  aiGenerationId?: string;
}

export interface Collection {
  id: string;
  name: string;
  center: { lat: number; lng: number };
  pins: Pin[];
}

export interface CollectionsData {
  collections: Collection[];
}

export const PIN_CATEGORIES: PinCategory[] = [
  'General',
  'Food',
  'History',
  'Nature',
  'Culture',
  'Architecture',
];
