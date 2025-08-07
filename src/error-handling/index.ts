/**
 * Error Handling and Reliability Module Index
 * 
 * Comprehensive error handling, fault tolerance, and reliability system
 * for Discord MCP Server with enterprise-grade patterns and best practices.
 */

// Core error types and factories
export {
  MCPError,
  ErrorCategory,
  ErrorSeverity,
  RecoveryStrategy,
  ErrorMetadata,
  RecoveryConfig,
  ErrorFactory
} from './error-types.js';

// Circuit breaker pattern implementation
export {
  CircuitBreaker,
  CircuitBreakerRegistry,
  CircuitState,
  CircuitBreakerConfig,
  CircuitBreakerMetrics,
  circuitBreakerRegistry
} from './circuit-breaker.js';

// Retry handling with exponential backoff
export {
  RetryHandler,
  RetryConfig,
  RetryContext,
  RetryResult,
  RetryHandlers,
  withRetry
} from './retry-handler.js';

// Monitoring and alerting system
export {
  MetricsCollector,
  AlertManager,
  HealthChecker,
  ReliabilityMonitor,
  Alert,
  AlertSeverity,
  Metric,
  MetricType,
  HealthCheck,
  SystemHealth,
  reliabilityMonitor
} from './monitoring.js';

// Graceful degradation and feature flags
export {
  ServiceDegradationManager,
  FeatureToggleManager,
  FallbackService,
  DegradationLevel,
  FeatureFlag,
  DegradationRule,
  FallbackConfig,
  serviceDegradationManager
} from './graceful-degradation.js';

// Production-ready examples and integrations
export {
  ReliableDiscordService,
  ReliableHttpServer,
  ProductionIntegrationExample,
  handleRequest
} from './production-examples.js';

/**
 * Initialize the reliability system with default configurations
 */
export function initializeReliabilitySystem(config?: {
  enableMonitoring?: boolean;
  enableDegradation?: boolean;
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
}): void {
  const {
    enableMonitoring = true,
    enableDegradation = true,
    logLevel = 'info'
  } = config || {};

  console.info('Initializing Discord MCP Server Reliability System...');

  if (enableMonitoring) {
    // Set up default monitoring
    console.info('✓ Monitoring and alerting system initialized');
  }

  if (enableDegradation) {
    // Graceful degradation is initialized by default
    console.info('✓ Graceful degradation system initialized');
  }

  // Log system capabilities
  console.info('Reliability System Features:');
  console.info('  • Circuit Breaker Pattern - Prevents cascading failures');
  console.info('  • Exponential Backoff Retry - Smart retry with jitter');
  console.info('  • Rate Limit Handling - Automatic backoff for API limits');
  console.info('  • Graceful Degradation - Feature toggles and fallbacks');
  console.info('  • Real-time Monitoring - Metrics, alerts, and health checks');
  console.info('  • Error Classification - Structured error handling with recovery strategies');
  console.info('Reliability system ready for production use.');
}

/**
 * Get system health overview
 */
export async function getSystemHealthOverview(): Promise<{
  overall: 'healthy' | 'degraded' | 'unhealthy';
  components: Record<string, any>;
  metrics: Record<string, number>;
  recommendations: string[];
}> {
  const health = await reliabilityMonitor.getHealth();
  const degradationStatus = serviceDegradationManager.getSystemStatus();
  const circuitBreakers = circuitBreakerRegistry.getAllMetrics();

  const components = {
    monitoring: {
      status: health.overall,
      details: health
    },
    degradation: {
      status: degradationStatus.degradationLevel === DegradationLevel.NORMAL ? 'healthy' : 'degraded',
      details: degradationStatus
    },
    circuitBreakers: {
      status: Object.values(circuitBreakers).every(cb => cb.state === CircuitState.CLOSED) ? 'healthy' : 'degraded',
      details: circuitBreakers
    }
  };

  // Generate recommendations based on system state
  const recommendations: string[] = [];
  
  if (degradationStatus.degradationLevel !== DegradationLevel.NORMAL) {
    recommendations.push('System is in degraded mode - monitor error rates and consider scaling');
  }
  
  if (degradationStatus.activeFallbacks.length > 0) {
    recommendations.push(`${degradationStatus.activeFallbacks.length} fallback(s) active - investigate primary service issues`);
  }
  
  const openCircuitBreakers = Object.entries(circuitBreakers)
    .filter(([, metrics]) => metrics.state !== CircuitState.CLOSED);
  
  if (openCircuitBreakers.length > 0) {
    recommendations.push(`${openCircuitBreakers.length} circuit breaker(s) not closed - check dependent services`);
  }

  if (recommendations.length === 0) {
    recommendations.push('System is operating normally - continue monitoring');
  }

  let overall: 'healthy' | 'degraded' | 'unhealthy';
  const unhealthyComponents = Object.values(components).filter(c => c.status === 'unhealthy').length;
  const degradedComponents = Object.values(components).filter(c => c.status === 'degraded').length;

  if (unhealthyComponents > 0) {
    overall = 'unhealthy';
  } else if (degradedComponents > 0) {
    overall = 'degraded';
  } else {
    overall = 'healthy';
  }

  return {
    overall,
    components,
    metrics: health.metrics,
    recommendations
  };
}

/**
 * Emergency recovery procedures
 */
export class EmergencyRecovery {
  /**
   * Force system into emergency mode
   */
  static triggerEmergencyMode(reason: string): void {
    console.error(`🚨 EMERGENCY MODE ACTIVATED: ${reason}`);
    
    // Set maximum degradation
    serviceDegradationManager.triggerDegradation(
      DegradationLevel.EMERGENCY,
      `Emergency activation: ${reason}`
    );

    // Force all circuit breakers open
    const allBreakers = circuitBreakerRegistry.getAllCircuitBreakers();
    for (const [name, breaker] of allBreakers) {
      breaker.forceState(CircuitState.OPEN);
      console.warn(`Circuit breaker '${name}' forced to OPEN state`);
    }

    // Create emergency alert
    console.error('System in EMERGENCY mode - only critical operations available');
  }

  /**
   * Attempt system recovery
   */
  static async attemptRecovery(): Promise<boolean> {
    console.info('🔧 Attempting system recovery...');

    try {
      // Reset degradation level
      serviceDegradationManager.recover();

      // Reset circuit breakers to closed
      const allBreakers = circuitBreakerRegistry.getAllCircuitBreakers();
      for (const [name, breaker] of allBreakers) {
        breaker.forceState(CircuitState.CLOSED);
        console.info(`Circuit breaker '${name}' reset to CLOSED state`);
      }

      // Verify system health
      const health = await getSystemHealthOverview();
      
      if (health.overall !== 'unhealthy') {
        console.info('✅ System recovery successful');
        return true;
      } else {
        console.warn('⚠️ System recovery incomplete - manual intervention may be required');
        return false;
      }

    } catch (error) {
      console.error('❌ System recovery failed:', error);
      return false;
    }
  }

  /**
   * Get recovery recommendations
   */
  static async getRecoveryRecommendations(): Promise<string[]> {
    const health = await getSystemHealthOverview();
    const recommendations: string[] = [];

    if (health.overall === 'unhealthy') {
      recommendations.push('System is unhealthy - check logs for critical errors');
      recommendations.push('Consider restarting the service if issues persist');
      recommendations.push('Verify Discord API connectivity and permissions');
    }

    if (health.overall === 'degraded') {
      recommendations.push('System is degraded - monitor for improvement');
      recommendations.push('Check circuit breaker states and error rates');
      recommendations.push('Consider scaling resources if load is high');
    }

    recommendations.push(...health.recommendations);

    return recommendations;
  }
}

// Export commonly used instances
export {
  reliabilityMonitor,
  serviceDegradationManager,
  circuitBreakerRegistry
};

// Default export for convenience
export default {
  initializeReliabilitySystem,
  getSystemHealthOverview,
  EmergencyRecovery,
  reliabilityMonitor,
  serviceDegradationManager,
  circuitBreakerRegistry
};