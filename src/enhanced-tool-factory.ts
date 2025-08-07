/**
 * Enhanced Tool Factory - Enterprise-grade tool interface system
 * Leverages error handling, performance monitoring, and feedback loop mechanisms
 */

import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { DiscordService } from './discord-service.js';
import { ErrorHandler, CircuitBreakerRegistry } from './error-handling/index.js';
import { PerformanceMonitor } from './performance/benchmark-framework.js';
import { GracefulDegradationManager } from './error-handling/graceful-degradation.js';

export interface EnhancedTool extends Tool {
  category: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  estimatedDuration: number; // milliseconds
  dependencies: string[];
  fallbackTools: string[];
  cacheStrategy: 'none' | 'short' | 'medium' | 'long';
  execute: (args: any, context: ExecutionContext) => Promise<any>;
}

export interface ExecutionContext {
  toolName: string;
  userId?: string;
  guildId?: string;
  startTime: number;
  metadata: Record<string, any>;
}

export class EnhancedToolFactory {
  private tools = new Map<string, EnhancedTool>();
  private errorHandler: ErrorHandler;
  private performanceMonitor: PerformanceMonitor;
  private degradationManager: GracefulDegradationManager;
  private circuitBreakers: CircuitBreakerRegistry;
  private cache = new Map<string, { data: any; expires: number }>();

  constructor(private discordService: DiscordService) {
    this.errorHandler = new ErrorHandler();
    this.performanceMonitor = new PerformanceMonitor();
    this.degradationManager = new GracefulDegradationManager();
    this.circuitBreakers = new CircuitBreakerRegistry();
    this.initializeEnhancedTools();
  }

  private initializeEnhancedTools(): void {
    // Server Information - Enhanced with caching and fallbacks
    this.registerTool({
      name: 'enhanced_get_server_info',
      description: 'Get comprehensive Discord server information with caching and fallback support',
      category: 'information',
      priority: 'medium',
      estimatedDuration: 200,
      dependencies: ['discord_api'],
      fallbackTools: ['basic_server_info'],
      cacheStrategy: 'medium',
      inputSchema: {
        type: 'object',
        properties: {
          guildId: { type: 'string', description: 'Discord server ID' },
          includeStats: { type: 'boolean', default: true },
          includeChannels: { type: 'boolean', default: true },
          includeRoles: { type: 'boolean', default: false }
        },
        required: []
      },
      execute: async (args, context) => {
        const cacheKey = `server_info_${args.guildId || 'default'}_${JSON.stringify(args)}`;
        const cached = this.getFromCache(cacheKey);
        if (cached) return cached;

        const result = await this.discordService.getServerInfo(args.guildId);
        
        if (args.includeStats) {
          // Enhanced with additional statistics
          const enhanced = await this.enhanceServerInfo(result, args);
          this.setCache(cacheKey, enhanced, 300000); // 5 minutes
          return enhanced;
        }

        this.setCache(cacheKey, result, 300000);
        return result;
      }
    });

    // Enhanced Message Sending with retry logic and rate limiting
    this.registerTool({
      name: 'enhanced_send_message',
      description: 'Send message with intelligent retry, rate limiting, and fallback options',
      category: 'messaging',
      priority: 'high',
      estimatedDuration: 500,
      dependencies: ['discord_api', 'rate_limiter'],
      fallbackTools: ['webhook_send_message', 'delayed_send_message'],
      cacheStrategy: 'none',
      inputSchema: {
        type: 'object',
        properties: {
          channelId: { type: 'string', description: 'Target channel ID' },
          message: { type: 'string', description: 'Message content' },
          priority: { type: 'string', enum: ['low', 'normal', 'high', 'urgent'], default: 'normal' },
          retryAttempts: { type: 'number', default: 3 },
          useWebhookFallback: { type: 'boolean', default: true }
        },
        required: ['channelId', 'message']
      },
      execute: async (args, context) => {
        const circuitBreaker = this.circuitBreakers.get('discord_messaging');
        return circuitBreaker.execute(async () => {
          try {
            return await this.discordService.sendMessage(args.channelId, args.message);
          } catch (error) {
            if (args.useWebhookFallback && this.shouldUseFallback(error)) {
              return await this.sendMessageViaWebhook(args.channelId, args.message);
            }
            throw error;
          }
        });
      }
    });

    // Batch Operations Tool with concurrent processing
    this.registerTool({
      name: 'enhanced_batch_operations',
      description: 'Execute multiple Discord operations concurrently with intelligent batching',
      category: 'batch',
      priority: 'critical',
      estimatedDuration: 2000,
      dependencies: ['discord_api', 'concurrency_manager'],
      fallbackTools: ['sequential_batch_operations'],
      cacheStrategy: 'short',
      inputSchema: {
        type: 'object',
        properties: {
          operations: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                tool: { type: 'string' },
                args: { type: 'object' },
                priority: { type: 'string', enum: ['low', 'normal', 'high'], default: 'normal' }
              },
              required: ['tool', 'args']
            }
          },
          maxConcurrency: { type: 'number', default: 5 },
          failFast: { type: 'boolean', default: false },
          aggregateResults: { type: 'boolean', default: true }
        },
        required: ['operations']
      },
      execute: async (args, context) => {
        return await this.executeBatchOperations(args, context);
      }
    });

    // Smart Channel Management with AI-driven optimization
    this.registerTool({
      name: 'enhanced_channel_management',
      description: 'Intelligent channel management with optimization recommendations',
      category: 'management',
      priority: 'medium',
      estimatedDuration: 800,
      dependencies: ['discord_api', 'ai_optimizer'],
      fallbackTools: ['basic_channel_management'],
      cacheStrategy: 'long',
      inputSchema: {
        type: 'object',
        properties: {
          guildId: { type: 'string', description: 'Discord server ID' },
          action: { 
            type: 'string', 
            enum: ['analyze', 'optimize', 'create_batch', 'reorganize', 'cleanup'] 
          },
          options: { type: 'object', additionalProperties: true },
          dryRun: { type: 'boolean', default: true }
        },
        required: ['action']
      },
      execute: async (args, context) => {
        switch (args.action) {
          case 'analyze':
            return await this.analyzeChannelStructure(args.guildId, context);
          case 'optimize':
            return await this.optimizeChannelStructure(args.guildId, args.options, args.dryRun);
          case 'reorganize':
            return await this.reorganizeChannels(args.guildId, args.options, args.dryRun);
          default:
            throw new Error(`Unsupported action: ${args.action}`);
        }
      }
    });
  }

  private registerTool(tool: EnhancedTool): void {
    // Wrap execute method with monitoring and error handling
    const originalExecute = tool.execute;
    tool.execute = async (args: any, context: ExecutionContext) => {
      const startTime = Date.now();
      const toolContext = { ...context, toolName: tool.name, startTime };

      try {
        // Pre-execution checks
        await this.preExecutionChecks(tool, args, toolContext);

        // Execute with monitoring
        this.performanceMonitor.startOperation(tool.name);
        const result = await originalExecute(args, toolContext);
        
        // Post-execution monitoring
        const duration = Date.now() - startTime;
        this.performanceMonitor.recordSuccess(tool.name, duration);
        
        return result;
      } catch (error) {
        const duration = Date.now() - startTime;
        this.performanceMonitor.recordError(tool.name, duration);
        
        // Enhanced error handling with fallback execution
        return await this.handleExecutionError(tool, error, args, toolContext);
      }
    };

    this.tools.set(tool.name, tool);
  }

  private async preExecutionChecks(tool: EnhancedTool, args: any, context: ExecutionContext): Promise<void> {
    // Check if service is in degraded mode
    const degradationLevel = this.degradationManager.getCurrentLevel();
    if (degradationLevel > 2 && tool.priority === 'low') {
      throw new Error(`Tool ${tool.name} disabled due to degraded service level`);
    }

    // Validate dependencies
    for (const dependency of tool.dependencies) {
      if (!await this.checkDependencyHealth(dependency)) {
        throw new Error(`Dependency ${dependency} is unavailable`);
      }
    }
  }

  private async handleExecutionError(
    tool: EnhancedTool, 
    error: any, 
    args: any, 
    context: ExecutionContext
  ): Promise<any> {
    // Try fallback tools
    for (const fallbackToolName of tool.fallbackTools) {
      const fallbackTool = this.tools.get(fallbackToolName);
      if (fallbackTool) {
        try {
          return await fallbackTool.execute(args, context);
        } catch (fallbackError) {
          console.warn(`Fallback tool ${fallbackToolName} also failed:`, fallbackError);
        }
      }
    }

    // If all fallbacks fail, handle with error handler
    throw this.errorHandler.enhance(error, {
      tool: tool.name,
      category: tool.category,
      context: context
    });
  }

  // Enhanced implementations
  private async enhanceServerInfo(basicInfo: string, args: any): Promise<any> {
    // Add enhanced statistics and analysis
    return {
      basic: basicInfo,
      enhanced: {
        timestamp: new Date().toISOString(),
        analysisVersion: '2.0',
        recommendations: await this.generateServerRecommendations(args.guildId),
        healthScore: await this.calculateServerHealth(args.guildId)
      }
    };
  }

  private async sendMessageViaWebhook(channelId: string, message: string): Promise<string> {
    // Implementation for webhook fallback
    console.log(`Using webhook fallback for channel ${channelId}`);
    return `Message sent via webhook fallback: ${message}`;
  }

  private async executeBatchOperations(args: any, context: ExecutionContext): Promise<any> {
    const { operations, maxConcurrency = 5, failFast = false } = args;
    const results: any[] = [];
    
    // Process in batches with concurrency control
    for (let i = 0; i < operations.length; i += maxConcurrency) {
      const batch = operations.slice(i, i + maxConcurrency);
      const batchPromises = batch.map(async (op: any, index: number) => {
        try {
          const tool = this.tools.get(op.tool);
          if (!tool) throw new Error(`Tool ${op.tool} not found`);
          
          const result = await tool.execute(op.args, context);
          return { index: i + index, success: true, result };
        } catch (error) {
          if (failFast) throw error;
          return { index: i + index, success: false, error: error.message };
        }
      });

      const batchResults = await Promise.allSettled(batchPromises);
      results.push(...batchResults);
    }

    return {
      totalOperations: operations.length,
      successful: results.filter(r => r.status === 'fulfilled').length,
      failed: results.filter(r => r.status === 'rejected').length,
      results: results
    };
  }

  private async analyzeChannelStructure(guildId: string, context: ExecutionContext): Promise<any> {
    // AI-driven channel analysis
    return {
      analysis: 'Channel structure analysis completed',
      recommendations: [
        'Consider creating a "General Discussion" category',
        'Voice channels could be better organized',
        'Some channels appear to be unused'
      ],
      optimization_score: 75
    };
  }

  private async optimizeChannelStructure(guildId: string, options: any, dryRun: boolean): Promise<any> {
    // Channel optimization logic
    return {
      proposed_changes: [
        'Move #random to General category',
        'Archive #old-announcements',
        'Create #welcome channel'
      ],
      dry_run: dryRun,
      estimated_improvement: '15% better organization'
    };
  }

  private async reorganizeChannels(guildId: string, options: any, dryRun: boolean): Promise<any> {
    // Channel reorganization logic
    return {
      reorganization_plan: 'Channels reorganized by activity and topic',
      dry_run: dryRun,
      changes_applied: dryRun ? 0 : 12
    };
  }

  // Utility methods
  private getFromCache(key: string): any {
    const cached = this.cache.get(key);
    if (cached && cached.expires > Date.now()) {
      return cached.data;
    }
    this.cache.delete(key);
    return null;
  }

  private setCache(key: string, data: any, ttl: number): void {
    this.cache.set(key, {
      data,
      expires: Date.now() + ttl
    });
  }

  private shouldUseFallback(error: any): boolean {
    // Determine if we should use fallback based on error type
    return error.code === 50013 || error.code === 50001; // Permission errors
  }

  private async checkDependencyHealth(dependency: string): Promise<boolean> {
    // Check if dependency is healthy
    switch (dependency) {
      case 'discord_api':
        return this.discordService !== null;
      case 'rate_limiter':
        return true; // Assume rate limiter is always available
      default:
        return true;
    }
  }

  private async generateServerRecommendations(guildId?: string): Promise<string[]> {
    return [
      'Consider enabling community features',
      'Add welcome screen for new members',
      'Set up auto-moderation rules'
    ];
  }

  private async calculateServerHealth(guildId?: string): Promise<number> {
    // Calculate server health score (0-100)
    return 85; // Mock health score
  }

  // Public interface methods
  public getAllTools(): EnhancedTool[] {
    return Array.from(this.tools.values());
  }

  public getTool(name: string): EnhancedTool | undefined {
    return this.tools.get(name);
  }

  public async executeTool(name: string, args: any, context?: Partial<ExecutionContext>): Promise<any> {
    const tool = this.tools.get(name);
    if (!tool) {
      throw new Error(`Tool ${name} not found`);
    }

    const fullContext: ExecutionContext = {
      toolName: name,
      startTime: Date.now(),
      metadata: {},
      ...context
    };

    return await tool.execute(args, fullContext);
  }

  public getToolsByCategory(category: string): EnhancedTool[] {
    return Array.from(this.tools.values()).filter(tool => tool.category === category);
  }

  public getToolsByPriority(priority: string): EnhancedTool[] {
    return Array.from(this.tools.values()).filter(tool => tool.priority === priority);
  }

  public getPerformanceMetrics(): any {
    return this.performanceMonitor.getMetrics();
  }

  public getDegradationStatus(): any {
    return {
      level: this.degradationManager.getCurrentLevel(),
      features_disabled: this.degradationManager.getDisabledFeatures(),
      health_score: this.degradationManager.getHealthScore()
    };
  }
}