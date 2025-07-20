<div align="center">
  <img src="assets/img/Discord_MCP_full_logo.svg" width="60%" alt="Discord MCP" />
</div>
<hr>
<div align="center" style="line-height: 1;">
    <a href="https://github.com/modelcontextprotocol/servers" target="_blank" style="margin: 2px;">
        <img alt="MCP Server" src="https://badge.mcpx.dev?type=server" style="display: inline-block; vertical-align: middle;"/>
    </a>
    <a href="https://smithery.ai/server/@SaseQ/discord-mcp" target="_blank" style="margin: 2px;">
        <img alt="Smithery Badge" src="https://camo.githubusercontent.com/ee5c6c6dc502821f4d57313b2885f7878af52be14142dd98526ea12aedf9b260/68747470733a2f2f736d6974686572792e61692f62616467652f40646d6f6e74676f6d65727934302f646565707365656b2d6d63702d736572766572" data-canonical-src="https://smithery.ai/server/@SaseQ/discord-mcp" style="display: inline-block; vertical-align: middle;"/>
    </a>
    <a href="https://discord.gg/5Uvxe5jteM" target="_blank" style="margin: 2px;">
        <img alt="Discord" src="https://img.shields.io/discord/936242526120194108?color=7389D8&label&logo=discord&logoColor=ffffff" style="display: inline-block; vertical-align: middle;"/>
    </a>
    <a href="https://github.com/SaseQ/discord-mcp/blob/main/LICENSE" target="_blank" style="margin: 2px;">
        <img alt="MIT License" src="https://img.shields.io/github/license/SaseQ/discord-mcp" style="display: inline-block; vertical-align: middle;"/>
    </a>
</div>

## 📖 Description

A comprehensive [Model Context Protocol (MCP)](https://modelcontextprotocol.io/introduction) server for Discord built with [discord.js](https://discord.js.org/), providing **83 powerful tools** for complete Discord server management and automation through MCP-compatible applications like Claude Desktop.

**🚀 NEW MAJOR UPDATE:** We've expanded from 76 to **83 total tools**, adding 6 powerful channel organization capabilities and voice channel creation for complete server structure management!

Transform your AI assistants into Discord powerhouses with comprehensive server management, voice channel control, advanced moderation, detailed analytics, and rich interactive components.

## ✨ Key Features

- **🎵 Voice & Audio Management** - Join/leave voice channels, play audio, control volume
- **📅 Event & Scheduling** - Create and manage Discord events and scheduled activities  
- **🎨 Rich Media Management** - Handle emojis, stickers, and file attachments
- **🛡️ Advanced Moderation** - Comprehensive automod rules and member management
- **📊 Analytics & Logging** - Detailed server statistics and chat log exports
- **🎯 Interactive Components** - Buttons, select menus, embeds, and modals
- **🏗️ Channel Organization** - Complete channel and category positioning and management
- **⚙️ Server Administration** - Complete server settings and welcome screen management
- **🔗 Dual Transport** - Both stdio and HTTP JSON-RPC support

## 🔬 Installation

### Prerequisites
- Node.js 18+ (download from [nodejs.org](https://nodejs.org/))
- A Discord Bot token (see [Discord Bot Setup](#discord-bot-setup) below)

### Setup Steps

#### 1. Clone the repository
```bash
git clone https://github.com/SaseQ/discord-mcp
cd discord-mcp
```

#### 2. Install dependencies
```bash
npm install
```

#### 3. Configure environment variables
Create a `.env` file in the project root:
```bash
cp .env.example .env
```

Edit `.env` and add your Discord bot token:
```env
DISCORD_TOKEN=your_discord_bot_token_here
DISCORD_GUILD_ID=optional_default_server_id
```

#### 4. Build the project
```bash
npm run build
```

#### 5. Test the setup (optional)
```bash
npm run dev
```
You should see: `Discord bot logged in as YourBotName#0000`

### Discord Bot Setup

To use this server, you need a Discord Bot token:

1. Go to the [Discord Developer Portal](https://discord.com/developers/applications)
2. Click "New Application" and give it a name
3. Go to the "Bot" section in the left sidebar
4. Click "Reset Token" and copy the token
5. Add this token to your `.env` file or MCP configuration
6. Under "Privileged Gateway Intents", enable:
   - **Server Members Intent** (required for user lookups)
   - **Message Content Intent** (required for reading messages)
7. Invite the bot to your server using the OAuth2 URL generator with appropriate permissions

### Configure AI Client

Add the Discord MCP server to your AI client configuration:
```json
{
  "mcpServers": {
    "discord-mcp": {
      "command": "node",
      "args": [
        "/absolute/path/to/discord-mcp/dist/index.js"
      ],
      "env": {
        "DISCORD_TOKEN": "YOUR_DISCORD_BOT_TOKEN",
        "DISCORD_GUILD_ID": "OPTIONAL_DEFAULT_SERVER_ID"
      }
    }
  }
}
```
**Environment Variables:**
- `DISCORD_TOKEN` (required): Your Discord bot token
- `DISCORD_GUILD_ID` (optional): Default Discord server ID. When set, tools that accept a `guildId` parameter can omit it

## 🔧 GitMCP

Use Discord MCP remotely via [GitMCP](https://gitmcp.io/):
```json
{
  "mcpServers": {
    "discord-mcp": {
      "command": "npx",
      "args": [
        "mcp-remote",
        "https://gitmcp.io/SaseQ/discord-mcp"
      ],
      "env": {
        "DISCORD_TOKEN": "YOUR_DISCORD_BOT_TOKEN",
        "DISCORD_GUILD_ID": "OPTIONAL_DEFAULT_SERVER_ID"
      }
    }
  }
}
```
Set `DISCORD_GUILD_ID` here as well if you want to automatically target a specific server.
More info and different configs [here](https://gitmcp.io/SaseQ/discord-mcp)

## ⚓ Smithery

Install Discord MCP Server automatically via [Smithery](https://smithery.ai/):
```bash
npx -y @smithery/cli@latest install @SaseQ/discord-mcp --client claude
```

## 🛠️ Available Tools (83 Total)

> **Note:** If `DISCORD_GUILD_ID` is set in your environment, the `guildId` parameter becomes optional for all tools that accept it.

### 🎵 Voice & Audio Management (6 tools)
- **`join_voice_channel`** - Join a voice channel
- **`leave_voice_channel`** - Leave a voice channel  
- **`play_audio`** - Play audio from URL or file
- **`stop_audio`** - Stop currently playing audio
- **`set_volume`** - Adjust audio volume (0-200%)
- **`get_voice_connections`** - List active voice connections

### 🏠 Server Information & Management (5 tools)
- **`get_server_info`** - Get detailed Discord server information
- **`edit_server`** - Edit server settings (name, description, verification level)
- **`get_server_widget`** - Get server widget information
- **`get_welcome_screen`** - Get server welcome screen details
- **`edit_welcome_screen`** - Edit server welcome screen settings

### 💬 Message Management (15 tools)
- **`send_message`** - Send a message to a specific channel
- **`edit_message`** - Edit a message from a specific channel
- **`delete_message`** - Delete a message from a specific channel
- **`read_messages`** - Read recent message history from a specific channel
- **`pin_message`** - Pin a message in a channel
- **`unpin_message`** - Unpin a message from a channel
- **`get_pinned_messages`** - Get all pinned messages in a channel
- **`bulk_delete_messages`** - Delete multiple messages at once
- **`crosspost_message`** - Crosspost an announcement message
- **`send_private_message`** - Send a private message to a specific user
- **`edit_private_message`** - Edit a private message
- **`delete_private_message`** - Delete a private message
- **`read_private_messages`** - Read private message history
- **`add_reaction`** - Add a reaction (emoji) to a specific message
- **`remove_reaction`** - Remove a reaction from a message

### 👥 Member Management (9 tools)
- **`get_user_id_by_name`** - Get a Discord user's ID by username
- **`get_members`** - Get server members with pagination
- **`search_members`** - Search members by username or nickname
- **`edit_member`** - Edit member properties (nickname, roles)
- **`get_member_info`** - Get detailed member information
- **`ban_member`** - Ban a member from the server
- **`unban_member`** - Unban a member from the server
- **`kick_member`** - Kick a member from the server
- **`timeout_member`** - Timeout a member temporarily

### 🎭 Role Management (7 tools)
- **`create_role`** - Create a new role
- **`delete_role`** - Delete a role
- **`edit_role`** - Edit role properties
- **`add_role_to_member`** - Add a role to a member
- **`remove_role_from_member`** - Remove a role from a member
- **`get_roles`** - List all server roles
- **`set_role_positions`** - Set role hierarchy positions

### 📢 Channel Management (15 tools)
- **`create_text_channel`** - Create a text channel
- **`create_voice_channel`** - Create a voice channel with customizable settings
- **`delete_channel`** - Delete a channel
- **`find_channel`** - Find a channel by name
- **`list_channels`** - List all channels
- **`create_category`** - Create a new category
- **`delete_category`** - Delete a category
- **`find_category`** - Find a category by name
- **`list_channels_in_category`** - List channels in a category
- **`set_channel_position`** - Move a single channel to a specific position
- **`set_channel_positions`** - Move multiple channels to specific positions
- **`move_channel_to_category`** - Move channels into or out of categories
- **`set_category_position`** - Move a category to a specific position
- **`organize_channels`** - Comprehensive server reorganization in one command
- **`get_channel_structure`** - View current server structure with visual layout

### 🎨 Emoji & Sticker Management (6 tools)
- **`create_emoji`** - Create a custom emoji
- **`delete_emoji`** - Delete a custom emoji
- **`get_emojis`** - List all custom emojis
- **`create_sticker`** - Create a custom sticker
- **`delete_sticker`** - Delete a custom sticker
- **`get_stickers`** - List all custom stickers

### 📎 File & Attachment Management (2 tools)
- **`upload_file`** - Upload a file to a channel
- **`get_message_attachments`** - Get attachments from a message

### 📅 Event & Scheduling Management (4 tools)
- **`create_event`** - Create a scheduled Discord event
- **`edit_event`** - Edit an existing event
- **`delete_event`** - Delete an event
- **`get_events`** - List all server events

### 🔗 Invite Management (3 tools)
- **`create_invite`** - Create channel invites with custom settings
- **`delete_invite`** - Delete/revoke an invite
- **`get_invites`** - List all server invites

### 🛡️ Moderation & Safety (8 tools)
- **`create_automod_rule`** - Create automoderation rules
- **`edit_automod_rule`** - Edit existing automod rules
- **`delete_automod_rule`** - Delete automod rules
- **`get_automod_rules`** - List all automod rules
- **`get_audit_logs`** - Get server audit logs
- **`get_bans`** - List all server bans
- **`remove_timeout`** - Remove timeout from a member
- **`timeout_member`** - Apply timeout to a member

### 🎯 Interactive Components (4 tools)
- **`send_modal`** - Send interactive modal dialogs
- **`send_embed`** - Send rich embed messages
- **`send_button`** - Send messages with interactive buttons
- **`send_select_menu`** - Send messages with select menus

### 🧵 Thread Management (8 tools)
- **`create_thread`** - Create discussion threads
- **`archive_thread`** - Archive a thread
- **`unarchive_thread`** - Unarchive a thread
- **`lock_thread`** - Lock a thread
- **`unlock_thread`** - Unlock a thread
- **`join_thread`** - Join a thread
- **`leave_thread`** - Leave a thread
- **`get_active_threads`** - List active threads

### 🔒 Permission Management (3 tools)
- **`set_channel_permissions`** - Set channel-specific permissions
- **`get_channel_permissions`** - Get channel permissions
- **`sync_channel_permissions`** - Sync permissions with category

### 🪝 Webhook Management (4 tools)
- **`create_webhook`** - Create a new webhook
- **`delete_webhook`** - Delete a webhook
- **`list_webhooks`** - List channel webhooks
- **`send_webhook_message`** - Send messages via webhook

### 📊 Analytics & Logging (3 tools)
- **`get_message_history`** - Get detailed message history with pagination
- **`get_server_stats`** - Get comprehensive server statistics
- **`export_chat_log`** - Export chat logs in JSON/CSV/TXT formats

## 🏗️ Channel Organization Features

The Discord MCP server includes powerful channel organization capabilities for complete server structure management:

### 🎯 Core Organization Tools

- **Individual Channel Positioning** - Move single channels with `set_channel_position`
- **Bulk Channel Management** - Reorder multiple channels simultaneously with `set_channel_positions`
- **Category Management** - Position categories and organize channel hierarchy with `set_category_position`
- **Channel-Category Assignment** - Move channels between categories with `move_channel_to_category`
- **Comprehensive Organization** - Complete server restructuring with `organize_channels`
- **Structure Visualization** - View current layout with `get_channel_structure`

### 📋 Usage Examples

**Get Current Server Structure:**
```json
{
  "name": "get_channel_structure",
  "arguments": { "guildId": "your-server-id" }
}
```

**Create Voice Channel with Settings:**
```json
{
  "name": "create_voice_channel",
  "arguments": {
    "name": "Gaming Voice",
    "categoryId": "123456789",
    "userLimit": 10,
    "bitrate": 128000
  }
}
```

**Move Channel to Category:**
```json
{
  "name": "move_channel_to_category", 
  "arguments": {
    "channelId": "123456789",
    "categoryId": "987654321"
  }
}
```

**Comprehensive Server Reorganization:**
```json
{
  "name": "organize_channels",
  "arguments": {
    "organization": {
      "categories": [
        {"categoryId": "cat1", "position": 0},
        {"categoryId": "cat2", "position": 1}
      ],
      "channels": [
        {"channelId": "ch1", "categoryId": "cat1", "position": 0},
        {"channelId": "ch2", "categoryId": "cat2", "position": 1},
        {"channelId": "ch3", "categoryId": null, "position": 2}
      ]
    }
  }
}
```

### 🛡️ Organization Requirements
- Bot requires **"Manage Channels"** permission
- Works with text channels, voice channels, and categories
- Supports both individual and bulk operations
- Position-based ordering (0-based indexing)
- Category assignment and removal capabilities

## 🚀 Development

### Available Scripts

```bash
# Run in development mode with hot reload
npm run dev

# Build the TypeScript project
npm run build

# Clean build artifacts
npm run clean

# Type check without building
npm run type-check
```

### Project Structure

```
discord-mcp/
├── src/
│   ├── index.ts          # Main server entry point and tool definitions
│   ├── discord-service.ts # Discord.js integration and service methods
│   └── types.ts          # Zod schemas and TypeScript type definitions
├── dist/                 # Compiled JavaScript (after build)
├── .env                  # Environment variables (create from .env.example)
├── .env.example          # Example environment configuration
├── package.json          # Project dependencies and scripts
└── tsconfig.json         # TypeScript configuration
```

### Technical Architecture

- **🏗️ MCP Protocol** - Full Model Context Protocol implementation
- **🔷 TypeScript** - Complete type safety with strict checking
- **📋 Zod Validation** - Runtime schema validation for all inputs
- **🚀 Discord.js v14** - Latest Discord API integration
- **🔄 Dual Transport** - Both stdio and HTTP JSON-RPC support
- **⚡ Error Handling** - Comprehensive error handling and validation
- **🛡️ Permission Checking** - Built-in Discord permission validation

## 🎯 Use Cases

- **🤖 Discord Bot Automation** - Create intelligent Discord bots with AI
- **📊 Server Analytics** - Monitor and analyze Discord server activity
- **🎮 Community Management** - Automated moderation and member management
- **📅 Event Coordination** - Streamlined event planning and management
- **🎵 Music & Audio** - Voice channel management and audio playback
- **🏗️ Server Organization** - Intelligent channel and category structure management
- **📈 Growth Tracking** - Server statistics and member insights
- **🔧 Server Administration** - Complete server configuration and management

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

**✨ Transform your Discord experience with AI-powered automation and management!**

For more detailed examples and advanced usage, check out the [Wiki](https://github.com/SaseQ/discord-mcp/wiki).