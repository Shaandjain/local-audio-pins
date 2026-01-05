# TODO

## Phase 1: Scaffold + Map ✅
- [x] Next.js app with App Router + TypeScript
- [x] MapLibre map centered on Toronto
- [x] Map renders full viewport

## Phase 2: Audio Recording UI ✅
- [x] Click map to capture coordinates
- [x] Modal/panel opens with title + description inputs
- [x] Record button starts MediaRecorder (webm/opus)
- [x] Stop button ends recording
- [x] Audio preview playback
- [x] Save button (logs to console only)

## Phase 3: Backend + Persistence ✅
- [x] data/collections.json with default collection
- [x] POST /api/collections/[id]/pins saves audio + metadata
- [x] GET endpoints for collections and pins
- [x] GET /api/audio/[filename] streams audio
- [x] Markers appear on map after save
- [x] Click marker to play audio

## Phase 4: Collection View ✅
- [x] /c/[id] page shows collection
- [x] List view of pins below map
- [x] Shareable URL

## Phase 5: MCP Server ✅
- [x] Node server in mcp-server/
- [x] get_collection, list_pins, get_pin tools
- [x] Reads from data/collections.json
- [x] Audio transcription for Claude access

## Phase 6: Design Polish ✅
- [x] Tailwind CSS integration
- [x] Color palette and design tokens
- [x] Clean typography
- [x] Header with logo, help tooltip, and browse link
- [x] First-time user hint pill with animation
- [x] Redesigned recording modal with sections and validation
- [x] Custom map markers with hover effects
- [x] Improved popups with relative timestamps
- [x] Responsive collection page (split layout on desktop)
- [x] Pin list with play buttons and audio playback
- [x] Empty states with friendly messaging
- [x] Micro-interactions (fade-in, slide-up animations)
- [x] Accessibility (focus rings, keyboard navigation, ARIA labels)

## Phase 7: Area Selection + Tour Generation ✅
- [x] "Select Area" toggle button in header
- [x] Click-and-drag bounding box drawing on map
- [x] Dashed border with accent color, semi-transparent fill
- [x] Selection panel showing pin count in area
- [x] "Generate Walking Tour" button (disabled if 0 pins)
- [x] "Clear Selection" to remove box and start over
- [x] Tour generation using nearest-neighbor algorithm
- [x] Tour Modal with ordered list of stops
- [x] Play button for each stop's audio
- [x] Click stop to view on map
- [x] Tour utility functions (isPinInBounds, generateWalkingTour)
- [x] Distance estimation and formatting
- [x] MCP server: get_pins_in_area tool for querying by region

## Phase 8: Final UX Polish ✅
- [x] Only one pin popup open at a time (closes others when clicking new pin)
- [x] Clicking empty map area closes any open popup
- [x] Easy exit from selection mode (visible "Exit Selection" button)
- [x] Auto-exit selection mode after closing tour panel
- [x] Selection panel has redraw and exit buttons
- [x] Guidance when clicking + in Browse All (navigates with ?hint=add)
- [x] HintPill supports custom messages
- [x] Close button for pins list panel in collection view
- [x] "Show Pins" button appears when panel is closed
- [x] Map resizes when panel toggles
- [x] Tour displayed in side panel (not modal overlay)
- [x] Side panel layout: Map 65% / Tour panel 35%
- [x] Tour panel with close button, ordered stops, audio playback
- [x] Clicking tour stop flies to pin and opens popup

## Phase 9: Bug Fixes ✅
- [x] Map no longer resets to Toronto when entering selection mode
- [x] Selection rectangle hidden when tour panel opens (prevents shift during resize)

## Phase 10: UI Redesign - Cartographer's Notebook ✅
- [x] New color palette: warm paper whites (#F7F5F2, #FFFEF9), deep teal accent (#1D7A8C), muted coral for recording (#C75D4A)
- [x] Typography: DM Sans for text, JetBrains Mono for coordinates
- [x] Refined shadows and borders (warm undertones)
- [x] Header: 56px height, backdrop blur, simple wordmark
- [x] Map markers: 14px teal circles with white border and microphone icon
- [x] Selection box: 2px dashed teal border, sharp corners (cartographic feel)
- [x] Tour panel: 380px fixed width, numbered teal stops, clean hierarchy
- [x] Recording modal: coral accent for recording state, pulse animation
- [x] Snappy transitions (150-200ms ease-out)
- [x] Improved accessibility: teal focus states with 2px offset

---

🎉 **Project Complete!**
