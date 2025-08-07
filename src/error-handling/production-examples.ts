/**
 * Production-Ready Error Handling Examples for Discord MCP Server
 * 
 * Demonstrates practical implementation of reliability patterns
 * integrated with the existing Discord service.
 */

import { 
  MCPError, 
  ErrorFactory, 
  ErrorCategory, 
  ErrorSeverity,
  RecoveryStrategy 
} from './error-types.js';
import { CircuitBreaker, circuitBreakerRegistry } from './circuit-breaker.js';
import { RetryHandler, RetryHandlers } from './retry-handler.js';
import { reliabilityMonitor } from './monitoring.js';
import { 
  serviceDegradationManager, 
  FeatureFlag, 
  DegradationLevel 
} from './graceful-degradation.js';

/**
 * Enhanced Discord service wrapper with comprehensive error handling
 */
export class ReliableDiscordService {
  private circuitBreaker: CircuitBreaker;
  private retryHandler: RetryHandler;

  constructor(private originalService: any) {
    // Initialize circuit breaker for Discord API calls
    this.circuitBreaker = circuitBreakerRegistry.getCircuitBreaker(
      'discord_api',
      {
        failureThreshold: 50, // 50% failure rate
        timeoutMs: 60000,     // 1 minute timeout
        monitoringPeriodMs: 120000, // 2 minute window
        expectedExceptionTypes: [
          ErrorCategory.NETWORK,
          ErrorCategory.DISCORD_API,
          ErrorCategory.TIMEOUT
        ],
        minimumNumberOfCalls: 5,
        slowCallDurationThreshold: 5000, // 5 seconds
        slowCallRateThreshold: 80 // 80% slow calls
      }
    );

    this.retryHandler = RetryHandlers.API_CALL;
  }

  /**
   * Send message with comprehensive error handling
   */
  async sendMessage(channelId: string, message: string): Promise<any> {
    const operationStart = Date.now();
    const operationName = 'send_message';

    try {
      // Check if messaging features are enabled
      if (!serviceDegradationManager.getFeatureToggler().isFeatureEnabled(FeatureFlag.RICH_EMBEDS)) {
        // Strip rich formatting if embeds are disabled
        message = this.stripRichFormatting(message);
      }

      const result = await serviceDegradationManager.executeWithDegradation(
        operationName,
        [], // No specific features required for basic messaging
        async () => {
          return this.circuitBreaker.execute(async () => {
            return this.retryHandler.execute(async () => {
              return this.originalService.sendMessage(channelId, message);
            }, operationName);
          }, operationName);
        },
        { channelId, messageLength: message.length }
      );

      // Record success metrics
      const duration = Date.now() - operationStart;
      reliabilityMonitor.recordSuccess(operationName, duration);

      return result;

    } catch (error) {
      const duration = Date.now() - operationStart;
      const mcpError = this.handleDiscordError(error, operationName, {
        channelId,
        messageLength: message.length,
        duration
      });

      reliabilityMonitor.recordError(mcpError);
      throw mcpError;
    }
  }

  /**
   * Create voice channel with fallback strategies
   */
  async createVoiceChannel(
    guildId: string, 
    name: string, 
    options: any = {}
  ): Promise<any> {
    const operationStart = Date.now();
    const operationName = 'create_voice_channel';

    try {
      return await serviceDegradationManager.executeWithDegradation(
        operationName,
        [FeatureFlag.VOICE_CHANNELS], // Requires voice channel feature
        async () => {
          return this.circuitBreaker.execute(async () => {
            return this.retryHandler.execute(async () => {
              return this.originalService.createVoiceChannel(guildId, name, options);
            }, operationName, {
              maxAttempts: 2, // Reduce retries for creation operations
              strategy: RecoveryStrategy.RETRY_LINEAR
            });
          }, operationName);
        },
        { guildId, name, options }
      );

    } catch (error) {
      const duration = Date.now() - operationStart;
      
      // Provide helpful error with recovery suggestions
      const mcpError = this.enhanceError(error, operationName, {
        guildId,
        name,
        duration,
        suggestions: [
          'Check bot permissions for Manage Channels',
          'Verify the guild exists and bot is a member',
          'Ensure voice channel limits are not exceeded'
        ]
      });

      reliabilityMonitor.recordError(mcpError);
      throw mcpError;
    }
  }

  /**
   * Bulk message operations with degradation
   */
  async bulkDeleteMessages(channelId: string, messageIds: string[]): Promise<any> {
    const operationStart = Date.now();
    const operationName = 'bulk_delete_messages';

    try {
      return await serviceDegradationManager.executeSimplified(
        operationName,
        // Full operation - bulk delete
        async () => {
          if (!serviceDegradationManager.getFeatureToggler().isFeatureEnabled(FeatureFlag.BATCH_OPERATIONS)) {
            throw new MCPError(
              'Bulk operations disabled',
              ErrorCategory.BUSINESS_LOGIC,
              ErrorSeverity.MEDIUM,
              false,
              {
                timestamp: new Date(),
                operation: operationName,
                attempt: 1,
                maxAttempts: 1,
                duration: 0,
                context: { reason: 'Feature disabled due to system degradation' }
              }
            );
          }

          return this.circuitBreaker.execute(async () => {
            return this.retryHandler.execute(async () => {
              return this.originalService.bulkDeleteMessages(channelId, messageIds);
            }, operationName);
          }, operationName);
        },
        // Simplified operation - delete one by one
        async () => {
          console.info(`Falling back to individual message deletion for ${messageIds.length} messages`);
          const results = [];
          
          for (const messageId of messageIds.slice(0, 10)) { // Limit to 10 in degraded mode
            try {
              const result = await this.originalService.deleteMessage(channelId, messageId);
              results.push(result);
              // Add delay to prevent rate limiting
              await new Promise(resolve => setTimeout(resolve, 1000));
            } catch (error) {
              console.warn(`Failed to delete message ${messageId}:`, error);
            }
          }
          
          return { 
            deletedCount: results.length, 
            totalRequested: messageIds.length,
            fallbackMode: true 
          };
        },
        { channelId, messageCount: messageIds.length }
      );

    } catch (error) {
      const duration = Date.now() - operationStart;
      const mcpError = this.enhanceError(error, operationName, {
        channelId,
        messageCount: messageIds.length,
        duration
      });

      reliabilityMonitor.recordError(mcpError);
      throw mcpError;
    }
  }

  /**
   * File upload with size checks and fallbacks
   */
  async uploadFile(
    channelId: string, 
    filePath: string, 
    options: any = {}
  ): Promise<any> {
    const operationStart = Date.now();
    const operationName = 'upload_file';

    try {
      if (!serviceDegradationManager.getFeatureToggler().isFeatureEnabled(FeatureFlag.FILE_UPLOADS)) {
        throw ErrorFactory.createValidationError(
          'File uploads are currently disabled due to system load',
          { operation: operationName, channelId },
          { reason: 'Feature disabled' }
        );
      }

      // Check file size and provide graceful degradation
      const fileStats = await this.getFileStats(filePath);
      const maxSize = this.getMaxFileSize();

      if (fileStats.size > maxSize) {
        throw ErrorFactory.createValidationError(
          `File size (${this.formatBytes(fileStats.size)}) exceeds limit (${this.formatBytes(maxSize)})`,
          { operation: operationName, channelId, filePath },
          { fileSize: fileStats.size, maxSize }
        );
      }

      return await this.circuitBreaker.execute(async () => {
        return this.retryHandler.execute(async () => {
          return this.originalService.uploadFile(channelId, filePath, options);
        }, operationName, {
          maxAttempts: 2, // Reduce retries for file operations
          baseDelayMs: 2000
        });
      }, operationName);

    } catch (error) {
      const duration = Date.now() - operationStart;
      const mcpError = this.enhanceError(error, operationName, {
        channelId,
        filePath,
        duration,
        suggestions: [
          'Check file size limits',
          'Verify file permissions',
          'Ensure channel allows file uploads'
        ]
      });

      reliabilityMonitor.recordError(mcpError);
      throw mcpError;
    }
  }

  /**
   * Health check for the service
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    details: any;
  }> {
    const checks = [];

    // Check circuit breaker status
    const cbMetrics = this.circuitBreaker.getMetrics();
    checks.push({
      name: 'circuit_breaker',
      status: this.circuitBreaker.isHealthy() ? 'healthy' : 'unhealthy',
      details: cbMetrics
    });

    // Check degradation status
    const systemStatus = serviceDegradationManager.getSystemStatus();
    checks.push({
      name: 'degradation_status',
      status: systemStatus.degradationLevel === DegradationLevel.NORMAL ? 'healthy' : 'degraded',
      details: systemStatus
    });

    // Try a simple Discord API call
    try {
      await this.originalService.getBotUser();
      checks.push({
        name: 'discord_api',
        status: 'healthy',
        details: { connected: true }
      });
    } catch (error) {
      checks.push({
        name: 'discord_api',
        status: 'unhealthy',
        details: { error: (error as Error).message }
      });
    }

    const unhealthyCount = checks.filter(c => c.status === 'unhealthy').length;
    const degradedCount = checks.filter(c => c.status === 'degraded').length;

    let overallStatus: 'healthy' | 'degraded' | 'unhealthy';
    if (unhealthyCount > 0) {
      overallStatus = 'unhealthy';
    } else if (degradedCount > 0) {
      overallStatus = 'degraded';
    } else {
      overallStatus = 'healthy';
    }

    return {
      status: overallStatus,
      details: {
        checks,
        circuitBreakerMetrics: cbMetrics,
        systemStatus
      }
    };
  }

  /**
   * Enhanced error handler with context and recovery suggestions
   */
  private handleDiscordError(
    error: any, 
    operation: string, 
    context: Record<string, any>
  ): MCPError {
    const duration = context.duration || 0;
    
    // Handle Discord.js specific errors
    if (error.code) {
      switch (error.code) {
        case 50013: // Missing Permissions
          return ErrorFactory.createPermissionError(
            `Missing permissions for ${operation}`,
            { operation, duration, ...context },
            ['SEND_MESSAGES', 'VIEW_CHANNEL']
          );
          
        case 50035: // Invalid Form Body
          return ErrorFactory.createValidationError(
            `Invalid input for ${operation}: ${error.message}`,
            { operation, duration, ...context }
          );
          
        case 50001: // Missing Access
        case 10003: // Unknown Channel
          return ErrorFactory.createResourceNotFoundError(
            `Resource not found for ${operation}`,
            { operation, duration, ...context },
            'channel',
            context.channelId
          );
          
        case 429: // Rate Limited
          return ErrorFactory.createRateLimitError(
            `Rate limited for ${operation}`,
            { operation, duration, ...context },
            error.retry_after
          );
          
        default:
          return ErrorFactory.createNetworkError(
            `Discord API error in ${operation}: ${error.message}`,
            { operation, duration, ...context, discordCode: error.code },
            error
          );
      }
    }

    // Handle network/timeout errors
    if (error.code === 'ENOTFOUND' || error.code === 'ETIMEDOUT') {
      return ErrorFactory.createNetworkError(
        `Network error in ${operation}`,
        { operation, duration, ...context },
        error
      );
    }

    // Handle generic errors
    return new MCPError(
      `Unexpected error in ${operation}: ${error.message}`,
      ErrorCategory.UNKNOWN,
      ErrorSeverity.HIGH,
      true,
      {
        timestamp: new Date(),
        operation,
        attempt: 1,
        maxAttempts: 1,
        duration,
        ...context
      },
      undefined,
      error
    );
  }

  /**
   * Enhance error with additional context and suggestions
   */
  private enhanceError(
    error: any,
    operation: string,
    context: Record<string, any>
  ): MCPError {
    const baseError = this.handleDiscordError(error, operation, context);
    
    // Add recovery suggestions based on error type
    if (baseError.category === ErrorCategory.PERMISSIONS) {
      baseError.metadata.context = {
        ...baseError.metadata.context,
        suggestions: context.suggestions || [
          'Check bot permissions in server settings',
          'Verify bot role hierarchy',
          'Ensure bot has required permissions for this channel'
        ]
      };
    }

    return baseError;
  }

  private stripRichFormatting(message: string): string {
    // Remove embeds, mentions, and other rich formatting
    return message
      .replace(/\*\*(.*?)\*\*/g, '$1') // Bold
      .replace(/\*(.*?)\*/g, '$1')     // Italic
      .replace(/~~(.*?)~~/g, '$1')     // Strikethrough
      .replace(/`(.*?)`/g, '$1')       // Code
      .replace(/```[\s\S]*?```/g, '[Code Block]') // Code blocks
      .trim();
  }

  private async getFileStats(filePath: string): Promise<{ size: number }> {
    // Placeholder - implement actual file stat reading
    return { size: 1024 * 1024 }; // 1MB placeholder
  }

  private getMaxFileSize(): number {
    const degradationLevel = serviceDegradationManager.getFeatureToggler().getDegradationLevel();
    
    switch (degradationLevel) {
      case DegradationLevel.NORMAL:
        return 8 * 1024 * 1024; // 8MB
      case DegradationLevel.REDUCED:
        return 5 * 1024 * 1024; // 5MB
      case DegradationLevel.LIMITED:
        return 2 * 1024 * 1024; // 2MB
      default:
        return 1 * 1024 * 1024; // 1MB
    }
  }

  private formatBytes(bytes: number): string {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Byte';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }
}

/**
 * Reliable HTTP server wrapper with error handling
 */
export class ReliableHttpServer {
  private server: any;
  private circuitBreaker: CircuitBreaker;

  constructor(server: any) {
    this.server = server;
    this.circuitBreaker = circuitBreakerRegistry.getCircuitBreaker(
      'http_server',
      {
        failureThreshold: 75, // 75% failure rate
        timeoutMs: 30000,     // 30 second timeout
        monitoringPeriodMs: 60000, // 1 minute window
        expectedExceptionTypes: [ErrorCategory.NETWORK, ErrorCategory.TIMEOUT],
        minimumNumberOfCalls: 3,
        slowCallDurationThreshold: 10000, // 10 seconds
        slowCallRateThreshold: 90 // 90% slow calls
      }
    );

    this.setupErrorHandling();
  }

  private setupErrorHandling(): void {
    // Global error handlers
    this.server.on('error', (error: Error) => {
      const mcpError = ErrorFactory.createNetworkError(
        `HTTP server error: ${error.message}`,
        { operation: 'server_operation' },
        error
      );
      reliabilityMonitor.recordError(mcpError);
    });

    // Request timeout handler
    this.server.on('timeout', (socket: any) => {
      const mcpError = ErrorFactory.createTimeoutError(
        'HTTP request timeout',
        { operation: 'http_request' },
        30000
      );
      reliabilityMonitor.recordError(mcpError);
      socket.destroy();
    });

    // Graceful shutdown handler
    process.on('SIGTERM', () => {
      console.info('Received SIGTERM, shutting down gracefully');
      this.gracefulShutdown();
    });

    process.on('SIGINT', () => {
      console.info('Received SIGINT, shutting down gracefully');
      this.gracefulShutdown();
    });
  }

  private gracefulShutdown(): void {
    console.info('Starting graceful shutdown...');
    
    // Stop accepting new connections
    this.server.close(() => {
      console.info('HTTP server closed');
      
      // Clean up resources
      serviceDegradationManager.dispose();
      
      process.exit(0);
    });

    // Force shutdown after timeout
    setTimeout(() => {
      console.error('Could not close connections in time, forcefully shutting down');
      process.exit(1);
    }, 10000);
  }
}

/**
 * Request wrapper with comprehensive error handling
 */
export async function handleRequest<T>(
  req: any,
  res: any,
  handler: () => Promise<T>
): Promise<void> {
  const requestId = Math.random().toString(36).substr(2, 9);
  const startTime = Date.now();

  try {
    const result = await handler();
    const duration = Date.now() - startTime;

    reliabilityMonitor.recordSuccess('http_request', duration);

    res.status(200).json({
      success: true,
      data: result,
      metadata: {
        requestId,
        duration,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    const duration = Date.now() - startTime;
    let mcpError: MCPError;

    if (error instanceof MCPError) {
      mcpError = error;
    } else {
      mcpError = ErrorFactory.createNetworkError(
        `Request handler error: ${(error as Error).message}`,
        { operation: 'http_request', requestId, duration },
        error as Error
      );
    }

    reliabilityMonitor.recordError(mcpError);

    const statusCode = getHttpStatusCode(mcpError);
    
    res.status(statusCode).json({
      success: false,
      error: {
        message: mcpError.message,
        category: mcpError.category,
        severity: mcpError.severity,
        recoverable: mcpError.recoverable,
        requestId,
        timestamp: mcpError.metadata.timestamp.toISOString()
      },
      metadata: {
        requestId,
        duration,
        attempt: mcpError.metadata.attempt
      }
    });
  }
}

/**
 * Map error categories to HTTP status codes
 */
function getHttpStatusCode(error: MCPError): number {
  switch (error.category) {
    case ErrorCategory.VALIDATION:
      return 400;
    case ErrorCategory.AUTHENTICATION:
      return 401;
    case ErrorCategory.PERMISSIONS:
      return 403;
    case ErrorCategory.RESOURCE_NOT_FOUND:
      return 404;
    case ErrorCategory.RATE_LIMIT:
      return 429;
    case ErrorCategory.CONFIGURATION:
    case ErrorCategory.DEPENDENCY:
    case ErrorCategory.NETWORK:
    case ErrorCategory.TIMEOUT:
      return 502;
    default:
      return 500;
  }
}

/**
 * Example usage and integration patterns
 */
export class ProductionIntegrationExample {
  private reliableService: ReliableDiscordService;

  constructor(originalDiscordService: any) {
    this.reliableService = new ReliableDiscordService(originalDiscordService);
  }

  /**
   * Example of using the reliable service in a tool handler
   */
  async handleSendMessageTool(params: any): Promise<any> {
    try {
      return await this.reliableService.sendMessage(
        params.channelId,
        params.message
      );
    } catch (error) {
      // Error is already properly handled and logged
      // Just re-throw for the tool system to handle
      throw error;
    }
  }

  /**
   * Example of batch operation with degradation
   */
  async handleBatchOperation(operations: any[]): Promise<any> {
    const results = [];
    const errors = [];

    // Check if batch operations are enabled
    if (!serviceDegradationManager.getFeatureToggler().isFeatureEnabled(FeatureFlag.BATCH_OPERATIONS)) {
      throw ErrorFactory.createValidationError(
        'Batch operations are currently disabled',
        { operation: 'batch_operation', count: operations.length },
        { reason: 'System degradation' }
      );
    }

    for (const [index, operation] of operations.entries()) {
      try {
        const result = await this.executeOperation(operation);
        results.push({ index, success: true, result });
      } catch (error) {
        errors.push({ index, success: false, error: (error as Error).message });
        
        // Stop batch if too many errors
        if (errors.length > operations.length * 0.3) { // 30% error threshold
          throw ErrorFactory.createValidationError(
            'Batch operation stopped due to high error rate',
            { 
              operation: 'batch_operation',
              completed: results.length,
              failed: errors.length,
              total: operations.length
            }
          );
        }
      }
    }

    return {
      completed: results.length,
      failed: errors.length,
      total: operations.length,
      results,
      errors
    };
  }

  private async executeOperation(operation: any): Promise<any> {
    // Placeholder for actual operation execution
    switch (operation.type) {
      case 'send_message':
        return this.reliableService.sendMessage(operation.channelId, operation.message);
      case 'create_channel':
        return this.reliableService.createVoiceChannel(operation.guildId, operation.name);
      default:
        throw new Error(`Unknown operation type: ${operation.type}`);
    }
  }
}