# 🤖 Discord MCP Server

> **⚠️ SECURITY WARNING**: This project handles Discord bot tokens and server access. Please read our [Security Policy](SECURITY.md) before using or contributing.

A comprehensive Model Context Protocol (MCP) server for Discord API integration, providing powerful Discord bot management capabilities through a standardized interface.

## 🔒 Security First

**BEFORE YOU START:**
- 🚨 **NEVER** commit Discord bot tokens to any repository
- ✅ Always use environment variables for sensitive data
- 🔐 Follow our [Security Policy](SECURITY.md) for safe usage
- 📖 Read [Contributing Guidelines](CONTRIBUTING.md) before contributing

## 🚀 Features

### Core Discord Operations
- ✅ Server information and management
- ✅ Channel creation and management (text, voice, forum, stage)
- ✅ Message management (send, edit, delete, reactions)
- ✅ Role and permission management
- ✅ Member moderation (ban, kick, timeout)
- ✅ Voice channel operations
- ✅ Webhook management
- ✅ Audit logging and analytics

### Advanced Features
- 🎯 Comprehensive channel organization
- 🔐 Privacy and permission controls
- 🎪 Interactive components (embeds, buttons, modals)
- 📊 Server statistics and analytics
- 🛡️ Auto-moderation capabilities
- 🎵 Audio playback support
- 📋 Thread management

## 🛡️ Quick Security Setup

### 1. Environment Setup
```bash
# Clone the repository
git clone https://github.com/YOUR-USERNAME/discord-mcp.git
cd discord-mcp

# Install dependencies
npm install

# Create environment file (NEVER commit this!)
cp .env.example .env

# Edit .env with your Discord bot token
nano .env
```

### 2. Discord Bot Setup
1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Create a new application and bot
3. Copy the bot token to your `.env` file
4. **IMPORTANT**: Regenerate your token if you suspect it's been exposed

### 3. Required Bot Permissions
```
Manage Server
Manage Roles  
Manage Channels
Manage Messages
View Channels
Send Messages
Connect (for voice)
Speak (for voice)
```

## 💾 Installation

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Start the server
npm start
```

### Development Mode
```bash
# Run in development mode
npm run dev
```

## 🔧 Configuration

### Environment Variables
Create a `.env` file based on `.env.example`:

```env
# Your Discord bot token (KEEP SECRET!)
DISCORD_TOKEN=your_bot_token_here

# Default Discord server ID (optional)
DISCORD_GUILD_ID=your_guild_id_here
```

## 📚 Usage

### MCP Integration
Use with MCP-compatible clients:

```bash
# Via stdio
npx discord-mcp

# Via HTTP (port 3001)
HTTP_PORT=3001 npx discord-mcp
```

### Example Operations
```typescript
// Server information
await discord.getServerInfo(guildId);

// Send message
await discord.sendMessage(channelId, "Hello World!");

// Create channel
await discord.createTextChannel(guildId, "new-channel");

// Manage roles
await discord.addRoleToMember(guildId, userId, roleId);
```

## 🤝 Contributing

We welcome contributions! Please:

1. 📖 Read our [Contributing Guidelines](CONTRIBUTING.md)
2. 🔒 Follow our [Security Policy](SECURITY.md)
3. ✅ Use the PR template
4. 🧪 Test thoroughly before submitting

### Development Guidelines
- Use TypeScript for all code
- Follow existing code style
- Add tests for new features
- Never commit sensitive data
- Update documentation

## 🔒 Security Features

- ✅ Environment variable validation
- ✅ Input sanitization and validation
- ✅ Permission-based access control
- ✅ Audit logging capabilities
- ✅ Rate limiting considerations
- ✅ Secure error handling

## 📋 API Reference

### Core Methods
| Method | Description | Security Level |
|--------|-------------|----------------|
| `getServerInfo()` | Get server information | READ |
| `sendMessage()` | Send message to channel | WRITE |
| `createChannel()` | Create new channel | ADMIN |
| `banMember()` | Ban server member | MODERATION |

See full API documentation in `/docs` (coming soon).

## 🚨 Important Security Notes

### For Users:
- 🔐 Keep your Discord bot token secret
- 🔄 Regularly rotate your tokens
- 📊 Monitor bot activity
- ⚠️ Use minimal required permissions

### For Contributors:
- 🚫 Never commit tokens or secrets
- ✅ Validate all user inputs
- 🔍 Review dependencies for vulnerabilities
- 📝 Follow secure coding practices

## 🐛 Troubleshooting

### Common Issues
- **Token Invalid**: Regenerate your Discord bot token
- **Permission Denied**: Check bot permissions in Discord server
- **Build Errors**: Ensure Node.js 18+ and TypeScript are installed

### Getting Help
- 📖 Check our [documentation](docs/)
- 🐛 [Report bugs](issues/new?template=bug_report.md)
- 💡 [Request features](issues/new?template=feature_request.md)
- 💬 Join our community discussions

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## ⚖️ Disclaimer

This software is provided "as-is" without warranty. Users are responsible for:
- Complying with Discord's Terms of Service
- Securing their bot tokens and credentials  
- Using appropriate permissions and rate limiting
- Monitoring and maintaining their Discord bots

## 🙏 Acknowledgments

- Discord.js team for the excellent Discord API wrapper
- Model Context Protocol community
- All contributors who help make this project better

---

**Remember**: Security first, then functionality. Happy building! 🚀

**Need help?** Check our [Security Policy](SECURITY.md) and [Contributing Guidelines](CONTRIBUTING.md).
