/**
 * Feedback Loop Manager - Central orchestrator for the entire improvement ecosystem
 * Integrates all components: coordination, roadmap synthesis, implementation sequencing, and continuous improvement
 */

import { EventEmitter } from 'events';
import { 
  FeedbackCoordinator, 
  type AgentFeedback, 
  type CoordinationAnalysis,
  type AgentConnection 
} from './feedback-coordinator.js';
import { 
  RoadmapSynthesizer, 
  type UnifiedRoadmap,
  type RoadmapItem 
} from './roadmap-synthesizer.js';
import { 
  ImplementationSequencer, 
  type ExecutionPlan 
} from './implementation-sequencer.js';
import { 
  ContinuousImprovementFramework,
  type ImprovementCycle,
  type SystemHealthReport,
  type ImplementationResult
} from './continuous-improvement.js';
import { z } from 'zod';

// Schema for overall system status
export const SystemStatusSchema = z.object({
  timestamp: z.date(),
  overallHealth: z.number().min(0).max(1),
  activeAgents: z.number(),
  feedbackProcessed: z.number(),
  roadmapsGenerated: z.number(),
  plansExecuted: z.number(),
  improvementCycles: z.number(),
  systemMetrics: z.object({
    avgResponseTime: z.number(),
    errorRate: z.number(),
    userSatisfaction: z.number(),
    systemUtilization: z.number()
  }),
  alerts: z.array(z.object({
    level: z.enum(['info', 'warning', 'error', 'critical']),
    message: z.string(),
    timestamp: z.date(),
    source: z.string()
  }))
});

export const ComprehensiveReportSchema = z.object({
  id: z.string(),
  generatedAt: z.date(),
  period: z.object({
    start: z.date(),
    end: z.date()
  }),
  summary: z.object({
    totalFeedback: z.number(),
    roadmapsCreated: z.number(),
    plansExecuted: z.number(),
    improvementsImplemented: z.number(),
    overallHealthImprovement: z.number()
  }),
  keyFindings: z.array(z.string()),
  topRecommendations: z.array(z.string()),
  systemTrends: z.record(z.string(), z.string()),
  futureProjections: z.array(z.object({
    metric: z.string(),
    currentValue: z.number(),
    projectedValue: z.number(),
    confidence: z.number(),
    timeframe: z.string()
  }))
});

export type SystemStatus = z.infer<typeof SystemStatusSchema>;
export type ComprehensiveReport = z.infer<typeof ComprehensiveReportSchema>;

/**
 * Central manager orchestrating the entire feedback loop ecosystem
 */
export class FeedbackLoopManager extends EventEmitter {
  private coordinator: FeedbackCoordinator;
  private roadmapSynthesizer: RoadmapSynthesizer;
  private implementationSequencer: ImplementationSequencer;
  private continuousImprovement: ContinuousImprovementFramework;
  
  // System state tracking
  private systemMetrics = {
    feedbackProcessed: 0,
    roadmapsGenerated: 0,
    plansExecuted: 0,
    improvementsImplemented: 0,
    startTime: new Date()
  };
  
  // Configuration
  private readonly config = {
    autoRoadmapGeneration: true,
    autoImplementation: true,
    alertThresholds: {
      errorRate: 0.1,
      responseTime: 2000,
      healthScore: 0.3
    },
    reportingInterval: 24 * 60 * 60 * 1000, // 24 hours
    roadmapRefreshInterval: 7 * 24 * 60 * 60 * 1000 // 7 days
  };

  constructor() {
    super();
    
    // Initialize all components
    this.coordinator = new FeedbackCoordinator();
    this.roadmapSynthesizer = new RoadmapSynthesizer();
    this.implementationSequencer = new ImplementationSequencer();
    this.continuousImprovement = new ContinuousImprovementFramework();
    
    this.setupComponentIntegration();
    this.setupPeriodicTasks();
    this.setupEventHandlers();
    
    console.log('Feedback Loop Manager initialized with all components');
  }

  /**
   * Register a new improvement agent
   */
  registerAgent(
    agentId: string, 
    agentType: AgentFeedback['agentType'], 
    connection: AgentConnection
  ): void {
    this.coordinator.registerAgent(agentId, agentType, connection);
    this.emit('agent_registered', { agentId, agentType });
  }

  /**
   * Process feedback from an agent (main entry point)
   */
  async processFeedback(feedback: AgentFeedback): Promise<void> {
    console.log(`Processing feedback from agent ${feedback.agentId}`);
    
    try {
      // Step 1: Coordinate feedback with other agents
      await this.coordinator.processFeedback(feedback);
      this.systemMetrics.feedbackProcessed++;
      
      // Step 2: Pass to continuous improvement framework
      this.continuousImprovement.processFeedback(feedback);
      
      // Step 3: Add to roadmap synthesizer for future roadmap generation
      this.roadmapSynthesizer.addAgentFeedback(feedback);
      
      // Step 4: Check if automatic roadmap generation should be triggered
      if (this.config.autoRoadmapGeneration) {
        await this.checkAndTriggerRoadmapGeneration();
      }
      
      this.emit('feedback_processed', { 
        agentId: feedback.agentId, 
        recommendations: feedback.recommendations.length,
        findings: feedback.findings.length 
      });
      
    } catch (error) {
      console.error('Error processing feedback:', error);
      this.emit('error', { 
        type: 'feedback_processing', 
        error: error instanceof Error ? error.message : String(error),
        agentId: feedback.agentId 
      });
    }
  }

  /**
   * Generate unified roadmap from all collected feedback
   */
  async generateUnifiedRoadmap(): Promise<UnifiedRoadmap> {
    console.log('Generating unified roadmap...');
    
    try {
      const roadmap = this.roadmapSynthesizer.generateUnifiedRoadmap();
      this.systemMetrics.roadmapsGenerated++;
      
      // Generate execution plan
      const executionPlan = this.implementationSequencer.generateExecutionPlan(roadmap);
      
      // Store for future reference
      this.emit('roadmap_generated', { 
        roadmapId: roadmap.id, 
        itemCount: roadmap.items.length,
        phases: roadmap.phases.length 
      });
      
      // Trigger continuous improvement analysis
      await this.analyzRoadmapForImprovement(roadmap, executionPlan);
      
      return roadmap;
      
    } catch (error) {
      console.error('Error generating roadmap:', error);
      this.emit('error', { 
        type: 'roadmap_generation', 
        error: error instanceof Error ? error.message : String(error) 
      });
      throw error;
    }
  }

  /**
   * Execute an improvement plan
   */
  async executeImprovementPlan(executionPlan: ExecutionPlan): Promise<ImplementationResult[]> {
    console.log(`Executing improvement plan ${executionPlan.id}...`);
    
    try {
      const results: ImplementationResult[] = [];
      
      // Execute each phase
      for (const phase of executionPlan.phases) {
        console.log(`Executing phase: ${phase.name}`);
        
        const phaseResults = await this.executePhase(phase, executionPlan);
        results.push(...phaseResults);
        
        // Process results for learning
        this.continuousImprovement.processImplementationResults(executionPlan, phaseResults);
      }
      
      this.systemMetrics.plansExecuted++;
      this.emit('plan_executed', { 
        planId: executionPlan.id, 
        results: results.length,
        success: results.filter(r => r.success).length 
      });
      
      return results;
      
    } catch (error) {
      console.error('Error executing plan:', error);
      this.emit('error', { 
        type: 'plan_execution', 
        error: error instanceof Error ? error.message : String(error),
        planId: executionPlan.id 
      });
      throw error;
    }
  }

  /**
   * Get current system status
   */
  getSystemStatus(): SystemStatus {
    const coordinationStatus = this.coordinator.getCoordinationStatus();
    const healthReport = this.continuousImprovement.getSystemHealth();
    
    const alerts = this.generateSystemAlerts(healthReport);
    
    return {
      timestamp: new Date(),
      overallHealth: healthReport.healthScore,
      activeAgents: coordinationStatus.activeAgents,
      feedbackProcessed: this.systemMetrics.feedbackProcessed,
      roadmapsGenerated: this.systemMetrics.roadmapsGenerated,
      plansExecuted: this.systemMetrics.plansExecuted,
      improvementCycles: healthReport.currentCycle ? 1 : 0,
      systemMetrics: {
        avgResponseTime: this.extractMetricValue(healthReport.metrics, 'average_response_time') || 1000,
        errorRate: this.extractMetricValue(healthReport.metrics, 'error_rate') || 0.05,
        userSatisfaction: this.extractMetricValue(healthReport.metrics, 'user_satisfaction') || 0.8,
        systemUtilization: coordinationStatus.overallHealth
      },
      alerts
    };
  }

  /**
   * Generate comprehensive improvement report
   */
  generateComprehensiveReport(periodDays: number = 30): ComprehensiveReport {
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - (periodDays * 24 * 60 * 60 * 1000));
    
    const healthReport = this.continuousImprovement.getSystemHealth();
    const coordinationStatus = this.coordinator.getCoordinationStatus();
    const feedbackSummary = this.coordinator.getFeedbackSummary();
    
    const keyFindings = this.generateKeyFindings(healthReport, feedbackSummary);
    const topRecommendations = this.generateTopRecommendations(healthReport);
    const systemTrends = this.analyzeSystemTrends(healthReport);
    const futureProjections = this.generateFutureProjections(healthReport);
    
    return {
      id: `report_${Date.now()}`,
      generatedAt: new Date(),
      period: { start: startDate, end: endDate },
      summary: {
        totalFeedback: this.systemMetrics.feedbackProcessed,
        roadmapsCreated: this.systemMetrics.roadmapsGenerated,
        plansExecuted: this.systemMetrics.plansExecuted,
        improvementsImplemented: this.systemMetrics.improvementsImplemented,
        overallHealthImprovement: this.calculateHealthImprovement()
      },
      keyFindings,
      topRecommendations,
      systemTrends,
      futureProjections
    };
  }

  /**
   * Auto-implement low-risk, high-impact improvements
   */
  async autoImplement(): Promise<void> {
    console.log('Starting auto-implementation process...');
    
    try {
      if (!this.config.autoImplementation) {
        console.log('Auto-implementation is disabled');
        return;
      }
      
      const autoResults = await this.continuousImprovement.autoImplement();
      const successCount = autoResults.filter(r => r.success).length;
      
      this.systemMetrics.improvementsImplemented += successCount;
      
      this.emit('auto_implementation_completed', { 
        total: autoResults.length, 
        successful: successCount 
      });
      
      console.log(`Auto-implementation completed: ${successCount}/${autoResults.length} successful`);
      
    } catch (error) {
      console.error('Error in auto-implementation:', error);
      this.emit('error', { 
        type: 'auto_implementation', 
        error: error instanceof Error ? error.message : String(error) 
      });
    }
  }

  /**
   * Export comprehensive system data
   */
  exportSystemData(format: 'json' | 'report' | 'dashboard' = 'json'): string {
    const systemStatus = this.getSystemStatus();
    const healthReport = this.continuousImprovement.getSystemHealth();
    const coordinationStatus = this.coordinator.getCoordinationStatus();
    const improvementData = this.continuousImprovement.exportData('json');
    
    const data = {
      systemStatus,
      healthReport,
      coordinationStatus,
      improvementData: JSON.parse(improvementData),
      exportTimestamp: new Date()
    };
    
    switch (format) {
      case 'json':
        return JSON.stringify(data, null, 2);
      
      case 'report':
        return this.generateSystemReport(data);
      
      case 'dashboard':
        return this.generateDashboardData(data);
      
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  // Private methods for internal operations
  private setupComponentIntegration(): void {
    // Integration between coordinator and roadmap synthesizer
    this.coordinator.on('coordination_broadcast', (report) => {
      // Pass coordination analysis to synthesizer
      this.roadmapSynthesizer.addCoordinationAnalysis(report as CoordinationAnalysis);
      this.continuousImprovement.processCoordinationAnalysis(report as CoordinationAnalysis);
    });
    
    // Integration between continuous improvement and other components
    this.continuousImprovement.on('suggestions_generated', (suggestions) => {
      console.log(`Generated ${suggestions.count} improvement suggestions`);
    });
    
    this.continuousImprovement.on('cycle_completed', (cycle) => {
      this.emit('improvement_cycle_completed', cycle);
    });
  }

  private setupPeriodicTasks(): void {
    // Daily system health check
    setInterval(() => {
      this.performHealthCheck();
    }, 24 * 60 * 60 * 1000);
    
    // Weekly roadmap refresh
    setInterval(() => {
      if (this.config.autoRoadmapGeneration) {
        this.generateUnifiedRoadmap().catch(console.error);
      }
    }, this.config.roadmapRefreshInterval);
    
    // Daily auto-implementation check
    setInterval(() => {
      this.autoImplement().catch(console.error);
    }, 24 * 60 * 60 * 1000);
    
    // Hourly system metrics collection
    setInterval(() => {
      this.collectSystemMetrics();
    }, 60 * 60 * 1000);
  }

  private setupEventHandlers(): void {
    this.on('agent_registered', (data) => {
      console.log(`Agent ${data.agentId} (${data.agentType}) registered successfully`);
    });
    
    this.on('feedback_processed', (data) => {
      console.log(`Processed feedback from ${data.agentId}: ${data.recommendations} recommendations, ${data.findings} findings`);
    });
    
    this.on('roadmap_generated', (data) => {
      console.log(`Generated roadmap ${data.roadmapId} with ${data.itemCount} items across ${data.phases} phases`);
    });
    
    this.on('error', (error) => {
      console.error(`System error in ${error.type}:`, error.error);
    });
  }

  private async checkAndTriggerRoadmapGeneration(): Promise<void> {
    // Check if we have enough feedback to generate a meaningful roadmap
    const coordinationStatus = this.coordinator.getCoordinationStatus();
    
    if (coordinationStatus.totalRecommendations >= 10 || 
        coordinationStatus.totalFeedback >= 20) {
      try {
        await this.generateUnifiedRoadmap();
      } catch (error) {
        console.error('Failed to auto-generate roadmap:', error);
      }
    }
  }

  private async analyzRoadmapForImprovement(roadmap: UnifiedRoadmap, plan: ExecutionPlan): Promise<void> {
    // Analyze the roadmap for potential process improvements
    const analysis = {
      totalItems: roadmap.items.length,
      averagePriority: roadmap.items.reduce((sum, item) => sum + item.priority.score, 0) / roadmap.items.length,
      riskDistribution: {
        high: roadmap.riskAssessment.high.length,
        medium: roadmap.riskAssessment.medium.length,
        low: roadmap.riskAssessment.low.length
      },
      resourceUtilization: plan.optimizationMetrics.resourceUtilization
    };
    
    // Generate insights for continuous improvement
    if (analysis.riskDistribution.high > roadmap.items.length * 0.3) {
      console.log('High proportion of high-risk items detected - consider more conservative planning');
    }
    
    if (analysis.resourceUtilization < 0.6) {
      console.log('Low resource utilization detected - opportunity for better parallelization');
    }
  }

  private async executePhase(
    phase: ExecutionPlan['phases'][0], 
    plan: ExecutionPlan
  ): Promise<ImplementationResult[]> {
    const results: ImplementationResult[] = [];
    
    // Mock implementation execution
    for (const item of phase.items) {
      const startTime = Date.now();
      
      // Simulate implementation (in real system, this would call actual implementation logic)
      const success = Math.random() > 0.2; // 80% success rate
      const duration = Math.random() * 1000 + 500; // 500-1500ms
      
      const result: ImplementationResult = {
        itemId: item.itemId,
        success,
        duration,
        metrics: {
          execution_time: duration,
          resources_used: Object.values(item.assignedResources).reduce((a, b) => a + b, 0)
        },
        issues: success ? [] : ['Mock implementation failure']
      };
      
      results.push(result);
      
      // Emit progress event
      this.emit('item_implemented', { 
        itemId: item.itemId, 
        success, 
        duration,
        phase: phase.name 
      });
    }
    
    return results;
  }

  private performHealthCheck(): void {
    const status = this.getSystemStatus();
    
    // Check various health indicators
    if (status.overallHealth < this.config.alertThresholds.healthScore) {
      this.emit('health_alert', {
        level: 'critical',
        message: `System health below threshold: ${(status.overallHealth * 100).toFixed(0)}%`,
        timestamp: new Date()
      });
    }
    
    if (status.systemMetrics.errorRate > this.config.alertThresholds.errorRate) {
      this.emit('health_alert', {
        level: 'warning',
        message: `Error rate above threshold: ${(status.systemMetrics.errorRate * 100).toFixed(1)}%`,
        timestamp: new Date()
      });
    }
    
    if (status.systemMetrics.avgResponseTime > this.config.alertThresholds.responseTime) {
      this.emit('health_alert', {
        level: 'warning',
        message: `Response time above threshold: ${status.systemMetrics.avgResponseTime}ms`,
        timestamp: new Date()
      });
    }
  }

  private collectSystemMetrics(): void {
    // Collect and emit system metrics
    const status = this.getSystemStatus();
    
    this.emit('metrics_collected', {
      timestamp: new Date(),
      metrics: status.systemMetrics,
      health: status.overallHealth
    });
  }

  private generateSystemAlerts(healthReport: SystemHealthReport): SystemStatus['alerts'] {
    const alerts: SystemStatus['alerts'] = [];
    
    // Check for concerning patterns
    const concerningPatterns = healthReport.patterns.filter(p => p.impact === 'negative');
    if (concerningPatterns.length > 0) {
      alerts.push({
        level: 'warning',
        message: `${concerningPatterns.length} concerning patterns detected`,
        timestamp: new Date(),
        source: 'pattern_analysis'
      });
    }
    
    // Check for high-impact opportunities
    const highImpactOpportunities = healthReport.opportunities.filter(o => o.impact.estimated > 0.7);
    if (highImpactOpportunities.length > 0) {
      alerts.push({
        level: 'info',
        message: `${highImpactOpportunities.length} high-impact optimization opportunities available`,
        timestamp: new Date(),
        source: 'opportunity_detection'
      });
    }
    
    // Check health score
    if (healthReport.healthScore < 0.4) {
      alerts.push({
        level: 'critical',
        message: 'System health critically low',
        timestamp: new Date(),
        source: 'health_monitor'
      });
    }
    
    return alerts;
  }

  private extractMetricValue(metrics: Record<string, any>, metricName: string): number | null {
    const metric = metrics[metricName];
    return metric ? metric.value : null;
  }

  private generateKeyFindings(healthReport: SystemHealthReport, feedbackSummary: any): string[] {
    const findings: string[] = [];
    
    // Health-based findings
    if (healthReport.healthScore > 0.8) {
      findings.push('System health is excellent with strong performance across all metrics');
    } else if (healthReport.healthScore < 0.4) {
      findings.push('System health requires immediate attention with multiple areas of concern');
    }
    
    // Pattern-based findings
    const topPatterns = healthReport.patterns.slice(0, 3);
    if (topPatterns.length > 0) {
      findings.push(`Top recurring patterns: ${topPatterns.map(p => p.pattern).join(', ')}`);
    }
    
    // Feedback-based findings
    const topIssues = feedbackSummary.topIssues?.slice(0, 3) || [];
    if (topIssues.length > 0) {
      findings.push(`Most frequent issues: ${topIssues.map((i: any) => i.description).join(', ')}`);
    }
    
    return findings;
  }

  private generateTopRecommendations(healthReport: SystemHealthReport): string[] {
    return healthReport.recommendations
      .slice(0, 5)
      .map(rec => rec.title);
  }

  private analyzeSystemTrends(healthReport: SystemHealthReport): Record<string, string> {
    const trends: Record<string, string> = {};
    
    Object.entries(healthReport.trends).forEach(([metric, trend]) => {
      trends[metric] = trend;
    });
    
    return trends;
  }

  private generateFutureProjections(healthReport: SystemHealthReport): ComprehensiveReport['futureProjections'] {
    const projections: ComprehensiveReport['futureProjections'] = [];
    
    // Project health score improvement
    projections.push({
      metric: 'system_health',
      currentValue: healthReport.healthScore,
      projectedValue: Math.min(1, healthReport.healthScore + 0.1),
      confidence: 0.7,
      timeframe: '30 days'
    });
    
    // Project based on current trends
    Object.entries(healthReport.metrics).forEach(([name, metric]) => {
      if (metric.trend.confidence > 0.6) {
        const projectedChange = metric.trend.direction === 'up' ? metric.trend.magnitude : -metric.trend.magnitude;
        projections.push({
          metric: name,
          currentValue: metric.value,
          projectedValue: metric.value + (metric.value * projectedChange),
          confidence: metric.trend.confidence,
          timeframe: '30 days'
        });
      }
    });
    
    return projections;
  }

  private calculateHealthImprovement(): number {
    // Calculate health improvement over time
    // This would be based on historical data in a real implementation
    return 0.15; // Mock 15% improvement
  }

  private generateSystemReport(data: any): string {
    let report = '# System Feedback Loop Report\n\n';
    report += `Generated: ${new Date().toISOString()}\n\n`;
    
    // Executive Summary
    report += '## Executive Summary\n';
    report += `- Overall Health: ${(data.systemStatus.overallHealth * 100).toFixed(0)}%\n`;
    report += `- Active Agents: ${data.systemStatus.activeAgents}\n`;
    report += `- Feedback Processed: ${data.systemStatus.feedbackProcessed}\n`;
    report += `- Roadmaps Generated: ${data.systemStatus.roadmapsGenerated}\n`;
    report += `- Plans Executed: ${data.systemStatus.plansExecuted}\n\n`;
    
    // Key Metrics
    report += '## Key Metrics\n';
    report += `- Average Response Time: ${data.systemStatus.systemMetrics.avgResponseTime}ms\n`;
    report += `- Error Rate: ${(data.systemStatus.systemMetrics.errorRate * 100).toFixed(2)}%\n`;
    report += `- User Satisfaction: ${(data.systemStatus.systemMetrics.userSatisfaction * 100).toFixed(0)}%\n`;
    report += `- System Utilization: ${(data.systemStatus.systemMetrics.systemUtilization * 100).toFixed(0)}%\n\n`;
    
    // Alerts
    if (data.systemStatus.alerts.length > 0) {
      report += '## Active Alerts\n';
      data.systemStatus.alerts.forEach((alert: any) => {
        report += `- ${alert.level.toUpperCase()}: ${alert.message} (${alert.source})\n`;
      });
      report += '\n';
    }
    
    return report;
  }

  private generateDashboardData(data: any): string {
    // Generate dashboard-friendly JSON data
    const dashboard = {
      timestamp: new Date(),
      kpis: {
        health_score: data.systemStatus.overallHealth,
        active_agents: data.systemStatus.activeAgents,
        feedback_processed: data.systemStatus.feedbackProcessed,
        error_rate: data.systemStatus.systemMetrics.errorRate,
        response_time: data.systemStatus.systemMetrics.avgResponseTime
      },
      trends: data.healthReport.trends,
      alerts: data.systemStatus.alerts,
      top_opportunities: data.healthReport.opportunities.slice(0, 5)
    };
    
    return JSON.stringify(dashboard, null, 2);
  }

  /**
   * Configuration methods
   */
  setAutoRoadmapGeneration(enabled: boolean): void {
    this.config.autoRoadmapGeneration = enabled;
  }

  setAutoImplementation(enabled: boolean): void {
    this.config.autoImplementation = enabled;
  }

  setAlertThresholds(thresholds: Partial<typeof this.config.alertThresholds>): void {
    Object.assign(this.config.alertThresholds, thresholds);
  }
}