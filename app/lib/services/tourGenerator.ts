import { Pin, PinCategory, PIN_CATEGORIES } from '../types/pin';
import { TourGenerationRequest, JobCosts, TourErrorCodes, TourErrorCode } from '../types/tour';
import { UserPreferences } from '../types/preferences';
import { getOrCreatePreferences } from '../storage/preferences';
import { createJob, updateJobStatus, updateJobProgress, completeJob, failJob, partialCompleteJob } from '../storage/jobs';
import { createTour, addPinsToCollection, getPinsInRadius } from '../storage/tours';
import { generatePinContent, estimateOpenAICost } from './openai';
import { generateAndSaveAudio, estimateElevenLabsCost } from './elevenLabs';
import { getTopCategories } from './preferenceLearning';

interface GenerateTourOptions {
  request: TourGenerationRequest;
  collectionId?: string;
}

function generatePinId(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = 'ai_pin_';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

async function reverseGeocode(lat: number, lng: number): Promise<string> {
  // Simple area name generation based on coordinates
  // In production, you'd use a geocoding API like Nominatim or Google Places
  // For now, return a generic name
  return `Area near ${lat.toFixed(4)}, ${lng.toFixed(4)}`;
}

function selectCategories(
  preferences: UserPreferences,
  requestedCategories: PinCategory[] | undefined,
  pinCount: number
): PinCategory[] {
  // If specific categories requested, use those
  if (requestedCategories && requestedCategories.length > 0) {
    const categories: PinCategory[] = [];
    for (let i = 0; i < pinCount; i++) {
      categories.push(requestedCategories[i % requestedCategories.length]);
    }
    return categories;
  }

  // Otherwise, use user's preferred categories with weights
  const topCategories = getTopCategories(preferences, 4);
  const categories: PinCategory[] = [];

  for (let i = 0; i < pinCount; i++) {
    // Weight selection towards preferred categories
    const weights = preferences.categoryWeights;
    let random = Math.random();
    let selected: PinCategory = 'General';

    for (const cat of PIN_CATEGORIES) {
      random -= weights[cat] || 0;
      if (random <= 0) {
        selected = cat;
        break;
      }
    }

    // Ensure some variety - don't repeat same category 3 times in a row
    if (categories.length >= 2 &&
        categories[categories.length - 1] === selected &&
        categories[categories.length - 2] === selected) {
      selected = topCategories.find((c) => c !== selected) || selected;
    }

    categories.push(selected);
  }

  return categories;
}

function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371e3;
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lng2 - lng1) * Math.PI) / 180;

  const a = Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
            Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

function calculateTotalDistance(pins: Pin[]): number {
  if (pins.length < 2) return 0;

  let total = 0;
  for (let i = 1; i < pins.length; i++) {
    total += haversineDistance(pins[i - 1].lat, pins[i - 1].lng, pins[i].lat, pins[i].lng);
  }
  return total;
}

export async function generateTour(options: GenerateTourOptions): Promise<string> {
  const { request, collectionId = 'default' } = options;
  const { deviceId, center, radiusMeters, pinCount, categories } = request;

  // Create job
  const job = createJob(request);
  const jobId = job.id;

  // Run generation asynchronously
  setImmediate(async () => {
    let totalOpenAITokens = 0;
    let totalElevenLabsCharacters = 0;
    const generatedPins: Pin[] = [];
    const failedPins: string[] = [];

    try {
      // Update status
      updateJobStatus(jobId, 'generating_content');
      updateJobProgress(jobId, { currentStep: 'Loading preferences' });

      // Get user preferences
      const preferences = getOrCreatePreferences(deviceId);

      // Get area name
      const areaName = await reverseGeocode(center.lat, center.lng);

      // Get existing pins in area
      const existingPins = getPinsInRadius(collectionId, center, radiusMeters);
      const existingTitles = existingPins.map((p) => p.title);

      // Select categories for each pin
      const selectedCategories = selectCategories(preferences, categories as PinCategory[], pinCount);

      // Generate each pin
      for (let i = 0; i < pinCount; i++) {
        const category = selectedCategories[i];

        updateJobProgress(jobId, {
          currentStep: `Generating content for pin ${i + 1}/${pinCount} (${category})`,
          completedPins: i,
        });

        try {
          // Generate content with OpenAI
          const content = await generatePinContent({
            location: center,
            areaName,
            category,
            userPreferences: {
              favoriteCategories: getTopCategories(preferences, 3),
              categoryWeights: preferences.categoryWeights,
            },
            existingPinTitles: [...existingTitles, ...generatedPins.map((p) => p.title)],
            pinIndex: i,
            totalPins: pinCount,
          });

          // Estimate tokens (rough estimate: ~4 chars per token)
          totalOpenAITokens += Math.ceil((content.transcript.length + content.title.length + content.description.length) / 4) + 200;

          updateJobStatus(jobId, 'generating_audio');
          updateJobProgress(jobId, {
            currentStep: `Generating audio for "${content.title}"`,
          });

          // Generate audio with Eleven Labs
          const pinId = generatePinId();
          const audioResult = await generateAndSaveAudio(content.transcript, pinId);
          totalElevenLabsCharacters += audioResult.characterCount;

          // Create pin object
          const pin: Pin = {
            id: pinId,
            lat: content.suggestedLocation.lat,
            lng: content.suggestedLocation.lng,
            title: content.title,
            description: content.description,
            transcript: content.transcript,
            audioFile: audioResult.fileName,
            category: content.category,
            createdAt: new Date().toISOString(),
            isAiGenerated: true,
            aiGenerationId: jobId,
          };

          generatedPins.push(pin);
        } catch (pinError) {
          console.error(`Error generating pin ${i + 1}:`, pinError);
          failedPins.push(`Pin ${i + 1} (${category})`);
        }
      }

      // Calculate costs
      const costs: JobCosts = {
        openaiTokens: totalOpenAITokens,
        elevenLabsCharacters: totalElevenLabsCharacters,
        estimatedCostUsd:
          estimateOpenAICost(totalOpenAITokens) +
          estimateElevenLabsCost(totalElevenLabsCharacters),
      };

      // Check if we have any successful pins
      if (generatedPins.length === 0) {
        failJob(jobId, {
          code: TourErrorCodes.PARTIAL_CONTENT_FAILURE,
          message: 'Failed to generate any pins',
          retryable: true,
        });
        return;
      }

      // Calculate tour metrics
      const totalDistance = calculateTotalDistance(generatedPins);
      const estimatedDuration = generatedPins.reduce((sum, p) => {
        // Estimate ~15-20 seconds per pin
        return sum + 17;
      }, 0);

      // Create tour record
      const tour = createTour(
        deviceId,
        `AI Tour: ${areaName}`,
        generatedPins,
        center,
        jobId,
        estimatedDuration,
        totalDistance
      );

      // Add pins to collection
      const addResult = addPinsToCollection(collectionId, generatedPins);
      if (!addResult.success) {
        console.error('Failed to add pins to collection:', addResult.error);
      }

      // Complete job
      if (failedPins.length > 0) {
        partialCompleteJob(
          jobId,
          {
            tourId: tour.id,
            pins: generatedPins,
            estimatedDuration,
            totalDistance,
          },
          {
            code: TourErrorCodes.PARTIAL_AUDIO_FAILURE,
            message: `${failedPins.length} of ${pinCount} pins failed`,
            retryable: true,
            failedPins,
          },
          costs
        );
      } else {
        completeJob(
          jobId,
          {
            tourId: tour.id,
            pins: generatedPins,
            estimatedDuration,
            totalDistance,
          },
          costs
        );
      }
    } catch (error) {
      console.error('Tour generation failed:', error);

      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      let errorCode: TourErrorCode = TourErrorCodes.STORAGE_ERROR;

      if (errorMessage.includes('OpenAI')) {
        errorCode = TourErrorCodes.OPENAI_ERROR;
      } else if (errorMessage.includes('Eleven Labs')) {
        errorCode = TourErrorCodes.ELEVEN_LABS_ERROR;
      }

      failJob(jobId, {
        code: errorCode,
        message: errorMessage,
        retryable: true,
      });
    }
  });

  return jobId;
}
