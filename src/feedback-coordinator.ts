/**
 * Feedback Loop Coordinator - Central system for managing improvement feedback
 * between multiple specialized agents analyzing the Discord MCP tool ecosystem
 */

import { EventEmitter } from 'events';
import { z } from 'zod';

// Core feedback data schemas
export const FindingSchema = z.object({
  id: z.string(),
  type: z.enum(['issue', 'opportunity', 'enhancement']),
  description: z.string(),
  impact: z.enum(['low', 'medium', 'high']),
  affectedTools: z.array(z.string()),
  evidence: z.array(z.record(z.string(), z.any())),
  timestamp: z.date(),
  confidence: z.number().min(0).max(1)
});

export const RecommendationSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  implementation: z.object({
    steps: z.array(z.string()),
    estimatedEffort: z.enum(['low', 'medium', 'high']),
    requiredResources: z.array(z.string()),
    timeline: z.string()
  }),
  expectedBenefits: z.array(z.string()),
  risks: z.array(z.string()),
  dependencies: z.array(z.string()),
  priority: z.enum(['low', 'medium', 'high', 'critical']),
  timestamp: z.date()
});

export const AgentFeedbackSchema = z.object({
  agentId: z.string(),
  agentType: z.enum(['performance', 'usability', 'reliability', 'security', 'feature']),
  timestamp: z.date(),
  category: z.enum(['performance', 'usability', 'reliability', 'security', 'feature']),
  priority: z.enum(['low', 'medium', 'high', 'critical']),
  findings: z.array(FindingSchema),
  recommendations: z.array(RecommendationSchema),
  metrics: z.array(z.record(z.string(), z.any()))
});

export const ImprovementPlanSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  recommendations: z.array(z.string()), // recommendation IDs
  priority: z.enum(['low', 'medium', 'high', 'critical']),
  status: z.enum(['planned', 'in_progress', 'completed', 'cancelled']),
  estimatedImpact: z.object({
    performance: z.number().min(0).max(1),
    usability: z.number().min(0).max(1),
    reliability: z.number().min(0).max(1),
    security: z.number().min(0).max(1)
  }),
  implementation: z.object({
    startDate: z.date().optional(),
    endDate: z.date().optional(),
    assignedAgents: z.array(z.string()),
    milestones: z.array(z.object({
      name: z.string(),
      date: z.date(),
      completed: z.boolean().default(false)
    }))
  })
});

export type Finding = z.infer<typeof FindingSchema>;
export type Recommendation = z.infer<typeof RecommendationSchema>;
export type AgentFeedback = z.infer<typeof AgentFeedbackSchema>;
export type ImprovementPlan = z.infer<typeof ImprovementPlanSchema>;

/**
 * Central coordinator for all feedback loops and improvement processes
 */
export class FeedbackCoordinator extends EventEmitter {
  private feedback: Map<string, AgentFeedback> = new Map();
  private recommendations: Map<string, Recommendation> = new Map();
  private improvementPlans: Map<string, ImprovementPlan> = new Map();
  private agentConnections: Map<string, AgentConnection> = new Map();
  
  constructor() {
    super();
    this.setupEventHandlers();
  }

  /**
   * Register a new agent for feedback coordination
   */
  registerAgent(agentId: string, agentType: AgentFeedback['agentType'], connection: AgentConnection): void {
    this.agentConnections.set(agentId, connection);
    
    // Set up feedback collection from this agent
    connection.on('feedback', (feedback: AgentFeedback) => {
      this.processFeedback(feedback);
    });
    
    connection.on('disconnect', () => {
      this.handleAgentDisconnection(agentId);
    });

    this.emit('agent_registered', { agentId, agentType });
    console.log(`Agent ${agentId} (${agentType}) registered successfully`);
  }

  /**
   * Process incoming feedback from agents
   */
  private processFeedback(feedback: AgentFeedback): void {
    try {
      // Validate feedback structure
      const validatedFeedback = AgentFeedbackSchema.parse(feedback);
      
      // Store feedback
      this.feedback.set(`${validatedFeedback.agentId}_${validatedFeedback.timestamp.getTime()}`, validatedFeedback);
      
      // Process recommendations
      validatedFeedback.recommendations.forEach(rec => {
        this.recommendations.set(rec.id, rec);
      });
      
      // Trigger analysis and coordination
      this.coordinateFeedback(validatedFeedback);
      
      this.emit('feedback_received', validatedFeedback);
      
    } catch (error) {
      console.error('Invalid feedback received:', error);
      this.emit('feedback_error', { error, feedback });
    }
  }

  /**
   * Coordinate feedback across multiple agents
   */
  private coordinateFeedback(newFeedback: AgentFeedback): void {
    // Find related feedback from other agents
    const relatedFeedback = this.findRelatedFeedback(newFeedback);
    
    // Identify synergies and conflicts
    const analysis = this.analyzeRecommendationInteractions(newFeedback, relatedFeedback);
    
    // Generate or update improvement plans
    this.updateImprovementPlans(analysis);
    
    // Notify relevant agents of coordination results
    this.broadcastCoordinationResults(analysis);
  }

  /**
   * Find feedback related to current submission
   */
  private findRelatedFeedback(targetFeedback: AgentFeedback): AgentFeedback[] {
    const related: AgentFeedback[] = [];
    
    for (const [, feedback] of this.feedback) {
      // Skip same agent
      if (feedback.agentId === targetFeedback.agentId) continue;
      
      // Check for tool overlap
      const targetTools = new Set(targetFeedback.findings.flatMap(f => f.affectedTools));
      const feedbackTools = new Set(feedback.findings.flatMap(f => f.affectedTools));
      const toolOverlap = [...targetTools].some(tool => feedbackTools.has(tool));
      
      // Check for category relevance
      const categoryRelevance = this.calculateCategoryRelevance(targetFeedback.category, feedback.category);
      
      // Check temporal relevance (within last 24 hours)
      const timeDiff = Math.abs(targetFeedback.timestamp.getTime() - feedback.timestamp.getTime());
      const temporalRelevance = timeDiff < 24 * 60 * 60 * 1000;
      
      if (toolOverlap || categoryRelevance > 0.5 || temporalRelevance) {
        related.push(feedback);
      }
    }
    
    return related;
  }

  /**
   * Analyze interactions between recommendations
   */
  private analyzeRecommendationInteractions(targetFeedback: AgentFeedback, relatedFeedback: AgentFeedback[]): CoordinationAnalysis {
    const allRecommendations = [
      ...targetFeedback.recommendations,
      ...relatedFeedback.flatMap(f => f.recommendations)
    ];
    
    const synergies: RecommendationSynergy[] = [];
    const conflicts: RecommendationConflict[] = [];
    
    // Analyze pairwise recommendation interactions
    for (let i = 0; i < allRecommendations.length; i++) {
      for (let j = i + 1; j < allRecommendations.length; j++) {
        const rec1 = allRecommendations[i];
        const rec2 = allRecommendations[j];
        
        const interaction = this.analyzeRecommendationPair(rec1, rec2);
        
        if (interaction.type === 'synergy') {
          synergies.push(interaction as RecommendationSynergy);
        } else if (interaction.type === 'conflict') {
          conflicts.push(interaction as RecommendationConflict);
        }
      }
    }
    
    return {
      targetFeedback,
      relatedFeedback,
      synergies,
      conflicts,
      overallScore: this.calculateOverallCoordinationScore(synergies, conflicts)
    };
  }

  /**
   * Analyze interaction between two specific recommendations
   */
  private analyzeRecommendationPair(rec1: Recommendation, rec2: Recommendation): RecommendationInteraction {
    // Check for tool overlap
    const tools1 = new Set(rec1.dependencies);
    const tools2 = new Set(rec2.dependencies);
    const toolOverlap = [...tools1].filter(tool => tools2.has(tool)).length;
    
    // Check for benefit synergy
    const benefits1 = new Set(rec1.expectedBenefits);
    const benefits2 = new Set(rec2.expectedBenefits);
    const benefitSynergy = [...benefits1].filter(benefit => benefits2.has(benefit)).length;
    
    // Check for risk conflicts
    const risks1 = new Set(rec1.risks);
    const risks2 = new Set(rec2.risks);
    const riskConflict = [...risks1].filter(risk => risks2.has(risk)).length;
    
    // Determine interaction type and strength
    if (benefitSynergy > 0 || toolOverlap > 0) {
      return {
        type: 'synergy',
        recommendation1: rec1.id,
        recommendation2: rec2.id,
        strength: (benefitSynergy + toolOverlap) / Math.max(rec1.dependencies.length, rec2.dependencies.length),
        description: `Recommendations complement each other through shared tools (${toolOverlap}) and benefits (${benefitSynergy})`
      };
    } else if (riskConflict > 0) {
      return {
        type: 'conflict',
        recommendation1: rec1.id,
        recommendation2: rec2.id,
        severity: riskConflict / Math.max(rec1.risks.length, rec2.risks.length),
        description: `Recommendations have conflicting risks: ${[...risks1].filter(risk => risks2.has(risk)).join(', ')}`
      };
    }
    
    return {
      type: 'neutral',
      recommendation1: rec1.id,
      recommendation2: rec2.id,
      description: 'No significant interaction detected'
    };
  }

  /**
   * Update improvement plans based on coordination analysis
   */
  private updateImprovementPlans(analysis: CoordinationAnalysis): void {
    // Create or update plans for high-synergy recommendation groups
    for (const synergy of analysis.synergies) {
      if (synergy.strength > 0.7) {
        this.createSynergyBasedPlan(synergy, analysis);
      }
    }
    
    // Handle conflicts by creating alternative plans
    for (const conflict of analysis.conflicts) {
      if (conflict.severity > 0.5) {
        this.resolveRecommendationConflict(conflict, analysis);
      }
    }
    
    // Update existing plans with new recommendations
    this.integrateNewRecommendations(analysis.targetFeedback.recommendations);
  }

  /**
   * Create improvement plan based on synergistic recommendations
   */
  private createSynergyBasedPlan(synergy: RecommendationSynergy, analysis: CoordinationAnalysis): void {
    const rec1 = this.recommendations.get(synergy.recommendation1);
    const rec2 = this.recommendations.get(synergy.recommendation2);
    
    if (!rec1 || !rec2) return;
    
    const planId = `synergy_${synergy.recommendation1}_${synergy.recommendation2}`;
    
    const plan: ImprovementPlan = {
      id: planId,
      title: `Synergistic Improvement: ${rec1.title} + ${rec2.title}`,
      description: `Combined implementation plan leveraging synergies between ${rec1.title} and ${rec2.title}. ${synergy.description}`,
      recommendations: [rec1.id, rec2.id],
      priority: this.calculateCombinedPriority([rec1.priority, rec2.priority]),
      status: 'planned',
      estimatedImpact: {
        performance: Math.min(1, synergy.strength * 0.8),
        usability: Math.min(1, synergy.strength * 0.7),
        reliability: Math.min(1, synergy.strength * 0.6),
        security: Math.min(1, synergy.strength * 0.5)
      },
      implementation: {
        assignedAgents: [...new Set([
          ...analysis.targetFeedback.agentId ? [analysis.targetFeedback.agentId] : [],
          ...analysis.relatedFeedback.map(f => f.agentId)
        ])],
        milestones: this.generateSynergyMilestones(rec1, rec2)
      }
    };
    
    this.improvementPlans.set(planId, plan);
    this.emit('improvement_plan_created', plan);
  }

  /**
   * Resolve conflicts between recommendations
   */
  private resolveRecommendationConflict(conflict: RecommendationConflict, analysis: CoordinationAnalysis): void {
    const rec1 = this.recommendations.get(conflict.recommendation1);
    const rec2 = this.recommendations.get(conflict.recommendation2);
    
    if (!rec1 || !rec2) return;
    
    // Create alternative implementation strategies
    const resolutionStrategies = this.generateConflictResolutionStrategies(rec1, rec2, conflict);
    
    // Notify involved agents about conflict and potential resolutions
    const involvedAgents = new Set([
      analysis.targetFeedback.agentId,
      ...analysis.relatedFeedback.map(f => f.agentId)
    ]);
    
    for (const agentId of involvedAgents) {
      const connection = this.agentConnections.get(agentId);
      if (connection) {
        connection.emit('conflict_detected', {
          conflict,
          resolutionStrategies,
          involvedRecommendations: [rec1, rec2]
        });
      }
    }
    
    this.emit('conflict_resolved', { conflict, resolutionStrategies });
  }

  /**
   * Generate conflict resolution strategies
   */
  private generateConflictResolutionStrategies(
    rec1: Recommendation, 
    rec2: Recommendation, 
    conflict: RecommendationConflict
  ): ConflictResolutionStrategy[] {
    const strategies: ConflictResolutionStrategy[] = [];
    
    // Sequential implementation strategy
    strategies.push({
      type: 'sequential',
      description: `Implement ${rec1.title} first, then ${rec2.title} with risk mitigation`,
      implementation: {
        phase1: rec1.id,
        phase2: rec2.id,
        riskMitigation: conflict.description
      }
    });
    
    // Alternative approach strategy
    strategies.push({
      type: 'alternative',
      description: `Choose the higher-priority recommendation based on current system needs`,
      implementation: {
        primaryChoice: rec1.priority >= rec2.priority ? rec1.id : rec2.id,
        fallbackChoice: rec1.priority >= rec2.priority ? rec2.id : rec1.id,
        decisionCriteria: 'Priority-based selection with fallback option'
      }
    });
    
    // Hybrid strategy
    strategies.push({
      type: 'hybrid',
      description: `Combine aspects of both recommendations while avoiding conflicts`,
      implementation: {
        combinedApproach: `Merge non-conflicting elements from both ${rec1.title} and ${rec2.title}`,
        conflictAvoidance: conflict.description
      }
    });
    
    return strategies;
  }

  /**
   * Broadcast coordination results to relevant agents
   */
  private broadcastCoordinationResults(analysis: CoordinationAnalysis): void {
    const involvedAgents = new Set([
      analysis.targetFeedback.agentId,
      ...analysis.relatedFeedback.map(f => f.agentId)
    ]);
    
    const coordinationReport = {
      timestamp: new Date(),
      analysisId: `analysis_${Date.now()}`,
      synergies: analysis.synergies,
      conflicts: analysis.conflicts,
      overallScore: analysis.overallScore,
      actionableInsights: this.generateActionableInsights(analysis)
    };
    
    for (const agentId of involvedAgents) {
      const connection = this.agentConnections.get(agentId);
      if (connection) {
        connection.emit('coordination_update', coordinationReport);
      }
    }
    
    this.emit('coordination_broadcast', coordinationReport);
  }

  /**
   * Generate actionable insights from coordination analysis
   */
  private generateActionableInsights(analysis: CoordinationAnalysis): ActionableInsight[] {
    const insights: ActionableInsight[] = [];
    
    // High-synergy opportunities
    const highSynergyPairs = analysis.synergies.filter(s => s.strength > 0.7);
    if (highSynergyPairs.length > 0) {
      insights.push({
        type: 'opportunity',
        priority: 'high',
        description: `${highSynergyPairs.length} high-synergy recommendation pairs identified for combined implementation`,
        recommendedActions: [
          'Create combined improvement plans for synergistic recommendations',
          'Allocate resources for coordinated implementation',
          'Monitor synergy realization during implementation'
        ]
      });
    }
    
    // Critical conflicts
    const criticalConflicts = analysis.conflicts.filter(c => c.severity > 0.8);
    if (criticalConflicts.length > 0) {
      insights.push({
        type: 'risk',
        priority: 'critical',
        description: `${criticalConflicts.length} critical conflicts require immediate resolution`,
        recommendedActions: [
          'Prioritize conflict resolution before implementation',
          'Engage domain experts for conflict arbitration',
          'Consider alternative implementation approaches'
        ]
      });
    }
    
    // Overall coordination health
    if (analysis.overallScore < 0.5) {
      insights.push({
        type: 'system',
        priority: 'medium',
        description: 'Low coordination score indicates need for better agent alignment',
        recommendedActions: [
          'Review agent communication protocols',
          'Enhance cross-agent collaboration mechanisms',
          'Implement better conflict prevention strategies'
        ]
      });
    }
    
    return insights;
  }

  // Utility methods
  private calculateCategoryRelevance(cat1: string, cat2: string): number {
    if (cat1 === cat2) return 1.0;
    
    const relevanceMatrix: Record<string, Record<string, number>> = {
      performance: { usability: 0.7, reliability: 0.8, security: 0.3, feature: 0.5 },
      usability: { performance: 0.7, reliability: 0.6, security: 0.4, feature: 0.8 },
      reliability: { performance: 0.8, usability: 0.6, security: 0.7, feature: 0.5 },
      security: { performance: 0.3, usability: 0.4, reliability: 0.7, feature: 0.6 },
      feature: { performance: 0.5, usability: 0.8, reliability: 0.5, security: 0.6 }
    };
    
    return relevanceMatrix[cat1]?.[cat2] || 0.0;
  }

  private calculateOverallCoordinationScore(synergies: RecommendationSynergy[], conflicts: RecommendationConflict[]): number {
    const synergyScore = synergies.reduce((sum, s) => sum + s.strength, 0) / Math.max(synergies.length, 1);
    const conflictPenalty = conflicts.reduce((sum, c) => sum + c.severity, 0) / Math.max(conflicts.length, 1);
    
    return Math.max(0, Math.min(1, synergyScore - (conflictPenalty * 0.5)));
  }

  private calculateCombinedPriority(priorities: string[]): 'low' | 'medium' | 'high' | 'critical' {
    const priorityValues = { low: 1, medium: 2, high: 3, critical: 4 };
    const maxValue = Math.max(...priorities.map(p => priorityValues[p as keyof typeof priorityValues]));
    
    const reverseMap = { 1: 'low', 2: 'medium', 3: 'high', 4: 'critical' } as const;
    return reverseMap[maxValue as keyof typeof reverseMap];
  }

  private generateSynergyMilestones(rec1: Recommendation, rec2: Recommendation): Array<{name: string, date: Date, completed: boolean}> {
    const now = new Date();
    return [
      { name: `Begin implementation of ${rec1.title}`, date: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000), completed: false },
      { name: `Integrate ${rec2.title} components`, date: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000), completed: false },
      { name: 'Testing and validation', date: new Date(now.getTime() + 21 * 24 * 60 * 60 * 1000), completed: false },
      { name: 'Deployment and monitoring', date: new Date(now.getTime() + 28 * 24 * 60 * 60 * 1000), completed: false }
    ];
  }

  private integrateNewRecommendations(recommendations: Recommendation[]): void {
    // Logic to integrate new recommendations into existing plans
    for (const rec of recommendations) {
      // Find compatible existing plans
      const compatiblePlans = Array.from(this.improvementPlans.values())
        .filter(plan => this.isRecommendationCompatibleWithPlan(rec, plan));
      
      if (compatiblePlans.length > 0) {
        // Add to most suitable existing plan
        const bestPlan = compatiblePlans.sort((a, b) => 
          this.calculatePlanCompatibility(rec, b) - this.calculatePlanCompatibility(rec, a)
        )[0];
        
        bestPlan.recommendations.push(rec.id);
        this.emit('plan_updated', bestPlan);
      } else if (rec.priority === 'high' || rec.priority === 'critical') {
        // Create new plan for high-priority recommendations
        this.createStandalonePlan(rec);
      }
    }
  }

  private isRecommendationCompatibleWithPlan(rec: Recommendation, plan: ImprovementPlan): boolean {
    // Check if recommendation conflicts with existing plan recommendations
    const planRecommendations = plan.recommendations
      .map(id => this.recommendations.get(id))
      .filter(r => r !== undefined) as Recommendation[];
    
    return planRecommendations.every(planRec => 
      this.analyzeRecommendationPair(rec, planRec).type !== 'conflict'
    );
  }

  private calculatePlanCompatibility(rec: Recommendation, plan: ImprovementPlan): number {
    const planRecommendations = plan.recommendations
      .map(id => this.recommendations.get(id))
      .filter(r => r !== undefined) as Recommendation[];
    
    let totalCompatibility = 0;
    for (const planRec of planRecommendations) {
      const interaction = this.analyzeRecommendationPair(rec, planRec);
      if (interaction.type === 'synergy') {
        totalCompatibility += (interaction as RecommendationSynergy).strength;
      }
    }
    
    return totalCompatibility / Math.max(planRecommendations.length, 1);
  }

  private createStandalonePlan(rec: Recommendation): void {
    const plan: ImprovementPlan = {
      id: `standalone_${rec.id}`,
      title: `Standalone Implementation: ${rec.title}`,
      description: rec.description,
      recommendations: [rec.id],
      priority: rec.priority,
      status: 'planned',
      estimatedImpact: {
        performance: 0.5,
        usability: 0.5,
        reliability: 0.5,
        security: 0.5
      },
      implementation: {
        assignedAgents: [],
        milestones: [
          { name: 'Implementation start', date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), completed: false },
          { name: 'Implementation complete', date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), completed: false }
        ]
      }
    };
    
    this.improvementPlans.set(plan.id, plan);
    this.emit('standalone_plan_created', plan);
  }

  private setupEventHandlers(): void {
    this.on('feedback_received', (feedback) => {
      console.log(`Processed feedback from agent ${feedback.agentId}: ${feedback.findings.length} findings, ${feedback.recommendations.length} recommendations`);
    });
    
    this.on('improvement_plan_created', (plan) => {
      console.log(`Created improvement plan: ${plan.title} (Priority: ${plan.priority})`);
    });
    
    this.on('conflict_resolved', ({ conflict, resolutionStrategies }) => {
      console.log(`Resolved conflict between recommendations ${conflict.recommendation1} and ${conflict.recommendation2}. ${resolutionStrategies.length} resolution strategies generated.`);
    });
  }

  private handleAgentDisconnection(agentId: string): void {
    this.agentConnections.delete(agentId);
    this.emit('agent_disconnected', agentId);
    console.log(`Agent ${agentId} disconnected`);
  }

  // Public API methods for external interaction
  public getCoordinationStatus(): CoordinationStatus {
    return {
      activeAgents: this.agentConnections.size,
      totalFeedback: this.feedback.size,
      totalRecommendations: this.recommendations.size,
      activePlans: Array.from(this.improvementPlans.values()).filter(p => p.status !== 'completed' && p.status !== 'cancelled').length,
      overallHealth: this.calculateSystemHealth()
    };
  }

  public getFeedbackSummary(): FeedbackSummary {
    const allFeedback = Array.from(this.feedback.values());
    return {
      byAgent: this.groupFeedbackByAgent(allFeedback),
      byCategory: this.groupFeedbackByCategory(allFeedback),
      recentTrends: this.calculateFeedbackTrends(allFeedback),
      topIssues: this.identifyTopIssues(allFeedback)
    };
  }

  private calculateSystemHealth(): number {
    const recentFeedback = Array.from(this.feedback.values())
      .filter(f => f.timestamp.getTime() > Date.now() - 24 * 60 * 60 * 1000);
    
    if (recentFeedback.length === 0) return 0.5; // Neutral when no recent feedback
    
    const avgIssues = recentFeedback.reduce((sum, f) => 
      sum + f.findings.filter(finding => finding.type === 'issue').length, 0
    ) / recentFeedback.length;
    
    const avgOpportunities = recentFeedback.reduce((sum, f) => 
      sum + f.findings.filter(finding => finding.type === 'opportunity').length, 0
    ) / recentFeedback.length;
    
    // Health improves with more opportunities and fewer issues
    return Math.max(0, Math.min(1, 0.5 + (avgOpportunities - avgIssues) * 0.1));
  }

  private groupFeedbackByAgent(feedback: AgentFeedback[]): Record<string, number> {
    return feedback.reduce((acc, f) => {
      acc[f.agentId] = (acc[f.agentId] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }

  private groupFeedbackByCategory(feedback: AgentFeedback[]): Record<string, number> {
    return feedback.reduce((acc, f) => {
      acc[f.category] = (acc[f.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }

  private calculateFeedbackTrends(feedback: AgentFeedback[]): FeedbackTrend[] {
    // Group by day and calculate trends
    const dailyData = new Map<string, number>();
    
    feedback.forEach(f => {
      const day = f.timestamp.toISOString().split('T')[0];
      dailyData.set(day, (dailyData.get(day) || 0) + 1);
    });
    
    const sortedDays = Array.from(dailyData.entries()).sort(([a], [b]) => a.localeCompare(b));
    
    return sortedDays.map(([date, count], index) => ({
      date,
      count,
      trend: index > 0 ? count - sortedDays[index - 1][1] : 0
    }));
  }

  private identifyTopIssues(feedback: AgentFeedback[]): TopIssue[] {
    const issueFrequency = new Map<string, { count: number, impact: string, tools: Set<string> }>();
    
    feedback.forEach(f => {
      f.findings
        .filter(finding => finding.type === 'issue')
        .forEach(issue => {
          const key = issue.description;
          if (!issueFrequency.has(key)) {
            issueFrequency.set(key, { count: 0, impact: issue.impact, tools: new Set() });
          }
          
          const data = issueFrequency.get(key)!;
          data.count++;
          issue.affectedTools.forEach(tool => data.tools.add(tool));
        });
    });
    
    return Array.from(issueFrequency.entries())
      .map(([description, data]) => ({
        description,
        frequency: data.count,
        impact: data.impact,
        affectedTools: Array.from(data.tools)
      }))
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 10);
  }
}

// Supporting interfaces and types
export interface AgentConnection extends EventEmitter {
  send(data: any): void;
}

export interface RecommendationSynergy {
  type: 'synergy';
  recommendation1: string;
  recommendation2: string;
  strength: number;
  description: string;
}

export interface RecommendationConflict {
  type: 'conflict';
  recommendation1: string;
  recommendation2: string;
  severity: number;
  description: string;
}

export interface RecommendationInteraction {
  type: 'synergy' | 'conflict' | 'neutral';
  recommendation1: string;
  recommendation2: string;
  description: string;
}

export interface CoordinationAnalysis {
  targetFeedback: AgentFeedback;
  relatedFeedback: AgentFeedback[];
  synergies: RecommendationSynergy[];
  conflicts: RecommendationConflict[];
  overallScore: number;
}

export interface ConflictResolutionStrategy {
  type: 'sequential' | 'alternative' | 'hybrid';
  description: string;
  implementation: Record<string, any>;
}

export interface ActionableInsight {
  type: 'opportunity' | 'risk' | 'system';
  priority: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  recommendedActions: string[];
}

export interface CoordinationStatus {
  activeAgents: number;
  totalFeedback: number;
  totalRecommendations: number;
  activePlans: number;
  overallHealth: number;
}

export interface FeedbackSummary {
  byAgent: Record<string, number>;
  byCategory: Record<string, number>;
  recentTrends: FeedbackTrend[];
  topIssues: TopIssue[];
}

export interface FeedbackTrend {
  date: string;
  count: number;
  trend: number;
}

export interface TopIssue {
  description: string;
  frequency: number;
  impact: string;
  affectedTools: string[];
}