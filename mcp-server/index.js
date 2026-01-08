import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_PATH = join(__dirname, "..", "data", "collections.json");

function readCollections() {
  const data = readFileSync(DATA_PATH, "utf-8");
  return JSON.parse(data);
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
