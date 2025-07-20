#!/usr/bin/env node

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const serverUrl = process.argv[2] || 'http://localhost:3000';

async function main() {
  try {
    const client = new Client({
      name: 'mcp-http-client',
      version: '1.0.0'
    }, {
      capabilities: {}
    });

    // Use SSE transport for HTTP connections
    const transport = new SSEClientTransport(new URL(`${serverUrl}/sse`));
    
    // Connect to the server
    await client.connect(transport);
    
    // Bridge stdio to the HTTP transport
    const stdioTransport = new StdioClientTransport();
    
    // Forward messages between stdio and HTTP
    stdioTransport.onmessage = (message) => {
      transport.send(message);
    };
    
    transport.onmessage = (message) => {
      stdioTransport.send(message);
    };
    
    await stdioTransport.start();
    
  } catch (error) {
    console.error('Failed to connect to MCP server:', error);
    process.exit(1);
  }
}

main().catch(console.error);