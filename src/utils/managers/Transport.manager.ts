import { Logtail } from "@logtail/node";
import { LogtailTransport } from "@logtail/winston";
import { Inject, Injectable, Optional } from "@nestjs/common";
import * as crypto from "crypto";
import winston, { transports } from "winston";
import "winston-daily-rotate-file";
import {
  CustomTransportConfig,
  ErrorFileTransportConfig,
  FileTransportConfig,
  ITransportManager,
} from "../../interfaces/TransportManager.interface";
import { LogLevel, YuuLogOptions } from "../../interfaces/YuuLogger.interfaces";
import { YUU_LOG_OPTIONS } from "../../YuuLogger.module";
import { LogFormatter } from "../logger/Log.formatter";

/**
 * Priority levels for log levels to determine the minimum log level
 * Higher number = higher priority
 */
const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  error: 5,
  warn: 4,
  info: 3,
  verbose: 2,
  debug: 1,
};

/**
 * TransportManager responsible for creating and managing Winston transports
 *
 * This class handles console, file, and external logging transports based on
 * the logger configuration.
 */
@Injectable()
export class TransportManager implements ITransportManager {
  private options: YuuLogOptions;
  private logFormatter: LogFormatter;
  private logtail: Logtail | null = null;
  private enabledLogLevels: LogLevel[];

  /**
   * Default options to use when none are provided
   */
  private defaultOptions: YuuLogOptions = {
    appName: "NestJS",
    logLevels: ["error", "warn", "info"],
    loggerTheme: "default",
    enableFileLogging: false,
  };

  // Default file transport configuration
  private fileTransportConfig: FileTransportConfig = {
    filename: "logs/application-%DATE%.log",
    datePattern: "YYYY-MM-DD",
    maxSize: "20m",
    maxFiles: "14d",
  };

  // Default error file transport configuration
  private errorFileTransportConfig: ErrorFileTransportConfig = {
    filename: "logs/error-%DATE%.log",
    datePattern: "YYYY-MM-DD",
    maxSize: "20m",
    maxFiles: "14d",
  };

  // Storage for custom transports
  private customTransports: Map<string, winston.transport> = new Map();

  // Cache of all active transports for better performance
  private activeTransports: winston.transport[] = [];
  private needsTransportRefresh: boolean = true;

  /**
   * Creates a new TransportManager instance
   *
   * @param options - Configuration options for the logger
   * @param logFormatter - The LogFormatter to use for log formatting
   */
  constructor(
    @Optional() @Inject(YUU_LOG_OPTIONS) options: YuuLogOptions = {},
    @Optional() logFormatter?: LogFormatter,
  ) {
    this.options = { ...this.defaultOptions, ...options };
    this.enabledLogLevels = [
      ...(this.options.logLevels ||
        this.defaultOptions.logLevels || ["error", "warn", "info"]),
    ];
    this.logFormatter = logFormatter || new LogFormatter(this.options);
    this.customTransports = new Map();
    this.initializeLogtail();
  }

  /**
   * Static factory method for creating instances without dependency injection
   */
  static create(
    options?: YuuLogOptions,
    logFormatter?: LogFormatter,
  ): TransportManager {
    const instance = Object.create(TransportManager.prototype);
    instance.options = options || {
      appName: "NestJS",
      logLevels: ["error", "warn", "info"],
    };
    instance.enabledLogLevels = [
      ...(instance.options.logLevels || ["error", "warn", "info"]),
    ];
    instance.logFormatter = logFormatter || new LogFormatter(instance.options);
    instance.customTransports = new Map();
    instance.logtail = null;
    instance.initializeLogtail();
    return instance;
  }

  /**
   * Initialize Logtail service if configured
   *
   * @private
   */
  initializeLogtail(): void {
    if (
      this.options.logtail?.sourceToken &&
      this.options.logtail?.endpoint &&
      this.options.logtail?.enabled !== false
    ) {
      this.logtail = new Logtail(this.options.logtail.sourceToken, {
        endpoint: this.options.logtail.endpoint,
      });
    }
  }

  /**
   * Initialize all transports based on configuration
   *
   * @returns Array of configured Winston transports
   */
  initializeTransports(): winston.transport[] {
    const minLogLevel = this.getMinLogLevel();
    const consoleFormat = this.logFormatter.createConsoleFormat();
    const fileFormat = this.logFormatter.createFileFormat();
    const externalFormat = this.logFormatter.createExternalFormat();

    // Start with console transport
    let logTransports: winston.transport[] = [
      this.getConsoleTransport(consoleFormat),
    ];

    // Add file transports if enabled
    const fileTransports = this.getFileTransports(fileFormat, minLogLevel);
    logTransports.push(...fileTransports);

    // Add external service transports if configured
    const externalTransports = this.getExternalTransports(
      externalFormat,
      minLogLevel,
    );
    logTransports.push(...externalTransports);

    // Add any custom transports
    if (this.customTransports.size > 0) {
      logTransports = [...logTransports, ...this.customTransports.values()];
    }

    // Update the cached active transports
    this.activeTransports = logTransports;
    this.needsTransportRefresh = false;

    return logTransports;
  }

  /**
   * Get the minimum log level based on enabled levels
   *
   * @returns The minimum log level to configure Winston with
   */
  getMinLogLevel(): LogLevel {
    let minLogLevel: LogLevel = "error"; // Default to highest priority
    let minPriority = LOG_LEVEL_PRIORITY.error;

    for (const level of this.enabledLogLevels) {
      if (LOG_LEVEL_PRIORITY[level] < minPriority) {
        minPriority = LOG_LEVEL_PRIORITY[level];
        minLogLevel = level;
      }
    }

    return minLogLevel;
  }

  /**
   * Get console transport
   *
   * @param format - The format to use for console output
   * @returns Console transport
   */
  getConsoleTransport(format: winston.Logform.Format): winston.transport {
    return new transports.Console({
      format,
    });
  }

  /**
   * Get file transports if enabled
   *
   * @param format - The format to use for file output
   * @param minLogLevel - The minimum log level
   * @returns Array of file transports or empty array if disabled
   */
  getFileTransports(
    format: winston.Logform.Format,
    minLogLevel: LogLevel,
  ): winston.transport[] {
    if (this.options.enableFileLogging !== true) {
      return [];
    }

    // Use custom format if provided, otherwise use the default
    const mainFormat = this.fileTransportConfig.format || format;
    const errorFormat = this.errorFileTransportConfig.format || format;

    return [
      new transports.DailyRotateFile({
        filename:
          this.fileTransportConfig.filename || "logs/application-%DATE%.log",
        datePattern: this.fileTransportConfig.datePattern || "YYYY-MM-DD",
        maxSize: this.fileTransportConfig.maxSize || "20m",
        maxFiles: this.fileTransportConfig.maxFiles || "14d",
        format: mainFormat,
        level: minLogLevel,
      }),
      new transports.DailyRotateFile({
        filename:
          this.errorFileTransportConfig.filename || "logs/error-%DATE%.log",
        datePattern: this.errorFileTransportConfig.datePattern || "YYYY-MM-DD",
        maxSize: this.errorFileTransportConfig.maxSize || "20m",
        maxFiles: this.errorFileTransportConfig.maxFiles || "14d",
        level: "error",
        format: errorFormat,
      }),
    ];
  }

  /**
   * Get external service transports if configured
   *
   * @param format - The format to use for external services
   * @param minLogLevel - The minimum log level
   * @returns Array of external service transports or empty array if not configured
   */
  getExternalTransports(
    format: winston.Logform.Format,
    minLogLevel: LogLevel,
  ): winston.transport[] {
    if (!this.logtail) {
      return [];
    }

    return [
      new LogtailTransport(this.logtail, {
        level: minLogLevel,
        format,
      }),
      new LogtailTransport(this.logtail, {
        level: "error",
        format,
      }),
    ];
  }

  /**
   * Flush logs for any external services that require it
   */
  flushExternalLogs(): void {
    if (this.logtail) {
      this.logtail.flush();
    }
  }

  /**
   * Get Logtail instance
   *
   * @returns The Logtail instance or null if not configured
   */
  getLogtail(): Logtail | null {
    return this.logtail;
  }

  /**
   * Configure file transport settings
   *
   * @param config Configuration options for the main file transport
   */
  configureFileTransport(config: FileTransportConfig): void {
    this.fileTransportConfig = { ...this.fileTransportConfig, ...config };
    this.needsTransportRefresh = true;
  }

  /**
   * Configure error file transport settings
   *
   * @param config Configuration options for the error file transport
   */
  configureErrorFileTransport(config: ErrorFileTransportConfig): void {
    this.errorFileTransportConfig = {
      ...this.errorFileTransportConfig,
      ...config,
    };
    this.needsTransportRefresh = true;
  }

  /**
   * Add a custom transport to the logger at runtime
   *
   * @param config The custom transport configuration
   * @returns The name or identifier of the added transport
   */
  addCustomTransport(config: CustomTransportConfig): string {
    const name = config.name || `transport-${crypto.randomUUID()}`;
    this.customTransports.set(name, config.transport);
    this.needsTransportRefresh = true;
    return name;
  }

  /**
   * Remove a custom transport by its name or identifier
   *
   * @param transportName The name or identifier of the transport to remove
   * @returns Boolean indicating whether the transport was removed successfully
   */
  removeCustomTransport(transportName: string): boolean {
    const removed = this.customTransports.delete(transportName);
    if (removed) {
      this.needsTransportRefresh = true;
    }
    return removed;
  }

  /**
   * Get all currently active transports
   *
   * @returns Array of all active transports
   */
  getActiveTransports(): winston.transport[] {
    // If the transports need to be refreshed, reinitialize them
    if (this.needsTransportRefresh) {
      return this.initializeTransports();
    }

    return this.activeTransports;
  }
}
