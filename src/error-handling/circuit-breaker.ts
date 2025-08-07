/**
 * Circuit Breaker Implementation for Discord MCP Server
 * 
 * Implements the circuit breaker pattern to prevent cascading failures
 * and provide graceful degradation when services are failing.
 */

import { ErrorCategory, MCPError, ErrorSeverity } from './error-types.js';

export enum CircuitState {
  CLOSED = 'CLOSED',     // Normal operation
  OPEN = 'OPEN',         // Failing fast, not executing operations
  HALF_OPEN = 'HALF_OPEN' // Testing if service has recovered
}

export interface CircuitBreakerConfig {
  failureThreshold: number;     // Number of failures to open circuit
  timeoutMs: number;           // Time to wait before trying half-open
  monitoringPeriodMs: number;  // Time window for failure counting
  expectedExceptionTypes: ErrorCategory[];
  minimumNumberOfCalls: number;
  slowCallDurationThreshold: number;
  slowCallRateThreshold: number;
}

export interface CircuitBreakerMetrics {
  state: CircuitState;
  failureCount: number;
  successCount: number;
  slowCallCount: number;
  totalCalls: number;
  lastFailureTime?: Date;
  lastStateChangeTime: Date;
  nextRetryTime?: Date;
}

export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount = 0;
  private successCount = 0;
  private slowCallCount = 0;
  private totalCalls = 0;
  private lastFailureTime?: Date;
  private lastStateChangeTime = new Date();
  private nextRetryTime?: Date;
  private callTimestamps: number[] = [];

  constructor(
    private readonly name: string,
    private readonly config: CircuitBreakerConfig
  ) {}

  /**
   * Execute a function with circuit breaker protection
   */
  async execute<T>(
    operation: () => Promise<T>,
    operationName: string
  ): Promise<T> {
    if (this.state === CircuitState.OPEN) {
      if (this.shouldAttemptReset()) {
        this.transitionToHalfOpen();
      } else {
        throw new MCPError(
          `Circuit breaker '${this.name}' is OPEN. Operation '${operationName}' rejected.`,
          ErrorCategory.DEPENDENCY,
          ErrorSeverity.HIGH,
          true,
          {
            timestamp: new Date(),
            operation: operationName,
            attempt: 1,
            maxAttempts: 0,
            duration: 0,
            context: {
              circuitBreakerName: this.name,
              circuitState: this.state,
              nextRetryTime: this.nextRetryTime
            }
          }
        );
      }
    }

    const startTime = Date.now();
    try {
      const result = await this.executeWithTimeout(operation, operationName);
      const duration = Date.now() - startTime;
      
      this.onSuccess(duration);
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.onFailure(error as Error, duration);
      throw error;
    }
  }

  /**
   * Execute operation with timeout protection
   */
  private async executeWithTimeout<T>(
    operation: () => Promise<T>,
    operationName: string
  ): Promise<T> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new MCPError(
          `Operation '${operationName}' timed out after ${this.config.slowCallDurationThreshold}ms`,
          ErrorCategory.TIMEOUT,
          ErrorSeverity.MEDIUM,
          true,
          {
            timestamp: new Date(),
            operation: operationName,
            attempt: 1,
            maxAttempts: 1,
            duration: this.config.slowCallDurationThreshold,
            context: {
              circuitBreakerName: this.name,
              timeoutThreshold: this.config.slowCallDurationThreshold
            }
          }
        ));
      }, this.config.slowCallDurationThreshold);
    });

    return Promise.race([operation(), timeoutPromise]);
  }

  /**
   * Handle successful operation
   */
  private onSuccess(duration: number): void {
    this.addCallTimestamp();
    this.successCount++;
    this.totalCalls++;

    if (duration > this.config.slowCallDurationThreshold) {
      this.slowCallCount++;
    }

    if (this.state === CircuitState.HALF_OPEN) {
      this.transitionToClosed();
    }
  }

  /**
   * Handle failed operation
   */
  private onFailure(error: Error, duration: number): void {
    this.addCallTimestamp();
    this.totalCalls++;
    this.lastFailureTime = new Date();

    // Check if this error type should trigger circuit breaker
    const mcpError = error instanceof MCPError ? error : null;
    const shouldCount = !mcpError || 
      this.config.expectedExceptionTypes.includes(mcpError.category);

    if (shouldCount) {
      this.failureCount++;

      if (duration > this.config.slowCallDurationThreshold) {
        this.slowCallCount++;
      }

      if (this.shouldOpenCircuit()) {
        this.transitionToOpen();
      }
    }
  }

  /**
   * Add timestamp for call tracking
   */
  private addCallTimestamp(): void {
    const now = Date.now();
    this.callTimestamps.push(now);
    
    // Remove timestamps outside monitoring period
    const cutoff = now - this.config.monitoringPeriodMs;
    this.callTimestamps = this.callTimestamps.filter(ts => ts > cutoff);
  }

  /**
   * Check if circuit should be opened
   */
  private shouldOpenCircuit(): boolean {
    if (this.totalCalls < this.config.minimumNumberOfCalls) {
      return false;
    }

    const failureRate = this.failureCount / this.totalCalls;
    const slowCallRate = this.slowCallCount / this.totalCalls;

    return failureRate >= (this.config.failureThreshold / 100) ||
           slowCallRate >= (this.config.slowCallRateThreshold / 100);
  }

  /**
   * Check if circuit should attempt reset
   */
  private shouldAttemptReset(): boolean {
    if (!this.nextRetryTime) return false;
    return Date.now() >= this.nextRetryTime.getTime();
  }

  /**
   * Transition to CLOSED state
   */
  private transitionToClosed(): void {
    this.state = CircuitState.CLOSED;
    this.lastStateChangeTime = new Date();
    this.resetCounts();
    this.nextRetryTime = undefined;
  }

  /**
   * Transition to OPEN state
   */
  private transitionToOpen(): void {
    this.state = CircuitState.OPEN;
    this.lastStateChangeTime = new Date();
    this.nextRetryTime = new Date(Date.now() + this.config.timeoutMs);
  }

  /**
   * Transition to HALF_OPEN state
   */
  private transitionToHalfOpen(): void {
    this.state = CircuitState.HALF_OPEN;
    this.lastStateChangeTime = new Date();
    this.resetCounts();
  }

  /**
   * Reset failure and success counts
   */
  private resetCounts(): void {
    this.failureCount = 0;
    this.successCount = 0;
    this.slowCallCount = 0;
    this.totalCalls = 0;
    this.callTimestamps = [];
  }

  /**
   * Get current metrics
   */
  getMetrics(): CircuitBreakerMetrics {
    return {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      slowCallCount: this.slowCallCount,
      totalCalls: this.totalCalls,
      lastFailureTime: this.lastFailureTime,
      lastStateChangeTime: this.lastStateChangeTime,
      nextRetryTime: this.nextRetryTime
    };
  }

  /**
   * Force circuit to specific state (for testing/manual intervention)
   */
  forceState(newState: CircuitState): void {
    this.state = newState;
    this.lastStateChangeTime = new Date();
    
    if (newState === CircuitState.CLOSED) {
      this.resetCounts();
      this.nextRetryTime = undefined;
    } else if (newState === CircuitState.OPEN) {
      this.nextRetryTime = new Date(Date.now() + this.config.timeoutMs);
    }
  }

  /**
   * Get circuit breaker name
   */
  getName(): string {
    return this.name;
  }

  /**
   * Check if circuit is healthy
   */
  isHealthy(): boolean {
    return this.state === CircuitState.CLOSED && 
           this.failureCount < this.config.failureThreshold;
  }
}

/**
 * Circuit Breaker Registry for managing multiple circuit breakers
 */
export class CircuitBreakerRegistry {
  private readonly circuitBreakers = new Map<string, CircuitBreaker>();

  /**
   * Get or create a circuit breaker
   */
  getCircuitBreaker(
    name: string, 
    config: CircuitBreakerConfig
  ): CircuitBreaker {
    if (!this.circuitBreakers.has(name)) {
      this.circuitBreakers.set(name, new CircuitBreaker(name, config));
    }
    return this.circuitBreakers.get(name)!;
  }

  /**
   * Get all circuit breakers
   */
  getAllCircuitBreakers(): Map<string, CircuitBreaker> {
    return new Map(this.circuitBreakers);
  }

  /**
   * Get metrics for all circuit breakers
   */
  getAllMetrics(): Record<string, CircuitBreakerMetrics> {
    const metrics: Record<string, CircuitBreakerMetrics> = {};
    for (const [name, breaker] of this.circuitBreakers) {
      metrics[name] = breaker.getMetrics();
    }
    return metrics;
  }

  /**
   * Check health of all circuit breakers
   */
  getHealthStatus(): Record<string, boolean> {
    const health: Record<string, boolean> = {};
    for (const [name, breaker] of this.circuitBreakers) {
      health[name] = breaker.isHealthy();
    }
    return health;
  }

  /**
   * Remove a circuit breaker
   */
  removeCircuitBreaker(name: string): boolean {
    return this.circuitBreakers.delete(name);
  }

  /**
   * Clear all circuit breakers
   */
  clear(): void {
    this.circuitBreakers.clear();
  }
}

// Global registry instance
export const circuitBreakerRegistry = new CircuitBreakerRegistry();