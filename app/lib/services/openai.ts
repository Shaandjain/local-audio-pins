import { PinCategory, Pin } from '../types/pin';

export interface GeneratePinContentRequest {
  location: { lat: number; lng: number };
  areaName: string;
  category: PinCategory;
  userPreferences: {
    favoriteCategories: PinCategory[];
    categoryWeights: Record<string, number>;
  };
  existingPinTitles: string[];
  pinIndex: number;
  totalPins: number;
}

export interface GeneratePinContentResponse {
  title: string;
  description: string;
  transcript: string;
  category: PinCategory;
  suggestedLocation: { lat: number; lng: number };
}

const TOUR_GUIDE_SYSTEM_PROMPT = `You are a friendly, knowledgeable local tour guide creating audio content for walking tours.

Your task is to generate engaging, informative content about points of interest for a specific location.

Guidelines:
- Write in a warm, conversational tone as if speaking to a visitor
- Keep transcripts between 40-50 words (approximately 15-20 seconds when spoken)
- Include interesting facts, local tips, or historical context
- Make content specific to the location and category
- Avoid generic descriptions - be specific and memorable
- Do not repeat topics from existing pins in the area
- Suggest a slight coordinate offset (within 50 meters) to spread pins apart

Respond ONLY with valid JSON in this exact format:
{
  "title": "Short, catchy title (max 50 characters)",
  "description": "2-3 sentence description for reading (max 200 characters)",
  "transcript": "40-50 word script for audio narration. Speak directly to the listener.",
  "suggestedLatOffset": 0.0003,
  "suggestedLngOffset": -0.0002
}`;

function buildUserPrompt(request: GeneratePinContentRequest): string {
  const { location, areaName, category, userPreferences, existingPinTitles, pinIndex, totalPins } = request;

  const topCategories = Object.entries(userPreferences.categoryWeights)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([cat]) => cat)
    .join(', ');

  let prompt = `Generate a ${category} point of interest for the ${areaName} area.
Base coordinates: ${location.lat.toFixed(6)}, ${location.lng.toFixed(6)}
This is pin ${pinIndex + 1} of ${totalPins} in the tour.

User's preferred categories (in order): ${topCategories}
`;

  if (existingPinTitles.length > 0) {
    prompt += `
Existing topics in this area to avoid duplicating:
${existingPinTitles.map((t) => `- ${t}`).join('\n')}
`;
  }

  prompt += `
Create something unique and interesting about this ${category} location that a visitor would find engaging.`;

  return prompt;
}

export async function generatePinContent(
  request: GeneratePinContentRequest
): Promise<GeneratePinContentResponse> {
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL || 'gpt-4o';
  const timeoutMs = parseInt(process.env.OPENAI_TIMEOUT_MS || '30000', 10);

  if (!apiKey) {
    throw new Error('OPENAI_API_KEY environment variable is not set');
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: TOUR_GUIDE_SYSTEM_PROMPT },
          { role: 'user', content: buildUserPrompt(request) },
        ],
        temperature: 0.8,
        max_tokens: 500,
        response_format: { type: 'json_object' },
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `OpenAI API error: ${response.status} - ${JSON.stringify(errorData)}`
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('No content in OpenAI response');
    }

    const parsed = JSON.parse(content);

    // Validate required fields
    if (!parsed.title || !parsed.description || !parsed.transcript) {
      throw new Error('Invalid response format from OpenAI');
    }

    // Calculate suggested location with offset
    const suggestedLocation = {
      lat: request.location.lat + (parsed.suggestedLatOffset || 0),
      lng: request.location.lng + (parsed.suggestedLngOffset || 0),
    };

    // Validate transcript length (aim for 40-50 words)
    const wordCount = parsed.transcript.split(/\s+/).length;
    if (wordCount < 20 || wordCount > 100) {
      console.warn(`Transcript word count ${wordCount} outside ideal range (40-50)`);
    }

    return {
      title: parsed.title.slice(0, 50),
      description: parsed.description.slice(0, 200),
      transcript: parsed.transcript,
      category: request.category,
      suggestedLocation,
    };
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('OpenAI request timed out');
    }

    throw error;
  }
}

export function estimateOpenAICost(tokensUsed: number): number {
  // GPT-4o pricing: ~$0.0025 per 1K input tokens, ~$0.01 per 1K output tokens
  // Using a blended estimate
  return (tokensUsed / 1000) * 0.005;
}
