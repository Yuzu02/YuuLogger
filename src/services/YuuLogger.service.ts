import { Logtail } from "@logtail/node";
import {
  Inject,
  Injectable,
  LoggerService as NestLoggerService,
  Optional,
} from "@nestjs/common";
import { WinstonModule } from "nest-winston";
import * as winston from "winston";
import { createLogger, format } from "winston";
import "winston-daily-rotate-file";
import { YUU_LOG_OPTIONS } from "../YuuLogger.module";
import {
  PerformanceMetrics,
  ProfileData,
} from "../interfaces/PerformanceProfiler.interface";
import {
  CustomTransportConfig,
  ErrorFileTransportConfig,
  FileTransportConfig,
} from "../interfaces/TransportManager.interface";
import {
  LogLevel,
  LoggerTheme,
  StructuredLogEntry,
  YuuLogOptions,
} from "../interfaces/YuuLogger.interfaces";
import { LogFormatter } from "../utils/logger/Log.formatter";
import { loggerThemes } from "../utils/logger/Logger.themes";
import { LoggerUtilities } from "../utils/logger/Logger.utilities";
import { TransportManager } from "../utils/managers/Transport.manager";
import { PerformanceProfiler } from "../utils/performance/Performance.profiler";

/**
 * Types of log messages that can be handled by the logger
 */
type LogMessage = string | Record<string, unknown>;

/**
 * Advanced logger service for NestJS applications
 *
 * Features:
 * - Fully configurable log levels
 * - Console, file, and external logging support
 * - Performance profiling and metrics
 * - Colorized console output with multiple themes
 * - Memory and CPU usage tracking
 *
 * @example
 * // Get logger instance in any service
 * private readonly logger = LoggerService.getLogger();
 *
 * // Log a message
 * this.logger.log('Hello world', 'MyService');
 *
 * // Profile a function
 * const profileId = this.logger.startProfile('My Operation');
 * // ... do something
 * this.logger.stopProfile(profileId);
 */
@Injectable()
export class YuuLogService implements NestLoggerService {
  private logger: winston.Logger;
  private static instance: YuuLogService;
  private logtail: Logtail | null = null;
  private enabledLogLevels: LogLevel[];

  private static loggerOptions: YuuLogOptions = {
    appName: "NestJS",
    logLevels: ["error", "warn", "info"],
    loggerTheme: "default",
    enableFileLogging: false,
    sampling: {
      generalSamplingRate: 1.0,
      profileSamplingRate: 1.0,
      alwaysLogErrors: true,
    },
  };

  // Counter for log statistics
  private logCounter: Record<LogLevel, number> = {
    error: 0,
    warn: 0,
    info: 0,
    verbose: 0,
    debug: 0,
  };

  private defaultOptions: YuuLogOptions = {
    appName: "NestJS",
    logLevels: ["error", "warn", "info"],
    loggerTheme: "default",
    enableFileLogging: false,
    sampling: {
      generalSamplingRate: 1.0,
      profileSamplingRate: 1.0,
      alwaysLogErrors: true,
    },
  };

  /**
   * Thread-local storage for request context information
   * This allows attaching request-specific data to all logs generated during a request
   */
  private requestContext: Record<string, unknown> = {};

  /**
   * Creates a new instance of the YuuLogService
   *
   * The constructor initializes the logger with the configured settings from the injected options,
   * sets up the appropriate transports (console, file, external services), and configures color themes.
   */
  constructor(
    @Optional() @Inject(YUU_LOG_OPTIONS) private options: YuuLogOptions = {},
    private readonly logFormatter: LogFormatter,
    private readonly transportManager: TransportManager,
    private readonly loggerUtilities: LoggerUtilities,
    private readonly performanceProfiler: PerformanceProfiler,
  ) {
    // Merge provided options with defaults
    this.options = { ...this.defaultOptions, ...this.options };
    this.loggerUtilities.setLoggerOptions(this.options);
    this.performanceProfiler.setOptions(this.options);
    // Ensure we have a valid array for enabledLogLevels
    this.enabledLogLevels = this.options.logLevels
      ? [...this.options.logLevels]
      : [...this.defaultOptions.logLevels!];

    // Use TransportManager and LogFormatter to get formats and transports
    const minLogLevel = this.transportManager.getMinLogLevel();
    const consoleFormat = this.logFormatter.createConsoleFormat();
    const fileFormat = this.logFormatter.createFileFormat();
    const externalFormat = this.logFormatter.createExternalFormat();

    const transportsArr: winston.transport[] = [
      this.transportManager.getConsoleTransport(consoleFormat),
      ...this.transportManager.getFileTransports(fileFormat, minLogLevel),
      ...this.transportManager.getExternalTransports(
        externalFormat,
        minLogLevel,
      ),
    ];

    this.logger = createLogger({
      level: minLogLevel,
      transports: transportsArr,
      format: format.combine(
        format.timestamp(),
        format.metadata({
          fillExcept: ["message", "level", "timestamp", "context"],
        }),
      ),
    });

    // Logtail instance (if any)
    this.logtail = this.transportManager.getLogtail?.() || null;
    if (this.logtail) {
      this.logtail.flush();
    }

    YuuLogService.instance = this;
  }

  /**
   * Configure the logger options statically before initialization
   *
   * Use this method to configure the logger before creating a NestJS application
   *
   * @param options - Configuration options
   *
   * @example
   * // In main.ts
   * YuuLogService.configure({
   *   appName: 'MyAPI',
   *   logLevels: ['error', 'warn', 'info'],
   *   loggerTheme: 'colorful',
   *   enableFileLogging: true
   * });
   *
   * const app = await NestFactory.create(AppModule, {
   *   logger: YuuLogService.getNestLogger()
   * });
   */
  static configure(options: YuuLogOptions): void {
    YuuLogService.loggerOptions = {
      ...YuuLogService.loggerOptions,
      ...options,
    };

    // If there's an existing instance, update its options
    if (YuuLogService.instance) {
      YuuLogService.instance.options = {
        ...YuuLogService.instance.options,
        ...options,
      };
      YuuLogService.instance.loggerUtilities.setLoggerOptions(
        YuuLogService.instance.options,
      );
      YuuLogService.instance.performanceProfiler.setOptions(
        YuuLogService.instance.options,
      );
      YuuLogService.instance.enabledLogLevels = options.logLevels
        ? [...options.logLevels]
        : YuuLogService.instance.enabledLogLevels;

      // Reinitialize the logger to apply the new configuration
      YuuLogService.instance.reinitializeLogger();
    }
  }

  /**
   * Get the current logger options
   *
   * @returns The current logger options
   *
   * @example
   * const options = YuuLogService.getOptions();
   * console.log(`Current log levels: ${options.logLevels.join(', ')}`);
   */
  static getOptions(): YuuLogOptions {
    return YuuLogService.instance
      ? { ...YuuLogService.instance.options }
      : { ...YuuLogService.loggerOptions };
  }

  /**
   * Check if a log level is enabled based on the current configuration
   *
   * @param level - The log level to check
   * @returns True if the log level is enabled
   * @private
   */
  private isLevelEnabled(level: LogLevel): boolean {
    return this.enabledLogLevels.includes(level);
  }

  /**
   * Determines if an event should be logged based on sampling configuration
   *
   * @param level - The log level
   * @param isProfile - Whether it's a performance profile event
   * @returns True if the event should be logged
   * @private
   */
  private shouldSampleEvent(level: LogLevel, isProfile = false): boolean {
    const sampling = this.options.sampling || this.defaultOptions.sampling;

    // Never apply sampling to errors if configured that way
    if (level === "error" && sampling?.alwaysLogErrors) {
      return true;
    }

    // Determine the appropriate sampling rate
    const rate = isProfile
      ? (sampling?.profileSamplingRate ?? 1.0)
      : (sampling?.generalSamplingRate ?? 1.0);

    // If the rate is 1.0 (100%), always log
    if (rate >= 1.0) {
      return true;
    }

    // For tests, we need to compare the Math.random() output with the rate value
    // This approach makes tests predictable while allowing random sampling in production
    const randomValue = Math.random();
    return randomValue < rate;
  }

  /**
   * Get a singleton instance of the YuuLogService
   *
   * @returns A YuuLogService instance
   * @static
   *
   * @example
   * const logger = YuuLogService.getLogger();
   * logger.log('Application started');
   */
  static getLogger(): YuuLogService {
    if (!YuuLogService.instance) {
      // Create instances of required dependencies
      const defaultOptions = { ...YuuLogService.loggerOptions };
      const logFormatter = new LogFormatter(defaultOptions);
      const transportManager = new TransportManager(defaultOptions);
      const loggerUtilities = new LoggerUtilities(defaultOptions);
      const performanceProfiler = new PerformanceProfiler(defaultOptions);
      YuuLogService.instance = new YuuLogService(
        defaultOptions,
        logFormatter,
        transportManager,
        loggerUtilities,
        performanceProfiler,
      );
    }
    return YuuLogService.instance;
  }

  /**
   * Get a Winston logger instance configured for NestJS application
   *
   * @param options - Optional configuration options to apply before creating the logger
   * @returns A NestJS compatible logger
   * @static
   *
   * @example
   * // In bootstrap function with custom options
   * const app = await NestFactory.create(AppModule, {
   *   logger: YuuLogService.getNestLogger({
   *     appName: 'API Server',
   *     logLevels: parseLogLevels('error,warn,info,verbose'),
   *     loggerTheme: 'dark'
   *   })
   * });
   */
  static getNestLogger(options?: YuuLogOptions) {
    // If options are provided, configure the logger first
    if (options) {
      YuuLogService.configure(options);
    }

    const instance = YuuLogService.getLogger();
    return WinstonModule.createLogger({
      instance: instance.logger,
    });
  }

  /**
   * Set request context information that will be included in all logs
   *
   * This is useful for adding request-specific information like requestId, userId, etc.
   * to all logs generated during the request lifecycle.
   *
   * @param context - Context information to include in logs
   *
   * @example
   * // In your request handler or middleware:
   * logger.setRequestContext({
   *   requestId: '123e4567-e89b-12d3-a456-426614174000',
   *   userId: 'user-123',
   *   ip: '192.168.1.1'
   * });
   */
  setRequestContext(context: Record<string, unknown>): void {
    this.requestContext = { ...context };
  }

  /**
   * Clear request context information
   *
   * Call this at the end of request processing to avoid context leaking between requests
   *
   * @example
   * // In your request completion handler or interceptor:
   * logger.clearRequestContext();
   */
  clearRequestContext(): void {
    this.requestContext = {};
  }

  /**
   * Log a message at the 'info' level
   *
   * @param message - The log message or object
   * @param context - Optional context (usually a class name)
   *
   * @example
   * logger.log('User created successfully', 'UserService');
   */
  log(message: LogMessage, context?: string) {
    if (!this.isLevelEnabled("info") || !this.shouldSampleEvent("info")) return;

    // Increment counter
    this.logCounter.info++;

    // Include request context if available
    const meta =
      Object.keys(this.requestContext).length > 0
        ? this.requestContext
        : undefined;

    if (typeof message === "string") {
      this.logger.info(message, { context, meta });
    } else {
      this.logger.info(JSON.stringify(message), {
        context,
        meta: { ...message, ...meta },
      });
    }
  }

  /**
   * Log a message at the 'error' level
   *
   * @param message - The error message or object
   * @param trace - Optional stack trace
   * @param context - Optional context (usually a class name)
   *
   * @example
   * try {
   *   // some code that might throw
   * } catch (error) {
   *   logger.error('Failed to process request', error.stack, 'UserController');
   * }
   */
  error(message: LogMessage, trace?: string, context?: string) {
    if (!this.isLevelEnabled("error") || !this.shouldSampleEvent("error"))
      return;

    // Increment counter
    this.logCounter.error++;

    // Include request context if available
    const meta =
      Object.keys(this.requestContext).length > 0
        ? this.requestContext
        : undefined;

    if (typeof message === "string") {
      this.logger.error(message, { trace, context, meta });
    } else {
      this.logger.error(JSON.stringify(message), {
        trace,
        context,
        meta: { ...message, ...meta },
      });
    }
  }

  /**
   * Log a message at the 'warn' level
   *
   * @param message - The warning message or object
   * @param context - Optional context (usually a class name)
   *
   * @example
   * logger.warn('Deprecated feature used', 'APIService');
   */
  warn(message: LogMessage, context?: string) {
    if (!this.isLevelEnabled("warn") || !this.shouldSampleEvent("warn")) return;

    // Increment counter
    this.logCounter.warn++;

    // Include request context if available
    const meta =
      Object.keys(this.requestContext).length > 0
        ? this.requestContext
        : undefined;

    if (typeof message === "string") {
      this.logger.warn(message, { context, meta });
    } else {
      this.logger.warn(JSON.stringify(message), {
        context,
        meta: { ...message, ...meta },
      });
    }
  }

  /**
   * Log a message at the 'debug' level
   *
   * @param message - The debug message or object
   * @param context - Optional context (usually a class name)
   *
   * @example
   * logger.debug('Processing request with params', 'RequestHandler');
   */
  debug(message: LogMessage, context?: string) {
    if (!this.isLevelEnabled("debug") || !this.shouldSampleEvent("debug"))
      return;

    // Increment counter
    this.logCounter.debug++;

    // Include request context if available
    const meta =
      Object.keys(this.requestContext).length > 0
        ? this.requestContext
        : undefined;

    if (typeof message === "string") {
      this.logger.debug(message, { context, meta });
    } else {
      this.logger.debug(JSON.stringify(message), {
        context,
        meta: { ...message, ...meta },
      });
    }
  }

  /**
   * Log a message at the 'verbose' level
   *
   * @param message - The verbose message or object
   * @param context - Optional context (usually a class name)
   *
   * @example
   * logger.verbose('Request details', 'RequestProcessor');
   */
  verbose(message: LogMessage, context?: string) {
    if (!this.isLevelEnabled("verbose") || !this.shouldSampleEvent("verbose"))
      return;

    // Increment counter
    this.logCounter.verbose++;

    // Include request context if available
    const meta =
      Object.keys(this.requestContext).length > 0
        ? this.requestContext
        : undefined;

    if (typeof message === "string") {
      this.logger.verbose(message, { context, meta });
    } else {
      this.logger.verbose(JSON.stringify(message), {
        context,
        meta: { ...message, ...meta },
      });
    }
  }

  /**
   * Create a structured log entry
   *
   * Structured logs are easier to process and analyze automatically
   * than plain text logs. This method creates a standardized format for
   * all application logs.
   *
   * @param level - Log level (error, warn, info, etc)
   * @param message - Main log message
   * @param context - Optional context (typically the class name)
   * @param data - Additional structured data organized by category
   *
   * @example
   * logger.structured('info', 'User created', 'UserService', {
   *   user: { id: '123', email: 'user@example.com' },
   *   performance: { duration: 45.2 }
   * });
   *
   * @example
   * // Record a structured error
   * try {
   *   // code that might fail
   * } catch (error) {
   *   logger.structured('error', 'Error processing payment', 'PaymentService', {
   *     error: {
   *       message: error.message,
   *       code: error.code,
   *       stack: error.stack
   *     },
   *     request: { orderId: '12345', amount: 99.99 }
   *   });
   * }
   */
  structured(
    level: LogLevel,
    message: string,
    context?: string,
    data?: StructuredLogEntry["data"],
  ): void {
    if (!this.isLevelEnabled(level) || !this.shouldSampleEvent(level)) return;

    // Increment counter
    this.logCounter[level]++;

    // Include request context if available
    const requestContextData =
      Object.keys(this.requestContext).length > 0
        ? { requestContext: this.requestContext }
        : {};

    // Merge request context with provided data
    const mergedData = data
      ? { ...data, ...requestContextData }
      : requestContextData;

    // Create structured entry with standard format
    const entry: StructuredLogEntry = {
      level,
      message,
      context,
      timestamp: new Date().toISOString(),
      data: Object.keys(mergedData).length > 0 ? mergedData : undefined,
    };

    // Send to appropriate logger based on level
    switch (level) {
      case "error":
        this.logger.error(message, { structuredEntry: entry, context });
        break;
      case "warn":
        this.logger.warn(message, { structuredEntry: entry, context });
        break;
      case "info":
        this.logger.info(message, { structuredEntry: entry, context });
        break;
      case "debug":
        this.logger.debug(message, { structuredEntry: entry, context });
        break;
      case "verbose":
        this.logger.verbose(message, { structuredEntry: entry, context });
        break;
    }

    // If Logtail is configured, send there as well with improved format
    if (this.logtail) {
      // Create a flat object for Logtail instead of passing the nested object directly
      const logtailEntry = this.logFormatter.formatStructuredEntry(entry);

      // Logtail expects a string message or an Error object, convert to JSON string
      this.logtail.info(JSON.stringify(logtailEntry));
    }
  }

  /**
   * Gets statistics of generated logs
   *
   * @returns Statistics of logs by level and general metrics
   */
  getLogStats(): Record<string, unknown> {
    // Basic count statistics
    const stats: Record<string, unknown> = {
      totalLogs: Object.values(this.logCounter).reduce(
        (sum, count) => sum + count,
        0,
      ),
      byLevel: { ...this.logCounter },
      activeProfiles: this.performanceProfiler.getActiveProfiles().size,
    };

    // Performance statistics - delegate to performance profiler
    const performanceStats: Record<string, unknown> = {};
    const metrics = this.getPerformanceMetricsData();
    Object.keys(metrics).forEach((operationName) => {
      const stats = this.performanceProfiler.getPerformanceStats(operationName);
      if (stats) {
        performanceStats[operationName] = stats;
      }
    });

    if (Object.keys(performanceStats).length > 0) {
      stats.performanceMetrics = performanceStats;
    }

    return stats;
  }

  /**
   * Helper method to get all metrics data
   */
  private getPerformanceMetricsData(): Record<string, PerformanceMetrics[]> {
    // Convert the Map to a Record object to avoid type error
    const metricsMap =
      this.performanceProfiler["performanceMetrics"] ||
      new Map<string, PerformanceMetrics[]>();
    const metricsRecord: Record<string, PerformanceMetrics[]> = {};

    // Convert Map to Record object
    for (const [key, value] of metricsMap.entries()) {
      metricsRecord[key] = value;
    }

    return metricsRecord;
  }

  /**
   * Resets the log counters
   */
  resetLogCounters(): void {
    Object.keys(this.logCounter).forEach((key) => {
      this.logCounter[key as LogLevel] = 0;
    });
  }

  /**
   * Records a structured info log
   *
   * @param message - Main message
   * @param context - Optional context
   * @param data - Additional structured data
   *
   * @example
   * logger.structuredInfo('User authenticated', 'AuthService', {
   *   user: { id: '123', roles: ['user'] },
   *   request: { ip: '192.168.1.1', userAgent: '...' }
   * });
   */
  structuredInfo(
    message: string,
    context?: string,
    data?: StructuredLogEntry["data"],
  ): void {
    this.structured("info", message, context, data);
  }

  /**
   * Records a structured error log
   *
   * @param message - Main message
   * @param context - Optional context
   * @param errorInfo - Error information
   * @param additionalData - Additional structured data
   *
   * @example
   * try {
   *   // code that might fail
   * } catch (error) {
   *   logger.structuredError(
   *     'Error processing payment',
   *     'PaymentService',
   *     { message: error.message, stack: error.stack },
   *     { request: { orderId: '12345' } }
   *   );
   * }
   */
  structuredError(
    message: string,
    context?: string,
    errorInfo?: Record<string, unknown>,
    additionalData?: Omit<StructuredLogEntry["data"], "error">,
  ): void {
    const data: StructuredLogEntry["data"] = {
      ...additionalData,
      error: errorInfo,
    };

    this.structured("error", message, context, data);
  }

  /**
   * Records a structured debug log
   *
   * @param message - Main message
   * @param context - Optional context
   * @param data - Additional structured data
   *
   * @example
   * logger.structuredDebug('Processing request data', 'RequestHandler', {
   *   request: { params: { id: 123 }, query: { filter: 'active' } },
   *   debug: { parser: 'JSON', config: { strict: true } }
   * });
   */
  structuredDebug(
    message: string,
    context?: string,
    data?: StructuredLogEntry["data"],
  ): void {
    this.structured("debug", message, context, data);
  }

  /**
   * Records a structured warning log
   *
   * @param message - Main message
   * @param context - Optional context
   * @param data - Additional structured data
   *
   * @example
   * logger.structuredWarn('Deprecated feature used', 'APIService', {
   *   feature: { name: 'oldApi', deprecatedSince: '2.0.0' },
   *   recommendation: 'Use newApi() instead'
   * });
   */
  structuredWarn(
    message: string,
    context?: string,
    data?: StructuredLogEntry["data"],
  ): void {
    this.structured("warn", message, context, data);
  }

  /**
   * Records a detailed structured log
   *
   * @param message - Main message
   * @param context - Optional context
   * @param data - Additional structured data
   *
   * @example
   * logger.structuredVerbose('Internal processing details', 'DataProcessor', {
   *   step: 'transformation',
   *   records: { processed: 150, skipped: 3 },
   *   runtime: { threadId: 12, memory: '256MB' }
   * });
   */
  structuredVerbose(
    message: string,
    context?: string,
    data?: StructuredLogEntry["data"],
  ): void {
    this.structured("verbose", message, context, data);
  }

  /**
   * Start measuring performance for an operation
   *
   * @param operationName - Name of the operation being measured
   * @param metadata - Optional metadata about the operation
   * @returns A unique ID for this performance measurement
   *
   * @example
   * const measureId = logger.startMeasure('Database Query');
   * // ... perform database query
   * logger.stopMeasure('Database Query');
   */
  startMeasure(
    operationName: string,
    metadata?: Record<string, unknown>,
  ): string {
    const id = this.performanceProfiler.startMeasure(operationName, metadata);

    if (this.isLevelEnabled("debug")) {
      this.debug(`⏱️ Started measuring [${operationName}]`, "Performance");
    }

    return id;
  }

  /**
   * Stop measuring performance for an operation
   *
   * @param operationName - Name of the operation being measured
   * @param logResults - Whether to log the results immediately (default: true)
   * @returns The performance metrics data or undefined if no measurement was found
   *
   * @example
   * const metrics = logger.stopMeasure('Database Query');
   * console.log(`Query took ${metrics.duration}ms`);
   */
  stopMeasure(
    operationName: string,
    logResults = true,
  ): PerformanceMetrics | undefined {
    const metrics = this.performanceProfiler.stopMeasure(operationName);

    if (!metrics) {
      this.warn(
        `No active measurement found for operation [${operationName}]`,
        "Performance",
      );
      return undefined;
    }

    if (logResults && this.isLevelEnabled("info") && metrics.duration) {
      const durationFormatted = this.loggerUtilities.formatDuration(
        metrics.duration,
      );
      this.log(
        `🏁 [${operationName}] completed in ${durationFormatted}`,
        "Performance",
      );

      if (
        this.isLevelEnabled("debug") &&
        metrics.memoryUsage &&
        metrics.cpuUsage
      ) {
        const endMemory = process.memoryUsage();
        const endCpu = process.cpuUsage();

        // Memory change during operation
        const memoryDiff = {
          rss: endMemory.rss - metrics.memoryUsage.rss,
          heapTotal: endMemory.heapTotal - metrics.memoryUsage.heapTotal,
          heapUsed: endMemory.heapUsed - metrics.memoryUsage.heapUsed,
          external: endMemory.external - metrics.memoryUsage.external,
        };

        // CPU usage during operation
        const cpuDiff = {
          user: endCpu.user - metrics.cpuUsage.user,
          system: endCpu.system - metrics.cpuUsage.system,
        };

        this.debug(
          `Memory change: ${this.loggerUtilities.formatMemorySize(memoryDiff.heapUsed)} | CPU: ${this.loggerUtilities.formatCpuUsage(cpuDiff)}`,
          "Performance",
        );
      }
    }

    return metrics;
  }

  /**
   * Get performance metrics statistics for a specific operation
   *
   * @param operationName - The operation name to get statistics for
   * @returns Summary statistics for the operation or undefined if no metrics exist
   *
   * @example
   * const stats = logger.getPerformanceStats('Database Query');
   * console.log(`Average query time: ${stats.averageDuration}`);
   */
  getPerformanceStats(
    operationName: string,
  ): Record<string, unknown> | undefined {
    return this.performanceProfiler.getPerformanceStats(operationName);
  }

  /**
   * Clear all performance metrics
   *
   * @param operationName - Optional operation name to clear only specific metrics
   *
   * @example
   * // Clear all metrics
   * logger.clearPerformanceMetrics();
   *
   * // Clear only metrics for a specific operation
   * logger.clearPerformanceMetrics('Database Query');
   */
  clearPerformanceMetrics(operationName?: string): void {
    this.performanceProfiler.clearPerformanceMetrics(operationName);
  }

  /**
   * Start a new profiling session
   *
   * Profiles provide more detailed performance tracking than simple measurements,
   * including memory and CPU usage differences, and support for nested operations.
   *
   * @param operationName - Name of the operation being profiled
   * @param context - Optional context for the profile
   * @param metadata - Optional metadata for the profile
   * @returns A unique ID for this profile or null if sampling criteria aren't met
   *
   * @example
   * const profileId = logger.startProfile('User Registration Process', 'UserService');
   * // ... complex operation with multiple steps
   * logger.stopProfile(profileId);
   */
  startProfile(
    operationName: string,
    context?: string,
    metadata?: Record<string, unknown>,
  ): string | null {
    const id = this.performanceProfiler.startProfile(
      operationName,
      context,
      metadata,
    );

    if (id && this.isLevelEnabled("debug")) {
      this.debug(
        `📊 Started profiling [${operationName}]${context ? ` in ${context}` : ""}`,
        "Profiling",
      );
    }

    return id;
  }

  /**
   * Add a child profile to an existing profile
   *
   * This allows tracking of nested operations within a larger operation.
   *
   * @param parentId - The ID of the parent profile
   * @param operationName - Name of the child operation
   * @param metadata - Optional metadata for the child profile
   * @returns The ID of the child profile
   *
   * @example
   * const parentId = logger.startProfile('User Registration');
   * // ... some code
   * const childId = logger.startChildProfile(parentId, 'Validate User Data');
   * // ... validation code
   * logger.stopProfile(childId);
   * // ... more code
   * logger.stopProfile(parentId);
   */
  startChildProfile(
    parentId: string,
    operationName: string,
    metadata?: Record<string, unknown>,
  ): string {
    const childId = this.performanceProfiler.startChildProfile(
      parentId,
      operationName,
      metadata,
    );

    if (this.isLevelEnabled("debug")) {
      const parentProfile = this.performanceProfiler
        .getActiveProfiles()
        .get(parentId);
      if (parentProfile) {
        this.debug(
          `📊 Started child profiling [${operationName}] under [${parentProfile.operationName}]`,
          "Profiling",
        );
      }
    }

    return childId;
  }

  /**
   * Stop a profiling session and calculate metrics
   *
   * @param id - The ID of the profile to stop
   * @param logResults - Whether to log the results immediately (default: true)
   * @returns The profile data with metrics or undefined if no active profile was found
   *
   * @example
   * const profileData = logger.stopProfile(profileId);
   * console.log(`Operation took ${profileData.duration}ms`);
   */
  stopProfile(id: string | null, logResults = true): ProfileData | undefined {
    if (id === null) {
      return undefined;
    }

    const profile = this.performanceProfiler.stopProfile(id);

    if (!profile) {
      this.warn(`No active profile found with ID [${id}]`, "Profiling");
      return undefined;
    }

    if (logResults && this.isLevelEnabled("info")) {
      // Use selected theme for colorizing output
      const selectedTheme = this.options.loggerTheme || "default";
      const theme =
        loggerThemes[selectedTheme as LoggerTheme] || loggerThemes.default;

      // Create a visual performance report
      const report = this.performanceProfiler.createPerformanceReport(
        profile,
        theme,
      );

      this.log(`\n📊 Performance Profile:\n${report}`, "Profiling");
    }

    return profile;
  }

  /**
   * Get all active profiles
   *
   * @returns Map of all active profiles
   *
   * @example
   * const activeProfiles = logger.getActiveProfiles();
   * console.log(`There are ${activeProfiles.size} active profiles`);
   */
  getActiveProfiles(): Map<string, ProfileData> {
    return this.performanceProfiler.getActiveProfiles();
  }

  /**
   * Log a formatted performance report for a completed profile
   *
   * @param profile - The profile data to report
   * @param title - Optional title for the report
   *
   * @example
   * const profileId = logger.startProfile('Complex Operation');
   * // ... perform operation
   * const profile = logger.stopProfile(profileId, false); // Don't log automatically
   * // ... do something with the profile data
   * logger.logPerformanceReport(profile, 'Detailed Performance Analysis');
   */
  logPerformanceReport(profile: ProfileData, title?: string): void {
    if (!this.isLevelEnabled("info")) return;

    const selectedTheme = this.options.loggerTheme || "default";
    const theme =
      loggerThemes[selectedTheme as LoggerTheme] || loggerThemes.default;
    const report = this.performanceProfiler.createPerformanceReport(
      profile,
      theme,
    );
    const reportTitle = title || `Performance Report: ${profile.operationName}`;

    this.log(`\n📊 ${reportTitle}\n${report}`, "Performance");
  }

  /**
   * Create a function that automatically measures performance around a given function
   *
   * @param fn - The function to measure
   * @param operationName - Name for this operation (defaults to function name)
   * @returns A wrapped function that measures performance
   *
   * @example
   * // Original function
   * function processData(data) { /* ... */ /* }
   *
   * // Profiled version
   * const profiledProcessData = logger.profileFunction(processData, 'Data Processing');
   *
   * // Use profiled version
   * profiledProcessData(someData); // Automatically measured
   */

  profileFunction<T extends (...args: unknown[]) => unknown>(
    fn: T,
    operationName?: string,
  ): (...args: Parameters<T>) => ReturnType<T> {
    return this.performanceProfiler.profileFunction(fn, operationName);
  }

  /**
   * Create an async function that automatically measures performance around a given async function
   *
   * @param fn - The async function to measure
   * @param operationName - Name for this operation (defaults to function name)
   * @returns A wrapped async function that measures performance
   *
   * @example
   * // Original async function
   * async function fetchData(id) { /* ... */ /* }
   *
   * // Profiled version
   * const profiledFetchData = logger.profileAsyncFunction(fetchData, 'Data Fetching');
   *
   * // Use profiled version
   * await profiledFetchData(123); // Automatically measured
   */
  profileAsyncFunction<T extends (...args: unknown[]) => Promise<unknown>>(
    fn: T,
    operationName?: string,
  ): (...args: Parameters<T>) => Promise<Awaited<ReturnType<T>>> {
    return this.performanceProfiler.profileAsyncFunction(fn, operationName);
  }

  /**
   * Create an async iterator that automatically measures each iteration
   *
   * @param iterator - The async iterator to measure
   * @param operationName - Name for this operation
   * @returns A wrapped async iterator that measures each iteration
   *
   * @example
   * // Original async iterator
   * async function* generateItems() {
   *   for (let i = 0; i < 10; i++) {
   *     yield i;
   *   }
   * }
   *
   * // Profile each iteration
   * const iter = generateItems();
   * const profiledIter = logger.profileAsyncIterator(iter, 'Item Generation');
   *
   * // Use the profiled iterator
   * for await (const item of profiledIter) {
   *   console.log(item);
   * }
   */
  async *profileAsyncIterator<T>(
    iterator: AsyncIterableIterator<T>,
    operationName: string,
  ): AsyncIterableIterator<T> {
    // Usando await al llamar al método del performance profiler para evitar el error de lint
    const result = await Promise.resolve(
      this.performanceProfiler.profileAsyncIterator(iterator, operationName),
    );

    // Usando yield* para delegar la iteración al resultado
    yield* result;
  }

  /**
   * Configure the main file transport settings
   *
   * This allows customizing the file transport at runtime
   *
   * @param config Configuration options for the main file transport
   *
   * @example
   * // Customize file transport
   * logger.configureFileTransport({
   *   filename: 'custom-logs/app-%DATE%.log',
   *   maxSize: '50m',
   *   maxFiles: '30d'
   * });
   */
  configureFileTransport(config: FileTransportConfig): void {
    this.transportManager.configureFileTransport(config);

    // Reinitialize the logger to apply changes
    this.reinitializeLogger();
  }

  /**
   * Configure the error file transport settings
   *
   * This allows customizing the error file transport at runtime
   *
   * @param config Configuration options for the error file transport
   *
   * @example
   * // Customize error file transport
   * logger.configureErrorFileTransport({
   *   filename: 'custom-logs/errors-%DATE%.log',
   *   maxFiles: '60d'
   * });
   */
  configureErrorFileTransport(config: ErrorFileTransportConfig): void {
    this.transportManager.configureErrorFileTransport(config);

    // Reinitialize the logger to apply changes
    this.reinitializeLogger();
  }

  /**
   * Add a custom transport to the logger at runtime
   *
   * This allows adding any Winston-compatible transport
   *
   * @param config The custom transport configuration
   * @returns The name/ID of the added transport (used for removal)
   *
   * @example
   * // Add a custom transport
   * import { SlackHook } from 'winston-slack-webhook-transport';
   *
   * const transportId = logger.addCustomTransport({
   *   name: 'slack-alerts',
   *   transport: new SlackHook({
   *     webhookUrl: 'https://hooks.slack.com/services/...',
   *     channel: '#alerts',
   *     username: 'LogBot',
   *   })
   * });
   */
  addCustomTransport(config: CustomTransportConfig): string {
    const transportId = this.transportManager.addCustomTransport(config);

    // Reinitialize the logger to apply changes
    this.reinitializeLogger();

    return transportId;
  }

  /**
   * Remove a previously added custom transport
   *
   * @param transportName The name/ID of the transport to remove
   * @returns Boolean indicating whether the transport was removed successfully
   *
   * @example
   * // Remove a custom transport
   * logger.removeCustomTransport('slack-alerts');
   */
  removeCustomTransport(transportName: string): boolean {
    const removed = this.transportManager.removeCustomTransport(transportName);

    if (removed) {
      // Reinitialize the logger to apply changes
      this.reinitializeLogger();
    }

    return removed;
  }

  /**
   * Get all currently active transports
   *
   * @returns Array of all active transports
   *
   * @example
   * // Get active transports
   * const transports = logger.getActiveTransports();
   * console.log(`Active transports: ${transports.length}`);
   */
  getActiveTransports(): winston.transport[] {
    return this.transportManager.getActiveTransports();
  }

  /**
   * Reinitialize the logger with updated transports
   *
   * @private
   */
  private reinitializeLogger(): void {
    const minLogLevel = this.transportManager.getMinLogLevel();
    const transports = this.transportManager.getActiveTransports();

    // Create a new logger with updated transports
    this.logger = createLogger({
      level: minLogLevel,
      transports: transports,
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.metadata({
          fillExcept: ["message", "level", "timestamp", "context"],
        }),
      ),
    });
  }
}
