import winston from "winston";
import { LogLevel } from "./YuuLogger.interfaces";

/**
 * Configuration options for file transport
 */
export interface FileTransportConfig {
  /**
   * Base filename pattern for logs
   * @default "logs/application-%DATE%.log"
   */
  filename?: string;

  /**
   * Date pattern format for rotating files
   * @default "YYYY-MM-DD"
   */
  datePattern?: string;

  /**
   * Maximum size of log files before rotation
   * @default "20m"
   */
  maxSize?: string;

  /**
   * Maximum number of files to keep
   * @default "14d"
   */
  maxFiles?: string;

  /**
   * Custom format for the file transport
   * If not provided, the default file format will be used
   */
  format?: winston.Logform.Format;
}

/**
 * Configuration options for error file transport
 * Extends FileTransportConfig with error-specific options
 */
export interface ErrorFileTransportConfig extends FileTransportConfig {
  /**
   * Base filename pattern for error logs
   * @default "logs/error-%DATE%.log"
   */
  filename?: string;
}

/**
 * Custom transport configuration
 */
export interface CustomTransportConfig {
  /**
   * The Winston transport instance
   */
  transport: winston.transport;

  /**
   * Optional name for the transport
   */
  name?: string;
}

/**
 * Interface for classes that manage Winston transports
 */
export interface ITransportManager {
  /**
   * Initialize all transports based on configuration
   * @returns Array of configured Winston transports
   */
  initializeTransports(): winston.transport[];

  /**
   * Get the minimum log level based on enabled levels
   * @returns The minimum log level to configure Winston with
   */
  getMinLogLevel(): LogLevel;

  /**
   * Get console transport
   * @param format The format to use for console output
   * @returns Console transport
   */
  getConsoleTransport(format: winston.Logform.Format): winston.transport;

  /**
   * Get file transports if enabled
   * @param format The format to use for file output
   * @param minLogLevel The minimum log level
   * @returns Array of file transports or empty array if disabled
   */
  getFileTransports(
    format: winston.Logform.Format,
    minLogLevel: LogLevel,
  ): winston.transport[];

  /**
   * Get external service transports if configured
   * @param format The format to use for external services
   * @param minLogLevel The minimum log level
   * @returns Array of external service transports or empty array if not configured
   */
  getExternalTransports(
    format: winston.Logform.Format,
    minLogLevel: LogLevel,
  ): winston.transport[];

  /**
   * Flush logs for any external services that require it
   */
  flushExternalLogs(): void;

  /**
   * Configure file transport settings
   * @param config Configuration options for the main file transport
   */
  configureFileTransport(config: FileTransportConfig): void;

  /**
   * Configure error file transport settings
   * @param config Configuration options for the error file transport
   */
  configureErrorFileTransport(config: ErrorFileTransportConfig): void;

  /**
   * Add a custom transport to the logger at runtime
   * @param config The custom transport configuration
   * @returns The name or identifier of the added transport
   */
  addCustomTransport(config: CustomTransportConfig): string;

  /**
   * Remove a custom transport by its name or identifier
   * @param transportName The name or identifier of the transport to remove
   * @returns Boolean indicating whether the transport was removed successfully
   */
  removeCustomTransport(transportName: string): boolean;

  /**
   * Get all currently active transports
   * @returns Array of all active transports
   */
  getActiveTransports(): winston.transport[];
}
