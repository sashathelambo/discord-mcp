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

// Tool definitions
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      // Server Information
      {
        name: 'get_server_info',
        description: 'Get detailed discord server information',
        inputSchema: {
          type: 'object',
          properties: {
            guildId: {
              type: 'string',
              description: 'Discord server ID',
            },
          },
          required: [],
        },
      },
      // Message Management
      {
        name: 'send_message',
        description: 'Send a message to a specific channel',
        inputSchema: {
          type: 'object',
          properties: {
            channelId: {
              type: 'string',
              description: 'Discord channel ID',
            },
            message: {
              type: 'string',
              description: 'Message content',
            },
          },
          required: ['channelId', 'message'],
        },
      },
      {
        name: 'edit_message',
        description: 'Edit a message from a specific channel',
        inputSchema: {
          type: 'object',
          properties: {
            channelId: {
              type: 'string',
              description: 'Discord channel ID',
            },
            messageId: {
              type: 'string',
              description: 'Specific message ID',
            },
            newMessage: {
              type: 'string',
              description: 'New message content',
            },
          },
          required: ['channelId', 'messageId', 'newMessage'],
        },
      },
      {
        name: 'delete_message',
        description: 'Delete a message from a specific channel',
        inputSchema: {
          type: 'object',
          properties: {
            channelId: {
              type: 'string',
              description: 'Discord channel ID',
            },
            messageId: {
              type: 'string',
              description: 'Specific message ID',
            },
          },
          required: ['channelId', 'messageId'],
        },
      },
      {
        name: 'read_messages',
        description: 'Read recent message history from a specific channel',
        inputSchema: {
          type: 'object',
          properties: {
            channelId: {
              type: 'string',
              description: 'Discord channel ID',
            },
            count: {
              type: 'string',
              description: 'Number of messages to retrieve',
            },
          },
          required: ['channelId'],
        },
      },
      {
        name: 'get_user_id_by_name',
        description: 'Get a Discord user\'s ID by username in a guild for ping usage <@id>.',
        inputSchema: {
          type: 'object',
          properties: {
            username: {
              type: 'string',
              description: 'Discord username (optionally username#discriminator)',
            },
            guildId: {
              type: 'string',
              description: 'Discord server ID',
            },
          },
          required: ['username'],
        },
      },
      {
        name: 'send_private_message',
        description: 'Send a private message to a specific user',
        inputSchema: {
          type: 'object',
          properties: {
            userId: {
              type: 'string',
              description: 'Discord user ID',
            },
            message: {
              type: 'string',
              description: 'Message content',
            },
          },
          required: ['userId', 'message'],
        },
      },
      {
        name: 'edit_private_message',
        description: 'Edit a private message from a specific user',
        inputSchema: {
          type: 'object',
          properties: {
            userId: {
              type: 'string',
              description: 'Discord user ID',
            },
            messageId: {
              type: 'string',
              description: 'Specific message ID',
            },
            newMessage: {
              type: 'string',
              description: 'New message content',
            },
          },
          required: ['userId', 'messageId', 'newMessage'],
        },
      },
      {
        name: 'delete_private_message',
        description: 'Delete a private message from a specific user',
        inputSchema: {
          type: 'object',
          properties: {
            userId: {
              type: 'string',
              description: 'Discord user ID',
            },
            messageId: {
              type: 'string',
              description: 'Specific message ID',
            },
          },
          required: ['userId', 'messageId'],
        },
      },
      {
        name: 'read_private_messages',
        description: 'Read recent message history from a specific user',
        inputSchema: {
          type: 'object',
          properties: {
            userId: {
              type: 'string',
              description: 'Discord user ID',
            },
            count: {
              type: 'string',
              description: 'Number of messages to retrieve',
            },
          },
          required: ['userId'],
        },
      },
      {
        name: 'add_reaction',
        description: 'Add a reaction (emoji) to a specific message',
        inputSchema: {
          type: 'object',
          properties: {
            channelId: {
              type: 'string',
              description: 'Discord channel ID',
            },
            messageId: {
              type: 'string',
              description: 'Discord message ID',
            },
            emoji: {
              type: 'string',
              description: 'Emoji (Unicode or string)',
            },
          },
          required: ['channelId', 'messageId', 'emoji'],
        },
      },
      {
        name: 'remove_reaction',
        description: 'Remove a specified reaction (emoji) from a message',
        inputSchema: {
          type: 'object',
          properties: {
            channelId: {
              type: 'string',
              description: 'Discord channel ID',
            },
            messageId: {
              type: 'string',
              description: 'Discord message ID',
            },
            emoji: {
              type: 'string',
              description: 'Emoji (Unicode or string)',
            },
          },
          required: ['channelId', 'messageId', 'emoji'],
        },
      },
      // Channel Management
      {
        name: 'create_text_channel',
        description: 'Create a new text channel',
        inputSchema: {
          type: 'object',
          properties: {
            guildId: {
              type: 'string',
              description: 'Discord server ID',
            },
            name: {
              type: 'string',
              description: 'Channel name',
            },
            categoryId: {
              type: 'string',
              description: 'Category ID (optional)',
            },
          },
          required: ['name'],
        },
      },
      {
        name: 'delete_channel',
        description: 'Delete a channel',
        inputSchema: {
          type: 'object',
          properties: {
            guildId: {
              type: 'string',
              description: 'Discord server ID',
            },
            channelId: {
              type: 'string',
              description: 'Discord channel ID',
            },
          },
          required: ['channelId'],
        },
      },
      {
        name: 'find_channel',
        description: 'Find a channel type and ID using name and server ID',
        inputSchema: {
          type: 'object',
          properties: {
            guildId: {
              type: 'string',
              description: 'Discord server ID',
            },
            channelName: {
              type: 'string',
              description: 'Discord channel name',
            },
          },
          required: ['channelName'],
        },
      },
      {
        name: 'list_channels',
        description: 'List of all channels',
        inputSchema: {
          type: 'object',
          properties: {
            guildId: {
              type: 'string',
              description: 'Discord server ID',
            },
          },
          required: [],
        },
      },
      // Category Management
      {
        name: 'create_category',
        description: 'Create a new category for channels',
        inputSchema: {
          type: 'object',
          properties: {
            guildId: {
              type: 'string',
              description: 'Discord server ID',
            },
            name: {
              type: 'string',
              description: 'Discord category name',
            },
          },
          required: ['name'],
        },
      },
      {
        name: 'delete_category',
        description: 'Delete a category',
        inputSchema: {
          type: 'object',
          properties: {
            guildId: {
              type: 'string',
              description: 'Discord server ID',
            },
            categoryId: {
              type: 'string',
              description: 'Discord category ID',
            },
          },
          required: ['categoryId'],
        },
      },
      {
        name: 'find_category',
        description: 'Find a category ID using name and server ID',
        inputSchema: {
          type: 'object',
          properties: {
            guildId: {
              type: 'string',
              description: 'Discord server ID',
            },
            categoryName: {
              type: 'string',
              description: 'Discord category name',
            },
          },
          required: ['categoryName'],
        },
      },
      {
        name: 'list_channels_in_category',
        description: 'List of channels in a specific category',
        inputSchema: {
          type: 'object',
          properties: {
            guildId: {
              type: 'string',
              description: 'Discord server ID',
            },
            categoryId: {
              type: 'string',
              description: 'Discord category ID',
            },
          },
          required: ['categoryId'],
        },
      },
      // Webhook Management
      {
        name: 'create_webhook',
        description: 'Create a new webhook on a specific channel',
        inputSchema: {
          type: 'object',
          properties: {
            channelId: {
              type: 'string',
              description: 'Discord channel ID',
            },
            name: {
              type: 'string',
              description: 'Webhook name',
            },
          },
          required: ['channelId', 'name'],
        },
      },
      {
        name: 'delete_webhook',
        description: 'Delete a webhook',
        inputSchema: {
          type: 'object',
          properties: {
            webhookId: {
              type: 'string',
              description: 'Discord webhook ID',
            },
          },
          required: ['webhookId'],
        },
      },
      {
        name: 'list_webhooks',
        description: 'List of webhooks on a specific channel',
        inputSchema: {
          type: 'object',
          properties: {
            channelId: {
              type: 'string',
              description: 'Discord channel ID',
            },
          },
          required: ['channelId'],
        },
      },
      {
        name: 'send_webhook_message',
        description: 'Send a message via webhook',
        inputSchema: {
          type: 'object',
          properties: {
            webhookUrl: {
              type: 'string',
              description: 'Discord webhook link',
            },
            message: {
              type: 'string',
              description: 'Message content',
            },
          },
          required: ['webhookUrl', 'message'],
        },
      },
    ],
  };
});

// Tool request handler
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    const { name, arguments: args } = request.params;

    switch (name) {
      // Server Information
      case 'get_server_info': {
        const parsed = schemas.ServerInfoSchema.parse(args);
        const result = await discordService.getServerInfo(parsed.guildId);
        return { content: [{ type: 'text', text: result }] };
      }

      // Message Management
      case 'send_message': {
        const parsed = schemas.SendMessageSchema.parse(args);
        const result = await discordService.sendMessage(parsed.channelId, parsed.message);
        return { content: [{ type: 'text', text: result }] };
      }

      case 'edit_message': {
        const parsed = schemas.EditMessageSchema.parse(args);
        const result = await discordService.editMessage(parsed.channelId, parsed.messageId, parsed.newMessage);
        return { content: [{ type: 'text', text: result }] };
      }

      case 'delete_message': {
        const parsed = schemas.DeleteMessageSchema.parse(args);
        const result = await discordService.deleteMessage(parsed.channelId, parsed.messageId);
        return { content: [{ type: 'text', text: result }] };
      }

      case 'read_messages': {
        const parsed = schemas.ReadMessagesSchema.parse(args);
        const result = await discordService.readMessages(parsed.channelId, parsed.count);
        return { content: [{ type: 'text', text: result }] };
      }

      case 'get_user_id_by_name': {
        const parsed = schemas.GetUserIdByNameSchema.parse(args);
        const result = await discordService.getUserIdByName(parsed.username, parsed.guildId);
        return { content: [{ type: 'text', text: result }] };
      }

      case 'send_private_message': {
        const parsed = schemas.SendPrivateMessageSchema.parse(args);
        const result = await discordService.sendPrivateMessage(parsed.userId, parsed.message);
        return { content: [{ type: 'text', text: result }] };
      }

      case 'edit_private_message': {
        const parsed = schemas.EditPrivateMessageSchema.parse(args);
        const result = await discordService.editPrivateMessage(parsed.userId, parsed.messageId, parsed.newMessage);
        return { content: [{ type: 'text', text: result }] };
      }

      case 'delete_private_message': {
        const parsed = schemas.DeletePrivateMessageSchema.parse(args);
        const result = await discordService.deletePrivateMessage(parsed.userId, parsed.messageId);
        return { content: [{ type: 'text', text: result }] };
      }

      case 'read_private_messages': {
        const parsed = schemas.ReadPrivateMessagesSchema.parse(args);
        const result = await discordService.readPrivateMessages(parsed.userId, parsed.count);
        return { content: [{ type: 'text', text: result }] };
      }

      case 'add_reaction': {
        const parsed = schemas.AddReactionSchema.parse(args);
        const result = await discordService.addReaction(parsed.channelId, parsed.messageId, parsed.emoji);
        return { content: [{ type: 'text', text: result }] };
      }

      case 'remove_reaction': {
        const parsed = schemas.RemoveReactionSchema.parse(args);
        const result = await discordService.removeReaction(parsed.channelId, parsed.messageId, parsed.emoji);
        return { content: [{ type: 'text', text: result }] };
      }

      // Channel Management
      case 'create_text_channel': {
        const parsed = schemas.CreateTextChannelSchema.parse(args);
        const result = await discordService.createTextChannel(parsed.guildId, parsed.name, parsed.categoryId);
        return { content: [{ type: 'text', text: result }] };
      }

      case 'delete_channel': {
        const parsed = schemas.DeleteChannelSchema.parse(args);
        const result = await discordService.deleteChannel(parsed.guildId, parsed.channelId);
        return { content: [{ type: 'text', text: result }] };
      }

      case 'find_channel': {
        const parsed = schemas.FindChannelSchema.parse(args);
        const result = await discordService.findChannel(parsed.guildId, parsed.channelName);
        return { content: [{ type: 'text', text: result }] };
      }

      case 'list_channels': {
        const parsed = schemas.ListChannelsSchema.parse(args);
        const result = await discordService.listChannels(parsed.guildId);
        return { content: [{ type: 'text', text: result }] };
      }

      // Category Management
      case 'create_category': {
        const parsed = schemas.CreateCategorySchema.parse(args);
        const result = await discordService.createCategory(parsed.guildId, parsed.name);
        return { content: [{ type: 'text', text: result }] };
      }

      case 'delete_category': {
        const parsed = schemas.DeleteCategorySchema.parse(args);
        const result = await discordService.deleteCategory(parsed.guildId, parsed.categoryId);
        return { content: [{ type: 'text', text: result }] };
      }

      case 'find_category': {
        const parsed = schemas.FindCategorySchema.parse(args);
        const result = await discordService.findCategory(parsed.guildId, parsed.categoryName);
        return { content: [{ type: 'text', text: result }] };
      }

      case 'list_channels_in_category': {
        const parsed = schemas.ListChannelsInCategorySchema.parse(args);
        const result = await discordService.listChannelsInCategory(parsed.guildId, parsed.categoryId);
        return { content: [{ type: 'text', text: result }] };
      }

      // Webhook Management
      case 'create_webhook': {
        const parsed = schemas.CreateWebhookSchema.parse(args);
        const result = await discordService.createWebhook(parsed.channelId, parsed.name);
        return { content: [{ type: 'text', text: result }] };
      }

      case 'delete_webhook': {
        const parsed = schemas.DeleteWebhookSchema.parse(args);
        const result = await discordService.deleteWebhook(parsed.webhookId);
        return { content: [{ type: 'text', text: result }] };
      }

      case 'list_webhooks': {
        const parsed = schemas.ListWebhooksSchema.parse(args);
        const result = await discordService.listWebhooks(parsed.channelId);
        return { content: [{ type: 'text', text: result }] };
      }

      case 'send_webhook_message': {
        const parsed = schemas.SendWebhookMessageSchema.parse(args);
        const result = await discordService.sendWebhookMessage(parsed.webhookUrl, parsed.message);
        return { content: [{ type: 'text', text: result }] };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      content: [{ type: 'text', text: `Error: ${errorMessage}` }],
      isError: true,
    };
  }
});

// Main function
async function main() {
  try {
    // Initialize Discord first
    await initializeDiscord();

    // Check if we should use HTTP transport
    const useHttp = process.env.MCP_HTTP_PORT || process.env.PORT;
    
    if (useHttp) {
      // Start HTTP server
      const port = parseInt(useHttp) || 3000;
      
      const httpServer = createServer(async (req, res) => {
        const url = new URL(req.url || '/', `http://${req.headers.host}`);
        
        // CORS headers
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
        
        if (req.method === 'OPTIONS') {
          res.writeHead(200);
          res.end();
          return;
        }
        
        if (url.pathname === '/sse' && req.method === 'GET') {
          // SSE connection
          const transport = new SSEServerTransport('/message', res);
          await server.connect(transport);
          await transport.start();
        } else if (url.pathname === '/message' && req.method === 'POST') {
          // Handle POST messages - this would need to route to the correct transport
          res.writeHead(501);
          res.end('POST message handling not implemented yet');
        } else if (url.pathname === '/health' && req.method === 'GET') {
          // Health check
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ status: 'ok', server: 'discord-mcp' }));
        } else {
          // Default response
          res.writeHead(200, { 'Content-Type': 'text/plain' });
          res.end('Discord MCP Server - Use /sse for SSE connection, /health for status');
        }
      });
      
      httpServer.listen(port, () => {
        console.error(`Discord MCP server running on HTTP port ${port}`);
        console.error(`SSE endpoint: http://localhost:${port}/sse`);
        console.error(`Health check: http://localhost:${port}/health`);
      });
    } else {
      // Start stdio server (default)
      const transport = new StdioServerTransport();
      await server.connect(transport);
      console.error('Discord MCP server running on stdio');
    }
  } catch (error) {
    console.error('Failed to start Discord MCP server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.error('Shutting down Discord MCP server...');
  if (discordService) {
    await discordService.destroy();
  }
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.error('Shutting down Discord MCP server...');
  if (discordService) {
    await discordService.destroy();
  }
  process.exit(0);
});

// Run the server
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
