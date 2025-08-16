# Discord MCP Architecture

## Overview

This document describes the organized architecture of the Discord MCP server, which provides a more modular and maintainable approach to Discord automation.

## Core Components

### 1. DiscordController
The main entry point that coordinates all operations:
- Manages initialization and cleanup of services
- Handles configuration and logging
- Coordinates rate limiting
- Routes actions to appropriate managers

### 2. AutomationManager
Central hub for all Discord operations:
- Provides organized methods for each Discord action
- Handles input validation through Zod schemas
- Routes operations to the DiscordService

### 3. DiscordService
Low-level Discord.js integration:
- Direct interaction with Discord API
- Connection management
- Event handling

## Supporting Components

### 4. ConfigManager
Handles all configuration:
- Environment variable parsing
- Action permission management
- Runtime configuration updates

### 5. Logger
Centralized logging system:
- Configurable log levels
- Structured logging format
- Operation tracking

### 6. ErrorHandler
Unified error handling:
- Custom error types for different scenarios
- Consistent error formatting
- Error re-throwing mechanism

### 7. RateLimiter
Discord API rate limit management:
- Global rate limit tracking
- Bucket-specific rate limiting
- Automatic wait mechanisms

### 8. ToolOrganizer
Tool categorization and organization:
- Category-based tool grouping
- Alphabetical sorting
- Permission-based filtering

## Directory Structure

```
src/
├── core/                 # Core components
│   ├── DiscordController.ts    # Main controller
│   ├── AutomationManager.ts    # Action manager
│   ├── ConfigManager.ts        # Configuration
│   ├── Logger.ts              # Logging
│   ├── ErrorHandler.ts        # Error handling
│   └── RateLimiter.ts         # Rate limiting
├── utils/                # Utility functions
│   └── ToolOrganizer.ts       # Tool organization
├── managers/             # Specialized managers (future)
├── discord-service.ts    # Low-level Discord integration
├── index.ts             # Entry point
└── types.ts             # Type definitions
```

## Benefits of This Architecture

1. **Modularity**: Each component has a single responsibility
2. **Maintainability**: Changes to one component don't affect others
3. **Testability**: Each component can be tested independently
4. **Extensibility**: New features can be added without disrupting existing code
5. **Configuration**: Centralized configuration management
6. **Error Handling**: Consistent error handling across all operations
7. **Rate Limiting**: Built-in protection against Discord API rate limits
8. **Logging**: Comprehensive operation tracking and debugging

## Usage Patterns

### Executing Actions
```typescript
const controller = new DiscordController();
await controller.initialize();

const result = await controller.executeAction('send_message', {
  channelId: '123456789',
  message: 'Hello, World!'
});
```

### Configuration
Environment variables control behavior:
- `DISCORD_GUILD_ID`: Default server ID
- `ENABLE_LOGGING`: Enable/disable logging
- `LOG_LEVEL`: Logging verbosity (ERROR, WARN, INFO, DEBUG)
- `MAX_RETRIES`: Maximum retry attempts
- `RETRY_DELAY`: Delay between retries (ms)
- `TIMEOUT`: Operation timeout (ms)
- `RATE_LIMIT_PROTECTION`: Enable rate limit protection
- `ALLOWED_ACTIONS`: Comma-separated list of allowed actions
- `DENIED_ACTIONS`: Comma-separated list of denied actions

## Future Improvements

1. **Specialized Managers**: Create dedicated managers for different Discord features
2. **Caching Layer**: Add caching for frequently accessed data
3. **Event System**: Implement event-driven architecture for real-time updates
4. **Plugin System**: Allow third-party extensions
5. **Metrics Collection**: Add performance monitoring and metrics