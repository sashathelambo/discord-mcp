#!/usr/bin/env node
/**
 * Discord MCP Server Performance Benchmark Example
 * 
 * Demonstrates how to use the benchmarking framework to test
 * and optimize Discord service performance in real-world scenarios.
 */

import { BenchmarkSuite, LoadTestRunner, PerformanceMonitor } from './benchmark-framework.js';
import { OptimizedDiscordService } from './optimized-discord-service.js';
import { DiscordService } from '../discord-service.js';

class DiscordPerformanceBenchmarks {
  private originalService: DiscordService;
  private optimizedService: OptimizedDiscordService;
  private benchmarkSuite: BenchmarkSuite;
  private monitor: PerformanceMonitor;
  
  constructor() {
    this.originalService = new DiscordService();
    this.optimizedService = new OptimizedDiscordService();
    this.benchmarkSuite = new BenchmarkSuite({
      warmupIterations: 5,
      testIterations: 50,
      concurrency: 1,
      timeout: 15000,
      memoryMonitoring: true
    });
    this.monitor = new PerformanceMonitor();
  }
  
  async initialize(): Promise<void> {
    console.log('Initializing Discord services for benchmarking...');
    
    // Initialize both services
    await Promise.all([
      this.originalService.initialize(),
      this.optimizedService.initialize()
    ]);
    
    // Start monitoring
    this.monitor.startMonitoring();
    
    // Setup monitoring alerts
    this.monitor.on('alert', (alert) => {
      console.warn(`ALERT [${alert.severity}]: ${alert.message}`);
    });
    
    this.monitor.on('metrics', (metrics) => {
      if (metrics.memoryUsage.heapUsed > 500 * 1024 * 1024) { // 500MB
        console.log(`High memory usage detected: ${(metrics.memoryUsage.heapUsed / 1024 / 1024).toFixed(2)}MB`);
      }
    });
    
    console.log('Services initialized successfully');
  }
  
  async runComparisonBenchmarks(): Promise<void> {
    console.log('\n=== Discord Service Performance Comparison ===\n');
    
    const testChannelId = process.env.TEST_CHANNEL_ID;
    const testGuildId = process.env.DISCORD_GUILD_ID;
    
    if (!testChannelId || !testGuildId) {
      console.error('TEST_CHANNEL_ID and DISCORD_GUILD_ID environment variables are required');
      return;
    }
    
    // Benchmark: Server Info Retrieval
    console.log('1. Server Info Retrieval Benchmark');
    const serverInfoResults = await Promise.all([
      this.benchmarkSuite.runBenchmark(
        'Original Service - Get Server Info',
        () => this.originalService.getServerInfo(testGuildId)
      ),
      this.benchmarkSuite.runBenchmark(
        'Optimized Service - Get Server Info',
        () => this.optimizedService.getServerInfo(testGuildId)
      )
    ]);
    
    // Benchmark: Message Operations
    console.log('2. Message Operations Benchmark');
    const messageResults = await Promise.all([
      this.benchmarkSuite.runBenchmark(
        'Original Service - Read Messages',
        () => this.originalService.readMessages(testChannelId, '10')
      ),
      this.benchmarkSuite.runBenchmark(
        'Optimized Service - Read Messages',
        () => this.optimizedService.readMessages(testChannelId, 10)
      )
    ]);
    
    // Benchmark: High-frequency operations (cache performance)
    console.log('3. High-Frequency Operations (Cache Performance)');
    const cacheResults = await this.benchmarkSuite.runSuite([
      {
        name: 'Original - Repeated Server Info',
        operation: () => this.originalService.getServerInfo(testGuildId)
      },
      {
        name: 'Optimized - Repeated Server Info',
        operation: () => this.optimizedService.getServerInfo(testGuildId)
      },
      {
        name: 'Original - Repeated Message Read',
        operation: () => this.originalService.readMessages(testChannelId, '10')
      },
      {
        name: 'Optimized - Repeated Message Read',
        operation: () => this.optimizedService.readMessages(testChannelId, 10)
      }
    ]);
    
    // Print comparison summary
    this.printComparisonSummary([...serverInfoResults, ...messageResults, ...cacheResults]);
  }
  
  async runLoadTests(): Promise<void> {
    console.log('\n=== Load Testing ===\n');
    
    const loadTester = new LoadTestRunner({
      warmupIterations: 5,
      testIterations: 200,
      timeout: 10000
    });
    
    const testChannelId = process.env.TEST_CHANNEL_ID!;
    
    // Load test: Message reading under increasing load
    const loadTestResults = await loadTester.runLoadTest(
      'Message Reading Load Test',
      () => this.optimizedService.readMessages(testChannelId, 5),
      {
        duration: 120000, // 2 minutes
        rampUpTime: 60000, // 1 minute ramp up
        maxConcurrency: 20,
        stepSize: 5
      }
    );
    
    console.log('\nLoad Test Results Summary:');
    loadTestResults.forEach(result => {
      console.log(`Concurrency ${result.name.split('-').pop()}: ${result.throughput.toFixed(2)} ops/sec, ${result.successRate.toFixed(1)}% success rate`);
    });
  }
  
  async runMemoryLeakTest(): Promise<void> {
    console.log('\n=== Memory Leak Detection Test ===\n');
    
    const testChannelId = process.env.TEST_CHANNEL_ID!;
    const iterations = 1000;
    let memoryGrowth = 0;
    
    // Baseline memory
    if (global.gc) global.gc();
    const baselineMemory = process.memoryUsage().heapUsed;
    
    console.log(`Baseline memory: ${(baselineMemory / 1024 / 1024).toFixed(2)}MB`);
    console.log(`Running ${iterations} operations to detect memory leaks...`);
    
    // Run operations
    for (let i = 0; i < iterations; i++) {
      await this.optimizedService.readMessages(testChannelId, 10);
      
      // Check memory every 100 iterations
      if (i % 100 === 0) {
        if (global.gc) global.gc();
        const currentMemory = process.memoryUsage().heapUsed;
        const growth = currentMemory - baselineMemory;
        
        console.log(`Iteration ${i}: ${(currentMemory / 1024 / 1024).toFixed(2)}MB (+${(growth / 1024 / 1024).toFixed(2)}MB)`);
        
        if (i === iterations - 100) {
          memoryGrowth = growth;
        }
      }
    }
    
    // Final memory check
    if (global.gc) global.gc();
    const finalMemory = process.memoryUsage().heapUsed;
    const totalGrowth = finalMemory - baselineMemory;
    
    console.log(`\nMemory Leak Test Results:`);
    console.log(`Final memory: ${(finalMemory / 1024 / 1024).toFixed(2)}MB`);
    console.log(`Total growth: ${(totalGrowth / 1024 / 1024).toFixed(2)}MB`);
    console.log(`Growth per operation: ${(totalGrowth / iterations / 1024).toFixed(2)}KB`);
    
    // Memory leak threshold: more than 100KB growth per 1000 operations
    if (totalGrowth > 100 * 1024) {
      console.warn('⚠️  Potential memory leak detected!');
    } else {
      console.log('✅ No significant memory leaks detected');
    }
  }
  
  async runConcurrencyTest(): Promise<void> {
    console.log('\n=== Concurrency Test ===\n');
    
    const testChannelId = process.env.TEST_CHANNEL_ID!;
    const testGuildId = process.env.DISCORD_GUILD_ID!;
    
    // Test concurrent operations
    const concurrencyLevels = [1, 5, 10, 20];
    
    for (const concurrency of concurrencyLevels) {
      console.log(`Testing concurrency level: ${concurrency}`);
      
      const result = await this.benchmarkSuite.runBenchmark(
        `Concurrent Operations (${concurrency})`,
        async () => {
          const promises = Array.from({ length: concurrency }, (_, i) => {
            // Alternate between different operations
            if (i % 3 === 0) {
              return this.optimizedService.getServerInfo(testGuildId);
            } else if (i % 3 === 1) {
              return this.optimizedService.readMessages(testChannelId, 5);
            } else {
              return this.optimizedService.readMessages(testChannelId, 10);
            }
          });
          
          return Promise.all(promises);
        },
        {
          testIterations: 20,
          concurrency: 1 // Sequential execution of concurrent batches
        }
      );
      
      console.log(`Concurrency ${concurrency}: ${result.throughput.toFixed(2)} batch/sec, ${result.averageTime.toFixed(2)}ms avg`);
    }
  }
  
  private printComparisonSummary(results: any[]): void {
    console.log('\n=== Performance Comparison Summary ===\n');
    
    const originalResults = results.filter(r => r.name.includes('Original'));
    const optimizedResults = results.filter(r => r.name.includes('Optimized'));
    
    console.log('Performance Improvements:');
    console.log('------------------------');
    
    for (let i = 0; i < Math.min(originalResults.length, optimizedResults.length); i++) {
      const original = originalResults[i];
      const optimized = optimizedResults[i];
      
      const speedImprovement = ((original.averageTime - optimized.averageTime) / original.averageTime * 100);
      const throughputImprovement = ((optimized.throughput - original.throughput) / original.throughput * 100);
      const memoryImprovement = ((original.memoryDelta - optimized.memoryDelta) / Math.abs(original.memoryDelta) * 100);
      
      console.log(`\n${original.name.replace('Original Service - ', '')}:`);
      console.log(`  Speed improvement: ${speedImprovement > 0 ? '+' : ''}${speedImprovement.toFixed(1)}%`);
      console.log(`  Throughput improvement: ${throughputImprovement > 0 ? '+' : ''}${throughputImprovement.toFixed(1)}%`);
      console.log(`  Memory efficiency: ${memoryImprovement > 0 ? '+' : ''}${memoryImprovement.toFixed(1)}%`);
      
      console.log(`  Original: ${original.averageTime.toFixed(2)}ms avg, ${original.throughput.toFixed(2)} ops/sec`);
      console.log(`  Optimized: ${optimized.averageTime.toFixed(2)}ms avg, ${optimized.throughput.toFixed(2)} ops/sec`);
    }
  }
  
  async generateDetailedReport(): Promise<string> {
    const metrics = this.monitor.getMetrics();
    const history = this.monitor.getMetricsHistory();
    const optimizedMetrics = this.optimizedService.getPerformanceMetrics();
    
    const report = `
# Discord MCP Server Performance Report
Generated: ${new Date().toISOString()}

## Executive Summary
This report provides detailed performance analysis of the Discord MCP server
implementation, comparing baseline and optimized versions across multiple metrics.

## Current Performance Metrics
- Average Response Time: ${optimizedMetrics.averageResponseTime}
- P95 Response Time: ${optimizedMetrics.p95ResponseTime}  
- Cache Hit Rate: ${optimizedMetrics.cacheHitRate}
- Error Rate: ${optimizedMetrics.errorRate}
- API Calls: ${optimizedMetrics.apiCalls}

## Memory Usage
- Heap Used: ${(metrics.memoryUsage.heapUsed / 1024 / 1024).toFixed(2)}MB
- Heap Total: ${(metrics.memoryUsage.heapTotal / 1024 / 1024).toFixed(2)}MB
- RSS: ${(metrics.memoryUsage.rss / 1024 / 1024).toFixed(2)}MB
- External: ${(metrics.memoryUsage.external / 1024 / 1024).toFixed(2)}MB

## Cache Performance
- Memory Usage: ${optimizedMetrics.cacheStats.memoryUsageMB.toFixed(2)}MB
- Cache Size: ${optimizedMetrics.cacheStats.size} entries
- Hit Rate: ${optimizedMetrics.cacheStats.hitRate.toFixed(2)}

## Connection Pool Status
HTTP Connections:
- Active Sockets: ${Object.keys(optimizedMetrics.connectionStats.http.sockets || {}).length}
- Free Sockets: ${Object.keys(optimizedMetrics.connectionStats.http.freeSockets || {}).length}

HTTPS Connections:  
- Active Sockets: ${Object.keys(optimizedMetrics.connectionStats.https.sockets || {}).length}
- Free Sockets: ${Object.keys(optimizedMetrics.connectionStats.https.freeSockets || {}).length}

## Health Status
Service Health: ${this.optimizedService.isHealthy() ? '✅ Healthy' : '❌ Unhealthy'}

## Recommendations
${this.generateRecommendations(metrics, optimizedMetrics)}

---
Report generated by Discord MCP Performance Monitoring System
`;
    
    return report;
  }
  
  private generateRecommendations(metrics: any, optimizedMetrics: any): string {
    const recommendations = [];
    
    // Memory recommendations
    const heapUsedMB = metrics.memoryUsage.heapUsed / 1024 / 1024;
    if (heapUsedMB > 512) {
      recommendations.push('• Consider reducing cache size limits or increasing garbage collection frequency');
    }
    
    // Performance recommendations  
    const avgResponseTime = parseFloat(optimizedMetrics.averageResponseTime);
    if (avgResponseTime > 500) {
      recommendations.push('• Response times are elevated - consider optimizing API calls or increasing cache hit rates');
    }
    
    // Cache recommendations
    const cacheHitRate = optimizedMetrics.cacheStats.hitRate;
    if (cacheHitRate < 70) {
      recommendations.push('• Cache hit rate is low - consider adjusting cache TTL or improving cache key strategies');
    }
    
    // Error rate recommendations
    const errorRate = parseFloat(optimizedMetrics.errorRate);
    if (errorRate > 2) {
      recommendations.push('• Error rate is elevated - investigate API failures and implement better error handling');
    }
    
    if (recommendations.length === 0) {
      recommendations.push('• Performance metrics are within acceptable ranges');
      recommendations.push('• Continue monitoring and consider load testing for higher traffic scenarios');
    }
    
    return recommendations.join('\n');
  }
  
  async cleanup(): Promise<void> {
    console.log('\nCleaning up benchmark resources...');
    
    this.monitor.stopMonitoring();
    await this.optimizedService.cleanup();
    
    // Note: Don't cleanup originalService as it may not have cleanup method
    
    console.log('Benchmark cleanup complete');
  }
}

// Main execution function
async function main(): Promise<void> {
  const benchmarks = new DiscordPerformanceBenchmarks();
  
  try {
    await benchmarks.initialize();
    
    // Run all benchmark suites
    await benchmarks.runComparisonBenchmarks();
    await benchmarks.runMemoryLeakTest();
    await benchmarks.runConcurrencyTest();
    
    // Skip load tests in CI/automated environments
    if (!process.env.CI) {
      await benchmarks.runLoadTests();
    }
    
    // Generate final report
    const report = await benchmarks.generateDetailedReport();
    console.log('\n' + report);
    
    // Save report to file
    const fs = await import('fs');
    const reportPath = `./performance-report-${Date.now()}.md`;
    fs.writeFileSync(reportPath, report);
    console.log(`\nDetailed report saved to: ${reportPath}`);
    
  } catch (error) {
    console.error('Benchmark execution failed:', error);
    process.exit(1);
  } finally {
    await benchmarks.cleanup();
  }
}

// Run benchmarks if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export default DiscordPerformanceBenchmarks;