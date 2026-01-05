# Local Audio Pins MCP Server

An MCP (Model Context Protocol) server that exposes geo-pinned audio notes to Claude, enabling AI-powered queries about your location-based voice recordings.

## Installation

```bash
cd mcp-server
npm install
```

## Running the Server

```bash
npm start
```

The server runs on stdio and is designed to be connected to Claude Desktop or other MCP-compatible clients.

## Connecting to Claude Desktop

Add the following to your Claude Desktop configuration file:

**macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "local-audio-pins": {
      "command": "node",
      "args": ["/absolute/path/to/local-audio-pins/mcp-server/index.js"]
    }
  }
}
```

Replace `/absolute/path/to/local-audio-pins` with the actual path to your project directory.

After updating the config, restart Claude Desktop.

## Available Tools

### get_collection

Get a full collection including all pins.

**Parameters:**
- `collection_id` (string): The collection ID (e.g., "default")

**Returns:** Collection object with name, center coordinates, and all pins.

### list_pins

List all pins in a collection with their details.

**Parameters:**
- `collection_id` (string): The collection ID

**Returns:** Array of pins with id, lat, lng, title, description, and audioPath.

### get_pin

Get a single pin by ID.

**Parameters:**
- `pin_id` (string): The pin ID (e.g., "pin_abc123")

**Returns:** Pin object with all details including which collection it belongs to.

## Example Prompts

Once connected, you can ask Claude things like:

- "List all the pins in my default collection"
- "What pins are in the downtown area?"
- "Create a walking tour starting from the easternmost pin"
- "Which pins mention food or restaurants in their descriptions?"
- "Summarize what each pin location is about"
