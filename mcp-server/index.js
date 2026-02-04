import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { readFileSync, writeFileSync, appendFileSync, existsSync, unlinkSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_PATH = join(__dirname, "..", "data", "collections.json");
const AUDIO_DIR = join(__dirname, "..", "data", "audio");
const PHOTOS_DIR = join(__dirname, "..", "data", "photos");
const AUDIT_LOG_PATH = join(__dirname, "..", "data", "audit.log");

// Idempotency key storage (in-memory, 24h TTL)
const idempotencyCache = new Map();
const IDEMPOTENCY_TTL_MS = 24 * 60 * 60 * 1000;

// Clean up expired idempotency keys periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, { timestamp }] of idempotencyCache.entries()) {
    if (now - timestamp > IDEMPOTENCY_TTL_MS) {
      idempotencyCache.delete(key);
    }
  }
}, 60 * 60 * 1000); // Every hour

// Logging helper
function log(message, data = null) {
  const timestamp = new Date().toISOString();
  const logLine = data
    ? `[${timestamp}] [MCP] ${message}: ${JSON.stringify(data)}`
    : `[${timestamp}] [MCP] ${message}`;
  console.error(logLine);
}

// Write to audit log
function auditLog(entry) {
  const logLine = JSON.stringify({ ...entry, timestamp: new Date().toISOString() }) + "\n";
  try {
    appendFileSync(AUDIT_LOG_PATH, logLine);
  } catch (err) {
    log("Failed to write audit log", { error: err.message });
  }
}

// Generate a unique pin ID
function generatePinId() {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let id = "pin_";
  for (let i = 0; i < 8; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return id;
}

function readCollections() {
  const data = readFileSync(DATA_PATH, "utf-8");
  return JSON.parse(data);
}

function writeCollections(data) {
  writeFileSync(DATA_PATH, JSON.stringify(data, null, 2));
}

function getCollection(collectionId) {
  const data = readCollections();
  const collection = data.collections.find((c) => c.id === collectionId);
  if (!collection) {
    throw new Error(`Collection '${collectionId}' not found`);
  }
  return collection;
}

function listPins(collectionId) {
  const collection = getCollection(collectionId);
  return collection.pins.map((pin) => ({
    id: pin.id,
    lat: pin.lat,
    lng: pin.lng,
    title: pin.title,
    description: pin.description,
    transcript: pin.transcript || '',
    audioPath: `/api/audio/${pin.audioFile}`,
    photoPath: pin.photoFile ? `/api/photos/${pin.photoFile}` : null,
  }));
}

function getPin(pinId) {
  const data = readCollections();
  for (const collection of data.collections) {
    const pin = collection.pins.find((p) => p.id === pinId);
    if (pin) {
      return {
        ...pin,
        audioPath: `/api/audio/${pin.audioFile}`,
        photoPath: pin.photoFile ? `/api/photos/${pin.photoFile}` : null,
        collectionId: collection.id,
      };
    }
  }
  throw new Error(`Pin '${pinId}' not found`);
}

function getPinsInArea(collectionId, north, south, east, west) {
  const collection = getCollection(collectionId);
  const pinsInArea = collection.pins.filter((pin) => {
    return (
      pin.lat >= south &&
      pin.lat <= north &&
      pin.lng >= west &&
      pin.lng <= east
    );
  });

  return pinsInArea.map((pin) => ({
    id: pin.id,
    lat: pin.lat,
    lng: pin.lng,
    title: pin.title,
    description: pin.description,
    transcript: pin.transcript || '',
    audioPath: `/api/audio/${pin.audioFile}`,
    photoPath: pin.photoFile ? `/api/photos/${pin.photoFile}` : null,
  }));
}

// Validation for create_audio_pin
function validateCreateAudioPin(args) {
  const errors = [];
  const warnings = [];

  // Required: collection_id
  if (!args.collection_id || typeof args.collection_id !== "string") {
    errors.push({ field: "collection_id", code: "INVALID_COLLECTION_ID", message: "Collection ID is required" });
  } else {
    try {
      getCollection(args.collection_id);
    } catch {
      errors.push({ field: "collection_id", code: "COLLECTION_NOT_FOUND", message: `Collection '${args.collection_id}' does not exist` });
    }
  }

  // Required: title
  if (!args.title || typeof args.title !== "string") {
    errors.push({ field: "title", code: "EMPTY_TITLE", message: "Title cannot be empty" });
  } else {
    const trimmedTitle = args.title.trim();
    if (trimmedTitle.length === 0) {
      errors.push({ field: "title", code: "EMPTY_TITLE", message: "Title cannot be empty" });
    } else if (trimmedTitle.length > 100) {
      errors.push({ field: "title", code: "INVALID_TITLE_LENGTH", message: "Title must be 1-100 characters" });
    }
  }

  // Required: lat
  if (typeof args.lat !== "number" || isNaN(args.lat)) {
    errors.push({ field: "lat", code: "INVALID_LATITUDE", message: "Latitude must be a number" });
  } else if (args.lat < -90 || args.lat > 90) {
    errors.push({ field: "lat", code: "INVALID_LATITUDE", message: "Latitude must be between -90 and 90" });
  }

  // Required: lng
  if (typeof args.lng !== "number" || isNaN(args.lng)) {
    errors.push({ field: "lng", code: "INVALID_LONGITUDE", message: "Longitude must be a number" });
  } else if (args.lng < -180 || args.lng > 180) {
    errors.push({ field: "lng", code: "INVALID_LONGITUDE", message: "Longitude must be between -180 and 180" });
  }

  // Optional: description
  if (args.description !== undefined) {
    if (typeof args.description !== "string") {
      errors.push({ field: "description", code: "INVALID_DESCRIPTION", message: "Description must be a string" });
    } else if (args.description.length > 500) {
      errors.push({ field: "description", code: "DESCRIPTION_TOO_LONG", message: "Description exceeds 500 characters" });
    }
  } else {
    warnings.push({ field: "description", code: "MISSING_DESCRIPTION", message: "Consider adding a description for better discoverability" });
  }

  // Optional: transcript
  if (args.transcript !== undefined) {
    if (typeof args.transcript !== "string") {
      errors.push({ field: "transcript", code: "INVALID_TRANSCRIPT", message: "Transcript must be a string" });
    } else if (args.transcript.length > 5000) {
      errors.push({ field: "transcript", code: "TRANSCRIPT_TOO_LONG", message: "Transcript exceeds 5000 characters" });
    }
  } else {
    warnings.push({ field: "transcript", code: "MISSING_TRANSCRIPT", message: "Consider adding a transcript for search and accessibility" });
  }

  // Optional: audio_url
  if (args.audio_url !== undefined && args.audio_url !== "placeholder") {
    if (typeof args.audio_url !== "string") {
      errors.push({ field: "audio_url", code: "INVALID_AUDIO_URL", message: "Audio URL must be a string" });
    }
  }
  if (args.audio_url === "placeholder" || !args.audio_url) {
    warnings.push({ field: "audio_url", code: "PLACEHOLDER_AUDIO", message: "Pin created without audio - requires frontend completion" });
  }

  // Optional: image_url
  if (args.image_url !== undefined && typeof args.image_url !== "string") {
    errors.push({ field: "image_url", code: "INVALID_IMAGE_URL", message: "Image URL must be a string" });
  }

  return {
    passed: errors.length === 0,
    errors,
    warnings,
  };
}

// Create audio pin with rollback support
function createAudioPin(args) {
  const startTime = Date.now();
  log("create_audio_pin called with", args);

  // Check idempotency key
  if (args.idempotency_key && idempotencyCache.has(args.idempotency_key)) {
    const cached = idempotencyCache.get(args.idempotency_key);
    log("Returning cached result for idempotency key", { key: args.idempotency_key });
    return {
      success: true,
      pin: cached.pin,
      operation: {
        type: "create_audio_pin",
        dry_run: false,
        idempotency_key: args.idempotency_key,
        timestamp: cached.timestamp,
        collection_id: args.collection_id,
        cached: true,
      },
      validation: { passed: true, errors: [], warnings: [] },
    };
  }

  // Validate inputs
  const validation = validateCreateAudioPin(args);
  log(`Validation ${validation.passed ? "passed" : "failed"} with ${validation.warnings.length} warning(s)`);

  if (!validation.passed) {
    auditLog({
      operation: "create_audio_pin",
      collection_id: args.collection_id,
      idempotency_key: args.idempotency_key || null,
      dry_run: args.dry_run || false,
      success: false,
      error: validation.errors[0]?.code,
    });
    return {
      success: false,
      operation: {
        type: "create_audio_pin",
        dry_run: args.dry_run || false,
        idempotency_key: args.idempotency_key || null,
        timestamp: new Date().toISOString(),
        collection_id: args.collection_id,
      },
      validation,
      error: validation.errors[0],
    };
  }

  // Generate pin ID
  const pinId = generatePinId();
  log("Generated pin ID", { pinId });

  const pin = {
    id: pinId,
    lat: args.lat,
    lng: args.lng,
    title: args.title.trim(),
    description: args.description?.trim() || "",
    transcript: args.transcript?.trim() || "",
    audioFile: `${pinId}.webm`,
    createdAt: new Date().toISOString(),
  };

  // Handle photo file reference
  if (args.image_url && args.image_url !== "placeholder") {
    // For local file paths, extract extension
    const ext = args.image_url.split(".").pop() || "jpg";
    pin.photoFile = `${pinId}.${ext}`;
  }

  // Dry run mode - return preview without persisting
  if (args.dry_run) {
    log("Dry run mode - returning preview without persisting");
    return {
      success: true,
      pin: {
        ...pin,
        audioPath: `/api/audio/${pin.audioFile}`,
        photoPath: pin.photoFile ? `/api/photos/${pin.photoFile}` : null,
        collectionId: args.collection_id,
      },
      operation: {
        type: "create_audio_pin",
        dry_run: true,
        idempotency_key: args.idempotency_key || null,
        timestamp: new Date().toISOString(),
        collection_id: args.collection_id,
      },
      validation,
    };
  }

  // Actual write with rollback support
  const writtenFiles = [];

  try {
    // Step 1: Create placeholder audio file (if no real audio provided)
    const audioPath = join(AUDIO_DIR, pin.audioFile);
    if (!args.audio_url || args.audio_url === "placeholder") {
      // Create empty placeholder file
      writeFileSync(audioPath, "");
      writtenFiles.push(audioPath);
      log("Created placeholder audio file", { path: audioPath });
    }

    // Step 2: Update collections.json
    const data = readCollections();
    const collectionIdx = data.collections.findIndex((c) => c.id === args.collection_id);
    const pinCountBefore = data.collections[collectionIdx].pins.length;
    data.collections[collectionIdx].pins.push(pin);
    writeCollections(data);
    log("Updated collections.json", { collectionId: args.collection_id, pinCountAfter: pinCountBefore + 1 });

    const executionTime = Date.now() - startTime;
    log(`Operation completed in ${executionTime}ms`);

    // Cache idempotency key
    if (args.idempotency_key) {
      idempotencyCache.set(args.idempotency_key, {
        pin: {
          ...pin,
          audioPath: `/api/audio/${pin.audioFile}`,
          photoPath: pin.photoFile ? `/api/photos/${pin.photoFile}` : null,
          collectionId: args.collection_id,
        },
        timestamp: pin.createdAt,
      });
    }

    // Write audit log
    auditLog({
      operation: "create_audio_pin",
      pin_id: pinId,
      collection_id: args.collection_id,
      idempotency_key: args.idempotency_key || null,
      dry_run: false,
      success: true,
      execution_ms: executionTime,
    });

    const response = {
      success: true,
      pin: {
        ...pin,
        audioPath: `/api/audio/${pin.audioFile}`,
        photoPath: pin.photoFile ? `/api/photos/${pin.photoFile}` : null,
        collectionId: args.collection_id,
      },
      operation: {
        type: "create_audio_pin",
        dry_run: false,
        idempotency_key: args.idempotency_key || null,
        timestamp: pin.createdAt,
        collection_id: args.collection_id,
      },
      validation,
    };

    // Add debug info in development
    if (process.env.NODE_ENV !== "production") {
      response.debug = {
        files_written: writtenFiles,
        json_path: DATA_PATH,
        execution_time_ms: executionTime,
        pin_count_before: pinCountBefore,
        pin_count_after: pinCountBefore + 1,
      };
    }

    return response;

  } catch (error) {
    // Rollback: delete any written files
    log("Error during write, rolling back", { error: error.message });
    for (const file of writtenFiles) {
      try {
        if (existsSync(file)) {
          unlinkSync(file);
          log("Rolled back file", { path: file });
        }
      } catch {
        log("Failed to rollback file", { path: file });
      }
    }

    auditLog({
      operation: "create_audio_pin",
      collection_id: args.collection_id,
      idempotency_key: args.idempotency_key || null,
      dry_run: false,
      success: false,
      error: error.message,
    });

    return {
      success: false,
      operation: {
        type: "create_audio_pin",
        dry_run: false,
        idempotency_key: args.idempotency_key || null,
        timestamp: new Date().toISOString(),
        collection_id: args.collection_id,
      },
      validation,
      error: {
        code: "WRITE_FAILED",
        message: error.message,
      },
    };
  }
}

// Create MCP server
const server = new Server(
  {
    name: "local-audio-pins",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "get_collection",
        description:
          "Get a collection of audio pins by ID. Returns the full collection object including name, center coordinates, and all pins with their locations, titles, descriptions, transcripts of what was said in the audio, and audio file references.",
        inputSchema: {
          type: "object",
          properties: {
            collection_id: {
              type: "string",
              description: "The ID of the collection to retrieve (e.g., 'default')",
            },
          },
          required: ["collection_id"],
        },
      },
      {
        name: "list_pins",
        description:
          "List all pins in a collection. Returns an array of pins with their IDs, coordinates (lat/lng), titles, descriptions, transcripts of what was said, audio paths, and photo paths (if available). Useful for getting an overview of all audio notes in a location and understanding what people said at each place.",
        inputSchema: {
          type: "object",
          properties: {
            collection_id: {
              type: "string",
              description: "The ID of the collection to list pins from (e.g., 'default')",
            },
          },
          required: ["collection_id"],
        },
      },
      {
        name: "get_pin",
        description:
          "Get a single pin by its ID. Returns the pin's location (lat/lng), title, description, transcript of the audio recording, audio path, photo path (if available), creation date, and which collection it belongs to.",
        inputSchema: {
          type: "object",
          properties: {
            pin_id: {
              type: "string",
              description: "The ID of the pin to retrieve (e.g., 'pin_abc123')",
            },
          },
          required: ["pin_id"],
        },
      },
      {
        name: "get_pins_in_area",
        description:
          "Get all pins within a specified geographic bounding box. Useful for finding audio pins in a specific region, neighborhood, or area. Returns pins with their coordinates, titles, descriptions, transcripts, audio paths, and photo paths (if available). Great for creating walking tours or exploring specific areas.",
        inputSchema: {
          type: "object",
          properties: {
            collection_id: {
              type: "string",
              description: "The ID of the collection to search (e.g., 'default')",
            },
            north: {
              type: "number",
              description: "Northern boundary (maximum latitude)",
            },
            south: {
              type: "number",
              description: "Southern boundary (minimum latitude)",
            },
            east: {
              type: "number",
              description: "Eastern boundary (maximum longitude)",
            },
            west: {
              type: "number",
              description: "Western boundary (minimum longitude)",
            },
          },
          required: ["collection_id", "north", "south", "east", "west"],
        },
      },
      {
        name: "create_audio_pin",
        description:
          "Create a new audio pin in a collection. Supports dry_run mode to validate without persisting. For local development, set audio_url to 'placeholder' and the frontend will prompt for recording. Returns the created pin with its ID, coordinates, and paths.",
        inputSchema: {
          type: "object",
          properties: {
            collection_id: {
              type: "string",
              description: "The collection to add the pin to (e.g., 'default')",
            },
            title: {
              type: "string",
              description: "Title for the pin (1-100 characters)",
            },
            lat: {
              type: "number",
              description: "Latitude coordinate (-90 to 90)",
            },
            lng: {
              type: "number",
              description: "Longitude coordinate (-180 to 180)",
            },
            description: {
              type: "string",
              description: "Description of the location (max 500 characters)",
            },
            transcript: {
              type: "string",
              description: "Transcript of audio content (max 5000 characters)",
            },
            audio_url: {
              type: "string",
              description: "URL or path to audio file. Use 'placeholder' to create pin without audio (requires frontend completion)",
            },
            image_url: {
              type: "string",
              description: "URL or path to image file (optional)",
            },
            dry_run: {
              type: "boolean",
              description: "If true, validate inputs without creating the pin",
            },
            idempotency_key: {
              type: "string",
              description: "Unique key to prevent duplicate creation on retry",
            },
          },
          required: ["collection_id", "title", "lat", "lng"],
        },
      },
    ],
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    let result;

    switch (name) {
      case "get_collection":
        result = getCollection(args.collection_id);
        break;
      case "list_pins":
        result = listPins(args.collection_id);
        break;
      case "get_pin":
        result = getPin(args.pin_id);
        break;
      case "get_pins_in_area":
        result = getPinsInArea(
          args.collection_id,
          args.north,
          args.south,
          args.east,
          args.west
        );
        break;
      case "create_audio_pin":
        result = createAudioPin(args);
        break;
      default:
        throw new Error(`Unknown tool: ${name}`);
    }

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `Error: ${error.message}`,
        },
      ],
      isError: true,
    };
  }
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Local Audio Pins MCP server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
