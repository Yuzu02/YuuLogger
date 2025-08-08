import { loggerThemes } from "../utils/logger/Logger.themes";
import { YuuLogOptions } from "./YuuLogger.interfaces";

/**
 * Interface for structured profile data
 *
 * Profiles are comprehensive measurements supporting:
 * - Hierarchical operations with parent-child relationships
 * - Differential resource usage measurements
 * - Contextual information and metadata
 */
export interface ProfileData {
  /** Unique identifier for this profile */
  id: string;

  /** Start time in milliseconds (from performance.now()) */
  startTime: number;

  /** End time in milliseconds (from performance.now()) */
  endTime?: number;

  /** Duration of the operation in milliseconds */
  duration?: number;

  /** Name of the operation being profiled */
  operationName: string;

  /** Context in which the operation is running (e.g., class name) */
  context?: string;

  /** Additional metadata about the operation */
  metadata?: Record<string, unknown>;

  /** Memory usage difference between start and end */
  memoryUsageDiff?: {
    rss: number;
    heapTotal: number;
    heapUsed: number;
    external: number;
  };

  /** CPU usage difference between start and end */
  cpuUsageDiff?: NodeJS.CpuUsage;

  /** Child profiles for nested operations */
  children?: ProfileData[];
}

/**
 * Interface for performance metrics data
 *
 * This interface represents performance measurements for a specific operation,
 * including timing, memory usage, and CPU usage information.
 */
export interface PerformanceMetrics {
  /** Name of the operation being measured */
  operationName: string;

  /** Start time in milliseconds (from performance.now()) */
  startTime: number;

  /** End time in milliseconds (from performance.now()) */
  endTime?: number;

  /** Duration of the operation in milliseconds */
  duration?: number;

  /** Additional contextual data about the operation */
  metadata?: Record<string, unknown>;

  /** Memory usage at the start of the operation */
  memoryUsage?: {
    rss: number;
    heapTotal: number;
    heapUsed: number;
    external: number;
  };

  /** CPU usage at the start of the operation */
  cpuUsage?: NodeJS.CpuUsage;
}

/**
 * Interface for the Performance Profiler service
 *
 * This interface defines methods for measuring, profiling and tracking
 * performance of operations within the application.
 */
export interface IPerformanceProfiler {
  /**
   * Set logger options for the profiler
   *
   * @param options - Logger options to set
   */
  setOptions(options: YuuLogOptions): void;

  /**
   * Get the current options
   *
   * @returns Current logger options
   */
  getOptions(): YuuLogOptions;

  /**
   * Check if a specific profile should be sampled based on sampling rate
   *
   * @param isProfile - Whether this is a profile event
   * @returns True if the profile should be sampled
   */
  shouldSampleEvent(isProfile?: boolean): boolean;

  /**
   * Start measuring performance for an operation
   *
   * @param operationName - Name of the operation being measured
   * @param metadata - Optional metadata about the operation
   * @returns A unique ID for this performance measurement
   */
  startMeasure(
    operationName: string,
    metadata?: Record<string, unknown>,
  ): string;

  /**
   * Stop measuring performance for an operation
   *
   * @param operationName - Name of the operation being measured
   * @returns The performance metrics data or undefined if no measurement was found
   */
  stopMeasure(operationName: string): PerformanceMetrics | undefined;

  /**
   * Get performance metrics statistics for a specific operation
   *
   * @param operationName - The operation name to get statistics for
   * @returns Summary statistics for the operation or undefined if no metrics exist
   */
  getPerformanceStats(
    operationName: string,
  ): Record<string, unknown> | undefined;

  /**
   * Clear all performance metrics
   *
   * @param operationName - Optional operation name to clear only specific metrics
   */
  clearPerformanceMetrics(operationName?: string): void;

  /**
   * Start a new profiling session
   *
   * @param operationName - Name of the operation being profiled
   * @param context - Optional context for the profile
   * @param metadata - Optional metadata for the profile
   * @returns A unique ID for this profile or null if sampling criteria aren't met
   */
  startProfile(
    operationName: string,
    context?: string,
    metadata?: Record<string, unknown>,
  ): string | null;

  /**
   * Add a child profile to an existing profile
   *
   * @param parentId - The ID of the parent profile
   * @param operationName - Name of the child operation
   * @param metadata - Optional metadata for the child profile
   * @returns The ID of the child profile
   */
  startChildProfile(
    parentId: string,
    operationName: string,
    metadata?: Record<string, unknown>,
  ): string;

  /**
   * Stop a profiling session and calculate metrics
   *
   * @param id - The ID of the profile to stop
   * @returns The profile data with metrics or undefined if no active profile was found
   */
  stopProfile(id: string | null): ProfileData | undefined;

  /**
   * Get all active profiles
   *
   * @returns Map of all active profiles
   */
  getActiveProfiles(): Map<string, ProfileData>;

  /**
   * Create a visual performance report with colors for console output
   *
   * @param profile - Profile data to generate a report for
   * @param theme - Logger theme to use for colors
   * @param indent - Indentation level for nested operations
   * @returns Formatted performance report string
   */
  createPerformanceReport(
    profile: ProfileData,
    theme: typeof loggerThemes.default,
    indent?: number,
  ): string;

  /**
   * Create a function that automatically measures performance around a given function
   *
   * @param fn - The function to measure
   * @param operationName - Name for this operation (defaults to function name)
   * @returns A wrapped function that measures performance
   */
  profileFunction<T extends (...args: unknown[]) => unknown>(
    fn: T,
    operationName?: string,
  ): (...args: Parameters<T>) => ReturnType<T>;

  /**
   * Create an async function that automatically measures performance around a given async function
   *
   * @param fn - The async function to measure
   * @param operationName - Name for this operation (defaults to function name)
   * @returns A wrapped async function that measures performance
   */

  profileAsyncFunction<T extends (...args: unknown[]) => Promise<unknown>>(
    fn: T,
    operationName?: string,
  ): (...args: Parameters<T>) => Promise<Awaited<ReturnType<T>>>;

  /**
   * Create an async iterator that automatically measures each iteration
   *
   * @param iterator - The async iterator to measure
   * @param operationName - Name for this operation
   * @returns A wrapped async iterator that measures each iteration
   */
  profileAsyncIterator<T>(
    iterator: AsyncIterableIterator<T>,
    operationName: string,
  ): AsyncIterableIterator<T>;
}
