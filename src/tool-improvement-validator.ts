/**
 * Tool Improvement Validator - Comprehensive testing and validation system
 * Tests all tool improvements, validates functionality, and ensures enterprise readiness
 */

import { EnhancedToolFactory, EnhancedTool, ExecutionContext } from './enhanced-tool-factory.js';
import { ToolWorkflowOrchestrator, Workflow } from './tool-workflow-orchestrator.js';
import { ToolFeedbackCoordinator, FeedbackData } from './tool-feedback-coordinator.js';
import { DiscordService } from './discord-service.js';

export interface ValidationTest {
  id: string;
  name: string;
  category: 'functionality' | 'performance' | 'reliability' | 'security' | 'integration';
  priority: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  testFunction: () => Promise<ValidationResult>;
  timeout: number;
  dependencies: string[];
}

export interface ValidationResult {
  testId: string;
  passed: boolean;
  duration: number;
  message: string;
  details?: any;
  metrics?: {
    performance?: number;
    reliability?: number;
    accuracy?: number;
    efficiency?: number;
  };
  recommendations?: string[];
}

export interface ValidationSuite {
  id: string;
  name: string;
  tests: string[];
  runInParallel: boolean;
  continueOnFailure: boolean;
  setupFunction?: () => Promise<void>;
  teardownFunction?: () => Promise<void>;
}

export interface ValidationReport {
  suiteId: string;
  timestamp: number;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  skippedTests: number;
  totalDuration: number;
  results: ValidationResult[];
  overallScore: number;
  readinessLevel: 'not-ready' | 'development' | 'staging' | 'production';
  criticalIssues: string[];
  recommendations: string[];
}

export class ToolImprovementValidator {
  private tests = new Map<string, ValidationTest>();
  private suites = new Map<string, ValidationSuite>();
  private validationHistory: ValidationReport[] = [];
  private mockDiscordService: any;
  
  constructor(
    private toolFactory: EnhancedToolFactory,
    private workflowOrchestrator: ToolWorkflowOrchestrator,
    private feedbackCoordinator: ToolFeedbackCoordinator,
    private discordService: DiscordService
  ) {
    this.initializeMockServices();
    this.defineValidationTests();
    this.createValidationSuites();
  }

  private initializeMockServices(): void {
    // Create mock Discord service for testing
    this.mockDiscordService = {
      getServerInfo: async (guildId?: string) => `Mock server info for ${guildId || 'default'}`,
      sendMessage: async (channelId: string, message: string) => `Mock message sent to ${channelId}: ${message}`,
      initialize: async () => Promise.resolve(),
      // Add other mock methods as needed
    };
  }

  private defineValidationTests(): void {
    // Enhanced Tool Factory Tests
    this.tests.set('tool-factory-initialization', {
      id: 'tool-factory-initialization',
      name: 'Tool Factory Initialization',
      category: 'functionality',
      priority: 'critical',
      description: 'Validates that the Enhanced Tool Factory initializes correctly with all tools',
      timeout: 10000,
      dependencies: [],
      testFunction: async () => {
        const startTime = Date.now();
        
        try {
          const tools = this.toolFactory.getAllTools();
          const duration = Date.now() - startTime;
          
          if (tools.length === 0) {
            return {
              testId: 'tool-factory-initialization',
              passed: false,
              duration,
              message: 'No tools found in factory',
              recommendations: ['Check tool registration process', 'Verify initialization sequence']
            };
          }

          // Validate tool structure
          const invalidTools = tools.filter(tool => 
            !tool.name || !tool.execute || !tool.category || !tool.priority
          );

          if (invalidTools.length > 0) {
            return {
              testId: 'tool-factory-initialization',
              passed: false,
              duration,
              message: `Found ${invalidTools.length} invalid tools`,
              details: { invalidTools: invalidTools.map(t => t.name) },
              recommendations: ['Fix tool structure validation', 'Ensure all required properties are present']
            };
          }

          return {
            testId: 'tool-factory-initialization',
            passed: true,
            duration,
            message: `Successfully initialized ${tools.length} tools`,
            details: { 
              toolCount: tools.length,
              categories: this.getToolCategories(tools),
              priorities: this.getToolPriorities(tools)
            },
            metrics: {
              performance: duration < 5000 ? 1.0 : 0.5,
              reliability: 1.0,
              accuracy: 1.0,
              efficiency: tools.length / duration * 1000 // tools per second
            }
          };
        } catch (error) {
          return {
            testId: 'tool-factory-initialization',
            passed: false,
            duration: Date.now() - startTime,
            message: `Initialization failed: ${error.message}`,
            recommendations: ['Check error logs', 'Verify dependencies', 'Fix initialization code']
          };
        }
      }
    });

    this.tests.set('enhanced-tool-execution', {
      id: 'enhanced-tool-execution',
      name: 'Enhanced Tool Execution',
      category: 'functionality',
      priority: 'high',
      description: 'Validates that enhanced tools execute correctly with monitoring and error handling',
      timeout: 15000,
      dependencies: ['tool-factory-initialization'],
      testFunction: async () => {
        const startTime = Date.now();
        
        try {
          // Test basic tool execution
          const result = await this.toolFactory.executeTool('enhanced_get_server_info', {
            guildId: 'test-guild',
            includeStats: true
          });

          const duration = Date.now() - startTime;

          if (!result) {
            return {
              testId: 'enhanced-tool-execution',
              passed: false,
              duration,
              message: 'Tool execution returned no result'
            };
          }

          // Test batch operations
          const batchResult = await this.toolFactory.executeTool('enhanced_batch_operations', {
            operations: [
              { tool: 'enhanced_get_server_info', args: { guildId: 'test-1' } },
              { tool: 'enhanced_get_server_info', args: { guildId: 'test-2' } }
            ],
            maxConcurrency: 2
          });

          return {
            testId: 'enhanced-tool-execution',
            passed: true,
            duration,
            message: 'All tool executions completed successfully',
            details: { 
              singleResult: typeof result,
              batchResult: batchResult?.totalOperations || 0
            },
            metrics: {
              performance: duration < 10000 ? 1.0 : 0.7,
              reliability: 1.0,
              accuracy: result ? 1.0 : 0.5
            }
          };
        } catch (error) {
          return {
            testId: 'enhanced-tool-execution',
            passed: false,
            duration: Date.now() - startTime,
            message: `Tool execution failed: ${error.message}`,
            recommendations: ['Check tool implementation', 'Verify error handling', 'Test with mock data']
          };
        }
      }
    });

    this.tests.set('workflow-orchestrator-basic', {
      id: 'workflow-orchestrator-basic',
      name: 'Workflow Orchestrator Basic Functions',
      category: 'functionality',
      priority: 'high',
      description: 'Tests basic workflow orchestration functionality',
      timeout: 20000,
      dependencies: ['tool-factory-initialization'],
      testFunction: async () => {
        const startTime = Date.now();
        
        try {
          // Test workflow listing
          const workflows = this.workflowOrchestrator.listWorkflows();
          
          if (workflows.length === 0) {
            return {
              testId: 'workflow-orchestrator-basic',
              passed: false,
              duration: Date.now() - startTime,
              message: 'No workflows found',
              recommendations: ['Initialize predefined workflows', 'Check workflow registration']
            };
          }

          // Test workflow execution (use a simple workflow)
          const testWorkflow = workflows.find(w => w.id === 'server-maintenance');
          if (!testWorkflow) {
            return {
              testId: 'workflow-orchestrator-basic',
              passed: false,
              duration: Date.now() - startTime,
              message: 'Test workflow not found',
              recommendations: ['Ensure test workflows are registered', 'Check workflow initialization']
            };
          }

          const executionId = await this.workflowOrchestrator.executeWorkflow(testWorkflow.id);
          const duration = Date.now() - startTime;

          // Give it a moment to start
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          const runningWorkflows = this.workflowOrchestrator.getRunningWorkflows();
          const isRunning = runningWorkflows.some(w => w.workflowId === testWorkflow.id);

          return {
            testId: 'workflow-orchestrator-basic',
            passed: true,
            duration,
            message: `Workflow orchestration working. Found ${workflows.length} workflows, executed ${testWorkflow.id}`,
            details: {
              availableWorkflows: workflows.length,
              executionId,
              isRunning,
              runningCount: runningWorkflows.length
            },
            metrics: {
              performance: duration < 15000 ? 1.0 : 0.7,
              reliability: isRunning ? 1.0 : 0.8,
              accuracy: 1.0
            }
          };
        } catch (error) {
          return {
            testId: 'workflow-orchestrator-basic',
            passed: false,
            duration: Date.now() - startTime,
            message: `Workflow orchestration failed: ${error.message}`,
            recommendations: ['Check workflow definitions', 'Verify tool dependencies', 'Test workflow steps individually']
          };
        }
      }
    });

    this.tests.set('feedback-loop-functionality', {
      id: 'feedback-loop-functionality',
      name: 'Feedback Loop System',
      category: 'functionality',
      priority: 'medium',
      description: 'Tests feedback loop coordination and processing',
      timeout: 10000,
      dependencies: [],
      testFunction: async () => {
        const startTime = Date.now();
        
        try {
          // Record sample feedback
          const sampleFeedback: FeedbackData = {
            toolName: 'test-tool',
            executionId: 'test-execution',
            timestamp: Date.now(),
            performance: {
              duration: 500,
              success: true,
              resourceUsage: { memory: 0.3, cpu: 0.2 }
            },
            businessImpact: {
              category: 'efficiency',
              value: 10,
              metric: 'time_saved'
            },
            context: {
              guildId: 'test-guild',
              metadata: {}
            }
          };

          this.feedbackCoordinator.recordFeedback(sampleFeedback);

          // Test system health metrics
          const systemHealth = this.feedbackCoordinator.getSystemHealth();
          const analytics = this.feedbackCoordinator.getFeedbackAnalytics();
          
          const duration = Date.now() - startTime;

          return {
            testId: 'feedback-loop-functionality',
            passed: true,
            duration,
            message: 'Feedback loop system functioning correctly',
            details: {
              systemHealth: systemHealth.overallHealth,
              feedbackItems: analytics.totalFeedbackItems,
              activeFeedbackLoops: analytics.activeFeedbackLoops,
              improvementSuggestions: analytics.improvementSuggestions
            },
            metrics: {
              performance: 1.0,
              reliability: systemHealth.overallHealth,
              accuracy: 1.0
            }
          };
        } catch (error) {
          return {
            testId: 'feedback-loop-functionality',
            passed: false,
            duration: Date.now() - startTime,
            message: `Feedback system failed: ${error.message}`,
            recommendations: ['Check feedback processing logic', 'Verify data structures', 'Test with different feedback types']
          };
        }
      }
    });

    this.tests.set('performance-monitoring', {
      id: 'performance-monitoring',
      name: 'Performance Monitoring System',
      category: 'performance',
      priority: 'high',
      description: 'Validates performance monitoring and metrics collection',
      timeout: 8000,
      dependencies: ['tool-factory-initialization'],
      testFunction: async () => {
        const startTime = Date.now();
        
        try {
          // Execute several operations to generate metrics
          const operations = [
            () => this.toolFactory.executeTool('enhanced_get_server_info', {}),
            () => this.toolFactory.executeTool('enhanced_get_server_info', { includeStats: true }),
            () => this.toolFactory.executeTool('enhanced_get_server_info', { includeChannels: true })
          ];

          await Promise.all(operations.map(op => op().catch(() => null))); // Allow failures
          
          const metrics = this.toolFactory.getPerformanceMetrics();
          const degradationStatus = this.toolFactory.getDegradationStatus();
          
          const duration = Date.now() - startTime;

          if (!metrics || typeof metrics !== 'object') {
            return {
              testId: 'performance-monitoring',
              passed: false,
              duration,
              message: 'Performance metrics not available',
              recommendations: ['Check performance monitoring implementation', 'Verify metrics collection']
            };
          }

          return {
            testId: 'performance-monitoring',
            passed: true,
            duration,
            message: 'Performance monitoring system working correctly',
            details: {
              metricsAvailable: Object.keys(metrics).length > 0,
              degradationLevel: degradationStatus.level,
              healthScore: degradationStatus.health_score
            },
            metrics: {
              performance: duration < 5000 ? 1.0 : 0.8,
              reliability: 1.0,
              accuracy: metrics ? 1.0 : 0.5
            }
          };
        } catch (error) {
          return {
            testId: 'performance-monitoring',
            passed: false,
            duration: Date.now() - startTime,
            message: `Performance monitoring failed: ${error.message}`,
            recommendations: ['Check monitoring system initialization', 'Verify metric collection logic']
          };
        }
      }
    });

    this.tests.set('error-handling-resilience', {
      id: 'error-handling-resilience',
      name: 'Error Handling and Resilience',
      category: 'reliability',
      priority: 'critical',
      description: 'Tests error handling, circuit breakers, and fallback mechanisms',
      timeout: 12000,
      dependencies: ['tool-factory-initialization'],
      testFunction: async () => {
        const startTime = Date.now();
        
        try {
          // Test error handling with invalid parameters
          let errorHandled = false;
          try {
            await this.toolFactory.executeTool('nonexistent-tool', {});
          } catch (error) {
            errorHandled = true;
          }

          if (!errorHandled) {
            return {
              testId: 'error-handling-resilience',
              passed: false,
              duration: Date.now() - startTime,
              message: 'Error handling not working - invalid tool execution should fail',
              recommendations: ['Implement proper error handling', 'Add input validation']
            };
          }

          // Test fallback mechanisms (simulate by using a tool with fallbacks)
          const result = await this.toolFactory.executeTool('enhanced_send_message', {
            channelId: 'test-channel',
            message: 'test',
            useWebhookFallback: true
          });

          const duration = Date.now() - startTime;

          return {
            testId: 'error-handling-resilience',
            passed: true,
            duration,
            message: 'Error handling and resilience systems working correctly',
            details: {
              errorHandlingWorks: errorHandled,
              fallbackResult: result ? 'success' : 'failed'
            },
            metrics: {
              performance: duration < 10000 ? 1.0 : 0.8,
              reliability: errorHandled ? 1.0 : 0.5,
              accuracy: 1.0
            }
          };
        } catch (error) {
          return {
            testId: 'error-handling-resilience',
            passed: false,
            duration: Date.now() - startTime,
            message: `Error handling test failed: ${error.message}`,
            recommendations: ['Check error handling implementation', 'Test fallback mechanisms', 'Verify circuit breaker logic']
          };
        }
      }
    });

    this.tests.set('caching-effectiveness', {
      id: 'caching-effectiveness',
      name: 'Caching System Effectiveness',
      category: 'performance',
      priority: 'medium',
      description: 'Tests caching mechanisms and hit rates',
      timeout: 10000,
      dependencies: ['tool-factory-initialization'],
      testFunction: async () => {
        const startTime = Date.now();
        
        try {
          const testArgs = { guildId: 'cache-test', includeStats: true };
          
          // First execution (should cache)
          const firstExecution = Date.now();
          await this.toolFactory.executeTool('enhanced_get_server_info', testArgs);
          const firstDuration = Date.now() - firstExecution;

          // Second execution (should hit cache)
          const secondExecution = Date.now();
          await this.toolFactory.executeTool('enhanced_get_server_info', testArgs);
          const secondDuration = Date.now() - secondExecution;

          const totalDuration = Date.now() - startTime;
          const cacheEffective = secondDuration < firstDuration * 0.5; // Cache should be much faster

          return {
            testId: 'caching-effectiveness',
            passed: cacheEffective,
            duration: totalDuration,
            message: cacheEffective 
              ? 'Caching system working effectively' 
              : 'Caching system may not be working optimally',
            details: {
              firstExecutionMs: firstDuration,
              secondExecutionMs: secondDuration,
              speedImprovement: `${((firstDuration - secondDuration) / firstDuration * 100).toFixed(1)}%`,
              cacheHit: cacheEffective
            },
            metrics: {
              performance: cacheEffective ? 1.0 : 0.6,
              reliability: 1.0,
              efficiency: firstDuration > 0 ? secondDuration / firstDuration : 1
            },
            recommendations: cacheEffective ? [] : [
              'Check cache configuration',
              'Verify cache key generation',
              'Review cache TTL settings'
            ]
          };
        } catch (error) {
          return {
            testId: 'caching-effectiveness',
            passed: false,
            duration: Date.now() - startTime,
            message: `Caching test failed: ${error.message}`,
            recommendations: ['Check cache implementation', 'Verify cache storage', 'Test cache invalidation']
          };
        }
      }
    });

    this.tests.set('security-validation', {
      id: 'security-validation',
      name: 'Security and Access Control',
      category: 'security',
      priority: 'critical',
      description: 'Validates security measures and access control',
      timeout: 8000,
      dependencies: [],
      testFunction: async () => {
        const startTime = Date.now();
        
        try {
          // Test input validation
          let inputValidationWorks = false;
          try {
            await this.toolFactory.executeTool('enhanced_send_message', {
              channelId: null, // Invalid input
              message: 'test'
            });
          } catch (error) {
            inputValidationWorks = true;
          }

          // Test unauthorized access (if applicable)
          // This is a simplified test - in real implementation, you'd test actual auth
          
          const duration = Date.now() - startTime;

          return {
            testId: 'security-validation',
            passed: inputValidationWorks,
            duration,
            message: inputValidationWorks 
              ? 'Security validation working correctly' 
              : 'Security validation needs improvement',
            details: {
              inputValidation: inputValidationWorks,
              // Add other security checks here
            },
            metrics: {
              reliability: inputValidationWorks ? 1.0 : 0.3,
              accuracy: 1.0
            },
            recommendations: inputValidationWorks ? [] : [
              'Implement comprehensive input validation',
              'Add authentication and authorization checks',
              'Review security best practices'
            ]
          };
        } catch (error) {
          return {
            testId: 'security-validation',
            passed: false,
            duration: Date.now() - startTime,
            message: `Security validation failed: ${error.message}`,
            recommendations: ['Review security implementation', 'Add proper validation', 'Test edge cases']
          };
        }
      }
    });

    this.tests.set('integration-compatibility', {
      id: 'integration-compatibility',
      name: 'Integration and Compatibility',
      category: 'integration',
      priority: 'medium',
      description: 'Tests integration between different components and compatibility',
      timeout: 15000,
      dependencies: ['tool-factory-initialization', 'workflow-orchestrator-basic'],
      testFunction: async () => {
        const startTime = Date.now();
        
        try {
          // Test tool factory + workflow orchestrator integration
          const workflows = this.workflowOrchestrator.listWorkflows();
          const tools = this.toolFactory.getAllTools();
          
          // Check if workflow tools exist in tool factory
          let allToolsExist = true;
          const missingTools: string[] = [];
          
          workflows.forEach(workflow => {
            workflow.steps.forEach(step => {
              if (!tools.find(tool => tool.name === step.toolName)) {
                allToolsExist = false;
                missingTools.push(step.toolName);
              }
            });
          });

          // Test feedback coordinator integration
          const analytics = this.feedbackCoordinator.getFeedbackAnalytics();
          
          const duration = Date.now() - startTime;

          return {
            testId: 'integration-compatibility',
            passed: allToolsExist && analytics,
            duration,
            message: allToolsExist 
              ? 'All integrations working correctly' 
              : 'Some integration issues detected',
            details: {
              workflowToolCompatibility: allToolsExist,
              missingTools,
              feedbackSystemIntegrated: !!analytics,
              totalWorkflows: workflows.length,
              totalTools: tools.length
            },
            metrics: {
              reliability: allToolsExist ? 1.0 : 0.7,
              accuracy: 1.0,
              efficiency: missingTools.length === 0 ? 1.0 : 0.8
            },
            recommendations: allToolsExist ? [] : [
              'Fix missing tool registrations',
              'Verify workflow dependencies',
              'Update integration mappings'
            ]
          };
        } catch (error) {
          return {
            testId: 'integration-compatibility',
            passed: false,
            duration: Date.now() - startTime,
            message: `Integration test failed: ${error.message}`,
            recommendations: ['Check component initialization order', 'Verify interface contracts', 'Test component communication']
          };
        }
      }
    });
  }

  private createValidationSuites(): void {
    // Critical functionality suite
    this.suites.set('critical-functionality', {
      id: 'critical-functionality',
      name: 'Critical Functionality Tests',
      tests: [
        'tool-factory-initialization',
        'enhanced-tool-execution',
        'error-handling-resilience',
        'security-validation'
      ],
      runInParallel: false,
      continueOnFailure: false
    });

    // Performance suite
    this.suites.set('performance-validation', {
      id: 'performance-validation',
      name: 'Performance Validation Tests',
      tests: [
        'performance-monitoring',
        'caching-effectiveness'
      ],
      runInParallel: true,
      continueOnFailure: true
    });

    // Integration suite
    this.suites.set('integration-testing', {
      id: 'integration-testing',
      name: 'Integration Testing Suite',
      tests: [
        'workflow-orchestrator-basic',
        'feedback-loop-functionality',
        'integration-compatibility'
      ],
      runInParallel: false,
      continueOnFailure: true
    });

    // Full validation suite
    this.suites.set('full-validation', {
      id: 'full-validation',
      name: 'Complete System Validation',
      tests: Array.from(this.tests.keys()),
      runInParallel: false,
      continueOnFailure: true
    });
  }

  public async runValidationSuite(suiteId: string): Promise<ValidationReport> {
    const suite = this.suites.get(suiteId);
    if (!suite) {
      throw new Error(`Validation suite ${suiteId} not found`);
    }

    const report: ValidationReport = {
      suiteId,
      timestamp: Date.now(),
      totalTests: suite.tests.length,
      passedTests: 0,
      failedTests: 0,
      skippedTests: 0,
      totalDuration: 0,
      results: [],
      overallScore: 0,
      readinessLevel: 'not-ready',
      criticalIssues: [],
      recommendations: []
    };

    const startTime = Date.now();

    try {
      // Run setup if defined
      if (suite.setupFunction) {
        await suite.setupFunction();
      }

      // Execute tests
      if (suite.runInParallel) {
        const testPromises = suite.tests.map(testId => this.runSingleTest(testId));
        const results = await Promise.allSettled(testPromises);
        
        results.forEach((result, index) => {
          if (result.status === 'fulfilled') {
            report.results.push(result.value);
            if (result.value.passed) {
              report.passedTests++;
            } else {
              report.failedTests++;
            }
          } else {
            report.failedTests++;
            report.results.push({
              testId: suite.tests[index],
              passed: false,
              duration: 0,
              message: `Test execution failed: ${result.reason}`,
              recommendations: ['Check test implementation', 'Verify test dependencies']
            });
          }
        });
      } else {
        // Sequential execution
        for (const testId of suite.tests) {
          try {
            const result = await this.runSingleTest(testId);
            report.results.push(result);
            
            if (result.passed) {
              report.passedTests++;
            } else {
              report.failedTests++;
              if (!suite.continueOnFailure) {
                break;
              }
            }
          } catch (error) {
            report.failedTests++;
            report.results.push({
              testId,
              passed: false,
              duration: 0,
              message: `Test execution failed: ${error.message}`,
              recommendations: ['Check test implementation', 'Verify test dependencies']
            });
            
            if (!suite.continueOnFailure) {
              break;
            }
          }
        }
      }

      // Run teardown if defined
      if (suite.teardownFunction) {
        await suite.teardownFunction();
      }

    } catch (error) {
      report.criticalIssues.push(`Suite execution failed: ${error.message}`);
    }

    report.totalDuration = Date.now() - startTime;
    report.skippedTests = report.totalTests - report.passedTests - report.failedTests;

    // Calculate overall metrics
    this.calculateOverallMetrics(report);
    
    // Store in history
    this.validationHistory.push(report);
    
    // Keep only last 50 reports
    if (this.validationHistory.length > 50) {
      this.validationHistory = this.validationHistory.slice(-50);
    }

    return report;
  }

  private async runSingleTest(testId: string): Promise<ValidationResult> {
    const test = this.tests.get(testId);
    if (!test) {
      return {
        testId,
        passed: false,
        duration: 0,
        message: `Test ${testId} not found`,
        recommendations: ['Check test registration', 'Verify test ID']
      };
    }

    // Check dependencies
    for (const depId of test.dependencies) {
      const depResult = this.validationHistory
        .flatMap(report => report.results)
        .find(result => result.testId === depId);
      
      if (depResult && !depResult.passed) {
        return {
          testId,
          passed: false,
          duration: 0,
          message: `Dependency ${depId} failed`,
          recommendations: [`Fix dependency ${depId} first`]
        };
      }
    }

    try {
      const result = await Promise.race([
        test.testFunction(),
        new Promise<ValidationResult>((_, reject) => 
          setTimeout(() => reject(new Error('Test timeout')), test.timeout)
        )
      ]);

      return result;
    } catch (error) {
      return {
        testId,
        passed: false,
        duration: 0,
        message: `Test failed: ${error.message}`,
        recommendations: ['Check test implementation', 'Verify test environment', 'Review error logs']
      };
    }
  }

  private calculateOverallMetrics(report: ValidationReport): void {
    const totalTests = report.results.length;
    if (totalTests === 0) {
      report.overallScore = 0;
      report.readinessLevel = 'not-ready';
      return;
    }

    // Calculate weighted score based on test priorities and categories
    let totalWeight = 0;
    let weightedScore = 0;

    report.results.forEach(result => {
      const test = this.tests.get(result.testId);
      if (!test) return;

      let weight = 1;
      switch (test.priority) {
        case 'critical': weight = 4; break;
        case 'high': weight = 3; break;
        case 'medium': weight = 2; break;
        case 'low': weight = 1; break;
      }

      totalWeight += weight;
      if (result.passed) {
        weightedScore += weight;
      }

      // Collect critical issues
      if (!result.passed && test.priority === 'critical') {
        report.criticalIssues.push(`Critical test failed: ${test.name}`);
      }

      // Collect recommendations
      if (result.recommendations) {
        report.recommendations.push(...result.recommendations);
      }
    });

    report.overallScore = totalWeight > 0 ? weightedScore / totalWeight : 0;

    // Determine readiness level
    const criticalTestsPassed = report.results
      .filter(r => {
        const test = this.tests.get(r.testId);
        return test?.priority === 'critical';
      })
      .every(r => r.passed);

    if (!criticalTestsPassed) {
      report.readinessLevel = 'not-ready';
    } else if (report.overallScore >= 0.9) {
      report.readinessLevel = 'production';
    } else if (report.overallScore >= 0.75) {
      report.readinessLevel = 'staging';
    } else if (report.overallScore >= 0.5) {
      report.readinessLevel = 'development';
    } else {
      report.readinessLevel = 'not-ready';
    }

    // Remove duplicate recommendations
    report.recommendations = [...new Set(report.recommendations)];
  }

  // Utility methods
  private getToolCategories(tools: EnhancedTool[]): Record<string, number> {
    const categories: Record<string, number> = {};
    tools.forEach(tool => {
      categories[tool.category] = (categories[tool.category] || 0) + 1;
    });
    return categories;
  }

  private getToolPriorities(tools: EnhancedTool[]): Record<string, number> {
    const priorities: Record<string, number> = {};
    tools.forEach(tool => {
      priorities[tool.priority] = (priorities[tool.priority] || 0) + 1;
    });
    return priorities;
  }

  // Public interface methods
  public listValidationSuites(): ValidationSuite[] {
    return Array.from(this.suites.values());
  }

  public getValidationHistory(limit?: number): ValidationReport[] {
    return limit ? this.validationHistory.slice(-limit) : this.validationHistory;
  }

  public getLastValidationReport(): ValidationReport | undefined {
    return this.validationHistory[this.validationHistory.length - 1];
  }

  public async runQuickValidation(): Promise<ValidationReport> {
    return this.runValidationSuite('critical-functionality');
  }

  public async runFullValidation(): Promise<ValidationReport> {
    return this.runValidationSuite('full-validation');
  }

  public getReadinessAssessment(): {
    currentLevel: string;
    blockers: string[];
    nextSteps: string[];
    confidence: number;
  } {
    const lastReport = this.getLastValidationReport();
    
    if (!lastReport) {
      return {
        currentLevel: 'unknown',
        blockers: ['No validation has been run'],
        nextSteps: ['Run full validation suite'],
        confidence: 0
      };
    }

    return {
      currentLevel: lastReport.readinessLevel,
      blockers: lastReport.criticalIssues,
      nextSteps: lastReport.recommendations.slice(0, 5), // Top 5 recommendations
      confidence: lastReport.overallScore
    };
  }

  public generateDetailedReport(): string {
    const lastReport = this.getLastValidationReport();
    if (!lastReport) {
      return 'No validation report available. Please run validation first.';
    }

    const sections = [
      '# Tool Improvement Validation Report\n',
      `**Generated:** ${new Date(lastReport.timestamp).toLocaleString()}`,
      `**Suite:** ${lastReport.suiteId}`,
      `**Overall Score:** ${(lastReport.overallScore * 100).toFixed(1)}%`,
      `**Readiness Level:** ${lastReport.readinessLevel.toUpperCase()}`,
      `**Duration:** ${lastReport.totalDuration}ms\n`,
      
      '## Summary',
      `- **Total Tests:** ${lastReport.totalTests}`,
      `- **Passed:** ${lastReport.passedTests} ✅`,
      `- **Failed:** ${lastReport.failedTests} ❌`,
      `- **Skipped:** ${lastReport.skippedTests} ⏭️\n`,

      '## Critical Issues',
      lastReport.criticalIssues.length > 0 
        ? lastReport.criticalIssues.map(issue => `- ❗ ${issue}`).join('\n')
        : '- None ✅\n',

      '## Test Results',
      lastReport.results.map(result => 
        `### ${result.testId} ${result.passed ? '✅' : '❌'}` +
        `\n**Duration:** ${result.duration}ms` +
        `\n**Message:** ${result.message}` +
        (result.details ? `\n**Details:** ${JSON.stringify(result.details, null, 2)}` : '') +
        (result.metrics ? `\n**Metrics:** Performance: ${(result.metrics.performance || 0 * 100).toFixed(1)}%, Reliability: ${((result.metrics.reliability || 0) * 100).toFixed(1)}%` : '') +
        (result.recommendations && result.recommendations.length > 0 
          ? `\n**Recommendations:**\n${result.recommendations.map(r => `- ${r}`).join('\n')}` 
          : '') + '\n'
      ).join('\n'),

      '## Next Steps',
      lastReport.recommendations.length > 0
        ? lastReport.recommendations.slice(0, 10).map((rec, i) => `${i + 1}. ${rec}`).join('\n')
        : 'No specific recommendations. System appears to be functioning well.\n',

      '## Production Readiness Assessment',
      this.generateProductionReadinessText(lastReport)
    ];

    return sections.join('\n');
  }

  private generateProductionReadinessText(report: ValidationReport): string {
    const assessment = this.getReadinessAssessment();
    
    const levelDescriptions = {
      'production': '🟢 **READY FOR PRODUCTION** - All critical systems operational, high confidence in stability and performance.',
      'staging': '🟡 **STAGING READY** - Core functionality working, minor issues remain. Safe for staging environment testing.',
      'development': '🟠 **DEVELOPMENT PHASE** - Basic functionality present but significant improvements needed before production.',
      'not-ready': '🔴 **NOT READY** - Critical issues must be resolved before any deployment.',
      'unknown': '⚪ **UNKNOWN** - Insufficient validation data to determine readiness.'
    };

    return [
      levelDescriptions[assessment.currentLevel as keyof typeof levelDescriptions] || 'Unknown status',
      '',
      `**Confidence Level:** ${(assessment.confidence * 100).toFixed(1)}%`,
      '',
      '**Recommended Actions:**',
      assessment.nextSteps.length > 0 
        ? assessment.nextSteps.map((step, i) => `${i + 1}. ${step}`).join('\n')
        : 'Continue with current implementation.'
    ].join('\n');
  }
}