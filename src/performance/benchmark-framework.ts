#!/usr/bin/env node
/**
 * Discord MCP Server Performance Benchmarking Framework
 * 
 * Enterprise-grade performance testing and monitoring capabilities
 * for continuous performance validation and optimization tracking.
 */

import { performance, PerformanceObserver } from 'perf_hooks';
import { EventEmitter } from 'events';

// Performance Metrics Interfaces
export interface BenchmarkResult {
  name: string;
  operations: number;
  totalTime: number;
  averageTime: number;
  minTime: number;
  maxTime: number;
  memoryDelta: number;
  throughput: number;
  successRate: number;
  errors: string[];
}

export interface PerformanceMetrics {
  timestamp: number;
  memoryUsage: NodeJS.MemoryUsage;
  cpuUsage: NodeJS.CpuUsage;
  requestLatency: number[];
  cacheHitRate: number;
  activeConnections: number;
  errorRate: number;
  throughput: number;
  gcStats?: {
    duration: number;
    type: string;
    reclaimed: number;
  };
}

export interface BenchmarkConfig {
  warmupIterations: number;
  testIterations: number;
  concurrency: number;
  timeout: number;
  memoryMonitoring: boolean;
  reportingInterval: number;
}

// Performance Monitor Class
export class PerformanceMonitor extends EventEmitter {
  private metrics: PerformanceMetrics;
  private metricsHistory: PerformanceMetrics[] = [];
  private isMonitoring = false;
  private monitoringInterval?: NodeJS.Timer;
  private performanceObserver?: PerformanceObserver;
  
  constructor() {
    super();
    this.metrics = this.initializeMetrics();
    this.setupPerformanceObserver();
  }
  
  private initializeMetrics(): PerformanceMetrics {
    return {
      timestamp: Date.now(),
      memoryUsage: process.memoryUsage(),
      cpuUsage: process.cpuUsage(),
      requestLatency: [],
      cacheHitRate: 0,
      activeConnections: 0,
      errorRate: 0,
      throughput: 0
    };
  }
  
  private setupPerformanceObserver(): void {
    this.performanceObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.entryType === 'measure') {
          this.metrics.requestLatency.push(entry.duration);
          
          // Keep only recent measurements (last 1000)
          if (this.metrics.requestLatency.length > 1000) {
            this.metrics.requestLatency = this.metrics.requestLatency.slice(-1000);
          }
        }
      }
    });
    
    this.performanceObserver.observe({ entryTypes: ['measure', 'mark'] });
  }
  
  startMonitoring(interval = 30000): void {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    this.monitoringInterval = setInterval(() => {
      this.collectMetrics();
      this.emit('metrics', this.metrics);
      
      // Store metrics history
      this.metricsHistory.push({ ...this.metrics });
      
      // Keep only last 2 hours of metrics (240 data points at 30s intervals)
      if (this.metricsHistory.length > 240) {
        this.metricsHistory = this.metricsHistory.slice(-240);
      }
      
      this.checkThresholds();
    }, interval);
    
    // Monitor garbage collection if available
    this.monitorGarbageCollection();
  }
  
  stopMonitoring(): void {
    if (!this.isMonitoring) return;
    
    this.isMonitoring = false;
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }
    
    this.performanceObserver?.disconnect();
  }
  
  private collectMetrics(): void {
    this.metrics.timestamp = Date.now();
    this.metrics.memoryUsage = process.memoryUsage();
    this.metrics.cpuUsage = process.cpuUsage();
    
    // Calculate throughput based on recent request latencies
    if (this.metrics.requestLatency.length > 0) {
      const recentRequests = this.metrics.requestLatency.slice(-100);
      this.metrics.throughput = (recentRequests.length / 
        (recentRequests.reduce((sum, latency) => sum + latency, 0) / 1000));
    }
  }
  
  private monitorGarbageCollection(): void {
    if (typeof global.gc === 'function') {
      const originalGC = global.gc;
      global.gc = () => {
        const start = performance.now();
        const beforeMemory = process.memoryUsage();
        
        originalGC();
        
        const duration = performance.now() - start;
        const afterMemory = process.memoryUsage();
        const reclaimed = beforeMemory.heapUsed - afterMemory.heapUsed;
        
        this.metrics.gcStats = {
          duration,
          type: 'manual',
          reclaimed
        };
        
        this.emit('gc', this.metrics.gcStats);
      };
    }
  }
  
  private checkThresholds(): void {
    const { heapUsed, heapTotal, rss } = this.metrics.memoryUsage;
    const heapUsagePercent = (heapUsed / heapTotal) * 100;
    
    // Memory threshold alerts
    if (heapUsagePercent > 85) {
      this.emit('alert', {
        type: 'memory',
        severity: 'critical',
        message: `High heap usage: ${heapUsagePercent.toFixed(2)}%`,
        metrics: this.metrics
      });
    }
    
    // Response time threshold alerts
    if (this.metrics.requestLatency.length > 10) {
      const avgLatency = this.metrics.requestLatency.slice(-10)
        .reduce((sum, lat) => sum + lat, 0) / 10;
      
      if (avgLatency > 1000) { // 1 second
        this.emit('alert', {
          type: 'latency',
          severity: 'warning',
          message: `High average latency: ${avgLatency.toFixed(2)}ms`,
          metrics: this.metrics
        });
      }
    }
  }
  
  measureOperation<T>(name: string, operation: () => Promise<T>): Promise<T> {
    performance.mark(`${name}-start`);
    
    return operation()
      .then(result => {
        performance.mark(`${name}-end`);
        performance.measure(name, `${name}-start`, `${name}-end`);
        return result;
      })
      .catch(error => {
        performance.mark(`${name}-error`);
        performance.measure(`${name}-error`, `${name}-start`, `${name}-error`);
        throw error;
      });
  }
  
  getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }
  
  getMetricsHistory(): PerformanceMetrics[] {
    return [...this.metricsHistory];
  }
  
  generateReport(): string {
    const latencies = this.metrics.requestLatency;
    const memUsage = this.metrics.memoryUsage;
    
    const avgLatency = latencies.length > 0 ? 
      latencies.reduce((sum, lat) => sum + lat, 0) / latencies.length : 0;
    const p95Latency = latencies.length > 0 ? 
      latencies.sort((a, b) => a - b)[Math.floor(latencies.length * 0.95)] : 0;
    
    return `
=== Performance Report ===
Timestamp: ${new Date(this.metrics.timestamp).toISOString()}

Memory Usage:
- Heap Used: ${(memUsage.heapUsed / 1024 / 1024).toFixed(2)} MB
- Heap Total: ${(memUsage.heapTotal / 1024 / 1024).toFixed(2)} MB
- RSS: ${(memUsage.rss / 1024 / 1024).toFixed(2)} MB
- External: ${(memUsage.external / 1024 / 1024).toFixed(2)} MB

Performance:
- Average Latency: ${avgLatency.toFixed(2)} ms
- P95 Latency: ${p95Latency.toFixed(2)} ms
- Throughput: ${this.metrics.throughput.toFixed(2)} req/sec
- Cache Hit Rate: ${this.metrics.cacheHitRate.toFixed(2)}%
- Error Rate: ${this.metrics.errorRate.toFixed(2)}%
- Active Connections: ${this.metrics.activeConnections}
`;
  }
}

// Benchmark Suite Class
export class BenchmarkSuite {
  private monitor: PerformanceMonitor;
  private config: BenchmarkConfig;
  
  constructor(config: Partial<BenchmarkConfig> = {}) {
    this.config = {
      warmupIterations: 10,
      testIterations: 100,
      concurrency: 1,
      timeout: 30000,
      memoryMonitoring: true,
      reportingInterval: 1000,
      ...config
    };
    
    this.monitor = new PerformanceMonitor();
  }
  
  async runBenchmark<T>(
    name: string,
    operation: () => Promise<T>,
    config?: Partial<BenchmarkConfig>
  ): Promise<BenchmarkResult> {
    const testConfig = { ...this.config, ...config };
    const results: number[] = [];
    const errors: string[] = [];
    let successCount = 0;
    
    console.log(`Starting benchmark: ${name}`);
    console.log(`Config: ${JSON.stringify(testConfig, null, 2)}`);
    
    // Warmup phase
    console.log(`Warmup phase: ${testConfig.warmupIterations} iterations`);
    for (let i = 0; i < testConfig.warmupIterations; i++) {
      try {
        await operation();
      } catch (error) {
        console.warn(`Warmup iteration ${i + 1} failed:`, error);
      }
    }
    
    // Force garbage collection before test
    if (global.gc) {
      global.gc();
    }
    
    const startMemory = process.memoryUsage();
    const startTime = performance.now();
    
    // Test phase
    console.log(`Test phase: ${testConfig.testIterations} iterations`);
    
    if (testConfig.concurrency === 1) {
      // Sequential execution
      for (let i = 0; i < testConfig.testIterations; i++) {
        try {
          const operationStart = performance.now();
          await Promise.race([
            operation(),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Operation timeout')), testConfig.timeout)
            )
          ]);
          const operationTime = performance.now() - operationStart;
          results.push(operationTime);
          successCount++;
        } catch (error) {
          errors.push(`Iteration ${i + 1}: ${error instanceof Error ? error.message : String(error)}`);
        }
        
        // Progress reporting
        if ((i + 1) % testConfig.reportingInterval === 0) {
          console.log(`Progress: ${i + 1}/${testConfig.testIterations} iterations completed`);
        }
      }
    } else {
      // Concurrent execution
      const batches = Math.ceil(testConfig.testIterations / testConfig.concurrency);
      
      for (let batch = 0; batch < batches; batch++) {
        const batchStart = batch * testConfig.concurrency;
        const batchEnd = Math.min(batchStart + testConfig.concurrency, testConfig.testIterations);
        const batchPromises: Promise<void>[] = [];
        
        for (let i = batchStart; i < batchEnd; i++) {
          batchPromises.push(
            (async () => {
              try {
                const operationStart = performance.now();
                await Promise.race([
                  operation(),
                  new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Operation timeout')), testConfig.timeout)
                  )
                ]);
                const operationTime = performance.now() - operationStart;
                results.push(operationTime);
                successCount++;
              } catch (error) {
                errors.push(`Iteration ${i + 1}: ${error instanceof Error ? error.message : String(error)}`);
              }
            })()
          );
        }
        
        await Promise.all(batchPromises);
        console.log(`Batch ${batch + 1}/${batches} completed`);
      }
    }
    
    const endTime = performance.now();
    const endMemory = process.memoryUsage();
    
    // Calculate statistics
    const totalTime = endTime - startTime;
    const averageTime = results.length > 0 ? results.reduce((sum, time) => sum + time, 0) / results.length : 0;
    const minTime = results.length > 0 ? Math.min(...results) : 0;
    const maxTime = results.length > 0 ? Math.max(...results) : 0;
    const memoryDelta = endMemory.heapUsed - startMemory.heapUsed;
    const throughput = successCount / (totalTime / 1000);
    const successRate = (successCount / testConfig.testIterations) * 100;
    
    const result: BenchmarkResult = {
      name,
      operations: testConfig.testIterations,
      totalTime,
      averageTime,
      minTime,
      maxTime,
      memoryDelta,
      throughput,
      successRate,
      errors: errors.slice(0, 10) // Limit to first 10 errors
    };
    
    console.log(this.formatBenchmarkResult(result));
    
    return result;
  }
  
  async runSuite(benchmarks: Array<{ name: string; operation: () => Promise<any> }>): Promise<BenchmarkResult[]> {
    console.log(`\n=== Starting Benchmark Suite ===`);
    console.log(`Running ${benchmarks.length} benchmarks...\n`);
    
    const results: BenchmarkResult[] = [];
    
    for (const { name, operation } of benchmarks) {
      const result = await this.runBenchmark(name, operation);
      results.push(result);
      
      // Brief pause between benchmarks
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log(`\n=== Benchmark Suite Complete ===`);
    this.printSuiteSummary(results);
    
    return results;
  }
  
  private formatBenchmarkResult(result: BenchmarkResult): string {
    return `
=== Benchmark Results: ${result.name} ===
Operations: ${result.operations}
Total Time: ${result.totalTime.toFixed(2)} ms
Average Time: ${result.averageTime.toFixed(2)} ms
Min Time: ${result.minTime.toFixed(2)} ms
Max Time: ${result.maxTime.toFixed(2)} ms
Throughput: ${result.throughput.toFixed(2)} ops/sec
Success Rate: ${result.successRate.toFixed(2)}%
Memory Delta: ${(result.memoryDelta / 1024 / 1024).toFixed(2)} MB
Errors: ${result.errors.length}
`;
  }
  
  private printSuiteSummary(results: BenchmarkResult[]): void {
    console.log(`\n=== Suite Summary ===`);
    console.log(`Total Benchmarks: ${results.length}`);
    console.log(`\nPerformance Rankings (by throughput):`);
    
    const sortedResults = [...results].sort((a, b) => b.throughput - a.throughput);
    sortedResults.forEach((result, index) => {
      console.log(`${index + 1}. ${result.name}: ${result.throughput.toFixed(2)} ops/sec`);
    });
    
    console.log(`\nMemory Impact (by memory delta):`);
    const memoryResults = [...results].sort((a, b) => b.memoryDelta - a.memoryDelta);
    memoryResults.forEach((result, index) => {
      const memoryMB = (result.memoryDelta / 1024 / 1024).toFixed(2);
      console.log(`${index + 1}. ${result.name}: ${memoryMB} MB`);
    });
  }
  
  exportResults(results: BenchmarkResult[], format: 'json' | 'csv' = 'json'): string {
    if (format === 'csv') {
      const headers = ['name', 'operations', 'totalTime', 'averageTime', 'minTime', 'maxTime', 
                     'memoryDelta', 'throughput', 'successRate', 'errorCount'];
      const csvRows = [
        headers.join(','),
        ...results.map(r => [
          r.name, r.operations, r.totalTime.toFixed(2), r.averageTime.toFixed(2),
          r.minTime.toFixed(2), r.maxTime.toFixed(2), r.memoryDelta, 
          r.throughput.toFixed(2), r.successRate.toFixed(2), r.errors.length
        ].join(','))
      ];
      
      return csvRows.join('\n');
    }
    
    return JSON.stringify(results, null, 2);
  }
  
  getMonitor(): PerformanceMonitor {
    return this.monitor;
  }
}

// Load Testing Utilities
export class LoadTestRunner {
  private suite: BenchmarkSuite;
  
  constructor(config?: Partial<BenchmarkConfig>) {
    this.suite = new BenchmarkSuite(config);
  }
  
  async runLoadTest(
    name: string,
    operation: () => Promise<any>,
    options: {
      duration: number; // milliseconds
      rampUpTime: number; // milliseconds
      maxConcurrency: number;
      stepSize: number;
    }
  ): Promise<BenchmarkResult[]> {
    const { duration, rampUpTime, maxConcurrency, stepSize } = options;
    const results: BenchmarkResult[] = [];
    
    console.log(`\n=== Load Test: ${name} ===`);
    console.log(`Duration: ${duration / 1000}s`);
    console.log(`Ramp up time: ${rampUpTime / 1000}s`);
    console.log(`Max concurrency: ${maxConcurrency}`);
    console.log(`Step size: ${stepSize}`);
    
    const stepDuration = rampUpTime / Math.ceil(maxConcurrency / stepSize);
    let currentConcurrency = stepSize;
    
    while (currentConcurrency <= maxConcurrency) {
      console.log(`\nTesting with concurrency: ${currentConcurrency}`);
      
      const testDuration = Math.min(duration, stepDuration);
      const iterations = Math.ceil((testDuration / 1000) * currentConcurrency);
      
      const result = await this.suite.runBenchmark(
        `${name}-concurrency-${currentConcurrency}`,
        operation,
        {
          testIterations: iterations,
          concurrency: currentConcurrency,
          timeout: 10000
        }
      );
      
      results.push(result);
      currentConcurrency += stepSize;
    }
    
    return results;
  }
}

export default BenchmarkSuite;