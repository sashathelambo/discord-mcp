/**
 * Monitoring and Alerting System for Discord MCP Server
 * 
 * Provides comprehensive observability, metrics collection, and alerting
 * capabilities for reliability monitoring and proactive issue detection.
 */

import { ErrorCategory, ErrorSeverity, MCPError } from './error-types.js';
import { CircuitBreakerMetrics, CircuitState } from './circuit-breaker.js';

export enum AlertSeverity {
  INFO = 'INFO',
  WARNING = 'WARNING',
  CRITICAL = 'CRITICAL',
  EMERGENCY = 'EMERGENCY'
}

export enum MetricType {
  COUNTER = 'COUNTER',
  GAUGE = 'GAUGE',
  HISTOGRAM = 'HISTOGRAM',
  SUMMARY = 'SUMMARY'
}

export interface Metric {
  name: string;
  type: MetricType;
  value: number;
  timestamp: Date;
  labels: Record<string, string>;
  help?: string;
}

export interface Alert {
  id: string;
  severity: AlertSeverity;
  title: string;
  description: string;
  timestamp: Date;
  source: string;
  labels: Record<string, string>;
  resolved: boolean;
  resolvedAt?: Date;
  metadata: Record<string, any>;
}

export interface HealthCheck {
  name: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: Date;
  duration: number;
  details: Record<string, any>;
  error?: string;
}

export interface SystemHealth {
  overall: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: Date;
  checks: HealthCheck[];
  metrics: Record<string, number>;
  alerts: Alert[];
}

/**
 * Metrics collector and aggregator
 */
export class MetricsCollector {
  private metrics = new Map<string, Metric>();
  private counters = new Map<string, number>();
  private gauges = new Map<string, number>();
  private histograms = new Map<string, number[]>();
  private summaries = new Map<string, { count: number; sum: number }>();

  /**
   * Record a counter metric
   */
  incrementCounter(
    name: string,
    value: number = 1,
    labels: Record<string, string> = {}
  ): void {
    const key = this.createMetricKey(name, labels);
    const current = this.counters.get(key) || 0;
    this.counters.set(key, current + value);

    this.updateMetric({
      name,
      type: MetricType.COUNTER,
      value: current + value,
      timestamp: new Date(),
      labels
    });
  }

  /**
   * Set a gauge metric
   */
  setGauge(
    name: string,
    value: number,
    labels: Record<string, string> = {}
  ): void {
    const key = this.createMetricKey(name, labels);
    this.gauges.set(key, value);

    this.updateMetric({
      name,
      type: MetricType.GAUGE,
      value,
      timestamp: new Date(),
      labels
    });
  }

  /**
   * Record a histogram observation
   */
  observeHistogram(
    name: string,
    value: number,
    labels: Record<string, string> = {}
  ): void {
    const key = this.createMetricKey(name, labels);
    const values = this.histograms.get(key) || [];
    values.push(value);
    this.histograms.set(key, values);

    // Keep only last 1000 values to prevent memory issues
    if (values.length > 1000) {
      values.shift();
    }

    this.updateMetric({
      name,
      type: MetricType.HISTOGRAM,
      value,
      timestamp: new Date(),
      labels
    });
  }

  /**
   * Record a summary observation
   */
  observeSummary(
    name: string,
    value: number,
    labels: Record<string, string> = {}
  ): void {
    const key = this.createMetricKey(name, labels);
    const summary = this.summaries.get(key) || { count: 0, sum: 0 };
    summary.count++;
    summary.sum += value;
    this.summaries.set(key, summary);

    this.updateMetric({
      name,
      type: MetricType.SUMMARY,
      value,
      timestamp: new Date(),
      labels
    });
  }

  /**
   * Get all current metrics
   */
  getMetrics(): Metric[] {
    return Array.from(this.metrics.values());
  }

  /**
   * Get specific metric
   */
  getMetric(name: string, labels: Record<string, string> = {}): Metric | undefined {
    const key = this.createMetricKey(name, labels);
    return this.metrics.get(key);
  }

  /**
   * Calculate histogram percentiles
   */
  getHistogramPercentiles(
    name: string,
    percentiles: number[],
    labels: Record<string, string> = {}
  ): Record<number, number> {
    const key = this.createMetricKey(name, labels);
    const values = this.histograms.get(key) || [];
    
    if (values.length === 0) {
      return {};
    }

    const sorted = values.slice().sort((a, b) => a - b);
    const result: Record<number, number> = {};

    for (const p of percentiles) {
      const index = Math.ceil((p / 100) * sorted.length) - 1;
      result[p] = sorted[Math.max(0, index)];
    }

    return result;
  }

  /**
   * Get summary statistics
   */
  getSummaryStats(
    name: string,
    labels: Record<string, string> = {}
  ): { count: number; sum: number; average: number } | undefined {
    const key = this.createMetricKey(name, labels);
    const summary = this.summaries.get(key);
    
    if (!summary) {
      return undefined;
    }

    return {
      count: summary.count,
      sum: summary.sum,
      average: summary.sum / summary.count
    };
  }

  private createMetricKey(name: string, labels: Record<string, string>): string {
    const labelStr = Object.entries(labels)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join(',');
    return labelStr ? `${name}{${labelStr}}` : name;
  }

  private updateMetric(metric: Metric): void {
    const key = this.createMetricKey(metric.name, metric.labels);
    this.metrics.set(key, metric);
  }
}

/**
 * Alert manager for handling and routing alerts
 */
export class AlertManager {
  private alerts = new Map<string, Alert>();
  private alertHandlers = new Set<(alert: Alert) => void>();
  private suppressions = new Map<string, Date>();

  /**
   * Create a new alert
   */
  createAlert(
    severity: AlertSeverity,
    title: string,
    description: string,
    source: string,
    labels: Record<string, string> = {},
    metadata: Record<string, any> = {}
  ): Alert {
    const id = this.generateAlertId(title, source, labels);
    
    // Check if alert is suppressed
    const suppressedUntil = this.suppressions.get(id);
    if (suppressedUntil && suppressedUntil > new Date()) {
      return this.alerts.get(id)!;
    }

    const alert: Alert = {
      id,
      severity,
      title,
      description,
      timestamp: new Date(),
      source,
      labels,
      resolved: false,
      metadata
    };

    this.alerts.set(id, alert);
    this.notifyHandlers(alert);

    return alert;
  }

  /**
   * Resolve an alert
   */
  resolveAlert(alertId: string): boolean {
    const alert = this.alerts.get(alertId);
    if (!alert || alert.resolved) {
      return false;
    }

    alert.resolved = true;
    alert.resolvedAt = new Date();
    this.notifyHandlers(alert);

    return true;
  }

  /**
   * Suppress alerts matching criteria for specified duration
   */
  suppressAlerts(
    pattern: Partial<Alert>,
    durationMs: number
  ): void {
    const suppressUntil = new Date(Date.now() + durationMs);
    
    for (const [id, alert] of this.alerts) {
      if (this.alertMatches(alert, pattern)) {
        this.suppressions.set(id, suppressUntil);
      }
    }
  }

  /**
   * Get all active alerts
   */
  getActiveAlerts(): Alert[] {
    return Array.from(this.alerts.values()).filter(alert => !alert.resolved);
  }

  /**
   * Get all alerts
   */
  getAllAlerts(): Alert[] {
    return Array.from(this.alerts.values());
  }

  /**
   * Register alert handler
   */
  onAlert(handler: (alert: Alert) => void): void {
    this.alertHandlers.add(handler);
  }

  /**
   * Remove alert handler
   */
  removeHandler(handler: (alert: Alert) => void): void {
    this.alertHandlers.delete(handler);
  }

  /**
   * Clear old resolved alerts
   */
  cleanupOldAlerts(maxAgeMs: number = 24 * 60 * 60 * 1000): void {
    const cutoff = new Date(Date.now() - maxAgeMs);
    
    for (const [id, alert] of this.alerts) {
      if (alert.resolved && alert.resolvedAt && alert.resolvedAt < cutoff) {
        this.alerts.delete(id);
      }
    }
  }

  private generateAlertId(
    title: string,
    source: string,
    labels: Record<string, string>
  ): string {
    const labelStr = Object.entries(labels)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join(',');
    return `${source}:${title}:${labelStr}`;
  }

  private alertMatches(alert: Alert, pattern: Partial<Alert>): boolean {
    for (const [key, value] of Object.entries(pattern)) {
      if (key === 'labels') {
        const patternLabels = value as Record<string, string>;
        for (const [labelKey, labelValue] of Object.entries(patternLabels)) {
          if (alert.labels[labelKey] !== labelValue) {
            return false;
          }
        }
      } else if ((alert as any)[key] !== value) {
        return false;
      }
    }
    return true;
  }

  private notifyHandlers(alert: Alert): void {
    for (const handler of this.alertHandlers) {
      try {
        handler(alert);
      } catch (error) {
        console.error('Alert handler error:', error);
      }
    }
  }
}

/**
 * Health checker for monitoring system components
 */
export class HealthChecker {
  private checks = new Map<string, () => Promise<HealthCheck>>();
  private lastResults = new Map<string, HealthCheck>();

  /**
   * Register a health check
   */
  registerCheck(
    name: string,
    checkFn: () => Promise<HealthCheck>
  ): void {
    this.checks.set(name, checkFn);
  }

  /**
   * Run all health checks
   */
  async runHealthChecks(): Promise<HealthCheck[]> {
    const results: HealthCheck[] = [];

    for (const [name, checkFn] of this.checks) {
      try {
        const result = await checkFn();
        results.push(result);
        this.lastResults.set(name, result);
      } catch (error) {
        const failedCheck: HealthCheck = {
          name,
          status: 'unhealthy',
          timestamp: new Date(),
          duration: 0,
          details: {},
          error: error instanceof Error ? error.message : String(error)
        };
        results.push(failedCheck);
        this.lastResults.set(name, failedCheck);
      }
    }

    return results;
  }

  /**
   * Get last health check results
   */
  getLastResults(): HealthCheck[] {
    return Array.from(this.lastResults.values());
  }

  /**
   * Get overall system health
   */
  async getSystemHealth(): Promise<SystemHealth> {
    const checks = await this.runHealthChecks();
    const unhealthy = checks.filter(c => c.status === 'unhealthy').length;
    const degraded = checks.filter(c => c.status === 'degraded').length;

    let overall: 'healthy' | 'degraded' | 'unhealthy';
    if (unhealthy > 0) {
      overall = 'unhealthy';
    } else if (degraded > 0) {
      overall = 'degraded';
    } else {
      overall = 'healthy';
    }

    return {
      overall,
      timestamp: new Date(),
      checks,
      metrics: {},
      alerts: []
    };
  }
}

/**
 * Reliability monitoring service
 */
export class ReliabilityMonitor {
  private metricsCollector = new MetricsCollector();
  private alertManager = new AlertManager();
  private healthChecker = new HealthChecker();
  private errorCounts = new Map<ErrorCategory, number>();
  private lastErrorTimes = new Map<ErrorCategory, Date>();

  constructor() {
    this.setupDefaultHealthChecks();
    this.setupDefaultAlertHandlers();
  }

  /**
   * Record an error occurrence
   */
  recordError(error: MCPError): void {
    const category = error.category;
    const severity = error.severity;

    // Update error counts
    const currentCount = this.errorCounts.get(category) || 0;
    this.errorCounts.set(category, currentCount + 1);
    this.lastErrorTimes.set(category, new Date());

    // Update metrics
    this.metricsCollector.incrementCounter(
      'errors_total',
      1,
      { category, severity, operation: error.metadata.operation }
    );

    this.metricsCollector.observeHistogram(
      'error_duration_ms',
      error.metadata.duration,
      { category, operation: error.metadata.operation }
    );

    // Create alerts based on severity and frequency
    this.checkErrorAlerts(category, severity, currentCount + 1);
  }

  /**
   * Record successful operation
   */
  recordSuccess(operation: string, duration: number): void {
    this.metricsCollector.incrementCounter(
      'operations_total',
      1,
      { operation, status: 'success' }
    );

    this.metricsCollector.observeHistogram(
      'operation_duration_ms',
      duration,
      { operation }
    );
  }

  /**
   * Record circuit breaker metrics
   */
  recordCircuitBreakerMetrics(
    name: string,
    metrics: CircuitBreakerMetrics
  ): void {
    this.metricsCollector.setGauge(
      'circuit_breaker_state',
      metrics.state === CircuitState.CLOSED ? 0 :
      metrics.state === CircuitState.HALF_OPEN ? 1 : 2,
      { name }
    );

    this.metricsCollector.setGauge(
      'circuit_breaker_failure_count',
      metrics.failureCount,
      { name }
    );

    this.metricsCollector.setGauge(
      'circuit_breaker_success_count',
      metrics.successCount,
      { name }
    );

    // Alert if circuit breaker is open
    if (metrics.state === CircuitState.OPEN) {
      this.alertManager.createAlert(
        AlertSeverity.WARNING,
        'Circuit Breaker Open',
        `Circuit breaker '${name}' is open due to failures`,
        'circuit_breaker',
        { name },
        { metrics }
      );
    }
  }

  /**
   * Get current metrics
   */
  getMetrics(): Metric[] {
    return this.metricsCollector.getMetrics();
  }

  /**
   * Get current alerts
   */
  getAlerts(): Alert[] {
    return this.alertManager.getAllAlerts();
  }

  /**
   * Get system health status
   */
  async getHealth(): Promise<SystemHealth> {
    const health = await this.healthChecker.getSystemHealth();
    health.metrics = this.getMetricsSummary();
    health.alerts = this.alertManager.getActiveAlerts();
    return health;
  }

  private setupDefaultHealthChecks(): void {
    // Basic system health check
    this.healthChecker.registerCheck('system', async () => {
      const start = Date.now();
      const activeAlerts = this.alertManager.getActiveAlerts();
      const criticalAlerts = activeAlerts.filter(a => 
        a.severity === AlertSeverity.CRITICAL || a.severity === AlertSeverity.EMERGENCY
      );

      return {
        name: 'system',
        status: criticalAlerts.length > 0 ? 'unhealthy' : 
                activeAlerts.length > 0 ? 'degraded' : 'healthy',
        timestamp: new Date(),
        duration: Date.now() - start,
        details: {
          activeAlerts: activeAlerts.length,
          criticalAlerts: criticalAlerts.length
        }
      };
    });

    // Error rate health check
    this.healthChecker.registerCheck('error_rate', async () => {
      const start = Date.now();
      const recentErrors = Array.from(this.lastErrorTimes.values())
        .filter(time => Date.now() - time.getTime() < 5 * 60 * 1000); // Last 5 minutes

      const errorRate = recentErrors.length;
      let status: 'healthy' | 'degraded' | 'unhealthy';
      
      if (errorRate > 20) {
        status = 'unhealthy';
      } else if (errorRate > 10) {
        status = 'degraded';
      } else {
        status = 'healthy';
      }

      return {
        name: 'error_rate',
        status,
        timestamp: new Date(),
        duration: Date.now() - start,
        details: {
          recentErrors: errorRate,
          timeWindow: '5 minutes'
        }
      };
    });
  }

  private setupDefaultAlertHandlers(): void {
    this.alertManager.onAlert((alert) => {
      const logLevel = alert.severity === AlertSeverity.CRITICAL || 
                      alert.severity === AlertSeverity.EMERGENCY ? 'error' : 'warn';
      
      console[logLevel](`[ALERT ${alert.severity}] ${alert.title}: ${alert.description}`, {
        alertId: alert.id,
        source: alert.source,
        labels: alert.labels,
        metadata: alert.metadata
      });
    });
  }

  private checkErrorAlerts(
    category: ErrorCategory,
    severity: ErrorSeverity,
    count: number
  ): void {
    // High error count alert
    if (count > 10 && count % 10 === 0) {
      this.alertManager.createAlert(
        AlertSeverity.WARNING,
        'High Error Count',
        `${category} errors have occurred ${count} times`,
        'error_monitor',
        { category },
        { count }
      );
    }

    // Critical error alert
    if (severity === ErrorSeverity.CRITICAL) {
      this.alertManager.createAlert(
        AlertSeverity.CRITICAL,
        'Critical Error Occurred',
        `Critical ${category} error detected`,
        'error_monitor',
        { category, severity },
        { count }
      );
    }
  }

  private getMetricsSummary(): Record<string, number> {
    const metrics = this.metricsCollector.getMetrics();
    const summary: Record<string, number> = {};

    for (const metric of metrics) {
      const key = `${metric.name}_${metric.type.toLowerCase()}`;
      summary[key] = metric.value;
    }

    return summary;
  }
}

// Global monitoring instance
export const reliabilityMonitor = new ReliabilityMonitor();