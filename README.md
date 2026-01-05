# Local Audio Pins

Geo-pinned voice notes that attach lived experience to coordinates — and expose it to AI via MCP.

## Why this exists

Maps are full of data but empty of context. Reviews optimize for ratings; wikis optimize for facts. Neither captures the kind of knowledge that only emerges in situ: "the light hits this corner perfectly at 5pm," "avoid this path after rain," "this is where my grandmother used to wait for the bus."

Local Audio Pins treats **place as a first-class context window** — for humans navigating space, and for models reasoning about it.

## What it does

1. Click a map location → record a short audio note → save it as a geo-pin
2. Browse and play pins on a shared collection page
3. Expose the same data to Claude via an MCP server (read-only)

## Architecture

```
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│     Browser      │     │     Next.js      │     │   Filesystem     │
│                  │     │                  │     │                  │
│  MapLibre        │     │  POST /pins      │     │  data/           │
│  click → coords  │────▶│  GET  /collection│────▶│    collections.json
│                  │     │  GET  /pins      │     │    audio/*.webm  │
│  MediaRecorder   │     │  GET  /audio/:id │     │                  │
│  mic → .webm     │     │                  │     └────────┬─────────┘
│                  │     └──────────────────┘              │
│  <audio>         │                                       │
│  stream playback │                                       ▼
└──────────────────┘                            ┌──────────────────┐
                                                │   MCP Server     │
                                                │   (read-only)    │
                                                │                  │
                                                │  get_collection  │
                                                │  list_pins       │
                                                │  get_pin         │
                                                │                  │
                                                │  ↳ exposes to    │
                                                │    Claude        │
                                                └──────────────────┘
```

**Zero external dependencies.** No database, no cloud storage, no API keys. Everything lives in `data/`.

## Run it yourself

```bash
git clone https://github.com/Shaandjain/local-audio-pins.git
cd local-audio-pins
npm install
npm run dev
```

Open `http://localhost:3000`, click the map, record a note.

## MCP Server

The MCP server exposes your audio pins to Claude, enabling AI-powered queries about your location-based recordings.

### Setup

```bash
cd mcp-server
npm install
```

### Connect to Claude Desktop

Add to your Claude Desktop config (`~/Library/Application Support/Claude/claude_desktop_config.json` on macOS):

```json
{
  "mcpServers": {
    "local-audio-pins": {
      "command": "node",
      "args": ["/path/to/local-audio-pins/mcp-server/index.js"]
    }
  }
}
```

Restart Claude Desktop after updating the config.

### Example Prompts

Once connected, try asking Claude:

- **"List all the pins in my collection"** — Get an overview of all your audio notes
- **"Create a walking tour from these pins starting from the easternmost point"** — Generate location-aware itineraries
- **"Which pins mention food or restaurants?"** — Search through your pin descriptions
- **"What's the pin closest to downtown?"** — Spatial queries on your data
- **"Summarize what each location is about"** — Get insights from your recordings

## License

MIT
