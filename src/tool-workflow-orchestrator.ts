/**
 * Tool Workflow Orchestrator - Enterprise-grade tool integration and workflow automation
 * Enables tools to work together in feedback loops and complex workflows
 */

import { EnhancedTool, EnhancedToolFactory, ExecutionContext } from './enhanced-tool-factory.js';

export interface WorkflowStep {
  id: string;
  toolName: string;
  args: any;
  dependsOn: string[];
  condition?: (results: Map<string, any>) => boolean;
  timeout?: number;
  retryCount?: number;
  fallbackSteps?: string[];
}

export interface Workflow {
  id: string;
  name: string;
  description: string;
  steps: WorkflowStep[];
  triggers: WorkflowTrigger[];
  maxDuration: number;
  priority: 'low' | 'medium' | 'high' | 'critical';
}

export interface WorkflowTrigger {
  type: 'manual' | 'scheduled' | 'event' | 'condition';
  config: any;
}

export interface WorkflowResult {
  workflowId: string;
  status: 'running' | 'completed' | 'failed' | 'timeout' | 'cancelled';
  startTime: number;
  endTime?: number;
  stepResults: Map<string, any>;
  errors: any[];
  metrics: {
    totalSteps: number;
    completedSteps: number;
    failedSteps: number;
    totalDuration: number;
  };
}

export interface FeedbackLoop {
  id: string;
  name: string;
  inputTool: string;
  processingTools: string[];
  feedbackTool: string;
  iterations: number;
  convergenceThreshold?: number;
  maxIterations: number;
}

export class ToolWorkflowOrchestrator {
  private workflows = new Map<string, Workflow>();
  private runningWorkflows = new Map<string, WorkflowResult>();
  private feedbackLoops = new Map<string, FeedbackLoop>();
  private workflowHistory: WorkflowResult[] = [];

  constructor(private toolFactory: EnhancedToolFactory) {
    this.initializePredefinedWorkflows();
    this.setupFeedbackLoops();
  }

  private initializePredefinedWorkflows(): void {
    // Server Setup Workflow
    this.registerWorkflow({
      id: 'server-setup',
      name: 'Complete Server Setup',
      description: 'Comprehensive Discord server setup with optimization',
      maxDuration: 300000, // 5 minutes
      priority: 'high',
      triggers: [{ type: 'manual', config: {} }],
      steps: [
        {
          id: 'analyze-server',
          toolName: 'enhanced_get_server_info',
          args: { includeStats: true, includeChannels: true, includeRoles: true },
          dependsOn: [],
          timeout: 5000
        },
        {
          id: 'analyze-channels',
          toolName: 'enhanced_channel_management',
          args: { action: 'analyze' },
          dependsOn: ['analyze-server'],
          timeout: 10000
        },
        {
          id: 'optimize-structure',
          toolName: 'enhanced_channel_management',
          args: { action: 'optimize', dryRun: false },
          dependsOn: ['analyze-channels'],
          condition: (results) => {
            const analysis = results.get('analyze-channels');
            return analysis?.optimization_score < 80;
          },
          timeout: 15000
        },
        {
          id: 'create-welcome-system',
          toolName: 'enhanced_batch_operations',
          args: {
            operations: [
              { tool: 'create_text_channel', args: { name: 'welcome', categoryId: null } },
              { tool: 'create_text_channel', args: { name: 'rules', categoryId: null } },
              { tool: 'send_message', args: { message: 'Welcome to the server!' } }
            ],
            maxConcurrency: 3
          },
          dependsOn: ['optimize-structure'],
          timeout: 20000
        }
      ]
    });

    // Monitoring and Maintenance Workflow
    this.registerWorkflow({
      id: 'server-maintenance',
      name: 'Server Monitoring & Maintenance',
      description: 'Continuous server health monitoring and maintenance',
      maxDuration: 600000, // 10 minutes
      priority: 'medium',
      triggers: [
        { type: 'scheduled', config: { interval: 3600000 } }, // Every hour
        { type: 'condition', config: { healthThreshold: 70 } }
      ],
      steps: [
        {
          id: 'health-check',
          toolName: 'enhanced_get_server_info',
          args: { includeStats: true },
          dependsOn: [],
          timeout: 5000
        },
        {
          id: 'analyze-activity',
          toolName: 'enhanced_channel_management',
          args: { action: 'analyze' },
          dependsOn: ['health-check'],
          timeout: 10000
        },
        {
          id: 'cleanup-inactive',
          toolName: 'enhanced_channel_management',
          args: { action: 'cleanup', dryRun: false },
          dependsOn: ['analyze-activity'],
          condition: (results) => {
            const analysis = results.get('analyze-activity');
            return analysis?.inactive_channels?.length > 5;
          },
          timeout: 30000
        },
        {
          id: 'generate-report',
          toolName: 'enhanced_batch_operations',
          args: {
            operations: [
              { tool: 'export_chat_log', args: { channelId: 'admin-log', limit: 100 } }
            ]
          },
          dependsOn: ['cleanup-inactive'],
          timeout: 15000
        }
      ]
    });

    // Emergency Response Workflow
    this.registerWorkflow({
      id: 'emergency-response',
      name: 'Emergency Response Protocol',
      description: 'Automated response to server emergencies and incidents',
      maxDuration: 120000, // 2 minutes
      priority: 'critical',
      triggers: [
        { type: 'event', config: { event: 'mass_delete', threshold: 50 } },
        { type: 'condition', config: { errorRate: 0.5 } }
      ],
      steps: [
        {
          id: 'emergency-assessment',
          toolName: 'enhanced_get_server_info',
          args: { includeStats: true, priority: 'urgent' },
          dependsOn: [],
          timeout: 3000
        },
        {
          id: 'enable-lockdown',
          toolName: 'enhanced_batch_operations',
          args: {
            operations: [
              { tool: 'edit_server', args: { verificationLevel: 'VERY_HIGH' } },
              { tool: 'create_automod_rule', args: { type: 'emergency_lockdown' } }
            ],
            maxConcurrency: 2,
            failFast: true
          },
          dependsOn: ['emergency-assessment'],
          timeout: 10000
        },
        {
          id: 'notify-admins',
          toolName: 'enhanced_send_message',
          args: {
            channelId: 'admin-alerts',
            message: 'EMERGENCY: Server lockdown activated. Check logs immediately.',
            priority: 'urgent'
          },
          dependsOn: ['enable-lockdown'],
          timeout: 5000
        }
      ]
    });
  }

  private setupFeedbackLoops(): void {
    // Server Optimization Feedback Loop
    this.registerFeedbackLoop({
      id: 'server-optimization',
      name: 'Continuous Server Optimization',
      inputTool: 'enhanced_get_server_info',
      processingTools: ['enhanced_channel_management'],
      feedbackTool: 'enhanced_get_server_info',
      iterations: 0,
      maxIterations: 5,
      convergenceThreshold: 0.95 // 95% optimization score
    });

    // Performance Monitoring Feedback Loop
    this.registerFeedbackLoop({
      id: 'performance-monitoring',
      name: 'Continuous Performance Monitoring',
      inputTool: 'get_performance_metrics',
      processingTools: ['analyze_performance', 'optimize_performance'],
      feedbackTool: 'get_performance_metrics',
      iterations: 0,
      maxIterations: 10,
      convergenceThreshold: 0.90 // 90% performance score
    });
  }

  public registerWorkflow(workflow: Workflow): void {
    this.workflows.set(workflow.id, workflow);
  }

  public registerFeedbackLoop(feedbackLoop: FeedbackLoop): void {
    this.feedbackLoops.set(feedbackLoop.id, feedbackLoop);
  }

  public async executeWorkflow(workflowId: string, initialArgs?: any): Promise<string> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Workflow ${workflowId} not found`);
    }

    const executionId = `${workflowId}_${Date.now()}`;
    const result: WorkflowResult = {
      workflowId,
      status: 'running',
      startTime: Date.now(),
      stepResults: new Map(),
      errors: [],
      metrics: {
        totalSteps: workflow.steps.length,
        completedSteps: 0,
        failedSteps: 0,
        totalDuration: 0
      }
    };

    this.runningWorkflows.set(executionId, result);

    // Execute workflow asynchronously
    this.executeWorkflowInternal(workflow, result, initialArgs)
      .then(() => {
        result.status = 'completed';
        result.endTime = Date.now();
        result.metrics.totalDuration = result.endTime - result.startTime;
        this.workflowHistory.push(result);
      })
      .catch((error) => {
        result.status = 'failed';
        result.endTime = Date.now();
        result.metrics.totalDuration = result.endTime - result.startTime;
        result.errors.push(error);
        this.workflowHistory.push(result);
      })
      .finally(() => {
        this.runningWorkflows.delete(executionId);
      });

    return executionId;
  }

  private async executeWorkflowInternal(
    workflow: Workflow, 
    result: WorkflowResult, 
    initialArgs?: any
  ): Promise<void> {
    const executedSteps = new Set<string>();
    const stepQueue = [...workflow.steps];

    while (stepQueue.length > 0 && result.status === 'running') {
      const readySteps = stepQueue.filter(step => 
        step.dependsOn.every(dep => executedSteps.has(dep))
      );

      if (readySteps.length === 0) {
        throw new Error('Workflow has circular dependencies or missing steps');
      }

      // Execute ready steps in parallel
      const stepPromises = readySteps.map(async (step) => {
        try {
          // Check condition if present
          if (step.condition && !step.condition(result.stepResults)) {
            console.log(`Step ${step.id} skipped due to condition`);
            return null;
          }

          const context: ExecutionContext = {
            toolName: step.toolName,
            startTime: Date.now(),
            metadata: {
              workflowId: workflow.id,
              stepId: step.id,
              initialArgs
            }
          };

          const stepResult = await Promise.race([
            this.toolFactory.executeTool(step.toolName, step.args, context),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Step timeout')), step.timeout || 30000)
            )
          ]);

          result.stepResults.set(step.id, stepResult);
          result.metrics.completedSteps++;
          executedSteps.add(step.id);

          return { step, result: stepResult };
        } catch (error) {
          result.errors.push({ step: step.id, error });
          result.metrics.failedSteps++;

          // Try fallback steps if available
          if (step.fallbackSteps && step.fallbackSteps.length > 0) {
            for (const fallbackStepId of step.fallbackSteps) {
              const fallbackStep = workflow.steps.find(s => s.id === fallbackStepId);
              if (fallbackStep) {
                try {
                  const fallbackResult = await this.toolFactory.executeTool(
                    fallbackStep.toolName, 
                    fallbackStep.args
                  );
                  result.stepResults.set(step.id, fallbackResult);
                  result.metrics.completedSteps++;
                  executedSteps.add(step.id);
                  return { step, result: fallbackResult };
                } catch (fallbackError) {
                  console.warn(`Fallback step ${fallbackStepId} also failed:`, fallbackError);
                }
              }
            }
          }

          throw error;
        }
      });

      await Promise.allSettled(stepPromises);

      // Remove executed steps from queue
      readySteps.forEach(step => {
        const index = stepQueue.indexOf(step);
        if (index > -1) stepQueue.splice(index, 1);
      });
    }
  }

  public async executeFeedbackLoop(loopId: string, initialData?: any): Promise<any> {
    const loop = this.feedbackLoops.get(loopId);
    if (!loop) {
      throw new Error(`Feedback loop ${loopId} not found`);
    }

    let currentData = initialData;
    let previousScore = 0;
    loop.iterations = 0;

    while (loop.iterations < loop.maxIterations) {
      // Input phase
      const inputResult = await this.toolFactory.executeTool(loop.inputTool, currentData || {});
      
      // Processing phase
      let processedData = inputResult;
      for (const processingTool of loop.processingTools) {
        processedData = await this.toolFactory.executeTool(processingTool, processedData);
      }

      // Feedback phase
      const feedbackResult = await this.toolFactory.executeTool(loop.feedbackTool, processedData);
      
      // Check convergence
      const currentScore = this.extractScore(feedbackResult);
      if (loop.convergenceThreshold && currentScore >= loop.convergenceThreshold) {
        console.log(`Feedback loop ${loopId} converged after ${loop.iterations + 1} iterations`);
        break;
      }

      // Check for improvement
      if (Math.abs(currentScore - previousScore) < 0.01) {
        console.log(`Feedback loop ${loopId} reached stable state after ${loop.iterations + 1} iterations`);
        break;
      }

      currentData = feedbackResult;
      previousScore = currentScore;
      loop.iterations++;
    }

    return {
      loopId,
      finalData: currentData,
      iterations: loop.iterations,
      converged: loop.convergenceThreshold ? previousScore >= loop.convergenceThreshold : false
    };
  }

  private extractScore(data: any): number {
    // Extract numerical score from various data formats
    if (typeof data === 'number') return data;
    if (data.score) return data.score;
    if (data.optimization_score) return data.optimization_score;
    if (data.health_score) return data.health_score;
    if (data.enhanced?.healthScore) return data.enhanced.healthScore;
    return 0;
  }

  // Workflow management methods
  public getWorkflow(id: string): Workflow | undefined {
    return this.workflows.get(id);
  }

  public listWorkflows(): Workflow[] {
    return Array.from(this.workflows.values());
  }

  public getRunningWorkflows(): WorkflowResult[] {
    return Array.from(this.runningWorkflows.values());
  }

  public getWorkflowHistory(limit?: number): WorkflowResult[] {
    return limit ? this.workflowHistory.slice(-limit) : this.workflowHistory;
  }

  public async cancelWorkflow(executionId: string): Promise<boolean> {
    const workflow = this.runningWorkflows.get(executionId);
    if (workflow) {
      workflow.status = 'cancelled';
      return true;
    }
    return false;
  }

  // Analytics and insights
  public getWorkflowAnalytics(): any {
    const total = this.workflowHistory.length;
    const successful = this.workflowHistory.filter(w => w.status === 'completed').length;
    const failed = this.workflowHistory.filter(w => w.status === 'failed').length;
    const avgDuration = this.workflowHistory.reduce((sum, w) => sum + w.metrics.totalDuration, 0) / total;

    return {
      totalExecutions: total,
      successRate: total > 0 ? successful / total : 0,
      failureRate: total > 0 ? failed / total : 0,
      averageDuration: avgDuration,
      currentlyRunning: this.runningWorkflows.size,
      workflowTypes: this.workflows.size,
      feedbackLoops: this.feedbackLoops.size
    };
  }

  public getOptimizationRecommendations(): string[] {
    const analytics = this.getWorkflowAnalytics();
    const recommendations: string[] = [];

    if (analytics.failureRate > 0.1) {
      recommendations.push('High failure rate detected. Consider adding more fallback steps.');
    }

    if (analytics.averageDuration > 300000) {
      recommendations.push('Workflows taking too long. Consider optimizing step dependencies.');
    }

    if (analytics.currentlyRunning > 10) {
      recommendations.push('Many concurrent workflows. Consider implementing queue management.');
    }

    return recommendations;
  }
}