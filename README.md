# Smart Inventory

A natural-language inventory management system built on the **Model Context Protocol (MCP)**, **SAP CAP**, and **Claude Desktop**. Manage your bookshop stock by simply chatting with Claude — no UI, no SQL, no API clients.

## What it does

Ask Claude things like:

> "Check low stock books"
> "Restock all low-stock items by 10 units"

Claude routes your request through a local MCP server, which talks to a SAP CAP service backed by SQLite. The result is returned to chat as structured data.

## Architecture

```
┌──────────────┐     MCP      ┌──────────────┐    HTTP     ┌──────────────┐    SQL    ┌─────────┐
│ Claude       │  ─────────►  │ MCP Server   │  ────────►  │ CAP Service  │ ────────► │ SQLite  │
│ Desktop      │  ◄─────────  │ (Node.js)    │  ◄────────  │ (CatalogSvc) │ ◄──────── │  (db)   │
└──────────────┘    JSON      └──────────────┘    JSON     └──────────────┘   rows    └─────────┘
```

- **Claude Desktop** — the conversational client; discovers and invokes tools via MCP
- **MCP Server** (`mcp-server/server.js`) — exposes `getLowStockBooks` and `restockBooks` tools
- **SAP CAP Service** (`srv/catalog-service.cds`) — REST/OData endpoint over the data model
- **SQLite** (`db/books.db`) — local persistence for the `Books` entity

## Project structure

```
smart-inventory/
├── db/
│   └── schema.cds              # CAP data model (Books entity)
├── srv/
│   ├── catalog-service.cds     # Service definition
│   └── catalog-service.js      # Custom service handlers
├── mcp-server/
│   ├── server.js               # MCP server exposing inventory tools
│   └── package.json
├── package.json                # CAP project config
└── .gitignore
```

## Tools exposed

| Tool | Description | Parameters |
|------|-------------|------------|
| `getLowStockBooks` | Returns all books with stock below 5 | _none_ |
| `restockBooks` | Adds units to every low-stock book | `amount` _(integer ≥ 1)_ |

## Prerequisites

- **Node.js** 18 or newer
- **Claude Desktop** ([download](https://claude.ai/download))
- **npm** (bundled with Node.js)

## Setup

### 1. Clone and install

```bash
git clone https://github.com/SAPNaga/smart-inventory.git
cd smart-inventory
npm install
```

### 2. Start the CAP service

In one terminal:

```bash
npx cds watch
```

You should see:

```
[cds] - server listening on { url: 'http://localhost:4004' }
```

### 3. Register the MCP server with Claude Desktop

Open Claude Desktop → **Settings → Developer → Edit Config**. Add the `smart-inventory` entry to `mcpServers`:

```json
{
  "mcpServers": {
    "smart-inventory": {
      "command": "node",
      "args": ["C:\\Users\\YourUsername\\Desktop\\smart-inventory\\mcp-server\\server.js"],
      "env": {
        "CAP_BASE_URL": "http://localhost:4004/catalog"
      }
    }
  }
}
```

> **Note:** Update the path in `args` to match where you cloned the repo. On macOS/Linux, use forward slashes.

### 4. Restart Claude Desktop

Fully quit Claude from the system tray, then relaunch. Navigate to **Settings → Developer** — `smart-inventory` should appear with a **running** status badge.

## Usage

In any chat with Claude:

```
You: check low stock books
```

Claude will call `getLowStockBooks` and return a table of items with stock under 5.

```
You: restock all low-stock books by 5 units
```

Claude will call `restockBooks` with `amount: 5` and return the updated stock levels.

You can also ask combined or follow-up questions naturally — Claude figures out which tool to call.

## Configuration

The MCP server reads its CAP backend URL from the `CAP_BASE_URL` environment variable, set in the Claude Desktop config:

```json
"env": {
  "CAP_BASE_URL": "http://localhost:4004/catalog"
}
```

If you deploy CAP elsewhere (Cloud Foundry, Kyma, BAS), update this URL accordingly.

## Troubleshooting

**MCP server shows "running" but tools fail with empty errors**
The CAP service isn't reachable. Make sure `cds watch` is running on port 4004 and `http://localhost:4004/catalog` returns a service document in your browser.

**Server doesn't appear in Settings → Developer**
Check `%APPDATA%\Claude\logs\mcp-server-smart-inventory.log` (Windows) or `~/Library/Logs/Claude/` (macOS) for startup errors. Common causes: invalid path in `args`, missing `npm install` in `mcp-server/`, or malformed JSON in the config file.

**Line-ending warnings on Windows**
Run `git config --global core.autocrlf true` once.

## Tech stack

- [Model Context Protocol](https://modelcontextprotocol.io/) — Anthropic's open standard for tool integration
- [SAP CAP (Cloud Application Programming Model)](https://cap.cloud.sap/) — service framework
- [Node.js](https://nodejs.org/) — runtime for the MCP server
- [SQLite](https://www.sqlite.org/) — local data storage
- [Axios](https://axios-http.com/) — HTTP client used by the MCP server

## License

MIT — feel free to use this as a template for your own MCP integrations.

## Author

**SAPNaga** · [GitHub](https://github.com/SAPNaga)

---

_Built as a learning project to demonstrate how MCP turns Claude into a domain-aware assistant for any backend service._
