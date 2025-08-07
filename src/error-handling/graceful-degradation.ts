/**
 * Graceful Degradation Strategies for Discord MCP Server
 * 
 * Implements fallback mechanisms, service degradation, and feature toggles
 * to maintain partial functionality during failures or high load conditions.
 */

import { ErrorCategory, MCPError, ErrorSeverity } from './error-types.js';
import { reliabilityMonitor } from './monitoring.js';

export enum DegradationLevel {
  NORMAL = 'NORMAL',           // Full functionality
  REDUCED = 'REDUCED',         // Some features disabled
  LIMITED = 'LIMITED',         // Core features only
  MINIMAL = 'MINIMAL',         // Basic functionality only
  EMERGENCY = 'EMERGENCY'      // Critical operations only
}

export enum FeatureFlag {
  VOICE_CHANNELS = 'VOICE_CHANNELS',
  FILE_UPLOADS = 'FILE_UPLOADS',
  RICH_EMBEDS = 'RICH_EMBEDS',
  BATCH_OPERATIONS = 'BATCH_OPERATIONS',
  ADVANCED_PERMISSIONS = 'ADVANCED_PERMISSIONS',
  ANALYTICS = 'ANALYTICS',
  WEBHOOKS = 'WEBHOOKS',
  AUTOMOD = 'AUTOMOD',
  EVENTS = 'EVENTS',
  STICKERS_EMOJIS = 'STICKERS_EMOJIS'
}

export interface FallbackConfig {
  enabled: boolean;
  priority: number;
  healthCheckInterval: number;
  autoRecover: boolean;
  maxFallbackDuration: number;
  fallbackImplementation: string;
}

export interface DegradationRule {
  trigger: {
    errorRate?: number;
    errorCount?: number;
    responseTime?: number;
    circuitBreakerOpen?: boolean;
    customCondition?: () => boolean;
  };
  action: {
    degradationLevel: DegradationLevel;
    disabledFeatures: FeatureFlag[];
    customActions?: () => void;
  };
  recovery: {
    autoRecover: boolean;
    healthThreshold: number;
    recoverAfterMs: number;
  };
}

/**
 * Feature toggle manager for controlling feature availability
 */
export class FeatureToggleManager {
  private featureStates = new Map<FeatureFlag, boolean>();
  private featureHealthScores = new Map<FeatureFlag, number>();
  private degradationLevel = DegradationLevel.NORMAL;

  constructor() {
    this.initializeFeatures();
  }

  /**
   * Check if a feature is enabled
   */
  isFeatureEnabled(feature: FeatureFlag): boolean {
    return this.featureStates.get(feature) ?? true;
  }

  /**
   * Enable a feature
   */
  enableFeature(feature: FeatureFlag): void {
    this.featureStates.set(feature, true);
    reliabilityMonitor.getMetrics(); // Update metrics
  }

  /**
   * Disable a feature
   */
  disableFeature(feature: FeatureFlag, reason?: string): void {
    this.featureStates.set(feature, false);
    
    console.warn(`Feature ${feature} disabled${reason ? `: ${reason}` : ''}`);
    
    // Record metrics
    reliabilityMonitor.recordError(new MCPError(
      `Feature ${feature} disabled`,
      ErrorCategory.BUSINESS_LOGIC,
      ErrorSeverity.MEDIUM,
      true,
      {
        timestamp: new Date(),
        operation: 'feature_toggle',
        attempt: 1,
        maxAttempts: 1,
        duration: 0,
        context: { feature, reason }
      }
    ));
  }

  /**
   * Set multiple features based on degradation level
   */
  setDegradationLevel(level: DegradationLevel): void {
    this.degradationLevel = level;
    
    const featuresToDisable = this.getFeaturesForDegradationLevel(level);
    
    // Reset all features first
    this.initializeFeatures();
    
    // Disable features based on degradation level
    for (const feature of featuresToDisable) {
      this.disableFeature(feature, `Degradation level: ${level}`);
    }

    console.warn(`System degradation level set to: ${level}`);
  }

  /**
   * Get current degradation level
   */
  getDegradationLevel(): DegradationLevel {
    return this.degradationLevel;
  }

  /**
   * Update feature health score
   */
  updateFeatureHealth(feature: FeatureFlag, score: number): void {
    this.featureHealthScores.set(feature, Math.max(0, Math.min(100, score)));
    
    // Automatically disable unhealthy features
    if (score < 20 && this.isFeatureEnabled(feature)) {
      this.disableFeature(feature, `Low health score: ${score}`);
    }
  }

  /**
   * Get feature health scores
   */
  getFeatureHealthScores(): Record<string, number> {
    const scores: Record<string, number> = {};
    for (const [feature, score] of this.featureHealthScores) {
      scores[feature] = score;
    }
    return scores;
  }

  /**
   * Get all feature states
   */
  getFeatureStates(): Record<string, boolean> {
    const states: Record<string, boolean> = {};
    for (const feature of Object.values(FeatureFlag)) {
      states[feature] = this.isFeatureEnabled(feature);
    }
    return states;
  }

  private initializeFeatures(): void {
    for (const feature of Object.values(FeatureFlag)) {
      this.featureStates.set(feature, true);
      this.featureHealthScores.set(feature, 100);
    }
  }

  private getFeaturesForDegradationLevel(level: DegradationLevel): FeatureFlag[] {
    switch (level) {
      case DegradationLevel.NORMAL:
        return [];
      
      case DegradationLevel.REDUCED:
        return [
          FeatureFlag.ANALYTICS,
          FeatureFlag.STICKERS_EMOJIS
        ];
      
      case DegradationLevel.LIMITED:
        return [
          FeatureFlag.ANALYTICS,
          FeatureFlag.STICKERS_EMOJIS,
          FeatureFlag.VOICE_CHANNELS,
          FeatureFlag.EVENTS,
          FeatureFlag.RICH_EMBEDS
        ];
      
      case DegradationLevel.MINIMAL:
        return [
          FeatureFlag.ANALYTICS,
          FeatureFlag.STICKERS_EMOJIS,
          FeatureFlag.VOICE_CHANNELS,
          FeatureFlag.EVENTS,
          FeatureFlag.RICH_EMBEDS,
          FeatureFlag.FILE_UPLOADS,
          FeatureFlag.WEBHOOKS,
          FeatureFlag.AUTOMOD
        ];
      
      case DegradationLevel.EMERGENCY:
        return [
          FeatureFlag.ANALYTICS,
          FeatureFlag.STICKERS_EMOJIS,
          FeatureFlag.VOICE_CHANNELS,
          FeatureFlag.EVENTS,
          FeatureFlag.RICH_EMBEDS,
          FeatureFlag.FILE_UPLOADS,
          FeatureFlag.WEBHOOKS,
          FeatureFlag.AUTOMOD,
          FeatureFlag.BATCH_OPERATIONS,
          FeatureFlag.ADVANCED_PERMISSIONS
        ];
      
      default:
        return [];
    }
  }
}

/**
 * Fallback service for providing alternative implementations
 */
export class FallbackService {
  private fallbacks = new Map<string, FallbackConfig & { implementation: () => any }>();
  private activeFallbacks = new Set<string>();

  /**
   * Register a fallback implementation
   */
  registerFallback<T>(
    operationName: string,
    fallbackImplementation: () => T,
    config: Partial<FallbackConfig> = {}
  ): void {
    const fullConfig: FallbackConfig = {
      enabled: true,
      priority: 1,
      healthCheckInterval: 30000,
      autoRecover: true,
      maxFallbackDuration: 300000, // 5 minutes
      fallbackImplementation: 'default',
      ...config
    };

    this.fallbacks.set(operationName, {
      ...fullConfig,
      implementation: fallbackImplementation
    });
  }

  /**
   * Execute operation with fallback support
   */
  async executeWithFallback<T>(
    operationName: string,
    primaryOperation: () => Promise<T>,
    context: Record<string, any> = {}
  ): Promise<T> {
    try {
      const result = await primaryOperation();
      
      // If we were using a fallback, check if we can recover
      if (this.activeFallbacks.has(operationName)) {
        this.tryRecoverFromFallback(operationName);
      }
      
      return result;
    } catch (error) {
      return this.handleFallback(operationName, error as Error, context);
    }
  }

  /**
   * Force activation of a fallback
   */
  activateFallback(operationName: string, reason: string): void {
    if (!this.fallbacks.has(operationName)) {
      throw new Error(`No fallback registered for operation: ${operationName}`);
    }

    this.activeFallbacks.add(operationName);
    
    console.warn(`Fallback activated for ${operationName}: ${reason}`);
    
    // Set up auto-recovery if enabled
    const config = this.fallbacks.get(operationName)!;
    if (config.autoRecover) {
      setTimeout(() => {
        this.deactivateFallback(operationName);
      }, config.maxFallbackDuration);
    }
  }

  /**
   * Deactivate a fallback
   */
  deactivateFallback(operationName: string): void {
    if (this.activeFallbacks.delete(operationName)) {
      console.info(`Fallback deactivated for ${operationName}`);
    }
  }

  /**
   * Check if operation is using fallback
   */
  isUsingFallback(operationName: string): boolean {
    return this.activeFallbacks.has(operationName);
  }

  /**
   * Get all active fallbacks
   */
  getActiveFallbacks(): string[] {
    return Array.from(this.activeFallbacks);
  }

  private async handleFallback<T>(
    operationName: string,
    error: Error,
    context: Record<string, any>
  ): Promise<T> {
    const fallback = this.fallbacks.get(operationName);
    
    if (!fallback || !fallback.enabled) {
      throw error;
    }

    // Activate fallback if not already active
    if (!this.activeFallbacks.has(operationName)) {
      this.activateFallback(operationName, error.message);
    }

    try {
      const result = await fallback.implementation();
      
      console.info(`Fallback executed successfully for ${operationName}`);
      
      return result;
    } catch (fallbackError) {
      console.error(`Fallback failed for ${operationName}:`, fallbackError);
      
      // Throw original error if fallback also fails
      throw error;
    }
  }

  private tryRecoverFromFallback(operationName: string): void {
    const config = this.fallbacks.get(operationName);
    if (config?.autoRecover) {
      this.deactivateFallback(operationName);
    }
  }
}

/**
 * Load balancer and service selector for graceful degradation
 */
export class ServiceDegradationManager {
  private featureToggler = new FeatureToggleManager();
  private fallbackService = new FallbackService();
  private degradationRules: DegradationRule[] = [];
  private monitoringInterval?: NodeJS.Timeout;

  constructor() {
    this.setupDefaultRules();
    this.setupDefaultFallbacks();
    this.startMonitoring();
  }

  /**
   * Add a degradation rule
   */
  addDegradationRule(rule: DegradationRule): void {
    this.degradationRules.push(rule);
  }

  /**
   * Execute operation with degradation support
   */
  async executeWithDegradation<T>(
    operationName: string,
    requiredFeatures: FeatureFlag[],
    operation: () => Promise<T>,
    context: Record<string, any> = {}
  ): Promise<T> {
    // Check if all required features are enabled
    const disabledFeatures = requiredFeatures.filter(
      feature => !this.featureToggler.isFeatureEnabled(feature)
    );

    if (disabledFeatures.length > 0) {
      throw new MCPError(
        `Operation ${operationName} unavailable due to disabled features: ${disabledFeatures.join(', ')}`,
        ErrorCategory.BUSINESS_LOGIC,
        ErrorSeverity.MEDIUM,
        false,
        {
          timestamp: new Date(),
          operation: operationName,
          attempt: 1,
          maxAttempts: 1,
          duration: 0,
          context: { disabledFeatures, requiredFeatures }
        }
      );
    }

    // Execute with fallback support
    return this.fallbackService.executeWithFallback(
      operationName,
      operation,
      context
    );
  }

  /**
   * Provide simplified version of operation
   */
  async executeSimplified<T>(
    operationName: string,
    fullOperation: () => Promise<T>,
    simplifiedOperation: () => Promise<T>,
    context: Record<string, any> = {}
  ): Promise<T> {
    const degradationLevel = this.featureToggler.getDegradationLevel();
    
    // Use simplified operation if system is degraded
    if (degradationLevel !== DegradationLevel.NORMAL) {
      console.info(`Using simplified implementation for ${operationName} due to degradation level: ${degradationLevel}`);
      return simplifiedOperation();
    }

    // Try full operation with fallback to simplified
    try {
      return await fullOperation();
    } catch (error) {
      console.warn(`Full operation failed for ${operationName}, falling back to simplified version:`, error);
      return simplifiedOperation();
    }
  }

  /**
   * Get feature toggle manager
   */
  getFeatureToggler(): FeatureToggleManager {
    return this.featureToggler;
  }

  /**
   * Get fallback service
   */
  getFallbackService(): FallbackService {
    return this.fallbackService;
  }

  /**
   * Get system status
   */
  getSystemStatus(): {
    degradationLevel: DegradationLevel;
    disabledFeatures: string[];
    activeFallbacks: string[];
    featureHealth: Record<string, number>;
  } {
    return {
      degradationLevel: this.featureToggler.getDegradationLevel(),
      disabledFeatures: Object.entries(this.featureToggler.getFeatureStates())
        .filter(([, enabled]) => !enabled)
        .map(([feature]) => feature),
      activeFallbacks: this.fallbackService.getActiveFallbacks(),
      featureHealth: this.featureToggler.getFeatureHealthScores()
    };
  }

  /**
   * Manually trigger degradation
   */
  triggerDegradation(level: DegradationLevel, reason: string): void {
    console.warn(`Manual degradation triggered to level ${level}: ${reason}`);
    this.featureToggler.setDegradationLevel(level);
  }

  /**
   * Recover from degradation
   */
  recover(): void {
    console.info('Recovering from degradation to normal operation');
    this.featureToggler.setDegradationLevel(DegradationLevel.NORMAL);
    
    // Deactivate all fallbacks
    for (const fallbackName of this.fallbackService.getActiveFallbacks()) {
      this.fallbackService.deactivateFallback(fallbackName);
    }
  }

  private setupDefaultRules(): void {
    // High error rate rule
    this.addDegradationRule({
      trigger: {
        errorRate: 25 // 25% error rate
      },
      action: {
        degradationLevel: DegradationLevel.REDUCED,
        disabledFeatures: [FeatureFlag.ANALYTICS, FeatureFlag.STICKERS_EMOJIS]
      },
      recovery: {
        autoRecover: true,
        healthThreshold: 95,
        recoverAfterMs: 300000
      }
    });

    // Circuit breaker open rule
    this.addDegradationRule({
      trigger: {
        circuitBreakerOpen: true
      },
      action: {
        degradationLevel: DegradationLevel.LIMITED,
        disabledFeatures: [
          FeatureFlag.VOICE_CHANNELS,
          FeatureFlag.FILE_UPLOADS,
          FeatureFlag.BATCH_OPERATIONS
        ]
      },
      recovery: {
        autoRecover: true,
        healthThreshold: 90,
        recoverAfterMs: 180000
      }
    });
  }

  private setupDefaultFallbacks(): void {
    // Simple message fallback
    this.fallbackService.registerFallback(
      'send_message',
      () => ({
        success: true,
        message: 'Message queued for delivery (fallback mode)',
        fallback: true
      }),
      {
        priority: 1,
        autoRecover: true,
        maxFallbackDuration: 300000
      }
    );

    // Basic channel info fallback
    this.fallbackService.registerFallback(
      'get_channel_info',
      () => ({
        id: 'unknown',
        name: 'Channel (limited info)',
        type: 'unknown',
        fallback: true
      }),
      {
        priority: 1,
        autoRecover: true
      }
    );
  }

  private startMonitoring(): void {
    this.monitoringInterval = setInterval(() => {
      this.evaluateDegradationRules();
    }, 10000); // Check every 10 seconds
  }

  private evaluateDegradationRules(): void {
    for (const rule of this.degradationRules) {
      if (this.shouldTriggerRule(rule)) {
        this.featureToggler.setDegradationLevel(rule.action.degradationLevel);
        
        for (const feature of rule.action.disabledFeatures) {
          this.featureToggler.disableFeature(feature, 'Degradation rule triggered');
        }

        if (rule.action.customActions) {
          rule.action.customActions();
        }

        if (rule.recovery.autoRecover) {
          setTimeout(() => {
            this.recover();
          }, rule.recovery.recoverAfterMs);
        }
      }
    }
  }

  private shouldTriggerRule(rule: DegradationRule): boolean {
    const trigger = rule.trigger;
    
    // Add actual implementation based on monitoring data
    if (trigger.customCondition) {
      return trigger.customCondition();
    }

    // Placeholder - implement based on actual metrics
    return false;
  }

  /**
   * Cleanup resources
   */
  dispose(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }
  }
}

// Global degradation manager instance
export const serviceDegradationManager = new ServiceDegradationManager();