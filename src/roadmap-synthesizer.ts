/**
 * Roadmap Synthesizer - Consolidates findings from all agents into unified improvement roadmaps
 * Provides intelligent prioritization, sequencing, and resource allocation for tool improvements
 */

import { z } from 'zod';
import type { 
  AgentFeedback, 
  Recommendation, 
  ImprovementPlan, 
  Finding,
  CoordinationAnalysis 
} from './feedback-coordinator.js';

// Schema definitions for roadmap components
export const RoadmapItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  type: z.enum(['bug_fix', 'enhancement', 'new_feature', 'optimization', 'security', 'maintenance']),
  priority: z.object({
    score: z.number().min(0).max(100),
    factors: z.record(z.string(), z.number()),
    reasoning: z.string()
  }),
  impact: z.object({
    performance: z.number().min(0).max(1),
    usability: z.number().min(0).max(1),
    reliability: z.number().min(0).max(1),
    security: z.number().min(0).max(1),
    overall: z.number().min(0).max(1)
  }),
  effort: z.object({
    estimatedHours: z.number(),
    complexity: z.enum(['low', 'medium', 'high', 'very_high']),
    requiredSkills: z.array(z.string()),
    dependencies: z.array(z.string())
  }),
  timeline: z.object({
    phase: z.enum(['immediate', 'short_term', 'medium_term', 'long_term']),
    startDate: z.date().optional(),
    endDate: z.date().optional(),
    milestones: z.array(z.object({
      name: z.string(),
      date: z.date(),
      description: z.string()
    }))
  }),
  sourceRecommendations: z.array(z.string()),
  affectedTools: z.array(z.string()),
  successMetrics: z.array(z.object({
    name: z.string(),
    target: z.number(),
    unit: z.string(),
    measurement: z.string()
  }))
});

export const UnifiedRoadmapSchema = z.object({
  id: z.string(),
  version: z.string(),
  generatedAt: z.date(),
  summary: z.object({
    totalItems: z.number(),
    byPhase: z.record(z.string(), z.number()),
    byType: z.record(z.string(), z.number()),
    estimatedDuration: z.string(),
    totalEffort: z.number()
  }),
  phases: z.array(z.object({
    name: z.string(),
    description: z.string(),
    duration: z.string(),
    items: z.array(z.string()), // roadmap item IDs
    dependencies: z.array(z.string()),
    resources: z.object({
      developers: z.number(),
      qa: z.number(),
      devops: z.number(),
      other: z.record(z.string(), z.number())
    })
  })),
  items: z.array(RoadmapItemSchema),
  riskAssessment: z.object({
    high: z.array(z.string()),
    medium: z.array(z.string()),
    low: z.array(z.string()),
    mitigationStrategies: z.array(z.object({
      risk: z.string(),
      strategy: z.string(),
      owner: z.string()
    }))
  }),
  resourceAllocation: z.object({
    totalEstimatedHours: z.number(),
    breakdown: z.record(z.string(), z.number()),
    criticalPath: z.array(z.string()),
    parallelizableWork: z.array(z.array(z.string()))
  })
});

export type RoadmapItem = z.infer<typeof RoadmapItemSchema>;
export type UnifiedRoadmap = z.infer<typeof UnifiedRoadmapSchema>;

/**
 * Synthesizes findings from multiple agents into comprehensive improvement roadmaps
 */
export class RoadmapSynthesizer {
  private recommendations: Map<string, Recommendation> = new Map();
  private findings: Map<string, Finding> = new Map();
  private agentFeedback: Map<string, AgentFeedback> = new Map();
  private coordinationAnalyses: CoordinationAnalysis[] = [];
  
  // Weighting factors for priority calculation
  private readonly priorityWeights = {
    agentConsensus: 0.25,      // How many agents agree on this
    impactScore: 0.30,         // Estimated impact of the change
    urgency: 0.20,             // Time sensitivity
    implementationCost: 0.15,   // Resource requirements (inverse)
    riskLevel: 0.10            // Implementation risks (inverse)
  };
  
  // Impact calculation weights
  private readonly impactWeights = {
    affectedToolCount: 0.25,
    userFacingChanges: 0.30,
    systemStability: 0.25,
    futureScalability: 0.20
  };

  /**
   * Add agent feedback for roadmap synthesis
   */
  addAgentFeedback(feedback: AgentFeedback): void {
    this.agentFeedback.set(`${feedback.agentId}_${feedback.timestamp.getTime()}`, feedback);
    
    // Index recommendations and findings
    feedback.recommendations.forEach(rec => {
      this.recommendations.set(rec.id, rec);
    });
    
    feedback.findings.forEach(finding => {
      this.findings.set(finding.id, finding);
    });
  }

  /**
   * Add coordination analysis results
   */
  addCoordinationAnalysis(analysis: CoordinationAnalysis): void {
    this.coordinationAnalyses.push(analysis);
  }

  /**
   * Generate unified roadmap from all collected data
   */
  generateUnifiedRoadmap(): UnifiedRoadmap {
    console.log('Starting unified roadmap generation...');
    
    // Step 1: Create roadmap items from recommendations
    const roadmapItems = this.createRoadmapItems();
    
    // Step 2: Calculate priorities and impacts
    const prioritizedItems = this.calculatePriorities(roadmapItems);
    
    // Step 3: Sequence items into phases
    const phases = this.sequenceIntoPhases(prioritizedItems);
    
    // Step 4: Perform resource allocation
    const resourceAllocation = this.calculateResourceAllocation(prioritizedItems);
    
    // Step 5: Assess risks
    const riskAssessment = this.assessRisks(prioritizedItems);
    
    // Step 6: Generate summary statistics
    const summary = this.generateSummary(prioritizedItems, phases);
    
    const roadmap: UnifiedRoadmap = {
      id: `roadmap_${Date.now()}`,
      version: '1.0',
      generatedAt: new Date(),
      summary,
      phases,
      items: prioritizedItems,
      riskAssessment,
      resourceAllocation
    };
    
    console.log(`Generated unified roadmap with ${roadmapItems.length} items across ${phases.length} phases`);
    return roadmap;
  }

  /**
   * Create roadmap items from collected recommendations
   */
  private createRoadmapItems(): RoadmapItem[] {
    const items: RoadmapItem[] = [];
    const processedRecommendations = new Set<string>();
    
    // Group synergistic recommendations together
    for (const analysis of this.coordinationAnalyses) {
      for (const synergy of analysis.synergies) {
        if (synergy.strength > 0.6) {
          const rec1 = this.recommendations.get(synergy.recommendation1);
          const rec2 = this.recommendations.get(synergy.recommendation2);
          
          if (rec1 && rec2 && !processedRecommendations.has(rec1.id) && !processedRecommendations.has(rec2.id)) {
            const combinedItem = this.createCombinedRoadmapItem(rec1, rec2, synergy);
            items.push(combinedItem);
            
            processedRecommendations.add(rec1.id);
            processedRecommendations.add(rec2.id);
          }
        }
      }
    }
    
    // Create items for remaining individual recommendations
    for (const [, rec] of this.recommendations) {
      if (!processedRecommendations.has(rec.id)) {
        const item = this.createRoadmapItemFromRecommendation(rec);
        items.push(item);
        processedRecommendations.add(rec.id);
      }
    }
    
    return items;
  }

  /**
   * Create combined roadmap item from synergistic recommendations
   */
  private createCombinedRoadmapItem(
    rec1: Recommendation,
    rec2: Recommendation,
    synergy: any
  ): RoadmapItem {
    const affectedTools = Array.from(new Set([
      ...rec1.dependencies,
      ...rec2.dependencies
    ]));
    
    return {
      id: `combined_${rec1.id}_${rec2.id}`,
      title: `Combined: ${rec1.title} + ${rec2.title}`,
      description: `Synergistic implementation combining: ${rec1.description} AND ${rec2.description}. Synergy: ${synergy.description}`,
      type: this.determineItemType([rec1, rec2]),
      priority: {
        score: 0, // Will be calculated later
        factors: {},
        reasoning: ''
      },
      impact: {
        performance: 0, // Will be calculated later
        usability: 0,
        reliability: 0,
        security: 0,
        overall: 0
      },
      effort: {
        estimatedHours: this.estimateEffort([rec1, rec2]) * 0.8, // Synergy reduces effort
        complexity: this.determineComplexity([rec1, rec2]),
        requiredSkills: Array.from(new Set([
          'discord-api', 'typescript', 'mcp-protocol',
          ...this.extractRequiredSkills([rec1, rec2])
        ])),
        dependencies: affectedTools
      },
      timeline: {
        phase: 'short_term', // Will be adjusted during sequencing
        milestones: this.generateMilestones(`Combined: ${rec1.title} + ${rec2.title}`)
      },
      sourceRecommendations: [rec1.id, rec2.id],
      affectedTools,
      successMetrics: this.generateSuccessMetrics([rec1, rec2])
    };
  }

  /**
   * Create roadmap item from individual recommendation
   */
  private createRoadmapItemFromRecommendation(rec: Recommendation): RoadmapItem {
    return {
      id: `item_${rec.id}`,
      title: rec.title,
      description: rec.description,
      type: this.determineItemType([rec]),
      priority: {
        score: 0, // Will be calculated later
        factors: {},
        reasoning: ''
      },
      impact: {
        performance: 0, // Will be calculated later
        usability: 0,
        reliability: 0,
        security: 0,
        overall: 0
      },
      effort: {
        estimatedHours: this.estimateEffort([rec]),
        complexity: this.determineComplexity([rec]),
        requiredSkills: Array.from(new Set([
          'discord-api', 'typescript', 'mcp-protocol',
          ...this.extractRequiredSkills([rec])
        ])),
        dependencies: rec.dependencies
      },
      timeline: {
        phase: 'short_term', // Will be adjusted during sequencing
        milestones: this.generateMilestones(rec.title)
      },
      sourceRecommendations: [rec.id],
      affectedTools: rec.dependencies,
      successMetrics: this.generateSuccessMetrics([rec])
    };
  }

  /**
   * Calculate priorities for all roadmap items
   */
  private calculatePriorities(items: RoadmapItem[]): RoadmapItem[] {
    return items.map(item => {
      const priorityFactors = this.calculatePriorityFactors(item);
      const impactScores = this.calculateImpactScores(item);
      
      // Calculate weighted priority score
      const priorityScore = Object.entries(priorityFactors).reduce((sum, [factor, value]) => {
        const weight = this.priorityWeights[factor as keyof typeof this.priorityWeights] || 0;
        return sum + (value * weight);
      }, 0);
      
      return {
        ...item,
        priority: {
          score: Math.round(priorityScore * 100),
          factors: priorityFactors,
          reasoning: this.generatePriorityReasoning(priorityFactors, priorityScore)
        },
        impact: impactScores
      };
    }).sort((a, b) => b.priority.score - a.priority.score);
  }

  /**
   * Calculate priority factors for an item
   */
  private calculatePriorityFactors(item: RoadmapItem): Record<string, number> {
    // Agent consensus: How many agents mentioned related issues/recommendations
    const agentConsensus = this.calculateAgentConsensus(item);
    
    // Impact score: Estimated business/technical impact
    const impactScore = this.calculateBusinessImpact(item);
    
    // Urgency: Time sensitivity based on issue severity and user impact
    const urgency = this.calculateUrgency(item);
    
    // Implementation cost: Resource requirements (inverse - lower cost = higher priority)
    const implementationCost = 1 - Math.min(1, item.effort.estimatedHours / 100);
    
    // Risk level: Implementation risks (inverse - lower risk = higher priority)
    const riskLevel = 1 - this.calculateRiskLevel(item);
    
    return {
      agentConsensus,
      impactScore,
      urgency,
      implementationCost,
      riskLevel
    };
  }

  /**
   * Calculate impact scores across different dimensions
   */
  private calculateImpactScores(item: RoadmapItem): RoadmapItem['impact'] {
    const performance = this.calculatePerformanceImpact(item);
    const usability = this.calculateUsabilityImpact(item);
    const reliability = this.calculateReliabilityImpact(item);
    const security = this.calculateSecurityImpact(item);
    
    const overall = (performance + usability + reliability + security) / 4;
    
    return {
      performance,
      usability,
      reliability,
      security,
      overall
    };
  }

  /**
   * Sequence items into implementation phases
   */
  private sequenceIntoPhases(items: RoadmapItem[]): UnifiedRoadmap['phases'] {
    const phases: UnifiedRoadmap['phases'] = [
      {
        name: 'Immediate Fixes',
        description: 'Critical issues and high-impact, low-effort improvements',
        duration: '1-2 weeks',
        items: [],
        dependencies: [],
        resources: { developers: 2, qa: 1, devops: 1, other: {} }
      },
      {
        name: 'Short-term Improvements',
        description: 'Medium-effort enhancements with significant user impact',
        duration: '1-2 months',
        items: [],
        dependencies: [],
        resources: { developers: 3, qa: 2, devops: 1, other: {} }
      },
      {
        name: 'Medium-term Features',
        description: 'New features and major improvements',
        duration: '2-4 months',
        items: [],
        dependencies: [],
        resources: { developers: 4, qa: 2, devops: 2, other: {} }
      },
      {
        name: 'Long-term Vision',
        description: 'Strategic improvements and architectural changes',
        duration: '4-6 months',
        items: [],
        dependencies: [],
        resources: { developers: 3, qa: 2, devops: 2, other: { architect: 1 } }
      }
    ];
    
    // Assign items to phases based on priority, effort, and dependencies
    items.forEach(item => {
      const phase = this.determinePhase(item, items);
      item.timeline.phase = phase;
      
      const phaseIndex = phase === 'immediate' ? 0 : 
                        phase === 'short_term' ? 1 :
                        phase === 'medium_term' ? 2 : 3;
      
      phases[phaseIndex].items.push(item.id);
    });
    
    // Calculate phase dependencies
    phases.forEach((phase, index) => {
      if (index > 0) {
        // This phase depends on previous phases completing
        phase.dependencies = phases.slice(0, index).map(p => p.name);
      }
    });
    
    return phases;
  }

  /**
   * Determine which phase an item belongs to
   */
  private determinePhase(item: RoadmapItem, allItems: RoadmapItem[]): RoadmapItem['timeline']['phase'] {
    const { priority, effort, type } = item;
    
    // Critical security issues go to immediate
    if (type === 'security' && priority.score > 80) {
      return 'immediate';
    }
    
    // High priority, low effort items go to immediate or short-term
    if (priority.score > 70 && effort.complexity === 'low') {
      return 'immediate';
    }
    
    if (priority.score > 60 && effort.complexity === 'medium') {
      return 'short_term';
    }
    
    // New features typically go to medium or long-term
    if (type === 'new_feature') {
      return effort.complexity === 'very_high' ? 'long_term' : 'medium_term';
    }
    
    // Check dependencies - items with many dependencies go later
    const dependencyCount = item.effort.dependencies.length;
    if (dependencyCount > 5) {
      return 'long_term';
    }
    
    if (dependencyCount > 2) {
      return 'medium_term';
    }
    
    // Default based on priority score
    if (priority.score > 75) return 'immediate';
    if (priority.score > 50) return 'short_term';
    if (priority.score > 25) return 'medium_term';
    return 'long_term';
  }

  /**
   * Calculate resource allocation across all roadmap items
   */
  private calculateResourceAllocation(items: RoadmapItem[]): UnifiedRoadmap['resourceAllocation'] {
    const totalEstimatedHours = items.reduce((sum, item) => sum + item.effort.estimatedHours, 0);
    
    const breakdown: Record<string, number> = {};
    items.forEach(item => {
      breakdown[item.type] = (breakdown[item.type] || 0) + item.effort.estimatedHours;
    });
    
    const criticalPath = this.calculateCriticalPath(items);
    const parallelizableWork = this.identifyParallelizableWork(items);
    
    return {
      totalEstimatedHours,
      breakdown,
      criticalPath,
      parallelizableWork
    };
  }

  /**
   * Assess implementation risks for all items
   */
  private assessRisks(items: RoadmapItem[]): UnifiedRoadmap['riskAssessment'] {
    const high: string[] = [];
    const medium: string[] = [];
    const low: string[] = [];
    
    items.forEach(item => {
      const riskLevel = this.calculateRiskLevel(item);
      if (riskLevel > 0.7) {
        high.push(item.id);
      } else if (riskLevel > 0.4) {
        medium.push(item.id);
      } else {
        low.push(item.id);
      }
    });
    
    const mitigationStrategies = this.generateRiskMitigationStrategies(items);
    
    return { high, medium, low, mitigationStrategies };
  }

  // Utility methods for calculations
  private calculateAgentConsensus(item: RoadmapItem): number {
    const relevantFeedback = Array.from(this.agentFeedback.values()).filter(feedback =>
      feedback.recommendations.some(rec => item.sourceRecommendations.includes(rec.id)) ||
      feedback.findings.some(finding => 
        finding.affectedTools.some(tool => item.affectedTools.includes(tool))
      )
    );
    
    return Math.min(1, relevantFeedback.length / Math.max(1, this.agentFeedback.size));
  }

  private calculateBusinessImpact(item: RoadmapItem): number {
    const toolCount = item.affectedTools.length;
    const typeImpact = this.getTypeImpactMultiplier(item.type);
    const complexityPenalty = item.effort.complexity === 'very_high' ? 0.8 : 1.0;
    
    return Math.min(1, (toolCount * 0.1 + typeImpact) * complexityPenalty);
  }

  private calculateUrgency(item: RoadmapItem): number {
    // Security items are most urgent
    if (item.type === 'security') return 0.9;
    
    // Bug fixes are generally urgent
    if (item.type === 'bug_fix') return 0.7;
    
    // Performance optimizations are moderately urgent
    if (item.type === 'optimization') return 0.6;
    
    // Enhancements and new features are less urgent
    if (item.type === 'enhancement') return 0.4;
    if (item.type === 'new_feature') return 0.3;
    
    // Maintenance is least urgent
    return 0.2;
  }

  private calculateRiskLevel(item: RoadmapItem): number {
    let riskScore = 0;
    
    // Complexity increases risk
    const complexityRisk = {
      low: 0.1,
      medium: 0.3,
      high: 0.6,
      very_high: 0.8
    }[item.effort.complexity];
    
    riskScore += complexityRisk;
    
    // Many dependencies increase risk
    const dependencyRisk = Math.min(0.4, item.effort.dependencies.length * 0.05);
    riskScore += dependencyRisk;
    
    // Large scope increases risk
    const scopeRisk = Math.min(0.3, item.affectedTools.length * 0.03);
    riskScore += scopeRisk;
    
    return Math.min(1, riskScore);
  }

  private calculatePerformanceImpact(item: RoadmapItem): number {
    if (item.type === 'optimization') return 0.8;
    if (item.type === 'bug_fix') return 0.6;
    if (item.type === 'enhancement') return 0.5;
    return 0.3;
  }

  private calculateUsabilityImpact(item: RoadmapItem): number {
    if (item.type === 'enhancement') return 0.8;
    if (item.type === 'new_feature') return 0.7;
    if (item.type === 'bug_fix') return 0.6;
    return 0.3;
  }

  private calculateReliabilityImpact(item: RoadmapItem): number {
    if (item.type === 'bug_fix') return 0.9;
    if (item.type === 'maintenance') return 0.7;
    if (item.type === 'optimization') return 0.5;
    return 0.4;
  }

  private calculateSecurityImpact(item: RoadmapItem): number {
    if (item.type === 'security') return 0.9;
    if (item.type === 'bug_fix') return 0.4;
    if (item.type === 'maintenance') return 0.3;
    return 0.2;
  }

  private getTypeImpactMultiplier(type: string): number {
    const multipliers = {
      security: 0.9,
      bug_fix: 0.7,
      optimization: 0.6,
      enhancement: 0.5,
      new_feature: 0.4,
      maintenance: 0.3
    };
    return multipliers[type as keyof typeof multipliers] || 0.3;
  }

  private determineItemType(recommendations: Recommendation[]): RoadmapItem['type'] {
    // Analyze recommendation descriptions and titles to determine type
    const combinedText = recommendations.map(r => `${r.title} ${r.description}`).join(' ').toLowerCase();
    
    if (combinedText.includes('security') || combinedText.includes('vulnerability')) return 'security';
    if (combinedText.includes('fix') || combinedText.includes('bug') || combinedText.includes('error')) return 'bug_fix';
    if (combinedText.includes('performance') || combinedText.includes('optimize') || combinedText.includes('speed')) return 'optimization';
    if (combinedText.includes('new') || combinedText.includes('add') || combinedText.includes('implement')) return 'new_feature';
    if (combinedText.includes('improve') || combinedText.includes('enhance') || combinedText.includes('better')) return 'enhancement';
    
    return 'maintenance';
  }

  private estimateEffort(recommendations: Recommendation[]): number {
    // Base effort estimation based on implementation steps
    let totalHours = 0;
    
    recommendations.forEach(rec => {
      const stepCount = rec.implementation.steps.length;
      const baseHours = stepCount * 4; // 4 hours per implementation step
      
      // Adjust based on estimated effort level
      const effortMultiplier = {
        low: 0.5,
        medium: 1.0,
        high: 2.0
      }[rec.implementation.estimatedEffort] || 1.0;
      
      totalHours += baseHours * effortMultiplier;
    });
    
    return Math.max(4, totalHours); // Minimum 4 hours for any task
  }

  private determineComplexity(recommendations: Recommendation[]): RoadmapItem['effort']['complexity'] {
    const maxComplexity = recommendations.reduce((max, rec) => {
      const complexity = rec.implementation.estimatedEffort;
      const complexityLevel = complexity === 'low' ? 1 : complexity === 'medium' ? 2 : 3;
      return Math.max(max, complexityLevel);
    }, 1);
    
    if (maxComplexity >= 3) return 'very_high';
    if (maxComplexity >= 2) return 'high';
    if (maxComplexity >= 1.5) return 'medium';
    return 'low';
  }

  private extractRequiredSkills(recommendations: Recommendation[]): string[] {
    const skills = new Set<string>();
    
    recommendations.forEach(rec => {
      rec.implementation.requiredResources.forEach(resource => {
        skills.add(resource.toLowerCase());
      });
    });
    
    return Array.from(skills);
  }

  private generateMilestones(title: string): RoadmapItem['timeline']['milestones'] {
    const now = new Date();
    return [
      {
        name: 'Design and Planning',
        date: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000),
        description: `Complete detailed design for ${title}`
      },
      {
        name: 'Implementation',
        date: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000),
        description: `Implement core functionality for ${title}`
      },
      {
        name: 'Testing and QA',
        date: new Date(now.getTime() + 21 * 24 * 60 * 60 * 1000),
        description: `Complete testing and quality assurance for ${title}`
      },
      {
        name: 'Deployment',
        date: new Date(now.getTime() + 28 * 24 * 60 * 60 * 1000),
        description: `Deploy ${title} to production`
      }
    ];
  }

  private generateSuccessMetrics(recommendations: Recommendation[]): RoadmapItem['successMetrics'] {
    const metrics: RoadmapItem['successMetrics'] = [];
    
    recommendations.forEach(rec => {
      rec.expectedBenefits.forEach(benefit => {
        if (benefit.toLowerCase().includes('performance')) {
          metrics.push({
            name: 'Response Time Improvement',
            target: 20,
            unit: 'percent',
            measurement: 'Average tool execution time reduction'
          });
        }
        if (benefit.toLowerCase().includes('error')) {
          metrics.push({
            name: 'Error Rate Reduction',
            target: 50,
            unit: 'percent',
            measurement: 'Reduction in tool execution errors'
          });
        }
        if (benefit.toLowerCase().includes('usability')) {
          metrics.push({
            name: 'User Satisfaction',
            target: 85,
            unit: 'percent',
            measurement: 'User satisfaction survey score'
          });
        }
      });
    });
    
    // Default metric if none specific
    if (metrics.length === 0) {
      metrics.push({
        name: 'Implementation Success',
        target: 100,
        unit: 'percent',
        measurement: 'Successful completion of all implementation steps'
      });
    }
    
    return metrics;
  }

  private generatePriorityReasoning(factors: Record<string, number>, score: number): string {
    const topFactors = Object.entries(factors)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 2)
      .map(([name, value]) => `${name}: ${(value * 100).toFixed(0)}%`);
    
    return `Priority score of ${(score * 100).toFixed(0)} based primarily on ${topFactors.join(' and ')}`;
  }

  private calculateCriticalPath(items: RoadmapItem[]): string[] {
    // Simplified critical path calculation based on dependencies
    const dependencyGraph = new Map<string, string[]>();
    
    items.forEach(item => {
      dependencyGraph.set(item.id, item.effort.dependencies);
    });
    
    // Find items with no dependencies (starting points)
    const criticalPath: string[] = [];
    const visited = new Set<string>();
    
    const findLongestPath = (itemId: string, currentPath: string[]): string[] => {
      if (visited.has(itemId)) return currentPath;
      
      visited.add(itemId);
      const newPath = [...currentPath, itemId];
      
      const dependencies = dependencyGraph.get(itemId) || [];
      let longestPath = newPath;
      
      dependencies.forEach(depId => {
        const pathFromDep = findLongestPath(depId, newPath);
        if (pathFromDep.length > longestPath.length) {
          longestPath = pathFromDep;
        }
      });
      
      return longestPath;
    };
    
    // Find the longest path through all items
    items.forEach(item => {
      if (!visited.has(item.id)) {
        const path = findLongestPath(item.id, []);
        if (path.length > criticalPath.length) {
          criticalPath.splice(0, criticalPath.length, ...path);
        }
      }
    });
    
    return criticalPath;
  }

  private identifyParallelizableWork(items: RoadmapItem[]): string[][] {
    const parallelGroups: string[][] = [];
    const processed = new Set<string>();
    
    items.forEach(item => {
      if (processed.has(item.id)) return;
      
      // Find items that can be done in parallel (no dependencies between them)
      const parallelGroup = [item.id];
      processed.add(item.id);
      
      items.forEach(otherItem => {
        if (processed.has(otherItem.id)) return;
        
        // Check if these items can be done in parallel
        const hasNoDependency = !item.effort.dependencies.includes(otherItem.id) && 
                                !otherItem.effort.dependencies.includes(item.id);
        
        if (hasNoDependency) {
          parallelGroup.push(otherItem.id);
          processed.add(otherItem.id);
        }
      });
      
      if (parallelGroup.length > 1) {
        parallelGroups.push(parallelGroup);
      }
    });
    
    return parallelGroups;
  }

  private generateRiskMitigationStrategies(items: RoadmapItem[]): UnifiedRoadmap['riskAssessment']['mitigationStrategies'] {
    const strategies: UnifiedRoadmap['riskAssessment']['mitigationStrategies'] = [];
    
    items.forEach(item => {
      const riskLevel = this.calculateRiskLevel(item);
      
      if (riskLevel > 0.7) {
        strategies.push({
          risk: `High complexity implementation for ${item.title}`,
          strategy: 'Break down into smaller phases, increase testing coverage, assign senior developers',
          owner: 'Technical Lead'
        });
      }
      
      if (item.effort.dependencies.length > 5) {
        strategies.push({
          risk: `Multiple dependencies for ${item.title}`,
          strategy: 'Create dependency mapping, implement in phases, have fallback plans',
          owner: 'Project Manager'
        });
      }
      
      if (item.type === 'security') {
        strategies.push({
          risk: `Security implementation risks for ${item.title}`,
          strategy: 'Security review at each milestone, penetration testing, compliance validation',
          owner: 'Security Team'
        });
      }
    });
    
    return strategies;
  }

  private generateSummary(items: RoadmapItem[], phases: UnifiedRoadmap['phases']): UnifiedRoadmap['summary'] {
    const byPhase: Record<string, number> = {};
    const byType: Record<string, number> = {};
    let totalEffort = 0;
    
    items.forEach(item => {
      byType[item.type] = (byType[item.type] || 0) + 1;
      totalEffort += item.effort.estimatedHours;
    });
    
    phases.forEach(phase => {
      byPhase[phase.name] = phase.items.length;
    });
    
    // Estimate total duration based on phases
    const estimatedDuration = phases.reduce((total, phase) => {
      return total + phase.duration;
    }, '');
    
    return {
      totalItems: items.length,
      byPhase,
      byType,
      estimatedDuration: estimatedDuration || '3-6 months',
      totalEffort
    };
  }

  /**
   * Export roadmap to various formats
   */
  exportRoadmap(roadmap: UnifiedRoadmap, format: 'json' | 'markdown' | 'csv' = 'json'): string {
    switch (format) {
      case 'json':
        return JSON.stringify(roadmap, null, 2);
      
      case 'markdown':
        return this.generateMarkdownRoadmap(roadmap);
      
      case 'csv':
        return this.generateCsvRoadmap(roadmap);
      
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  private generateMarkdownRoadmap(roadmap: UnifiedRoadmap): string {
    let markdown = `# Discord MCP Tool Improvement Roadmap v${roadmap.version}\n\n`;
    markdown += `Generated: ${roadmap.generatedAt.toISOString()}\n\n`;
    
    // Summary
    markdown += `## Summary\n\n`;
    markdown += `- **Total Items**: ${roadmap.summary.totalItems}\n`;
    markdown += `- **Estimated Duration**: ${roadmap.summary.estimatedDuration}\n`;
    markdown += `- **Total Effort**: ${roadmap.summary.totalEffort} hours\n\n`;
    
    // Phase breakdown
    markdown += `### Items by Phase\n`;
    Object.entries(roadmap.summary.byPhase).forEach(([phase, count]) => {
      markdown += `- ${phase}: ${count} items\n`;
    });
    markdown += '\n';
    
    // Type breakdown
    markdown += `### Items by Type\n`;
    Object.entries(roadmap.summary.byType).forEach(([type, count]) => {
      markdown += `- ${type}: ${count} items\n`;
    });
    markdown += '\n';
    
    // Phases
    roadmap.phases.forEach(phase => {
      markdown += `## Phase: ${phase.name}\n\n`;
      markdown += `${phase.description}\n\n`;
      markdown += `- **Duration**: ${phase.duration}\n`;
      markdown += `- **Resources**: ${phase.resources.developers} developers, ${phase.resources.qa} QA, ${phase.resources.devops} DevOps\n\n`;
      
      // Phase items
      const phaseItems = roadmap.items.filter(item => phase.items.includes(item.id));
      phaseItems.forEach(item => {
        markdown += `### ${item.title}\n\n`;
        markdown += `${item.description}\n\n`;
        markdown += `- **Priority**: ${item.priority.score}/100\n`;
        markdown += `- **Type**: ${item.type}\n`;
        markdown += `- **Effort**: ${item.effort.estimatedHours}h (${item.effort.complexity})\n`;
        markdown += `- **Impact**: Overall ${(item.impact.overall * 100).toFixed(0)}%\n\n`;
      });
    });
    
    return markdown;
  }

  private generateCsvRoadmap(roadmap: UnifiedRoadmap): string {
    const headers = [
      'ID', 'Title', 'Type', 'Phase', 'Priority', 'Effort (hours)', 
      'Complexity', 'Impact (%)', 'Affected Tools'
    ];
    
    let csv = headers.join(',') + '\n';
    
    roadmap.items.forEach(item => {
      const row = [
        `"${item.id}"`,
        `"${item.title}"`,
        `"${item.type}"`,
        `"${item.timeline.phase}"`,
        item.priority.score.toString(),
        item.effort.estimatedHours.toString(),
        `"${item.effort.complexity}"`,
        (item.impact.overall * 100).toFixed(0),
        `"${item.affectedTools.join('; ')}")`
      ];
      csv += row.join(',') + '\n';
    });
    
    return csv;
  }
}