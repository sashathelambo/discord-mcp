<div align="center">
  <img src="assets/img/Discord_MCP_full_logo.svg" width="60%" alt="DeepSeek-V3" />
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

A [Model Context Protocol (MCP)](https://modelcontextprotocol.io/introduction) server for Discord built with [discord.js](https://discord.js.org/), 
allowing seamless integration of Discord Bot with MCP-compatible applications like Claude Desktop.

Enable your AI assistants to seamlessly interact with Discord. Manage channels, send messages, and retrieve server information effortlessly. Enhance your Discord experience with powerful automation capabilities.


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


## 🛠️ Available Tools

> **Note:** If `DISCORD_GUILD_ID` is set in your environment, the `guildId` parameter becomes optional for all tools that accept it.

#### Server Information
 - [`get_server_info`](): Get detailed discord server information

#### Message Management
 - [`send_message`](): Send a message to a specific channel
 - [`edit_message`](): Edit a message from a specific channel
 - [`delete_message`](): Delete a message from a specific channel
 - [`read_messages`](): Read recent message history from a specific channel
 - [`get_user_id_by_name`](): Get a Discord user's ID by username in a guild for ping usage `<@id>`
 - [`send_private_message`](): Send a private message to a specific user
 - [`edit_private_message`](): Edit a private message from a specific user
 - [`delete_private_message`](): Delete a private message from a specific user
 - [`read_private_messages`](): Read recent message history from a specific user
 - [`add_reaction`](): Add a reaction (emoji) to a specific message
 - [`remove_reaction`](): Remove a specified reaction (emoji) from a message

#### Channel Management
 - [`create_text_channel`](): Create text a channel
 - [`delete_channel`](): Delete a channel
 - [`find_channel`](): Find a channel type and ID using name and server ID
 - [`list_channels`](): List of all channels

#### Category Management
 - [`create_category`](): Create a new category for channels
 - [`delete_category`](): Delete a category
 - [`find_category`](): Find a category ID using name and server ID
 - [`list_channels_in_category`](): List of channels in a specific category

#### Webhook Management
 - [`create_webhook`](): Create a new webhook on a specific channel
 - [`delete_webhook`](): Delete a webhook
 - [`list_webhooks`](): List of webhooks on a specific channel
 - [`send_webhook_message`](): Send a message via webhook


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
│   ├── index.ts          # Main server entry point
│   ├── discord-service.ts # Discord.js integration
│   └── types.ts          # TypeScript type definitions
├── dist/                 # Compiled JavaScript (after build)
├── .env                  # Environment variables (create from .env.example)
├── .env.example          # Example environment configuration
├── package.json          # Project dependencies and scripts
└── tsconfig.json         # TypeScript configuration
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

<hr>

For more detailed examples and advanced usage, check out the [Wiki](https://github.com/SaseQ/discord-mcp/wiki).
