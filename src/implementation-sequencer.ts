/**
 * Implementation Sequencer - Optimizes the order and timing of improvements
 * Handles resource allocation, dependency management, and parallel execution planning
 */

import { z } from 'zod';
import type { UnifiedRoadmap, RoadmapItem } from './roadmap-synthesizer.js';

// Schema definitions for sequencing components
export const SequencingConstraintSchema = z.object({
  id: z.string(),
  type: z.enum(['resource', 'dependency', 'timeline', 'risk', 'business']),
  description: z.string(),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  affectedItems: z.array(z.string()),
  resolution: z.object({
    strategy: z.string(),
    effort: z.number(),
    timeline: z.string()
  })
});

export const ResourceAllocationSchema = z.object({
  resourceType: z.string(),
  capacity: z.number(),
  utilization: z.array(z.object({
    period: z.string(),
    allocated: z.number(),
    items: z.array(z.string())
  }))
});

export const ExecutionPlanSchema = z.object({
  id: z.string(),
  roadmapId: z.string(),
  generatedAt: z.date(),
  totalDuration: z.string(),
  phases: z.array(z.object({
    id: z.string(),
    name: z.string(),
    startDate: z.date(),
    endDate: z.date(),
    items: z.array(z.object({
      itemId: z.string(),
      startDate: z.date(),
      endDate: z.date(),
      assignedResources: z.record(z.string(), z.number()),
      dependencies: z.array(z.string()),
      riskLevel: z.enum(['low', 'medium', 'high']),
      bufferTime: z.number() // days
    })),
    milestones: z.array(z.object({
      name: z.string(),
      date: z.date(),
      criteria: z.string(),
      dependencies: z.array(z.string())
    })),
    riskAssessment: z.object({
      overallRisk: z.enum(['low', 'medium', 'high']),
      criticalRisks: z.array(z.string()),
      mitigationPlan: z.string()
    })
  })),
  resourcePlan: z.array(ResourceAllocationSchema),
  constraints: z.array(SequencingConstraintSchema),
  optimizationMetrics: z.object({
    totalCost: z.number(),
    riskScore: z.number(),
    parallelization: z.number(),
    resourceUtilization: z.number()
  })
});

export type SequencingConstraint = z.infer<typeof SequencingConstraintSchema>;
export type ResourceAllocation = z.infer<typeof ResourceAllocationSchema>;
export type ExecutionPlan = z.infer<typeof ExecutionPlanSchema>;

/**
 * Advanced implementation sequencer with optimization algorithms
 */
export class ImplementationSequencer {
  private constraints: Map<string, SequencingConstraint> = new Map();
  private resourceCapacity: Map<string, number> = new Map();
  
  // Default resource capacities (can be configured)
  private readonly defaultCapacity = {
    developers: 5,
    qa: 3,
    devops: 2,
    architect: 1,
    product_manager: 1,
    security_specialist: 1
  };

  constructor() {
    // Initialize with default resource capacities
    Object.entries(this.defaultCapacity).forEach(([resource, capacity]) => {
      this.resourceCapacity.set(resource, capacity);
    });
  }

  /**
   * Generate optimized execution plan from roadmap
   */
  generateExecutionPlan(roadmap: UnifiedRoadmap): ExecutionPlan {
    console.log('Generating optimized execution plan...');
    
    // Step 1: Analyze constraints and dependencies
    const constraints = this.analyzeConstraints(roadmap);
    
    // Step 2: Optimize item sequencing
    const optimizedSequence = this.optimizeSequence(roadmap.items, constraints);
    
    // Step 3: Allocate resources efficiently
    const resourcePlan = this.allocateResources(optimizedSequence);
    
    // Step 4: Generate detailed phase execution plans
    const phases = this.generatePhaseExecutionPlans(optimizedSequence, resourcePlan, roadmap);
    
    // Step 5: Calculate optimization metrics
    const optimizationMetrics = this.calculateOptimizationMetrics(phases, resourcePlan);
    
    const executionPlan: ExecutionPlan = {
      id: `execution_${Date.now()}`,
      roadmapId: roadmap.id,
      generatedAt: new Date(),
      totalDuration: this.calculateTotalDuration(phases),
      phases,
      resourcePlan,
      constraints,
      optimizationMetrics
    };
    
    console.log(`Generated execution plan with ${phases.length} phases over ${executionPlan.totalDuration}`);
    return executionPlan;
  }

  /**
   * Analyze constraints that affect implementation sequencing
   */
  private analyzeConstraints(roadmap: UnifiedRoadmap): SequencingConstraint[] {
    const constraints: SequencingConstraint[] = [];
    
    // Dependency constraints
    roadmap.items.forEach(item => {
      if (item.effort.dependencies.length > 0) {
        constraints.push({
          id: `dep_${item.id}`,
          type: 'dependency',
          description: `${item.title} depends on: ${item.effort.dependencies.join(', ')}`,
          severity: item.effort.dependencies.length > 3 ? 'high' : 'medium',
          affectedItems: [item.id, ...item.effort.dependencies],
          resolution: {
            strategy: 'Sequential execution with dependency validation',
            effort: item.effort.dependencies.length * 2,
            timeline: '1-2 weeks per dependency'
          }
        });
      }
    });
    
    // Resource constraints
    const resourceNeeds = this.calculateResourceNeeds(roadmap.items);
    Object.entries(resourceNeeds).forEach(([resource, need]) => {
      const capacity = this.resourceCapacity.get(resource) || 0;
      if (need > capacity) {
        const affectedItems = roadmap.items
          .filter(item => item.effort.requiredSkills.includes(resource))
          .map(item => item.id);
        
        constraints.push({
          id: `resource_${resource}`,
          type: 'resource',
          description: `${resource} capacity (${capacity}) insufficient for demand (${need})`,
          severity: need > capacity * 1.5 ? 'critical' : 'high',
          affectedItems,
          resolution: {
            strategy: 'Stagger implementation phases, consider external contractors',
            effort: (need - capacity) * 40, // 40 hours per additional resource
            timeline: '2-4 weeks to onboard additional resources'
          }
        });
      }
    });
    
    // Timeline constraints for high-priority items
    const criticalItems = roadmap.items.filter(item => item.priority.score > 80);
    if (criticalItems.length > 0) {
      constraints.push({
        id: 'critical_timeline',
        type: 'timeline',
        description: `${criticalItems.length} critical items require immediate attention`,
        severity: 'critical',
        affectedItems: criticalItems.map(item => item.id),
        resolution: {
          strategy: 'Parallel execution with dedicated resources',
          effort: criticalItems.reduce((sum, item) => sum + item.effort.estimatedHours, 0),
          timeline: 'Must complete within 2-4 weeks'
        }
      });
    }
    
    // Risk constraints
    const highRiskItems = roadmap.items.filter(item => 
      roadmap.riskAssessment.high.includes(item.id)
    );
    if (highRiskItems.length > 0) {
      constraints.push({
        id: 'high_risk',
        type: 'risk',
        description: `${highRiskItems.length} high-risk items require special handling`,
        severity: 'high',
        affectedItems: highRiskItems.map(item => item.id),
        resolution: {
          strategy: 'Extended testing phases, senior developer assignment, phased rollout',
          effort: highRiskItems.reduce((sum, item) => sum + item.effort.estimatedHours * 0.3, 0),
          timeline: '30% additional time for risk mitigation'
        }
      });
    }
    
    // Store constraints for later reference
    constraints.forEach(constraint => {
      this.constraints.set(constraint.id, constraint);
    });
    
    return constraints;
  }

  /**
   * Optimize the sequence of roadmap items using constraint-based algorithms
   */
  private optimizeSequence(items: RoadmapItem[], constraints: SequencingConstraint[]): RoadmapItem[] {
    // Create a copy of items to work with
    let sequence = [...items];
    
    // Step 1: Sort by priority score (highest first)
    sequence.sort((a, b) => b.priority.score - a.priority.score);
    
    // Step 2: Apply dependency constraints
    sequence = this.applyDependencyConstraints(sequence);
    
    // Step 3: Apply resource constraints
    sequence = this.applyResourceConstraints(sequence, constraints);
    
    // Step 4: Apply timeline constraints
    sequence = this.applyTimelineConstraints(sequence, constraints);
    
    // Step 5: Optimize for parallel execution
    sequence = this.optimizeForParallelism(sequence);
    
    return sequence;
  }

  /**
   * Apply dependency constraints to ensure proper ordering
   */
  private applyDependencyConstraints(items: RoadmapItem[]): RoadmapItem[] {
    const result: RoadmapItem[] = [];
    const processed = new Set<string>();
    const itemMap = new Map(items.map(item => [item.id, item]));
    
    const canProcess = (item: RoadmapItem): boolean => {
      return item.effort.dependencies.every(dep => 
        processed.has(dep) || !itemMap.has(dep) // dependency is processed or not in our items
      );
    };
    
    // Process items in dependency order
    while (result.length < items.length) {
      const readyItems = items.filter(item => 
        !processed.has(item.id) && canProcess(item)
      );
      
      if (readyItems.length === 0) {
        // Circular dependency or external dependency - add remaining items
        const remaining = items.filter(item => !processed.has(item.id));
        result.push(...remaining);
        remaining.forEach(item => processed.add(item.id));
        break;
      }
      
      // Sort ready items by priority and add them
      readyItems
        .sort((a, b) => b.priority.score - a.priority.score)
        .forEach(item => {
          result.push(item);
          processed.add(item.id);
        });
    }
    
    return result;
  }

  /**
   * Apply resource constraints to balance workload
   */
  private applyResourceConstraints(items: RoadmapItem[], constraints: SequencingConstraint[]): RoadmapItem[] {
    const resourceConstraints = constraints.filter(c => c.type === 'resource');
    
    if (resourceConstraints.length === 0) return items;
    
    // Group items by required skills to balance resource usage
    const skillGroups = new Map<string, RoadmapItem[]>();
    
    items.forEach(item => {
      item.effort.requiredSkills.forEach(skill => {
        if (!skillGroups.has(skill)) {
          skillGroups.set(skill, []);
        }
        skillGroups.get(skill)!.push(item);
      });
    });
    
    // Reorder to distribute resource-intensive items
    const result: RoadmapItem[] = [];
    const processed = new Set<string>();
    
    // Process high-priority items first, then balance resources
    const highPriorityItems = items.filter(item => item.priority.score > 75);
    const mediumPriorityItems = items.filter(item => item.priority.score >= 50 && item.priority.score <= 75);
    const lowPriorityItems = items.filter(item => item.priority.score < 50);
    
    [highPriorityItems, mediumPriorityItems, lowPriorityItems].forEach(priorityGroup => {
      // Within each priority group, balance resources
      const remaining = priorityGroup.filter(item => !processed.has(item.id));
      
      while (remaining.length > 0) {
        // Find item that uses least contested resources
        const nextItem = this.selectNextItemByResourceBalance(remaining, skillGroups);
        result.push(nextItem);
        processed.add(nextItem.id);
        remaining.splice(remaining.indexOf(nextItem), 1);
      }
    });
    
    return result;
  }

  /**
   * Apply timeline constraints to prioritize urgent items
   */
  private applyTimelineConstraints(items: RoadmapItem[], constraints: SequencingConstraint[]): RoadmapItem[] {
    const timelineConstraints = constraints.filter(c => c.type === 'timeline');
    
    if (timelineConstraints.length === 0) return items;
    
    // Get critical items that need immediate attention
    const criticalConstraint = timelineConstraints.find(c => c.id === 'critical_timeline');
    if (!criticalConstraint) return items;
    
    const criticalItemIds = new Set(criticalConstraint.affectedItems);
    const criticalItems = items.filter(item => criticalItemIds.has(item.id));
    const nonCriticalItems = items.filter(item => !criticalItemIds.has(item.id));
    
    // Critical items go first, maintaining dependency order
    return [...criticalItems, ...nonCriticalItems];
  }

  /**
   * Optimize sequence for maximum parallelism
   */
  private optimizeForParallelism(items: RoadmapItem[]): RoadmapItem[] {
    // Group items that can run in parallel
    const parallelGroups: RoadmapItem[][] = [];
    let currentGroup: RoadmapItem[] = [];
    const usedSkills = new Set<string>();
    
    items.forEach(item => {
      const itemSkills = new Set(item.effort.requiredSkills);
      const hasConflict = Array.from(itemSkills).some(skill => usedSkills.has(skill));
      
      if (hasConflict && currentGroup.length > 0) {
        // Start new parallel group
        parallelGroups.push([...currentGroup]);
        currentGroup = [item];
        usedSkills.clear();
        item.effort.requiredSkills.forEach(skill => usedSkills.add(skill));
      } else {
        // Add to current group
        currentGroup.push(item);
        item.effort.requiredSkills.forEach(skill => usedSkills.add(skill));
      }
    });
    
    if (currentGroup.length > 0) {
      parallelGroups.push(currentGroup);
    }
    
    // Flatten back to sequence, but mark parallel execution opportunities
    return parallelGroups.flat();
  }

  /**
   * Allocate resources across the optimized sequence
   */
  private allocateResources(items: RoadmapItem[]): ResourceAllocation[] {
    const allocations: ResourceAllocation[] = [];
    const resourceTypes = Array.from(this.resourceCapacity.keys());
    
    resourceTypes.forEach(resourceType => {
      const capacity = this.resourceCapacity.get(resourceType) || 0;
      const utilization: ResourceAllocation['utilization'] = [];
      
      // Create time periods (weekly allocation)
      const startDate = new Date();
      const periods = 26; // 6 months of weekly periods
      
      for (let week = 0; week < periods; week++) {
        const periodStart = new Date(startDate);
        periodStart.setDate(startDate.getDate() + (week * 7));
        
        const period = `Week ${week + 1} (${periodStart.toISOString().split('T')[0]})`;
        const allocatedItems: string[] = [];
        let allocated = 0;
        
        // Find items that need this resource in this period
        items.forEach(item => {
          if (item.effort.requiredSkills.includes(resourceType)) {
            const itemWeeks = Math.ceil(item.effort.estimatedHours / 40); // 40 hours per week
            const itemStartWeek = this.estimateItemStartWeek(item, items);
            
            if (week >= itemStartWeek && week < itemStartWeek + itemWeeks) {
              const resourceNeed = Math.min(1, (item.effort.estimatedHours / itemWeeks) / 40);
              if (allocated + resourceNeed <= capacity) {
                allocatedItems.push(item.id);
                allocated += resourceNeed;
              }
            }
          }
        });
        
        utilization.push({
          period,
          allocated: Math.round(allocated * 100) / 100,
          items: allocatedItems
        });
      }
      
      allocations.push({
        resourceType,
        capacity,
        utilization
      });
    });
    
    return allocations;
  }

  /**
   * Generate detailed execution plans for each phase
   */
  private generatePhaseExecutionPlans(
    items: RoadmapItem[],
    resourcePlan: ResourceAllocation[],
    roadmap: UnifiedRoadmap
  ): ExecutionPlan['phases'] {
    const phases: ExecutionPlan['phases'] = [];
    
    // Group items by timeline phase
    const phaseGroups = new Map<string, RoadmapItem[]>();
    items.forEach(item => {
      const phase = item.timeline.phase;
      if (!phaseGroups.has(phase)) {
        phaseGroups.set(phase, []);
      }
      phaseGroups.get(phase)!.push(item);
    });
    
    let currentDate = new Date();
    
    // Generate execution plan for each phase
    ['immediate', 'short_term', 'medium_term', 'long_term'].forEach((phaseName, index) => {
      const phaseItems = phaseGroups.get(phaseName) || [];
      if (phaseItems.length === 0) return;
      
      const phaseStartDate = new Date(currentDate);
      const phaseDuration = this.estimatePhaseDuration(phaseItems);
      const phaseEndDate = new Date(phaseStartDate.getTime() + phaseDuration * 24 * 60 * 60 * 1000);
      
      const phaseExecutionItems = this.generateItemExecutionPlans(
        phaseItems,
        phaseStartDate,
        resourcePlan
      );
      
      const phaseMilestones = this.generatePhaseMilestones(
        phaseName,
        phaseStartDate,
        phaseEndDate,
        phaseItems
      );
      
      const riskAssessment = this.assessPhaseRisk(phaseItems, roadmap);
      
      phases.push({
        id: `phase_${index + 1}_${phaseName}`,
        name: this.formatPhaseName(phaseName),
        startDate: phaseStartDate,
        endDate: phaseEndDate,
        items: phaseExecutionItems,
        milestones: phaseMilestones,
        riskAssessment
      });
      
      currentDate = new Date(phaseEndDate.getTime() + 7 * 24 * 60 * 60 * 1000); // 1 week buffer
    });
    
    return phases;
  }

  /**
   * Generate execution plans for individual items within a phase
   */
  private generateItemExecutionPlans(
    items: RoadmapItem[],
    phaseStartDate: Date,
    resourcePlan: ResourceAllocation[]
  ): ExecutionPlan['phases'][0]['items'] {
    const itemPlans: ExecutionPlan['phases'][0]['items'] = [];
    let currentItemDate = new Date(phaseStartDate);
    
    items.forEach(item => {
      const duration = Math.ceil(item.effort.estimatedHours / 40) * 7; // Convert hours to days
      const bufferTime = this.calculateBufferTime(item);
      
      const itemStartDate = new Date(currentItemDate);
      const itemEndDate = new Date(itemStartDate.getTime() + (duration + bufferTime) * 24 * 60 * 60 * 1000);
      
      const assignedResources = this.calculateAssignedResources(item, resourcePlan);
      const riskLevel = this.determineItemRiskLevel(item);
      
      itemPlans.push({
        itemId: item.id,
        startDate: itemStartDate,
        endDate: itemEndDate,
        assignedResources,
        dependencies: item.effort.dependencies,
        riskLevel,
        bufferTime
      });
      
      // Update current date for next item (consider parallel execution)
      const canRunInParallel = this.canRunInParallel(item, items.slice(items.indexOf(item) + 1));
      if (!canRunInParallel) {
        currentItemDate = itemEndDate;
      }
    });
    
    return itemPlans;
  }

  // Utility methods for calculations
  private calculateResourceNeeds(items: RoadmapItem[]): Record<string, number> {
    const needs: Record<string, number> = {};
    
    items.forEach(item => {
      item.effort.requiredSkills.forEach(skill => {
        const effort = item.effort.estimatedHours / 40; // Convert to person-weeks
        needs[skill] = (needs[skill] || 0) + effort;
      });
    });
    
    return needs;
  }

  private selectNextItemByResourceBalance(
    items: RoadmapItem[],
    skillGroups: Map<string, RoadmapItem[]>
  ): RoadmapItem {
    // Select item with least contested resources
    let bestItem = items[0];
    let lowestContention = Infinity;
    
    items.forEach(item => {
      let contention = 0;
      item.effort.requiredSkills.forEach(skill => {
        const groupSize = skillGroups.get(skill)?.length || 0;
        contention += groupSize;
      });
      
      if (contention < lowestContention) {
        lowestContention = contention;
        bestItem = item;
      }
    });
    
    return bestItem;
  }

  private estimateItemStartWeek(item: RoadmapItem, allItems: RoadmapItem[]): number {
    const itemIndex = allItems.findIndex(i => i.id === item.id);
    let totalWeeks = 0;
    
    // Sum up weeks for all previous items
    for (let i = 0; i < itemIndex; i++) {
      totalWeeks += Math.ceil(allItems[i].effort.estimatedHours / 40);
    }
    
    return totalWeeks;
  }

  private estimatePhaseDuration(items: RoadmapItem[]): number {
    // Estimate duration considering parallel execution
    const totalEffort = items.reduce((sum, item) => sum + item.effort.estimatedHours, 0);
    const parallelizationFactor = this.estimateParallelizationFactor(items);
    
    // Convert hours to days with parallelization
    return Math.ceil((totalEffort / parallelizationFactor) / 8); // 8 hours per day
  }

  private estimateParallelizationFactor(items: RoadmapItem[]): number {
    // Estimate how many items can run in parallel based on resource constraints
    const uniqueSkills = new Set<string>();
    items.forEach(item => {
      item.effort.requiredSkills.forEach(skill => uniqueSkills.add(skill));
    });
    
    // Rough estimate: can parallelize based on available resources
    return Math.min(items.length, uniqueSkills.size, 3); // Max 3 parallel streams
  }

  private generatePhaseMilestones(
    phaseName: string,
    startDate: Date,
    endDate: Date,
    items: RoadmapItem[]
  ): ExecutionPlan['phases'][0]['milestones'] {
    const duration = endDate.getTime() - startDate.getTime();
    const quarterDuration = duration / 4;
    
    return [
      {
        name: `${this.formatPhaseName(phaseName)} Planning Complete`,
        date: new Date(startDate.getTime() + quarterDuration),
        criteria: 'All items planned and resources allocated',
        dependencies: []
      },
      {
        name: `${this.formatPhaseName(phaseName)} 50% Complete`,
        date: new Date(startDate.getTime() + duration / 2),
        criteria: '50% of phase items completed and tested',
        dependencies: items.slice(0, Math.ceil(items.length / 2)).map(item => item.id)
      },
      {
        name: `${this.formatPhaseName(phaseName)} Complete`,
        date: endDate,
        criteria: 'All phase items completed, tested, and deployed',
        dependencies: items.map(item => item.id)
      }
    ];
  }

  private assessPhaseRisk(items: RoadmapItem[], roadmap: UnifiedRoadmap): ExecutionPlan['phases'][0]['riskAssessment'] {
    const highRiskItems = items.filter(item => roadmap.riskAssessment.high.includes(item.id));
    const criticalRisks: string[] = [];
    
    if (highRiskItems.length > 0) {
      criticalRisks.push(`${highRiskItems.length} high-risk items in phase`);
    }
    
    const complexItems = items.filter(item => item.effort.complexity === 'very_high');
    if (complexItems.length > 0) {
      criticalRisks.push(`${complexItems.length} very high complexity items`);
    }
    
    const overallRisk = criticalRisks.length > 2 ? 'high' : 
                       criticalRisks.length > 0 ? 'medium' : 'low';
    
    const mitigationPlan = this.generateRiskMitigationPlan(items, criticalRisks);
    
    return {
      overallRisk: overallRisk as 'low' | 'medium' | 'high',
      criticalRisks,
      mitigationPlan
    };
  }

  private generateRiskMitigationPlan(items: RoadmapItem[], risks: string[]): string {
    let plan = '';
    
    if (risks.some(r => r.includes('high-risk'))) {
      plan += 'Assign senior developers to high-risk items. ';
    }
    
    if (risks.some(r => r.includes('complexity'))) {
      plan += 'Break down complex items into smaller tasks. ';
    }
    
    if (items.some(item => item.effort.dependencies.length > 3)) {
      plan += 'Implement dependency validation checkpoints. ';
    }
    
    plan += 'Conduct weekly risk reviews and maintain contingency plans.';
    
    return plan;
  }

  private calculateBufferTime(item: RoadmapItem): number {
    // Calculate buffer time based on complexity and risk
    const baseBuffer = 2; // 2 days base buffer
    
    const complexityMultiplier = {
      low: 1,
      medium: 1.5,
      high: 2,
      very_high: 3
    }[item.effort.complexity];
    
    const dependencyMultiplier = Math.min(2, 1 + (item.effort.dependencies.length * 0.2));
    
    return Math.ceil(baseBuffer * complexityMultiplier * dependencyMultiplier);
  }

  private calculateAssignedResources(item: RoadmapItem, resourcePlan: ResourceAllocation[]): Record<string, number> {
    const assigned: Record<string, number> = {};
    
    item.effort.requiredSkills.forEach(skill => {
      const allocation = resourcePlan.find(rp => rp.resourceType === skill);
      if (allocation) {
        // Estimate resource allocation based on item effort
        const weeklyNeed = Math.min(1, item.effort.estimatedHours / 40);
        assigned[skill] = Math.round(weeklyNeed * 100) / 100;
      }
    });
    
    return assigned;
  }

  private determineItemRiskLevel(item: RoadmapItem): 'low' | 'medium' | 'high' {
    let riskScore = 0;
    
    if (item.effort.complexity === 'very_high') riskScore += 3;
    if (item.effort.complexity === 'high') riskScore += 2;
    if (item.effort.dependencies.length > 3) riskScore += 2;
    if (item.affectedTools.length > 5) riskScore += 1;
    
    if (riskScore >= 4) return 'high';
    if (riskScore >= 2) return 'medium';
    return 'low';
  }

  private canRunInParallel(item: RoadmapItem, subsequentItems: RoadmapItem[]): boolean {
    // Check if any subsequent item can run in parallel with this item
    return subsequentItems.some(otherItem => {
      const skillOverlap = item.effort.requiredSkills.some(skill => 
        otherItem.effort.requiredSkills.includes(skill)
      );
      const dependencyConflict = otherItem.effort.dependencies.includes(item.id);
      
      return !skillOverlap && !dependencyConflict;
    });
  }

  private calculateTotalDuration(phases: ExecutionPlan['phases']): string {
    if (phases.length === 0) return '0 days';
    
    const startDate = phases[0].startDate;
    const endDate = phases[phases.length - 1].endDate;
    const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000));
    
    const months = Math.floor(totalDays / 30);
    const remainingDays = totalDays % 30;
    
    if (months > 0) {
      return `${months} months${remainingDays > 0 ? ` ${remainingDays} days` : ''}`;
    } else {
      return `${totalDays} days`;
    }
  }

  private calculateOptimizationMetrics(
    phases: ExecutionPlan['phases'],
    resourcePlan: ResourceAllocation[]
  ): ExecutionPlan['optimizationMetrics'] {
    // Calculate total cost (simplified)
    const totalCost = phases.reduce((sum, phase) => {
      return sum + phase.items.reduce((phaseSum, item) => {
        return phaseSum + Object.values(item.assignedResources).reduce((a, b) => a + b, 0) * 1000; // $1000 per resource-week
      }, 0);
    }, 0);
    
    // Calculate risk score (0-1)
    const highRiskPhases = phases.filter(p => p.riskAssessment.overallRisk === 'high').length;
    const riskScore = highRiskPhases / phases.length;
    
    // Calculate parallelization efficiency (0-1)
    const totalItems = phases.reduce((sum, p) => sum + p.items.length, 0);
    const parallelPhases = phases.filter(p => p.items.length > 1).length;
    const parallelization = parallelPhases / phases.length;
    
    // Calculate resource utilization (0-1)
    const avgUtilization = resourcePlan.reduce((sum, rp) => {
      const periodUtilization = rp.utilization.reduce((pSum, period) => 
        pSum + (period.allocated / rp.capacity), 0
      ) / rp.utilization.length;
      return sum + periodUtilization;
    }, 0) / resourcePlan.length;
    
    return {
      totalCost,
      riskScore,
      parallelization,
      resourceUtilization: Math.min(1, avgUtilization)
    };
  }

  private formatPhaseName(phaseName: string): string {
    return phaseName.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  }

  /**
   * Update resource capacity (for configuration)
   */
  setResourceCapacity(resource: string, capacity: number): void {
    this.resourceCapacity.set(resource, capacity);
  }

  /**
   * Get current resource capacity
   */
  getResourceCapacity(): Map<string, number> {
    return new Map(this.resourceCapacity);
  }

  /**
   * Add custom constraint
   */
  addConstraint(constraint: SequencingConstraint): void {
    this.constraints.set(constraint.id, constraint);
  }

  /**
   * Export execution plan to various formats
   */
  exportExecutionPlan(plan: ExecutionPlan, format: 'json' | 'gantt' | 'csv' = 'json'): string {
    switch (format) {
      case 'json':
        return JSON.stringify(plan, null, 2);
        
      case 'gantt':
        return this.generateGanttChart(plan);
        
      case 'csv':
        return this.generateExecutionCsv(plan);
        
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  private generateGanttChart(plan: ExecutionPlan): string {
    // Generate a text-based Gantt chart representation
    let gantt = `# Gantt Chart - ${plan.id}\n\n`;
    gantt += `Total Duration: ${plan.totalDuration}\n\n`;
    
    plan.phases.forEach(phase => {
      gantt += `## ${phase.name}\n`;
      gantt += `Duration: ${phase.startDate.toISOString().split('T')[0]} to ${phase.endDate.toISOString().split('T')[0]}\n\n`;
      
      phase.items.forEach(item => {
        const duration = Math.ceil((item.endDate.getTime() - item.startDate.getTime()) / (24 * 60 * 60 * 1000));
        gantt += `- ${item.itemId}: ${duration} days (${item.startDate.toISOString().split('T')[0]} - ${item.endDate.toISOString().split('T')[0]})\n`;
      });
      
      gantt += '\n';
    });
    
    return gantt;
  }

  private generateExecutionCsv(plan: ExecutionPlan): string {
    const headers = [
      'Phase', 'Item ID', 'Start Date', 'End Date', 'Duration (days)', 
      'Risk Level', 'Buffer Time', 'Dependencies', 'Resources'
    ];
    
    let csv = headers.join(',') + '\n';
    
    plan.phases.forEach(phase => {
      phase.items.forEach(item => {
        const duration = Math.ceil((item.endDate.getTime() - item.startDate.getTime()) / (24 * 60 * 60 * 1000));
        const resources = Object.entries(item.assignedResources)
          .map(([res, alloc]) => `${res}:${alloc}`)
          .join(';');
        
        const row = [
          `"${phase.name}"`,
          `"${item.itemId}"`,
          item.startDate.toISOString().split('T')[0],
          item.endDate.toISOString().split('T')[0],
          duration.toString(),
          `"${item.riskLevel}"`,
          item.bufferTime.toString(),
          `"${item.dependencies.join(';')}"`,
          `"${resources}"`
        ];
        
        csv += row.join(',') + '\n';
      });
    });
    
    return csv;
  }
}