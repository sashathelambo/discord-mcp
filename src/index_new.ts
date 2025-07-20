#!/usr/bin/env node
import 'dotenv/config';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { DiscordService } from './discord-service.js';
import * as schemas from './types.js';
import { createServer } from 'node:http';
import { URL } from 'node:url';

const server = new Server(
  {
    name: 'discord-mcp-server',
    version: '0.0.1',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

let discordService: DiscordService;

// Initialize Discord service
async function initializeDiscord() {
  discordService = new DiscordService();
  await discordService.initialize();
}

// Complete tools list for both stdio and HTTP
