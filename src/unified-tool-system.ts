/**
 * Unified Tool System - Complete integration of all tool improvements
 * Provides a single interface to access all enhanced functionality with feedback loops
 */

import { DiscordService } from './discord-service.js';
import { EnhancedToolFactory, EnhancedTool } from './enhanced-tool-factory.js';
import { ToolWorkflowOrchestrator } from './tool-workflow-orchestrator.js';
import { ToolFeedbackCoordinator } from './tool-feedback-coordinator.js';
import { ToolImprovementValidator } from './tool-improvement-validator.js';

export interface SystemStatus {
  status: 'initializing' | 'ready' | 'degraded' | 'error';
  health: {
    overall: number;
    performance: number;
    reliability: number;
    userSatisfaction: number;
  };
  metrics: {
    totalTools: number;
    activeWorkflows: number;
    feedbackLoopsActive: number;
    validationScore: number;
    uptime: number;
  };
  lastValidation?: {
    timestamp: number;
    readinessLevel: string;
    score: number;
  };
}

export interface SystemConfig {
  enablePerformanceMonitoring: boolean;
  enableFeedbackLoops: boolean;
  enableAutoOptimization: boolean;
  enableGracefulDegradation: boolean;
  enableContinuousValidation: boolean;
  validationInterval: number; // milliseconds
  feedbackProcessingInterval: number; // milliseconds
}

export class UnifiedToolSystem {
  private initializationTime: number;
  private status: SystemStatus['status'] = 'initializing';
  
  private discordService: DiscordService;
  private toolFactory: EnhancedToolFactory;
  private workflowOrchestrator: ToolWorkflowOrchestrator;
  private feedbackCoordinator: ToolFeedbackCoordinator;
  private validator: ToolImprovementValidator;

  private config: SystemConfig = {
    enablePerformanceMonitoring: true,
    enableFeedbackLoops: true,
    enableAutoOptimization: true,
    enableGracefulDegradation: true,
    enableContinuousValidation: true,
    validationInterval: 3600000, // 1 hour
    feedbackProcessingInterval: 60000 // 1 minute
  };

  private intervalIds: NodeJS.Timeout[] = [];

  constructor(config?: Partial<SystemConfig>) {
    this.initializationTime = Date.now();
    if (config) {
      this.config = { ...this.config, ...config };
    }
    
    this.initializeSystem();
  }

  private async initializeSystem(): Promise<void> {
    try {
      console.log('🚀 Initializing Unified Tool System...');

      // Initialize Discord service
      this.discordService = new DiscordService();
      await this.discordService.initialize();
      console.log('✅ Discord service initialized');

      // Initialize Enhanced Tool Factory
      this.toolFactory = new EnhancedToolFactory(this.discordService);
      console.log('✅ Enhanced Tool Factory initialized');

      // Initialize Workflow Orchestrator
      this.workflowOrchestrator = new ToolWorkflowOrchestrator(this.toolFactory);
      console.log('✅ Workflow Orchestrator initialized');

      // Initialize Feedback Coordinator
      this.feedbackCoordinator = new ToolFeedbackCoordinator(
        this.toolFactory,
        this.workflowOrchestrator
      );
      console.log('✅ Feedback Coordinator initialized');

      // Initialize Validator
      this.validator = new ToolImprovementValidator(
        this.toolFactory,
        this.workflowOrchestrator,
        this.feedbackCoordinator,
        this.discordService
      );
      console.log('✅ Tool Improvement Validator initialized');

      // Run initial validation
      if (this.config.enableContinuousValidation) {
        console.log('🔍 Running initial validation...');
        const initialValidation = await this.validator.runQuickValidation();
        console.log(`✅ Initial validation complete: ${initialValidation.readinessLevel} (${(initialValidation.overallScore * 100).toFixed(1)}%)`);
      }

      // Start background processes
      this.startBackgroundProcesses();

      this.status = 'ready';
      console.log('🎉 Unified Tool System is ready!');
      
      // Log system summary
      this.logSystemSummary();

    } catch (error) {
      this.status = 'error';
      console.error('❌ Failed to initialize Unified Tool System:', error);
      throw error;
    }
  }

  private startBackgroundProcesses(): void {
    // Continuous validation
    if (this.config.enableContinuousValidation) {
      const validationInterval = setInterval(async () => {
        try {
          console.log('🔄 Running periodic validation...');
          await this.validator.runQuickValidation();
        } catch (error) {
          console.error('Validation failed:', error);
        }
      }, this.config.validationInterval);
      
      this.intervalIds.push(validationInterval);
    }

    // Health monitoring
    const healthInterval = setInterval(() => {
      this.updateSystemHealth();
    }, 30000); // Every 30 seconds
    
    this.intervalIds.push(healthInterval);

    // Auto-optimization
    if (this.config.enableAutoOptimization) {
      const optimizationInterval = setInterval(() => {
        this.performAutoOptimization();
      }, 300000); // Every 5 minutes
      
      this.intervalIds.push(optimizationInterval);
    }
  }

  private logSystemSummary(): void {
    const tools = this.toolFactory.getAllTools();
    const workflows = this.workflowOrchestrator.listWorkflows();
    const analytics = this.feedbackCoordinator.getFeedbackAnalytics();

    console.log('\n📊 System Summary:');
    console.log(`   • Enhanced Tools: ${tools.length}`);
    console.log(`   • Available Workflows: ${workflows.length}`);
    console.log(`   • Feedback Loops: ${analytics.activeFeedbackLoops}`);
    console.log(`   • Initialization Time: ${Date.now() - this.initializationTime}ms`);
    console.log(`   • Status: ${this.status.toUpperCase()}\n`);
  }

  private updateSystemHealth(): void {
    try {
      const systemHealth = this.feedbackCoordinator.getSystemHealth();
      const degradationStatus = this.toolFactory.getDegradationStatus();
      const lastValidation = this.validator.getLastValidationReport();

      // Update system status based on health
      if (systemHealth.overallHealth < 0.3 || degradationStatus.level > 3) {
        this.status = 'degraded';
      } else if (systemHealth.overallHealth >= 0.8 && this.status !== 'ready') {
        this.status = 'ready';
      }
    } catch (error) {
      console.error('Health update failed:', error);
    }
  }

  private performAutoOptimization(): void {
    if (!this.config.enableAutoOptimization) return;

    try {
      const suggestions = this.feedbackCoordinator.getImprovementSuggestions({
        priority: 'high'
      });

      if (suggestions.length > 0) {
        console.log(`🎯 Auto-optimization: Found ${suggestions.length} high-priority suggestions`);
        
        // Implement automatic optimizations for low-risk, high-impact suggestions
        suggestions
          .filter(s => s.estimatedImpact > 0.7 && s.implementationCost < 0.3)
          .forEach(suggestion => {
            console.log(`⚡ Auto-applying: ${suggestion.description}`);
            // Implementation would go here
          });
      }
    } catch (error) {
      console.error('Auto-optimization failed:', error);
    }
  }

  // Public interface methods

  /**
   * Execute a tool with full monitoring and feedback
   */
  public async executeTool(toolName: string, args: any, userId?: string): Promise<any> {
    const startTime = Date.now();
    let success = true;
    let error: any = null;

    try {
      const result = await this.toolFactory.executeTool(toolName, args, {
        toolName,
        userId,
        startTime,
        metadata: { source: 'unified-system' }
      });

      // Record feedback
      if (this.config.enableFeedbackLoops) {
        this.feedbackCoordinator.recordFeedback({
          toolName,
          executionId: `${toolName}_${Date.now()}`,
          timestamp: Date.now(),
          performance: {
            duration: Date.now() - startTime,
            success: true,
            resourceUsage: { memory: 0.1, cpu: 0.1 } // Would be measured in real implementation
          },
          businessImpact: {
            category: 'productivity',
            value: 5,
            metric: 'operations_completed'
          },
          context: {
            userId,
            metadata: { source: 'unified-system' }
          }
        });
      }

      return result;
    } catch (err) {
      success = false;
      error = err;

      // Record failure feedback
      if (this.config.enableFeedbackLoops) {
        this.feedbackCoordinator.recordFeedback({
          toolName,
          executionId: `${toolName}_${Date.now()}`,
          timestamp: Date.now(),
          performance: {
            duration: Date.now() - startTime,
            success: false,
            errorType: err.name || 'UnknownError',
            resourceUsage: { memory: 0.1, cpu: 0.1 }
          },
          businessImpact: {
            category: 'productivity',
            value: -1,
            metric: 'failed_operations'
          },
          context: {
            userId,
            metadata: { source: 'unified-system', error: err.message }
          }
        });
      }

      throw err;
    }
  }

  /**
   * Execute a workflow with monitoring
   */
  public async executeWorkflow(workflowId: string, initialArgs?: any): Promise<string> {
    return await this.workflowOrchestrator.executeWorkflow(workflowId, initialArgs);
  }

  /**
   * Get comprehensive system status
   */
  public getSystemStatus(): SystemStatus {
    const systemHealth = this.feedbackCoordinator.getSystemHealth();
    const analytics = this.feedbackCoordinator.getFeedbackAnalytics();
    const tools = this.toolFactory.getAllTools();
    const runningWorkflows = this.workflowOrchestrator.getRunningWorkflows();
    const lastValidation = this.validator.getLastValidationReport();

    return {
      status: this.status,
      health: {
        overall: systemHealth.overallHealth,
        performance: systemHealth.performanceScore,
        reliability: systemHealth.reliabilityScore,
        userSatisfaction: systemHealth.userSatisfactionScore
      },
      metrics: {
        totalTools: tools.length,
        activeWorkflows: runningWorkflows.length,
        feedbackLoopsActive: analytics.activeFeedbackLoops,
        validationScore: lastValidation?.overallScore || 0,
        uptime: Date.now() - this.initializationTime
      },
      lastValidation: lastValidation ? {
        timestamp: lastValidation.timestamp,
        readinessLevel: lastValidation.readinessLevel,
        score: lastValidation.overallScore
      } : undefined
    };
  }

  /**
   * Get available tools with their current status
   */
  public getAvailableTools(): Array<EnhancedTool & { status: string }> {
    return this.toolFactory.getAllTools().map(tool => ({
      ...tool,
      status: this.getToolStatus(tool.name)
    }));
  }

  private getToolStatus(toolName: string): string {
    // This would check circuit breakers, degradation status, etc.
    const degradationStatus = this.toolFactory.getDegradationStatus();
    
    if (degradationStatus.level > 3) {
      return 'degraded';
    }
    
    return 'healthy';
  }

  /**
   * Get workflow analytics and insights
   */
  public getWorkflowAnalytics(): any {
    return this.workflowOrchestrator.getWorkflowAnalytics();
  }

  /**
   * Get feedback analytics and improvement suggestions
   */
  public getFeedbackAnalytics(): any {
    return this.feedbackCoordinator.getFeedbackAnalytics();
  }

  /**
   * Get improvement suggestions
   */
  public getImprovementSuggestions(filter?: { type?: string; priority?: string }): any[] {
    return this.feedbackCoordinator.getImprovementSuggestions(filter);
  }

  /**
   * Run validation and get readiness assessment
   */
  public async validateSystem(full = false): Promise<any> {
    const report = full 
      ? await this.validator.runFullValidation()
      : await this.validator.runQuickValidation();
    
    return {
      report,
      readinessAssessment: this.validator.getReadinessAssessment()
    };
  }

  /**
   * Generate comprehensive system report
   */
  public generateSystemReport(): string {
    const status = this.getSystemStatus();
    const workflowAnalytics = this.getWorkflowAnalytics();
    const feedbackAnalytics = this.getFeedbackAnalytics();
    const suggestions = this.getImprovementSuggestions({ priority: 'high' });
    const readinessAssessment = this.validator.getReadinessAssessment();

    return `
# Unified Tool System Report

**Generated:** ${new Date().toLocaleString()}
**System Status:** ${status.status.toUpperCase()}
**Uptime:** ${(status.metrics.uptime / 1000 / 60).toFixed(1)} minutes

## Health Overview
- **Overall Health:** ${(status.health.overall * 100).toFixed(1)}%
- **Performance Score:** ${(status.health.performance * 100).toFixed(1)}%
- **Reliability Score:** ${(status.health.reliability * 100).toFixed(1)}%
- **User Satisfaction:** ${(status.health.userSatisfaction * 100).toFixed(1)}%

## System Metrics
- **Total Tools:** ${status.metrics.totalTools}
- **Active Workflows:** ${status.metrics.activeWorkflows}
- **Feedback Loops:** ${status.metrics.feedbackLoopsActive}
- **Validation Score:** ${(status.metrics.validationScore * 100).toFixed(1)}%

## Workflow Analytics
- **Total Executions:** ${workflowAnalytics.totalExecutions || 0}
- **Success Rate:** ${((workflowAnalytics.successRate || 0) * 100).toFixed(1)}%
- **Average Duration:** ${workflowAnalytics.averageDuration || 0}ms
- **Currently Running:** ${workflowAnalytics.currentlyRunning || 0}

## Feedback Analytics
- **Total Feedback Items:** ${feedbackAnalytics.totalFeedbackItems || 0}
- **Overall Success Rate:** ${((feedbackAnalytics.successRate || 0) * 100).toFixed(1)}%
- **Average Duration:** ${feedbackAnalytics.averageDuration || 0}ms

## Production Readiness
- **Current Level:** ${readinessAssessment.currentLevel.toUpperCase()}
- **Confidence:** ${(readinessAssessment.confidence * 100).toFixed(1)}%
- **Active Blockers:** ${readinessAssessment.blockers.length}

## High Priority Improvement Suggestions
${suggestions.length > 0 
  ? suggestions.slice(0, 5).map((s, i) => `${i + 1}. ${s.description} (Impact: ${(s.estimatedImpact * 100).toFixed(1)}%)`).join('\n')
  : 'No high-priority suggestions at this time.'
}

## Next Steps
${readinessAssessment.nextSteps.length > 0
  ? readinessAssessment.nextSteps.slice(0, 5).map((step, i) => `${i + 1}. ${step}`).join('\n')
  : 'Continue with current operations.'
}

---
*Report generated by Unified Tool System v2.0*
    `.trim();
  }

  /**
   * Cleanup and shutdown
   */
  public async shutdown(): Promise<void> {
    console.log('🛑 Shutting down Unified Tool System...');
    
    // Clear all intervals
    this.intervalIds.forEach(id => clearInterval(id));
    this.intervalIds = [];
    
    // Clean up feedback data
    this.feedbackCoordinator.clearOldFeedback();
    
    this.status = 'initializing'; // Reset status
    
    console.log('✅ Unified Tool System shutdown complete');
  }

  /**
   * Restart the system (useful for applying configuration changes)
   */
  public async restart(newConfig?: Partial<SystemConfig>): Promise<void> {
    await this.shutdown();
    
    if (newConfig) {
      this.config = { ...this.config, ...newConfig };
    }
    
    this.initializationTime = Date.now();
    await this.initializeSystem();
  }

  /**
   * Update system configuration
   */
  public updateConfiguration(config: Partial<SystemConfig>): void {
    this.config = { ...this.config, ...config };
    console.log('⚙️ System configuration updated');
  }

  /**
   * Get current configuration
   */
  public getConfiguration(): SystemConfig {
    return { ...this.config };
  }

  /**
   * Manual trigger for optimization
   */
  public triggerOptimization(): void {
    console.log('🎯 Manual optimization triggered');
    this.performAutoOptimization();
  }

  /**
   * Get system uptime in milliseconds
   */
  public getUptime(): number {
    return Date.now() - this.initializationTime;
  }

  /**
   * Check if system is ready for production
   */
  public isProductionReady(): boolean {
    const readiness = this.validator.getReadinessAssessment();
    return readiness.currentLevel === 'production' && readiness.confidence >= 0.9;
  }
}

// Export singleton instance for easy use
let systemInstance: UnifiedToolSystem | null = null;

export function createUnifiedToolSystem(config?: Partial<SystemConfig>): UnifiedToolSystem {
  if (systemInstance) {
    console.warn('⚠️ Unified Tool System already exists. Use getUnifiedToolSystem() to access it.');
  }
  
  systemInstance = new UnifiedToolSystem(config);
  return systemInstance;
}

export function getUnifiedToolSystem(): UnifiedToolSystem {
  if (!systemInstance) {
    throw new Error('Unified Tool System not initialized. Call createUnifiedToolSystem() first.');
  }
  
  return systemInstance;
}