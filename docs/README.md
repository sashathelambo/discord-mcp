# Discord MCP - Organized Architecture

This directory contains the new organized architecture for the Discord MCP server.

## Overview

The Discord MCP server has been restructured to provide better organization, maintainability, and extensibility. The new architecture follows a modular approach with clearly defined responsibilities for each component.

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
```

## Key Components

### DiscordController
The main entry point that coordinates all operations:
- Manages initialization and cleanup of services
- Handles configuration and logging
- Coordinates rate limiting
- Routes actions to appropriate managers

### AutomationManager
Central hub for all Discord operations:
- Provides organized methods for each Discord action
- Handles input validation through Zod schemas
- Routes operations to the DiscordService

### Supporting Components
- **ConfigManager**: Environment variable parsing and runtime configuration
- **Logger**: Structured logging with configurable levels
- **ErrorHandler**: Unified error handling with custom error types
- **RateLimiter**: Discord API rate limit management
- **ToolOrganizer**: Tool categorization and organization

## Benefits

1. **Modularity**: Each component has a single responsibility
2. **Maintainability**: Changes to one component don't affect others
3. **Testability**: Each component can be tested independently
4. **Extensibility**: New features can be added without disrupting existing code
5. **Configuration**: Centralized configuration management
6. **Error Handling**: Consistent error handling across all operations
7. **Rate Limiting**: Built-in protection against Discord API rate limits

## Usage

The new architecture maintains backward compatibility with the existing API while providing a more organized internal structure. All existing tools and functionality remain available.

For detailed information about the architecture, see [architecture.md](architecture.md).