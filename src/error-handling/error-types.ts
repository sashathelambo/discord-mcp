/**
 * Comprehensive Error Type Definitions for Discord MCP Server
 * 
 * This module provides a structured error handling system with different
 * error categories, recovery strategies, and metadata for monitoring.
 */

export enum ErrorCategory {
  // Network and connectivity errors
  NETWORK = 'NETWORK',
  RATE_LIMIT = 'RATE_LIMIT',
  TIMEOUT = 'TIMEOUT',
  
  // Discord API specific errors
  DISCORD_API = 'DISCORD_API',
  PERMISSIONS = 'PERMISSIONS',
  RESOURCE_NOT_FOUND = 'RESOURCE_NOT_FOUND',
  
  // Validation and input errors
  VALIDATION = 'VALIDATION',
  AUTHENTICATION = 'AUTHENTICATION',
  
  // System and configuration errors
  CONFIGURATION = 'CONFIGURATION',
  DEPENDENCY = 'DEPENDENCY',
  
  // Business logic errors
  BUSINESS_LOGIC = 'BUSINESS_LOGIC',
  
  // Unknown/uncategorized errors
  UNKNOWN = 'UNKNOWN'
}

export enum ErrorSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

export enum RecoveryStrategy {
  RETRY_EXPONENTIAL_BACKOFF = 'RETRY_EXPONENTIAL_BACKOFF',
  RETRY_LINEAR = 'RETRY_LINEAR',
  CIRCUIT_BREAKER = 'CIRCUIT_BREAKER',
  FALLBACK = 'FALLBACK',
  GRACEFUL_DEGRADATION = 'GRACEFUL_DEGRADATION',
  FAIL_FAST = 'FAIL_FAST',
  NO_RETRY = 'NO_RETRY'
}

export interface ErrorMetadata {
  timestamp: Date;
  requestId?: string;
  userId?: string;
  guildId?: string;
  channelId?: string;
  operation: string;
  attempt: number;
  maxAttempts: number;
  duration: number;
  stackTrace?: string;
  context?: Record<string, any>;
}

export interface RecoveryConfig {
  strategy: RecoveryStrategy;
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  jitterEnabled: boolean;
  circuitBreakerThreshold?: number;
  circuitBreakerTimeout?: number;
  fallbackValue?: any;
}

export class MCPError extends Error {
  public readonly category: ErrorCategory;
  public readonly severity: ErrorSeverity;
  public readonly recoverable: boolean;
  public readonly metadata: ErrorMetadata;
  public readonly recoveryConfig?: RecoveryConfig;
  public readonly originalError?: Error;

  constructor(
    message: string,
    category: ErrorCategory,
    severity: ErrorSeverity,
    recoverable: boolean,
    metadata: ErrorMetadata,
    recoveryConfig?: RecoveryConfig,
    originalError?: Error
  ) {
    super(message);
    this.name = 'MCPError';
    this.category = category;
    this.severity = severity;
    this.recoverable = recoverable;
    this.metadata = metadata;
    this.recoveryConfig = recoveryConfig;
    this.originalError = originalError;

    // Maintain proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, MCPError);
    }
  }

  /**
   * Creates a structured error object for logging and monitoring
   */
  toStructured(): Record<string, any> {
    return {
      name: this.name,
      message: this.message,
      category: this.category,
      severity: this.severity,
      recoverable: this.recoverable,
      metadata: this.metadata,
      recoveryConfig: this.recoveryConfig,
      stack: this.stack,
      originalError: this.originalError ? {
        name: this.originalError.name,
        message: this.originalError.message,
        stack: this.originalError.stack
      } : undefined
    };
  }
}

/**
 * Pre-configured error factories for common scenarios
 */
export class ErrorFactory {
  static createNetworkError(
    message: string,
    metadata: Partial<ErrorMetadata>,
    originalError?: Error
  ): MCPError {
    return new MCPError(
      message,
      ErrorCategory.NETWORK,
      ErrorSeverity.MEDIUM,
      true,
      {
        timestamp: new Date(),
        operation: 'network_operation',
        attempt: 1,
        maxAttempts: 3,
        duration: 0,
        ...metadata
      },
      {
        strategy: RecoveryStrategy.RETRY_EXPONENTIAL_BACKOFF,
        maxAttempts: 3,
        baseDelay: 1000,
        maxDelay: 10000,
        jitterEnabled: true
      },
      originalError
    );
  }

  static createRateLimitError(
    message: string,
    metadata: Partial<ErrorMetadata>,
    retryAfter?: number
  ): MCPError {
    return new MCPError(
      message,
      ErrorCategory.RATE_LIMIT,
      ErrorSeverity.MEDIUM,
      true,
      {
        timestamp: new Date(),
        operation: 'api_call',
        attempt: 1,
        maxAttempts: 5,
        duration: 0,
        context: { retryAfter },
        ...metadata
      },
      {
        strategy: RecoveryStrategy.RETRY_EXPONENTIAL_BACKOFF,
        maxAttempts: 5,
        baseDelay: retryAfter ? retryAfter * 1000 : 5000,
        maxDelay: 60000,
        jitterEnabled: true
      }
    );
  }

  static createValidationError(
    message: string,
    metadata: Partial<ErrorMetadata>,
    validationErrors?: Record<string, string[]>
  ): MCPError {
    return new MCPError(
      message,
      ErrorCategory.VALIDATION,
      ErrorSeverity.LOW,
      false,
      {
        timestamp: new Date(),
        operation: 'validation',
        attempt: 1,
        maxAttempts: 1,
        duration: 0,
        context: { validationErrors },
        ...metadata
      },
      {
        strategy: RecoveryStrategy.FAIL_FAST,
        maxAttempts: 1,
        baseDelay: 0,
        maxDelay: 0,
        jitterEnabled: false
      }
    );
  }

  static createPermissionError(
    message: string,
    metadata: Partial<ErrorMetadata>,
    requiredPermissions?: string[]
  ): MCPError {
    return new MCPError(
      message,
      ErrorCategory.PERMISSIONS,
      ErrorSeverity.HIGH,
      false,
      {
        timestamp: new Date(),
        operation: 'permission_check',
        attempt: 1,
        maxAttempts: 1,
        duration: 0,
        context: { requiredPermissions },
        ...metadata
      },
      {
        strategy: RecoveryStrategy.FAIL_FAST,
        maxAttempts: 1,
        baseDelay: 0,
        maxDelay: 0,
        jitterEnabled: false
      }
    );
  }

  static createResourceNotFoundError(
    message: string,
    metadata: Partial<ErrorMetadata>,
    resourceType?: string,
    resourceId?: string
  ): MCPError {
    return new MCPError(
      message,
      ErrorCategory.RESOURCE_NOT_FOUND,
      ErrorSeverity.MEDIUM,
      false,
      {
        timestamp: new Date(),
        operation: 'resource_lookup',
        attempt: 1,
        maxAttempts: 1,
        duration: 0,
        context: { resourceType, resourceId },
        ...metadata
      },
      {
        strategy: RecoveryStrategy.FAIL_FAST,
        maxAttempts: 1,
        baseDelay: 0,
        maxDelay: 0,
        jitterEnabled: false
      }
    );
  }

  static createConfigurationError(
    message: string,
    metadata: Partial<ErrorMetadata>,
    configKey?: string
  ): MCPError {
    return new MCPError(
      message,
      ErrorCategory.CONFIGURATION,
      ErrorSeverity.CRITICAL,
      false,
      {
        timestamp: new Date(),
        operation: 'configuration_load',
        attempt: 1,
        maxAttempts: 1,
        duration: 0,
        context: { configKey },
        ...metadata
      },
      {
        strategy: RecoveryStrategy.FAIL_FAST,
        maxAttempts: 1,
        baseDelay: 0,
        maxDelay: 0,
        jitterEnabled: false
      }
    );
  }

  static createTimeoutError(
    message: string,
    metadata: Partial<ErrorMetadata>,
    timeoutMs?: number
  ): MCPError {
    return new MCPError(
      message,
      ErrorCategory.TIMEOUT,
      ErrorSeverity.MEDIUM,
      true,
      {
        timestamp: new Date(),
        operation: 'operation_timeout',
        attempt: 1,
        maxAttempts: 2,
        duration: timeoutMs || 0,
        context: { timeoutMs },
        ...metadata
      },
      {
        strategy: RecoveryStrategy.RETRY_LINEAR,
        maxAttempts: 2,
        baseDelay: 2000,
        maxDelay: 5000,
        jitterEnabled: false
      }
    );
  }
}