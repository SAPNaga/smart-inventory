#!/usr/bin/env node
/**
 * Smart Inventory MCP Server
 *
 * Exposes 2 tools (getLowStockBooks, restockBooks) over MCP via stdio JSON-RPC.
 * Designed to be launched by Claude Desktop as a subprocess.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema
} from '@modelcontextprotocol/sdk/types.js';

import axios from 'axios';

const CAP_URL = process.env.CAP_BASE_URL || 'http://localhost:4004/catalog';

// ============================================================================
// Tool catalog — single source of truth
// ============================================================================
const TOOLS = [
  {
    name: 'getLowStockBooks',
    description: 'Returns all books with stock less than 5. Use this to identify which books need restocking.',
    inputSchema: {
      type: 'object',
      properties: {}
    },
    handler: async () => {
      const res = await axios.get(`${CAP_URL}/getLowStockBooks()`);
      return res.data.value || res.data;
    }
  },
  {
    name: 'restockBooks',
    description: 'Adds the given amount to the stock of every book that currently has stock less than 5. Returns the updated books.',
    inputSchema: {
      type: 'object',
      properties: {
        amount: {
          type: 'integer',
          minimum: 1,
          description: 'How many units to add to each low-stock book.'
        }
      },
      required: ['amount']
    },
    handler: async ({ amount }) => {
      const res = await axios.post(`${CAP_URL}/restockBooks`, { amount });
      return res.data.value || res.data;
    }
  }
];

// ============================================================================
// MCP server setup
// ============================================================================
const server = new Server(
  { name: 'smart-inventory-mcp', version: '1.0.0' },
  { capabilities: { tools: {} } }
);

// Handler: tools/list — Claude Desktop calls this to discover available tools
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: TOOLS.map(t => ({
    name: t.name,
    description: t.description,
    inputSchema: t.inputSchema
  }))
}));

// Handler: tools/call — Claude Desktop calls this when it wants to invoke a tool
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const name = request.params.name;
  const args = request.params.arguments || {};

  const tool = TOOLS.find(t => t.name === name);
  if (!tool) {
    return {
      content: [{ type: 'text', text: 'Error: unknown tool ' + name }],
      isError: true
    };
  }

  try {
    const result = await tool.handler(args);
    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
    };
  } catch (err) {
    const msg = (err.response?.data?.error?.message) || err.message;
    return {
      content: [{ type: 'text', text: 'Error executing ' + name + ': ' + msg }],
      isError: true
    };
  }
});

// ============================================================================
// Boot
// ============================================================================
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // CRITICAL: stderr only — never stdout (would corrupt MCP protocol stream)
  console.error(JSON.stringify({
    msg: 'MCP server started',
    name: 'smart-inventory-mcp',
    tools: TOOLS.length,
    capUrl: CAP_URL
  }));
}

main().catch(err => {
  console.error(JSON.stringify({ msg: 'fatal', err: err.message }));
  process.exit(1);
});