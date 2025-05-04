import { randomUUID } from "crypto";
import { Injectable } from "@nestjs/common";
import {
  IPerformanceProfiler,
  PerformanceMetrics,
  ProfileData,
} from "../../interfaces/PerformanceProfiler.interface";
import { YuuLogOptions } from "../../interfaces/YuuLogger.interfaces";
import { loggerThemes } from "../logger/Logger.themes";
import { LoggerUtilities } from "../logger/Logger.utilities";

/**
 * Service for profiling and measuring performance of operations
 *
 * This class provides comprehensive tools for tracking the performance of
 * operations, supporting nested profiles, resource usage tracking, and more.
 */
@Injectable()
export class PerformanceProfiler implements IPerformanceProfiler {
  private options: YuuLogOptions;
  private readonly loggerUtilities: LoggerUtilities;
  private activeProfiles: Map<string, ProfileData> = new Map();
  private performanceMetrics: Map<string, PerformanceMetrics[]> = new Map();

  /**
   * Default options to use when none are provided
   */
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
   * Creates a new PerformanceProfiler instance
   *
   * @param options - Optional initial configuration options
   */
  constructor(options?: YuuLogOptions) {
    this.options = { ...this.defaultOptions, ...(options || {}) };
    this.loggerUtilities = new LoggerUtilities(this.options);
  }

  /**
   * Set logger options for the profiler
   *
   * @param options - Logger options to set
   */
  setOptions(options: YuuLogOptions): void {
    this.options = { ...this.options, ...options };
    this.loggerUtilities.setLoggerOptions(this.options);
  }

  /**
   * Get the current options
   *
   * @returns Current logger options
   */
  getOptions(): YuuLogOptions {
    return { ...this.options };
  }

  /**
   * Check if a specific profile should be sampled based on sampling rate
   *
   * @param isProfile - Whether this is a profile event
   * @returns True if the profile should be sampled
   */
  shouldSampleEvent(isProfile = false): boolean {
    const sampling = this.options.sampling || this.defaultOptions.sampling;

    // Determine the appropriate sampling rate
    const rate = isProfile
      ? (sampling?.profileSamplingRate ?? 1.0)
      : (sampling?.generalSamplingRate ?? 1.0);

    // If the rate is 1.0 (100%), always log
    if (rate >= 1.0) {
      return true;
    }

    // Apply random sampling
    const randomValue = Math.random();
    return randomValue < rate;
  }

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
  ): string {
    const id = randomUUID();
    const metrics: PerformanceMetrics = {
      operationName,
      startTime: performance.now(),
      metadata,
      memoryUsage: process.memoryUsage(),
      cpuUsage: process.cpuUsage(),
    };

    // Store metrics by operation name for aggregation
    if (!this.performanceMetrics.has(operationName)) {
      this.performanceMetrics.set(operationName, []);
    }
    this.performanceMetrics.get(operationName)?.push(metrics);

    return id;
  }

  /**
   * Stop measuring performance for an operation
   *
   * @param operationName - Name of the operation being measured
   * @returns The performance metrics data or undefined if no measurement was found
   */
  stopMeasure(operationName: string): PerformanceMetrics | undefined {
    const metrics = this.performanceMetrics.get(operationName)?.pop();

    if (!metrics) {
      return undefined;
    }

    // Calculate duration and record end time
    metrics.endTime = performance.now();
    metrics.duration = metrics.endTime - metrics.startTime;

    return metrics;
  }

  /**
   * Get performance metrics statistics for a specific operation
   *
   * @param operationName - The operation name to get statistics for
   * @returns Summary statistics for the operation or undefined if no metrics exist
   */
  getPerformanceStats(
    operationName: string,
  ): Record<string, unknown> | undefined {
    const metrics = this.performanceMetrics.get(operationName);

    if (!metrics || metrics.length === 0) {
      return undefined;
    }

    // Only include completed measurements
    const completedMetrics = metrics.filter((m) => m.duration !== undefined);

    if (completedMetrics.length === 0) {
      return {
        operationName,
        count: 0,
        message: "No completed measurements found",
      };
    }

    // Calculate statistics
    const durations = completedMetrics.map((m) => m.duration as number);
    const totalDuration = durations.reduce((sum, d) => sum + d, 0);
    const avgDuration = totalDuration / durations.length;
    const minDuration = Math.min(...durations);
    const maxDuration = Math.max(...durations);

    return {
      operationName,
      count: completedMetrics.length,
      totalDuration: this.loggerUtilities.formatDuration(totalDuration),
      averageDuration: this.loggerUtilities.formatDuration(avgDuration),
      minDuration: this.loggerUtilities.formatDuration(minDuration),
      maxDuration: this.loggerUtilities.formatDuration(maxDuration),
      lastMeasurement: this.loggerUtilities.formatDuration(
        durations[durations.length - 1] ?? 0,
      ),
    };
  }

  /**
   * Clear all performance metrics
   *
   * @param operationName - Optional operation name to clear only specific metrics
   */
  clearPerformanceMetrics(operationName?: string): void {
    if (operationName) {
      this.performanceMetrics.delete(operationName);
    } else {
      this.performanceMetrics.clear();
    }
  }

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
  ): string | null {
    // Apply sampling for profiles
    if (!this.shouldSampleEvent(true)) {
      // Return null instead of a skipped ID for better test compatibility
      return null;
    }

    const id = randomUUID();
    const profile: ProfileData = {
      id,
      operationName,
      startTime: performance.now(),
      context,
      metadata,
      children: [],
    };

    const memoryBefore = process.memoryUsage();
    const cpuBefore = process.cpuUsage();

    // Store initial memory and CPU usage
    profile.metadata = {
      ...profile.metadata,
      _initialMemory: memoryBefore,
      _initialCpu: cpuBefore,
    };

    this.activeProfiles.set(id, profile);

    return id;
  }

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
  ): string {
    const parentProfile = this.activeProfiles.get(parentId);

    if (!parentProfile) {
      // Fallback to creating a new parent profile
      return this.startProfile(operationName, undefined, metadata) as string;
    }

    const childId = randomUUID();
    const childProfile: ProfileData = {
      id: childId,
      operationName,
      startTime: performance.now(),
      context: parentProfile.context,
      metadata,
    };

    const memoryBefore = process.memoryUsage();
    const cpuBefore = process.cpuUsage();

    // Store initial memory and CPU usage
    childProfile.metadata = {
      ...childProfile.metadata,
      _initialMemory: memoryBefore,
      _initialCpu: cpuBefore,
    };

    // Add to active profiles and as child to parent
    this.activeProfiles.set(childId, childProfile);

    if (!parentProfile.children) {
      parentProfile.children = [];
    }

    parentProfile.children.push(childProfile);

    return childId;
  }

  /**
   * Stop a profiling session and calculate metrics
   *
   * @param id - The ID of the profile to stop
   * @returns The profile data with metrics or undefined if no active profile was found
   */
  stopProfile(id: string | null): ProfileData | undefined {
    // If profile ID is null (due to sampling), return undefined
    if (id === null) {
      return undefined;
    }

    const profile = this.activeProfiles.get(id);

    if (!profile) {
      return undefined;
    }

    // Calculate duration and record end time
    profile.endTime = performance.now();
    profile.duration = profile.endTime - profile.startTime;

    // Calculate memory and CPU usage differences
    if (profile.metadata?._initialMemory && profile.metadata?._initialCpu) {
      const initialMemory = profile.metadata
        ._initialMemory as NodeJS.MemoryUsage;
      const initialCpu = profile.metadata._initialCpu as NodeJS.CpuUsage;

      const endMemory = process.memoryUsage();
      const endCpu = process.cpuUsage();

      profile.memoryUsageDiff = {
        rss: endMemory.rss - initialMemory.rss,
        heapTotal: endMemory.heapTotal - initialMemory.heapTotal,
        heapUsed: endMemory.heapUsed - initialMemory.heapUsed,
        external: endMemory.external - initialMemory.external,
      };

      profile.cpuUsageDiff = {
        user: endCpu.user - initialCpu.user,
        system: endCpu.system - initialCpu.system,
      };

      // Remove internal properties from metadata
      delete profile.metadata._initialMemory;
      delete profile.metadata._initialCpu;
    }

    // Process any unfinished child profiles
    if (profile.children) {
      for (const child of profile.children) {
        if (child.endTime === undefined) {
          child.endTime = profile.endTime;
          child.duration = child.endTime - child.startTime;

          // Calculate child metrics too
          if (child.metadata?._initialMemory && child.metadata?._initialCpu) {
            const initialMemory = child.metadata
              ._initialMemory as NodeJS.MemoryUsage;
            const initialCpu = child.metadata._initialCpu as NodeJS.CpuUsage;

            const endMemory = process.memoryUsage();
            const endCpu = process.cpuUsage();

            child.memoryUsageDiff = {
              rss: endMemory.rss - initialMemory.rss,
              heapTotal: endMemory.heapTotal - initialMemory.heapTotal,
              heapUsed: endMemory.heapUsed - initialMemory.heapUsed,
              external: endMemory.external - initialMemory.external,
            };

            child.cpuUsageDiff = {
              user: endCpu.user - initialCpu.user,
              system: endCpu.system - initialCpu.system,
            };

            // Remove internal properties from metadata
            delete child.metadata._initialMemory;
            delete child.metadata._initialCpu;
          }

          // Remove from active profiles
          this.activeProfiles.delete(child.id);
        }
      }
    }

    // Remove from active profiles
    this.activeProfiles.delete(id);

    return profile;
  }

  /**
   * Get all active profiles
   *
   * @returns Map of all active profiles
   */
  getActiveProfiles(): Map<string, ProfileData> {
    return new Map(this.activeProfiles);
  }

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
    indent = 0,
  ): string {
    return this.loggerUtilities.createPerformanceReport(profile, theme, indent);
  }

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
  ): (...args: Parameters<T>) => ReturnType<T> {
    const name = operationName || fn.name || "anonymous function";

    return (...args: Parameters<T>): ReturnType<T> => {
      const profileId = this.startProfile(name);
      try {
        const result = fn(...args);

        // Handle promise results
        if (result instanceof Promise) {
          return result
            .then((value) => {
              this.stopProfile(profileId as string);
              return value;
            })
            .catch((error) => {
              this.stopProfile(profileId as string);
              throw error;
            }) as ReturnType<T>;
        }

        this.stopProfile(profileId as string);
        return result as ReturnType<T>;
      } catch (error) {
        this.stopProfile(profileId as string);
        throw error;
      }
    };
  }

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
  ): (...args: Parameters<T>) => Promise<Awaited<ReturnType<T>>> {
    const name = operationName || fn.name || "anonymous async function";

    return async (...args: Parameters<T>): Promise<Awaited<ReturnType<T>>> => {
      const profileId = this.startProfile(name);
      try {
        const result = await fn(...args);
        this.stopProfile(profileId as string);
        return result as Awaited<ReturnType<T>>;
      } catch (error) {
        this.stopProfile(profileId as string);
        throw error;
      }
    };
  }

  /**
   * Create an async iterator that automatically measures each iteration
   *
   * @param iterator - The async iterator to measure
   * @param operationName - Name for this operation
   * @returns A wrapped async iterator that measures each iteration
   */
  async *profileAsyncIterator<T>(
    iterator: AsyncIterableIterator<T>,
    operationName: string,
  ): AsyncIterableIterator<T> {
    let iteration = 0;
    const mainProfileId = this.startProfile(operationName);

    try {
      for await (const item of iterator) {
        const iterProfileId = this.startChildProfile(
          mainProfileId as string,
          `${operationName} - iteration ${++iteration}`,
        );
        yield item;
        await Promise.resolve(); // Añadir await para evitar la advertencia de lint
        this.stopProfile(iterProfileId);
      }
    } finally {
      this.stopProfile(mainProfileId as string);
    }
  }
}
