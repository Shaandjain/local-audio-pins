import { writeFileSync, mkdirSync, existsSync } from 'fs';
import path from 'path';

export interface GenerateAudioRequest {
  text: string;
  voiceId?: string;
  modelId?: string;
}

export interface GenerateAudioResponse {
  audioBuffer: Buffer;
  fileName: string;
  durationEstimate: number;  // seconds (estimated from character count)
  characterCount: number;
}

const AUDIO_DIR = path.join(process.cwd(), 'data', 'audio');

// Default voice IDs from Eleven Labs
// "Rachel" is a popular natural-sounding female voice
// "Adam" is a popular natural-sounding male voice
const DEFAULT_VOICE_ID = 'EXAVITQu4vr4xnSDxMaL';  // "Sarah" - warm, friendly

function ensureAudioDir(): void {
  if (!existsSync(AUDIO_DIR)) {
    mkdirSync(AUDIO_DIR, { recursive: true });
  }
}

export async function generateAudio(
  request: GenerateAudioRequest
): Promise<GenerateAudioResponse> {
  const apiKey = process.env.ELEVEN_LABS_API_KEY;
  const voiceId = request.voiceId || process.env.ELEVEN_LABS_VOICE_ID || DEFAULT_VOICE_ID;
  const modelId = request.modelId || process.env.ELEVEN_LABS_MODEL_ID || 'eleven_multilingual_v2';
  const timeoutMs = parseInt(process.env.ELEVEN_LABS_TIMEOUT_MS || '60000', 10);

  if (!apiKey) {
    throw new Error('ELEVEN_LABS_API_KEY environment variable is not set');
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'xi-api-key': apiKey,
        },
        body: JSON.stringify({
          text: request.text,
          model_id: modelId,
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
            style: 0.3,  // Slight expressiveness
            use_speaker_boost: true,
          },
        }),
        signal: controller.signal,
      }
    );

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Eleven Labs API error: ${response.status} - ${errorText}`
      );
    }

    const audioBuffer = Buffer.from(await response.arrayBuffer());

    // Estimate duration: ~150 words per minute, ~5 characters per word
    // So roughly 750 characters per minute, or ~12.5 characters per second
    const characterCount = request.text.length;
    const durationEstimate = characterCount / 12.5;

    return {
      audioBuffer,
      fileName: '', // Will be set by caller
      durationEstimate,
      characterCount,
    };
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Eleven Labs request timed out');
    }

    throw error;
  }
}

export async function generateAndSaveAudio(
  text: string,
  pinId: string,
  options?: { voiceId?: string; modelId?: string }
): Promise<{ fileName: string; durationEstimate: number; characterCount: number }> {
  ensureAudioDir();

  const result = await generateAudio({
    text,
    voiceId: options?.voiceId,
    modelId: options?.modelId,
  });

  // Save as MP3 (Eleven Labs returns MP3 by default)
  const fileName = `${pinId}.mp3`;
  const filePath = path.join(AUDIO_DIR, fileName);

  writeFileSync(filePath, result.audioBuffer);

  return {
    fileName,
    durationEstimate: result.durationEstimate,
    characterCount: result.characterCount,
  };
}

export function estimateElevenLabsCost(characterCount: number): number {
  // Eleven Labs pricing: varies by plan
  // Starter: ~$0.30 per 1K characters
  // Using conservative estimate
  return (characterCount / 1000) * 0.30;
}

export async function getAvailableVoices(): Promise<Array<{ voice_id: string; name: string }>> {
  const apiKey = process.env.ELEVEN_LABS_API_KEY;

  if (!apiKey) {
    throw new Error('ELEVEN_LABS_API_KEY environment variable is not set');
  }

  const response = await fetch('https://api.elevenlabs.io/v1/voices', {
    headers: {
      'xi-api-key': apiKey,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch voices: ${response.status}`);
  }

  const data = await response.json();
  return data.voices.map((v: { voice_id: string; name: string }) => ({
    voice_id: v.voice_id,
    name: v.name,
  }));
}
