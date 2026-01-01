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
git clone https://github.com/YOUR_USERNAME/local-audio-pins.git
cd local-audio-pins
npm install
npm run dev
```

Open `http://localhost:3000`, click the map, record a note.

## License

MIT
