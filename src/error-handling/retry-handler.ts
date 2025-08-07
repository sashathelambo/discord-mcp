/**
 * Retry Handler Implementation for Discord MCP Server
 * 
 * Provides configurable retry logic with exponential backoff,
 * jitter, and various retry strategies.
 */

import { ErrorCategory, MCPError, ErrorSeverity, RecoveryStrategy } from './error-types.js';

export interface RetryConfig {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  strategy: RecoveryStrategy;
  jitterEnabled: boolean;
  exponentialBase: number;
  retryableErrors: ErrorCategory[];
  abortSignal?: AbortSignal;
}

export interface RetryContext {
  attempt: number;
  totalElapsed: number;
  lastError?: Error;
  operationName: string;
  startTime: number;
}

export interface RetryResult<T> {
  result?: T;
  success: boolean;
  attempts: number;
  totalElapsed: number;
  errors: Error[];
}

export class RetryHandler {
  private static readonly DEFAULT_CONFIG: RetryConfig = {
    maxAttempts: 3,
    baseDelayMs: 1000,
    maxDelayMs: 30000,
    strategy: RecoveryStrategy.RETRY_EXPONENTIAL_BACKOFF,
    jitterEnabled: true,
    exponentialBase: 2,
    retryableErrors: [
      ErrorCategory.NETWORK,
      ErrorCategory.TIMEOUT,
      ErrorCategory.RATE_LIMIT,
      ErrorCategory.DEPENDENCY
    ]
  };

  constructor(private readonly config: Partial<RetryConfig> = {}) {}

  /**
   * Execute an operation with retry logic
   */
  async execute<T>(
    operation: () => Promise<T>,
    operationName: string,
    overrideConfig?: Partial<RetryConfig>
  ): Promise<T> {
    const finalConfig = {
      ...RetryHandler.DEFAULT_CONFIG,
      ...this.config,
      ...overrideConfig
    };

    const context: RetryContext = {
      attempt: 0,
      totalElapsed: 0,
      operationName,
      startTime: Date.now()
    };

    const errors: Error[] = [];

    for (let attempt = 1; attempt <= finalConfig.maxAttempts; attempt++) {
      context.attempt = attempt;
      context.totalElapsed = Date.now() - context.startTime;

      // Check for abort signal
      if (finalConfig.abortSignal?.aborted) {
        throw new MCPError(
          `Operation '${operationName}' was aborted`,
          ErrorCategory.UNKNOWN,
          ErrorSeverity.MEDIUM,
          false,
          {
            timestamp: new Date(),
            operation: operationName,
            attempt,
            maxAttempts: finalConfig.maxAttempts,
            duration: context.totalElapsed,
            context: { aborted: true }
          }
        );
      }

      try {
        const result = await operation();
        
        // Log successful retry if it took multiple attempts
        if (attempt > 1) {
          this.logRetrySuccess(operationName, attempt, context.totalElapsed);
        }
        
        return result;
      } catch (error) {
        errors.push(error as Error);
        context.lastError = error as Error;

        const shouldRetry = this.shouldRetry(
          error as Error,
          attempt,
          finalConfig,
          context
        );

        if (!shouldRetry || attempt === finalConfig.maxAttempts) {
          throw this.createFinalError(
            error as Error,
            operationName,
            attempt,
            finalConfig.maxAttempts,
            context.totalElapsed,
            errors
          );
        }

        // Calculate delay and wait
        const delay = this.calculateDelay(attempt, finalConfig, context);
        await this.sleep(delay);

        this.logRetryAttempt(operationName, attempt, error as Error, delay);
      }
    }

    // This should never be reached
    throw new Error('Unexpected end of retry loop');
  }

  /**
   * Execute operation with detailed result information
   */
  async executeWithDetails<T>(
    operation: () => Promise<T>,
    operationName: string,
    overrideConfig?: Partial<RetryConfig>
  ): Promise<RetryResult<T>> {
    const finalConfig = {
      ...RetryHandler.DEFAULT_CONFIG,
      ...this.config,
      ...overrideConfig
    };

    const startTime = Date.now();
    const errors: Error[] = [];

    for (let attempt = 1; attempt <= finalConfig.maxAttempts; attempt++) {
      try {
        const result = await operation();
        return {
          result,
          success: true,
          attempts: attempt,
          totalElapsed: Date.now() - startTime,
          errors
        };
      } catch (error) {
        errors.push(error as Error);

        const shouldRetry = this.shouldRetry(
          error as Error,
          attempt,
          finalConfig,
          { 
            attempt, 
            totalElapsed: Date.now() - startTime, 
            operationName,
            startTime,
            lastError: error as Error
          }
        );

        if (!shouldRetry || attempt === finalConfig.maxAttempts) {
          return {
            success: false,
            attempts: attempt,
            totalElapsed: Date.now() - startTime,
            errors
          };
        }

        const delay = this.calculateDelay(attempt, finalConfig, {
          attempt,
          totalElapsed: Date.now() - startTime,
          operationName,
          startTime,
          lastError: error as Error
        });
        
        await this.sleep(delay);
      }
    }

    return {
      success: false,
      attempts: finalConfig.maxAttempts,
      totalElapsed: Date.now() - startTime,
      errors
    };
  }

  /**
   * Determine if operation should be retried
   */
  private shouldRetry(
    error: Error,
    attempt: number,
    config: RetryConfig,
    context: RetryContext
  ): boolean {
    // Don't retry if max attempts reached
    if (attempt >= config.maxAttempts) {
      return false;
    }

    // Don't retry if aborted
    if (config.abortSignal?.aborted) {
      return false;
    }

    // Check if error type is retryable
    if (error instanceof MCPError) {
      if (!error.recoverable) {
        return false;
      }
      
      if (!config.retryableErrors.includes(error.category)) {
        return false;
      }

      // Special handling for rate limits
      if (error.category === ErrorCategory.RATE_LIMIT) {
        const retryAfter = error.metadata.context?.retryAfter;
        if (retryAfter && retryAfter > config.maxDelayMs / 1000) {
          return false; // Don't retry if rate limit is too long
        }
      }
    }

    return true;
  }

  /**
   * Calculate delay before next retry
   */
  private calculateDelay(
    attempt: number,
    config: RetryConfig,
    context: RetryContext
  ): number {
    let delay = config.baseDelayMs;

    // Handle rate limit special case
    if (context.lastError instanceof MCPError && 
        context.lastError.category === ErrorCategory.RATE_LIMIT) {
      const retryAfter = context.lastError.metadata.context?.retryAfter;
      if (retryAfter) {
        delay = Math.max(delay, retryAfter * 1000);
      }
    }

    // Apply retry strategy
    switch (config.strategy) {
      case RecoveryStrategy.RETRY_EXPONENTIAL_BACKOFF:
        delay = config.baseDelayMs * Math.pow(config.exponentialBase, attempt - 1);
        break;
      
      case RecoveryStrategy.RETRY_LINEAR:
        delay = config.baseDelayMs * attempt;
        break;
      
      default:
        delay = config.baseDelayMs;
    }

    // Apply jitter to prevent thundering herd
    if (config.jitterEnabled) {
      const jitterRange = delay * 0.1; // 10% jitter
      delay += (Math.random() * 2 - 1) * jitterRange;
    }

    // Ensure delay is within bounds
    return Math.min(Math.max(delay, 0), config.maxDelayMs);
  }

  /**
   * Sleep for specified duration
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Create final error after all retries failed
   */
  private createFinalError(
    lastError: Error,
    operationName: string,
    attempts: number,
    maxAttempts: number,
    totalElapsed: number,
    allErrors: Error[]
  ): MCPError {
    const errorMessages = allErrors.map(e => e.message).join('; ');
    
    return new MCPError(
      `Operation '${operationName}' failed after ${attempts} attempts. Last error: ${lastError.message}`,
      lastError instanceof MCPError ? lastError.category : ErrorCategory.UNKNOWN,
      ErrorSeverity.HIGH,
      false,
      {
        timestamp: new Date(),
        operation: operationName,
        attempt: attempts,
        maxAttempts,
        duration: totalElapsed,
        context: {
          allErrors: errorMessages,
          finalAttempt: true
        }
      },
      undefined,
      lastError
    );
  }

  /**
   * Log retry attempt
   */
  private logRetryAttempt(
    operationName: string,
    attempt: number,
    error: Error,
    delay: number
  ): void {
    console.warn(`Retry attempt ${attempt} for operation '${operationName}' failed: ${error.message}. Retrying in ${delay}ms`);
  }

  /**
   * Log successful retry
   */
  private logRetrySuccess(
    operationName: string,
    attempts: number,
    totalElapsed: number
  ): void {
    console.info(`Operation '${operationName}' succeeded after ${attempts} attempts in ${totalElapsed}ms`);
  }
}

/**
 * Decorator for adding retry logic to methods
 */
export function withRetry(config?: Partial<RetryConfig>) {
  return function <T extends any[], R>(
    target: any,
    propertyName: string,
    descriptor: TypedPropertyDescriptor<(...args: T) => Promise<R>>
  ) {
    const method = descriptor.value!;
    const retryHandler = new RetryHandler(config);

    descriptor.value = async function (...args: T): Promise<R> {
      return retryHandler.execute(
        () => method.apply(this, args),
        `${target.constructor.name}.${propertyName}`
      );
    };
  };
}

/**
 * Pre-configured retry handlers for common scenarios
 */
export class RetryHandlers {
  static readonly NETWORK = new RetryHandler({
    maxAttempts: 3,
    baseDelayMs: 1000,
    maxDelayMs: 10000,
    strategy: RecoveryStrategy.RETRY_EXPONENTIAL_BACKOFF,
    jitterEnabled: true,
    retryableErrors: [ErrorCategory.NETWORK, ErrorCategory.TIMEOUT]
  });

  static readonly RATE_LIMIT = new RetryHandler({
    maxAttempts: 5,
    baseDelayMs: 5000,
    maxDelayMs: 60000,
    strategy: RecoveryStrategy.RETRY_EXPONENTIAL_BACKOFF,
    jitterEnabled: true,
    retryableErrors: [ErrorCategory.RATE_LIMIT]
  });

  static readonly API_CALL = new RetryHandler({
    maxAttempts: 3,
    baseDelayMs: 1000,
    maxDelayMs: 30000,
    strategy: RecoveryStrategy.RETRY_EXPONENTIAL_BACKOFF,
    jitterEnabled: true,
    retryableErrors: [
      ErrorCategory.NETWORK,
      ErrorCategory.TIMEOUT,
      ErrorCategory.DEPENDENCY
    ]
  });

  static readonly CRITICAL_OPERATION = new RetryHandler({
    maxAttempts: 5,
    baseDelayMs: 2000,
    maxDelayMs: 60000,
    strategy: RecoveryStrategy.RETRY_EXPONENTIAL_BACKOFF,
    jitterEnabled: true,
    exponentialBase: 1.5,
    retryableErrors: [
      ErrorCategory.NETWORK,
      ErrorCategory.TIMEOUT,
      ErrorCategory.DEPENDENCY,
      ErrorCategory.RATE_LIMIT
    ]
  });
}