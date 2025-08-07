/**
 * Tool Feedback Coordinator - Advanced feedback loop management system
 * Coordinates feedback between tools, manages continuous improvement, and provides AI-driven insights
 */

import { EnhancedToolFactory } from './enhanced-tool-factory.js';
import { ToolWorkflowOrchestrator } from './tool-workflow-orchestrator.js';

export interface FeedbackData {
  toolName: string;
  executionId: string;
  timestamp: number;
  performance: {
    duration: number;
    success: boolean;
    errorType?: string;
    resourceUsage: {
      memory: number;
      cpu: number;
    };
  };
  userSatisfaction?: number; // 0-1 scale
  businessImpact: {
    category: string;
    value: number;
    metric: string;
  };
  context: {
    guildId?: string;
    userId?: string;
    workflowId?: string;
    metadata: Record<string, any>;
  };
}

export interface FeedbackPattern {
  id: string;
  name: string;
  pattern: RegExp | ((data: FeedbackData) => boolean);
  action: 'alert' | 'optimize' | 'degrade' | 'scale' | 'investigate';
  threshold: number;
  window: number; // time window in milliseconds
  confidence: number; // 0-1 scale
}

export interface ImprovementSuggestion {
  id: string;
  type: 'performance' | 'reliability' | 'user_experience' | 'cost_optimization';
  priority: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  estimatedImpact: number; // 0-1 scale
  implementationCost: number; // 0-1 scale
  toolsAffected: string[];
  actionItems: string[];
  expectedOutcome: string;
  confidence: number; // 0-1 scale
}

export interface FeedbackLoopConfig {
  id: string;
  name: string;
  description: string;
  inputSources: string[]; // Tool names or data sources
  processingRules: string[]; // Processing rule IDs
  outputTargets: string[]; // Where to send processed feedback
  frequency: number; // How often to process feedback (ms)
  enabled: boolean;
  adaptiveTuning: boolean; // Whether to auto-adjust parameters
}

export class ToolFeedbackCoordinator {
  private feedbackBuffer: FeedbackData[] = [];
  private patterns = new Map<string, FeedbackPattern>();
  private improvementSuggestions: ImprovementSuggestion[] = [];
  private feedbackLoops = new Map<string, FeedbackLoopConfig>();
  private processingRules = new Map<string, (data: FeedbackData[]) => any>();
  private aiInsights: Map<string, any> = new Map();
  
  // Performance tracking
  private toolPerformanceHistory = new Map<string, FeedbackData[]>();
  private systemHealthMetrics = {
    overallHealth: 1.0,
    performanceScore: 1.0,
    reliabilityScore: 1.0,
    userSatisfactionScore: 1.0,
    lastUpdated: Date.now()
  };

  constructor(
    private toolFactory: EnhancedToolFactory,
    private workflowOrchestrator: ToolWorkflowOrchestrator
  ) {
    this.initializeFeedbackPatterns();
    this.initializeProcessingRules();
    this.setupFeedbackLoops();
    this.startContinuousProcessing();
  }

  private initializeFeedbackPatterns(): void {
    // High error rate pattern
    this.patterns.set('high-error-rate', {
      id: 'high-error-rate',
      name: 'High Error Rate Detection',
      pattern: (data: FeedbackData) => !data.performance.success,
      action: 'alert',
      threshold: 0.1, // 10% error rate
      window: 300000, // 5 minutes
      confidence: 0.9
    });

    // Performance degradation pattern
    this.patterns.set('performance-degradation', {
      id: 'performance-degradation',
      name: 'Performance Degradation Detection',
      pattern: (data: FeedbackData) => data.performance.duration > 5000, // 5 seconds
      action: 'optimize',
      threshold: 0.2, // 20% of requests slow
      window: 600000, // 10 minutes
      confidence: 0.85
    });

    // User dissatisfaction pattern
    this.patterns.set('low-user-satisfaction', {
      id: 'low-user-satisfaction',
      name: 'Low User Satisfaction',
      pattern: (data: FeedbackData) => (data.userSatisfaction || 1) < 0.6,
      action: 'investigate',
      threshold: 0.3, // 30% dissatisfied users
      window: 3600000, // 1 hour
      confidence: 0.75
    });

    // Resource exhaustion pattern
    this.patterns.set('resource-exhaustion', {
      id: 'resource-exhaustion',
      name: 'Resource Exhaustion Warning',
      pattern: (data: FeedbackData) => 
        data.performance.resourceUsage.memory > 0.8 || data.performance.resourceUsage.cpu > 0.9,
      action: 'scale',
      threshold: 0.05, // 5% of requests hitting limits
      window: 180000, // 3 minutes
      confidence: 0.95
    });

    // Business impact anomaly
    this.patterns.set('business-impact-anomaly', {
      id: 'business-impact-anomaly',
      name: 'Business Impact Anomaly',
      pattern: (data: FeedbackData) => data.businessImpact.value < 0,
      action: 'investigate',
      threshold: 0.15, // 15% negative impact
      window: 1800000, // 30 minutes
      confidence: 0.8
    });
  }

  private initializeProcessingRules(): void {
    // Performance analysis rule
    this.processingRules.set('performance-analysis', (data: FeedbackData[]) => {
      const byTool = new Map<string, FeedbackData[]>();
      data.forEach(d => {
        if (!byTool.has(d.toolName)) byTool.set(d.toolName, []);
        byTool.get(d.toolName)!.push(d);
      });

      const analysis: any = {};
      byTool.forEach((toolData, toolName) => {
        const avgDuration = toolData.reduce((sum, d) => sum + d.performance.duration, 0) / toolData.length;
        const successRate = toolData.filter(d => d.performance.success).length / toolData.length;
        const avgSatisfaction = toolData
          .filter(d => d.userSatisfaction !== undefined)
          .reduce((sum, d) => sum + (d.userSatisfaction || 0), 0) / toolData.length;

        analysis[toolName] = {
          avgDuration,
          successRate,
          avgSatisfaction,
          sampleSize: toolData.length,
          trend: this.calculateTrend(toolName, avgDuration)
        };
      });

      return analysis;
    });

    // Error pattern analysis
    this.processingRules.set('error-pattern-analysis', (data: FeedbackData[]) => {
      const errors = data.filter(d => !d.performance.success);
      const errorPatterns = new Map<string, number>();
      
      errors.forEach(error => {
        const pattern = error.performance.errorType || 'unknown';
        errorPatterns.set(pattern, (errorPatterns.get(pattern) || 0) + 1);
      });

      return {
        totalErrors: errors.length,
        errorRate: errors.length / data.length,
        mostCommonErrors: Array.from(errorPatterns.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5),
        timeDistribution: this.analyzeErrorTimeDistribution(errors)
      };
    });

    // User behavior analysis
    this.processingRules.set('user-behavior-analysis', (data: FeedbackData[]) => {
      const userMetrics = new Map<string, any>();
      
      data.forEach(d => {
        if (d.context.userId) {
          const userId = d.context.userId;
          if (!userMetrics.has(userId)) {
            userMetrics.set(userId, {
              toolsUsed: new Set<string>(),
              totalExecutions: 0,
              avgSatisfaction: 0,
              satisfactionSamples: 0,
              businessImpact: 0
            });
          }
          
          const metrics = userMetrics.get(userId)!;
          metrics.toolsUsed.add(d.toolName);
          metrics.totalExecutions++;
          metrics.businessImpact += d.businessImpact.value;
          
          if (d.userSatisfaction !== undefined) {
            metrics.avgSatisfaction = (metrics.avgSatisfaction * metrics.satisfactionSamples + d.userSatisfaction) 
              / (metrics.satisfactionSamples + 1);
            metrics.satisfactionSamples++;
          }
        }
      });

      return {
        totalUsers: userMetrics.size,
        avgToolsPerUser: Array.from(userMetrics.values()).reduce((sum, m) => sum + m.toolsUsed.size, 0) / userMetrics.size,
        avgExecutionsPerUser: Array.from(userMetrics.values()).reduce((sum, m) => sum + m.totalExecutions, 0) / userMetrics.size,
        avgSatisfactionAcrossUsers: Array.from(userMetrics.values())
          .filter(m => m.satisfactionSamples > 0)
          .reduce((sum, m) => sum + m.avgSatisfaction, 0) / userMetrics.size
      };
    });

    // Business impact analysis
    this.processingRules.set('business-impact-analysis', (data: FeedbackData[]) => {
      const impactByCategory = new Map<string, { total: number; count: number; avg: number }>();
      
      data.forEach(d => {
        const category = d.businessImpact.category;
        if (!impactByCategory.has(category)) {
          impactByCategory.set(category, { total: 0, count: 0, avg: 0 });
        }
        
        const impact = impactByCategory.get(category)!;
        impact.total += d.businessImpact.value;
        impact.count++;
        impact.avg = impact.total / impact.count;
      });

      return {
        overallImpact: data.reduce((sum, d) => sum + d.businessImpact.value, 0),
        impactByCategory: Object.fromEntries(impactByCategory),
        highImpactTools: this.identifyHighImpactTools(data),
        roi: this.calculateROI(data)
      };
    });
  }

  private setupFeedbackLoops(): void {
    // Real-time performance optimization loop
    this.feedbackLoops.set('performance-optimization', {
      id: 'performance-optimization',
      name: 'Real-time Performance Optimization',
      description: 'Continuously optimizes tool performance based on feedback',
      inputSources: ['all-tools'],
      processingRules: ['performance-analysis'],
      outputTargets: ['tool-factory', 'workflow-orchestrator'],
      frequency: 30000, // 30 seconds
      enabled: true,
      adaptiveTuning: true
    });

    // Error prevention loop
    this.feedbackLoops.set('error-prevention', {
      id: 'error-prevention',
      name: 'Proactive Error Prevention',
      description: 'Identifies and prevents potential errors before they occur',
      inputSources: ['all-tools'],
      processingRules: ['error-pattern-analysis'],
      outputTargets: ['degradation-manager', 'circuit-breakers'],
      frequency: 60000, // 1 minute
      enabled: true,
      adaptiveTuning: true
    });

    // User experience optimization loop
    this.feedbackLoops.set('ux-optimization', {
      id: 'ux-optimization',
      name: 'User Experience Optimization',
      description: 'Optimizes user experience based on satisfaction feedback',
      inputSources: ['user-tools'],
      processingRules: ['user-behavior-analysis'],
      outputTargets: ['tool-factory', 'ui-recommendations'],
      frequency: 300000, // 5 minutes
      enabled: true,
      adaptiveTuning: false
    });

    // Business value maximization loop
    this.feedbackLoops.set('business-optimization', {
      id: 'business-optimization',
      name: 'Business Value Maximization',
      description: 'Maximizes business value and ROI from tool usage',
      inputSources: ['business-critical-tools'],
      processingRules: ['business-impact-analysis'],
      outputTargets: ['resource-allocation', 'priority-system'],
      frequency: 900000, // 15 minutes
      enabled: true,
      adaptiveTuning: true
    });
  }

  public recordFeedback(feedback: FeedbackData): void {
    feedback.timestamp = Date.now();
    this.feedbackBuffer.push(feedback);
    
    // Add to tool performance history
    if (!this.toolPerformanceHistory.has(feedback.toolName)) {
      this.toolPerformanceHistory.set(feedback.toolName, []);
    }
    this.toolPerformanceHistory.get(feedback.toolName)!.push(feedback);

    // Keep history manageable (last 1000 entries per tool)
    const history = this.toolPerformanceHistory.get(feedback.toolName)!;
    if (history.length > 1000) {
      history.splice(0, history.length - 1000);
    }

    // Immediate pattern analysis for critical issues
    this.analyzeImmediateFeedback(feedback);
  }

  private analyzeImmediateFeedback(feedback: FeedbackData): void {
    this.patterns.forEach((pattern, patternId) => {
      if (this.matchesPattern(pattern, feedback)) {
        this.handlePatternMatch(patternId, pattern, feedback);
      }
    });
  }

  private matchesPattern(pattern: FeedbackPattern, feedback: FeedbackData): boolean {
    if (typeof pattern.pattern === 'function') {
      return pattern.pattern(feedback);
    } else {
      // For RegExp patterns, match against stringified feedback
      return pattern.pattern.test(JSON.stringify(feedback));
    }
  }

  private handlePatternMatch(patternId: string, pattern: FeedbackPattern, feedback: FeedbackData): void {
    console.log(`Pattern match detected: ${pattern.name} for tool ${feedback.toolName}`);
    
    switch (pattern.action) {
      case 'alert':
        this.sendAlert(patternId, pattern, feedback);
        break;
      case 'optimize':
        this.triggerOptimization(feedback.toolName, pattern);
        break;
      case 'degrade':
        this.requestDegradation(feedback.toolName, pattern);
        break;
      case 'scale':
        this.requestScaling(feedback.toolName, pattern);
        break;
      case 'investigate':
        this.flagForInvestigation(patternId, feedback);
        break;
    }
  }

  private startContinuousProcessing(): void {
    setInterval(() => {
      this.processFeedbackLoops();
    }, 10000); // Check every 10 seconds

    setInterval(() => {
      this.generateImprovementSuggestions();
    }, 300000); // Generate suggestions every 5 minutes

    setInterval(() => {
      this.updateSystemHealth();
    }, 60000); // Update system health every minute
  }

  private processFeedbackLoops(): void {
    const now = Date.now();
    
    this.feedbackLoops.forEach((loop, loopId) => {
      if (!loop.enabled) return;

      // Check if it's time to process this loop
      const lastProcessed = this.aiInsights.get(`${loopId}_last_processed`) || 0;
      if (now - lastProcessed < loop.frequency) return;

      // Get relevant feedback data
      const relevantData = this.getRelevantFeedbackData(loop.inputSources, loop.frequency);
      if (relevantData.length === 0) return;

      // Process data with configured rules
      const results: any = {};
      loop.processingRules.forEach(ruleId => {
        const rule = this.processingRules.get(ruleId);
        if (rule) {
          results[ruleId] = rule(relevantData);
        }
      });

      // Send results to output targets
      this.distributeResults(loop.outputTargets, results, loopId);

      // Update AI insights
      this.aiInsights.set(`${loopId}_results`, results);
      this.aiInsights.set(`${loopId}_last_processed`, now);

      // Adaptive tuning if enabled
      if (loop.adaptiveTuning) {
        this.adaptivelyTuneLoop(loopId, results);
      }
    });
  }

  private getRelevantFeedbackData(sources: string[], timeWindow: number): FeedbackData[] {
    const cutoffTime = Date.now() - timeWindow;
    
    return this.feedbackBuffer.filter(feedback => {
      if (feedback.timestamp < cutoffTime) return false;
      
      if (sources.includes('all-tools')) return true;
      if (sources.includes('user-tools') && feedback.context.userId) return true;
      if (sources.includes('business-critical-tools') && feedback.businessImpact.value > 10) return true;
      
      return sources.includes(feedback.toolName);
    });
  }

  private distributeResults(targets: string[], results: any, loopId: string): void {
    targets.forEach(target => {
      switch (target) {
        case 'tool-factory':
          // Send optimization recommendations to tool factory
          this.optimizeToolFactory(results);
          break;
        case 'workflow-orchestrator':
          // Send workflow optimization recommendations
          this.optimizeWorkflows(results);
          break;
        case 'degradation-manager':
          // Request service degradation if needed
          this.requestServiceDegradation(results);
          break;
        case 'circuit-breakers':
          // Update circuit breaker thresholds
          this.updateCircuitBreakers(results);
          break;
        default:
          console.log(`Unknown output target: ${target}`);
      }
    });
  }

  private generateImprovementSuggestions(): void {
    const recentFeedback = this.getRelevantFeedbackData(['all-tools'], 3600000); // Last hour
    if (recentFeedback.length < 10) return; // Need sufficient data

    // Performance improvement suggestions
    const performanceAnalysis = this.processingRules.get('performance-analysis')!(recentFeedback);
    Object.entries(performanceAnalysis).forEach(([toolName, analysis]: [string, any]) => {
      if (analysis.avgDuration > 2000) { // > 2 seconds
        this.improvementSuggestions.push({
          id: `perf_${toolName}_${Date.now()}`,
          type: 'performance',
          priority: analysis.avgDuration > 5000 ? 'high' : 'medium',
          description: `Tool ${toolName} has high average response time (${analysis.avgDuration}ms)`,
          estimatedImpact: 0.7,
          implementationCost: 0.4,
          toolsAffected: [toolName],
          actionItems: [
            'Add request caching',
            'Optimize database queries',
            'Implement connection pooling',
            'Add request batching'
          ],
          expectedOutcome: 'Reduce response time by 50-70%',
          confidence: 0.8
        });
      }

      if (analysis.successRate < 0.95) { // < 95% success rate
        this.improvementSuggestions.push({
          id: `reliability_${toolName}_${Date.now()}`,
          type: 'reliability',
          priority: analysis.successRate < 0.9 ? 'critical' : 'high',
          description: `Tool ${toolName} has low success rate (${(analysis.successRate * 100).toFixed(1)}%)`,
          estimatedImpact: 0.9,
          implementationCost: 0.6,
          toolsAffected: [toolName],
          actionItems: [
            'Add retry logic with exponential backoff',
            'Implement circuit breaker pattern',
            'Add comprehensive error handling',
            'Create fallback mechanisms'
          ],
          expectedOutcome: 'Increase success rate to >98%',
          confidence: 0.9
        });
      }
    });

    // User experience suggestions
    const uxAnalysis = this.processingRules.get('user-behavior-analysis')!(recentFeedback);
    if (uxAnalysis.avgSatisfactionAcrossUsers < 0.7) {
      this.improvementSuggestions.push({
        id: `ux_improvement_${Date.now()}`,
        type: 'user_experience',
        priority: 'high',
        description: `Overall user satisfaction is low (${(uxAnalysis.avgSatisfactionAcrossUsers * 100).toFixed(1)}%)`,
        estimatedImpact: 0.8,
        implementationCost: 0.5,
        toolsAffected: ['all'],
        actionItems: [
          'Improve error messages and user feedback',
          'Add progress indicators for long-running operations',
          'Implement user preference learning',
          'Create interactive help and tutorials'
        ],
        expectedOutcome: 'Increase user satisfaction to >85%',
        confidence: 0.7
      });
    }

    // Keep only recent suggestions (last 24 hours)
    const dayAgo = Date.now() - 86400000;
    this.improvementSuggestions = this.improvementSuggestions.filter(
      suggestion => parseInt(suggestion.id.split('_').pop() || '0') > dayAgo
    );
  }

  // Utility methods
  private calculateTrend(toolName: string, currentValue: number): 'improving' | 'stable' | 'degrading' {
    const history = this.toolPerformanceHistory.get(toolName) || [];
    if (history.length < 10) return 'stable';

    const recent = history.slice(-10);
    const older = history.slice(-20, -10);
    
    if (older.length === 0) return 'stable';

    const recentAvg = recent.reduce((sum, d) => sum + d.performance.duration, 0) / recent.length;
    const olderAvg = older.reduce((sum, d) => sum + d.performance.duration, 0) / older.length;

    const change = (recentAvg - olderAvg) / olderAvg;
    
    if (change < -0.1) return 'improving';
    if (change > 0.1) return 'degrading';
    return 'stable';
  }

  private analyzeErrorTimeDistribution(errors: FeedbackData[]): any {
    const hourlyDistribution = new Array(24).fill(0);
    
    errors.forEach(error => {
      const hour = new Date(error.timestamp).getHours();
      hourlyDistribution[hour]++;
    });

    return {
      hourlyDistribution,
      peakErrorHour: hourlyDistribution.indexOf(Math.max(...hourlyDistribution)),
      lowErrorHour: hourlyDistribution.indexOf(Math.min(...hourlyDistribution))
    };
  }

  private identifyHighImpactTools(data: FeedbackData[]): string[] {
    const toolImpacts = new Map<string, number>();
    
    data.forEach(d => {
      const current = toolImpacts.get(d.toolName) || 0;
      toolImpacts.set(d.toolName, current + d.businessImpact.value);
    });

    return Array.from(toolImpacts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([toolName]) => toolName);
  }

  private calculateROI(data: FeedbackData[]): number {
    const totalBenefit = data.reduce((sum, d) => sum + Math.max(0, d.businessImpact.value), 0);
    const totalCost = data.length * 0.01; // Assume $0.01 per execution
    return totalCost > 0 ? totalBenefit / totalCost : 0;
  }

  private updateSystemHealth(): void {
    const recentFeedback = this.getRelevantFeedbackData(['all-tools'], 3600000); // Last hour
    
    if (recentFeedback.length > 0) {
      const successRate = recentFeedback.filter(f => f.performance.success).length / recentFeedback.length;
      const avgDuration = recentFeedback.reduce((sum, f) => sum + f.performance.duration, 0) / recentFeedback.length;
      const avgSatisfaction = recentFeedback
        .filter(f => f.userSatisfaction !== undefined)
        .reduce((sum, f) => sum + (f.userSatisfaction || 0), 0) / recentFeedback.length;

      this.systemHealthMetrics = {
        overallHealth: (successRate + Math.min(1, 2000 / avgDuration) + (avgSatisfaction || 1)) / 3,
        performanceScore: Math.min(1, 2000 / avgDuration), // 2 seconds is optimal
        reliabilityScore: successRate,
        userSatisfactionScore: avgSatisfaction || 1,
        lastUpdated: Date.now()
      };
    }
  }

  // Action methods (simplified implementations)
  private sendAlert(patternId: string, pattern: FeedbackPattern, feedback: FeedbackData): void {
    console.log(`🚨 ALERT: ${pattern.name} - Tool: ${feedback.toolName}`);
  }

  private triggerOptimization(toolName: string, pattern: FeedbackPattern): void {
    console.log(`⚡ OPTIMIZE: Triggering optimization for ${toolName}`);
  }

  private requestDegradation(toolName: string, pattern: FeedbackPattern): void {
    console.log(`⬇️ DEGRADE: Requesting degradation for ${toolName}`);
  }

  private requestScaling(toolName: string, pattern: FeedbackPattern): void {
    console.log(`📈 SCALE: Requesting scaling for ${toolName}`);
  }

  private flagForInvestigation(patternId: string, feedback: FeedbackData): void {
    console.log(`🔍 INVESTIGATE: Flagging ${feedback.toolName} for investigation`);
  }

  private optimizeToolFactory(results: any): void {
    // Implementation would optimize tool factory based on results
    console.log('🔧 Optimizing tool factory based on feedback');
  }

  private optimizeWorkflows(results: any): void {
    // Implementation would optimize workflows based on results
    console.log('🔄 Optimizing workflows based on feedback');
  }

  private requestServiceDegradation(results: any): void {
    // Implementation would request service degradation
    console.log('⚠️ Requesting service degradation based on feedback');
  }

  private updateCircuitBreakers(results: any): void {
    // Implementation would update circuit breaker thresholds
    console.log('🔌 Updating circuit breakers based on feedback');
  }

  private adaptivelyTuneLoop(loopId: string, results: any): void {
    // Implementation would adaptively tune the feedback loop
    console.log(`🎛️ Adaptively tuning loop ${loopId}`);
  }

  // Public interface methods
  public getSystemHealth(): any {
    return this.systemHealthMetrics;
  }

  public getImprovementSuggestions(filter?: { type?: string; priority?: string }): ImprovementSuggestion[] {
    let suggestions = this.improvementSuggestions;
    
    if (filter?.type) {
      suggestions = suggestions.filter(s => s.type === filter.type);
    }
    
    if (filter?.priority) {
      suggestions = suggestions.filter(s => s.priority === filter.priority);
    }
    
    return suggestions.sort((a, b) => b.estimatedImpact - a.estimatedImpact);
  }

  public getFeedbackAnalytics(): any {
    const total = this.feedbackBuffer.length;
    const successful = this.feedbackBuffer.filter(f => f.performance.success).length;
    const avgDuration = this.feedbackBuffer.reduce((sum, f) => sum + f.performance.duration, 0) / total;
    
    return {
      totalFeedbackItems: total,
      successRate: total > 0 ? successful / total : 0,
      averageDuration: avgDuration,
      patternsDetected: this.patterns.size,
      activeFeedbackLoops: Array.from(this.feedbackLoops.values()).filter(loop => loop.enabled).length,
      systemHealth: this.systemHealthMetrics,
      improvementSuggestions: this.improvementSuggestions.length
    };
  }

  public configureFeedbackLoop(config: FeedbackLoopConfig): void {
    this.feedbackLoops.set(config.id, config);
  }

  public enableFeedbackLoop(loopId: string): void {
    const loop = this.feedbackLoops.get(loopId);
    if (loop) {
      loop.enabled = true;
    }
  }

  public disableFeedbackLoop(loopId: string): void {
    const loop = this.feedbackLoops.get(loopId);
    if (loop) {
      loop.enabled = false;
    }
  }

  public getAIInsights(): Map<string, any> {
    return new Map(this.aiInsights);
  }

  public clearOldFeedback(olderThan: number = 86400000): number { // Default: 24 hours
    const cutoff = Date.now() - olderThan;
    const initialLength = this.feedbackBuffer.length;
    
    this.feedbackBuffer = this.feedbackBuffer.filter(f => f.timestamp >= cutoff);
    
    // Also clean up tool performance history
    this.toolPerformanceHistory.forEach((history, toolName) => {
      const cleanedHistory = history.filter(f => f.timestamp >= cutoff);
      this.toolPerformanceHistory.set(toolName, cleanedHistory);
    });
    
    return initialLength - this.feedbackBuffer.length;
  }
}