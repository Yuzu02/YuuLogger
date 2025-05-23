import * as os from "os";
import { Controller, Get, Header, Inject, Optional } from "@nestjs/common";
import { YUU_LOG_OPTIONS } from "../../YuuLogger.module";
import { SystemInfo } from "../../interfaces/SystemInfo.interface";
import { YuuLogOptions } from "../../interfaces/YuuLogger.interfaces";
import { YuuLogService } from "../../services/YuuLogger.service";

/**
 * Controller to expose metrics and statistics
 *
 * This controller provides endpoints to monitor application performance
 * and behavior in real time.
 */
@Controller("metrics")
export class MetricsController {
  private readonly logger = YuuLogService.getLogger();

  constructor(
    @Optional() @Inject(YUU_LOG_OPTIONS) private options: YuuLogOptions = {},
  ) {}

  /**
   * Gets general system information
   *
   * @returns Basic system information
   */
  @Get("system")
  getSystemInfo(): SystemInfo {
    const formatBytes = (bytes: number): string => {
      if (bytes < 1024) return `${bytes} B`;
      const k = 1024;
      const sizes = ["B", "KB", "MB", "GB", "TB"];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
    };

    const formatUptime = (seconds: number): string => {
      const days = Math.floor(seconds / 86400);
      const hours = Math.floor((seconds % 86400) / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      const secs = Math.floor(seconds % 60);

      return `${days}d ${hours}h ${minutes}m ${secs}s`;
    };

    return {
      hostname: os.hostname(),
      platform: os.platform(),
      arch: os.arch(),
      totalMemory: formatBytes(os.totalmem()),
      freeMemory: formatBytes(os.freemem()),
      uptime: formatUptime(os.uptime()),
      cpuLoad: os.loadavg(),
      nodeVersion: process.version,
    };
  }

  /**
   * Gets recorded performance statistics
   *
   * @returns Performance statistics
   */
  @Get("performance")
  getPerformanceStats(): Record<string, unknown> {
    const memoryUsage = process.memoryUsage();

    const formatMemoryUsage = (data: number): string => {
      return `${Math.round((data / 1024 / 1024) * 100) / 100} MB`;
    };

    const performanceMetrics = {
      memory: {
        rss: formatMemoryUsage(memoryUsage.rss), // Total allocated memory
        heapTotal: formatMemoryUsage(memoryUsage.heapTotal), // Total memory reserved for V8
        heapUsed: formatMemoryUsage(memoryUsage.heapUsed), // Memory currently used by V8
        external: formatMemoryUsage(memoryUsage.external), // Memory used by external objects
        arrayBuffers: formatMemoryUsage(memoryUsage.arrayBuffers || 0), // Memory used by buffers
      },
      process: {
        pid: process.pid,
        uptime: `${Math.floor(process.uptime())} seconds`,
      },
    };

    return performanceMetrics;
  }

  /**
   * Gets statistics of generated logs
   *
   * This endpoint provides information such as:
   * - How many logs have been generated by level
   * - Recorded performance metrics
   * - Information about performance profiles
   *
   * @returns Log statistics
   */
  @Get("logs")
  getLogStats(): Record<string, unknown> {
    // Use the new function to get statistics
    return this.logger.getLogStats();
  }

  /**
   * Resets statistics counters
   *
   * @returns Confirmation message
   */
  @Get("reset")
  resetStats(): Record<string, unknown> {
    this.logger.resetLogCounters();
    this.logger.clearPerformanceMetrics();

    return {
      status: "success",
      message: "Log statistics and performance metrics reset",
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Endpoint to check the health of the logging service
   *
   * @returns Health status of the service
   */
  @Get("health")
  healthCheck(): Record<string, unknown> {
    return {
      status: "ok",
      timestamp: new Date().toISOString(),
      appName: this.options.appName || "NestJS",
      enabledLogLevels: this.options.logLevels || [],
    };
  }

  /**
   * Exports metrics in Prometheus format for integration with monitoring systems
   *
   * @returns Plain text with metrics in Prometheus format
   */
  @Get("prometheus")
  @Header("Content-Type", "text/plain")
  getPrometheusMetrics(): string {
    // Get statistics
    const logStats = this.logger.getLogStats();
    const memoryUsage = process.memoryUsage();

    // Build metrics in Prometheus format
    const lines: string[] = [];

    // Add metadata and comments
    lines.push(
      "# HELP yuulog_logs_total Total number of logs generated by level",
    );
    lines.push("# TYPE yuulog_logs_total counter");

    // Convert log counters by level
    if (logStats.byLevel) {
      Object.entries(logStats.byLevel as Record<string, number>).forEach(
        ([level, count]) => {
          lines.push(`yuulog_logs_total{level="${level}"} ${count}`);
        },
      );
    }

    // Export memory metrics
    lines.push("# HELP nodejs_memory_usage_bytes Memory usage by Node.js");
    lines.push("# TYPE nodejs_memory_usage_bytes gauge");
    lines.push(`nodejs_memory_usage_bytes{type="rss"} ${memoryUsage.rss}`);
    lines.push(
      `nodejs_memory_usage_bytes{type="heapTotal"} ${memoryUsage.heapTotal}`,
    );
    lines.push(
      `nodejs_memory_usage_bytes{type="heapUsed"} ${memoryUsage.heapUsed}`,
    );
    lines.push(
      `nodejs_memory_usage_bytes{type="external"} ${memoryUsage.external}`,
    );
    if (memoryUsage.arrayBuffers) {
      lines.push(
        `nodejs_memory_usage_bytes{type="arrayBuffers"} ${memoryUsage.arrayBuffers}`,
      );
    }

    // Export active profiles
    lines.push(
      "# HELP yuulog_active_profiles Number of active performance profiles",
    );
    lines.push("# TYPE yuulog_active_profiles gauge");
    lines.push(`yuulog_active_profiles ${logStats.activeProfiles || 0}`);

    // Process information
    lines.push("# HELP nodejs_process_uptime_seconds Uptime in seconds");
    lines.push("# TYPE nodejs_process_uptime_seconds gauge");
    lines.push(`nodejs_process_uptime_seconds ${process.uptime()}`);

    // Export performance metrics if they exist
    if (logStats.performanceMetrics) {
      lines.push(
        "# HELP yuulog_operation_duration_seconds Operation time in seconds",
      );
      lines.push("# TYPE yuulog_operation_duration_seconds histogram");

      interface PerformanceMetric {
        averageDuration: string | number;
        [key: string]: unknown;
      }

      const metrics = logStats.performanceMetrics as Record<
        string,
        PerformanceMetric
      >;
      Object.entries(metrics).forEach(([operation, stats]) => {
        if (stats && typeof stats === "object" && stats.averageDuration) {
          // Convert readable duration format to seconds
          let durationSeconds: number;
          const durationStr = String(stats.averageDuration);

          if (durationStr.includes("ms")) {
            durationSeconds = parseFloat(durationStr) / 1000;
          } else if (durationStr.includes("s")) {
            durationSeconds = parseFloat(durationStr);
          } else {
            durationSeconds = 0;
          }

          lines.push(
            `yuulog_operation_duration_seconds{operation="${operation}"} ${durationSeconds}`,
          );
        }
      });
    }

    // Return all metrics in plain text format
    return lines.join("\n");
  }
}
