import { Injectable } from "@nestjs/common";
import {
  ILoggerTheme,
  ILoggerUtilities,
} from "../../interfaces/LoggerUtilities.interface";
import { ProfileData } from "../../interfaces/PerformanceProfiler.interface";
import {
  LoggerTheme,
  YuuLogOptions,
} from "../../interfaces/YuuLogger.interfaces";
import { colors, loggerThemes, themeHighlights } from "./Logger.themes";

/**
 * Implementation of logger utility functions
 *
 * This class provides utility functions for formatting, highlighting,
 * and creating performance reports for the YuuLogger.
 */
@Injectable()
export class LoggerUtilities implements ILoggerUtilities {
  // Singleton to store current options
  private currentOptions: YuuLogOptions = {
    appName: "NestJS",
    logLevels: ["error", "warn", "info"],
    loggerTheme: "default",
  };

  /**
   * Valid log levels supported by the logger
   */
  private readonly validLogLevels = [
    "error",
    "warn",
    "info",
    "verbose",
    "debug",
  ];

  /**
   * Creates a new LoggerUtilities instance
   *
   * @param options - Optional initial logger options
   */
  constructor(options?: YuuLogOptions) {
    if (options) {
      this.setLoggerOptions(options);
    }
  }

  /**
   * Get the current logger options
   *
   * @returns Current logger options
   */
  getLoggerOptions(): YuuLogOptions {
    return { ...this.currentOptions };
  }

  /**
   * Set the logger options
   *
   * @param options - Logger options to set
   */
  setLoggerOptions(options: YuuLogOptions): void {
    this.currentOptions = { ...this.currentOptions, ...options };
  }

  /**
   * Format memory size to human-readable format
   *
   * @param bytes - Memory size in bytes
   * @returns Formatted memory size with units
   */
  formatMemorySize(bytes: number): string {
    if (bytes < 1024) {
      return `${bytes} B`;
    } else if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(2)} KB`;
    } else if (bytes < 1024 * 1024 * 1024) {
      return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    } else {
      return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
    }
  }

  /**
   * Format duration in milliseconds to human-readable format
   *
   * @param ms - Duration in milliseconds
   * @returns Formatted duration with appropriate units
   */
  formatDuration(ms: number): string {
    if (ms < 1) {
      return `${(ms * 1000).toFixed(2)} μs`;
    } else if (ms < 1000) {
      return `${ms.toFixed(2)} ms`;
    } else if (ms < 60000) {
      return `${(ms / 1000).toFixed(2)} s`;
    } else {
      const minutes = Math.floor(ms / 60000);
      const seconds = ((ms % 60000) / 1000).toFixed(2);
      return `${minutes}m ${seconds}s`;
    }
  }

  /**
   * Format CPU usage to human-readable format
   *
   * @param cpuUsage - CPU usage object from process.cpuUsage()
   * @returns Formatted CPU usage string
   */
  formatCpuUsage(cpuUsage: NodeJS.CpuUsage): string {
    // Convert from microseconds to milliseconds
    const userMs = cpuUsage.user / 1000;
    const systemMs = cpuUsage.system / 1000;

    // For very small values, show microseconds instead of 0.00ms
    const formatValue = (value: number, originalMicroseconds: number) => {
      if (value < 0.01 && originalMicroseconds > 0) {
        return `${originalMicroseconds.toFixed(0)}μs`;
      }
      return `${value.toFixed(2)}ms`;
    };

    return `User: ${formatValue(userMs, cpuUsage.user)}, System: ${formatValue(systemMs, cpuUsage.system)}`;
  }

  /**
   * Format memory usage to human-readable format
   *
   * @param memoryUsage - Memory usage object from process.memoryUsage()
   * @returns Formatted memory usage string
   */
  formatMemoryUsage(memoryUsage: NodeJS.MemoryUsage): string {
    return `RSS: ${this.formatMemorySize(memoryUsage.rss)}, Heap: ${this.formatMemorySize(memoryUsage.heapUsed)}/${this.formatMemorySize(memoryUsage.heapTotal)}`;
  }

  /**
   * Helper function to parse comma-separated log levels
   *
   * @param value - The input value to parse
   * @returns An array of valid log levels
   */
  parseLogLevels(value: unknown): string[] {
    if (typeof value !== "string" || value.trim() === "") return ["all"];

    const levels = value.split(",").map((level) => level.trim().toLowerCase());

    // If "all" is specified, return all valid log levels
    if (levels.includes("all")) {
      return ["error", "warn", "info", "verbose", "debug"];
    }

    // Filter out any invalid levels
    return levels.filter((level) =>
      ["error", "warn", "info", "verbose", "debug"].includes(level),
    );
  }

  /**
   * Gets the current logger theme from options
   *
   * @returns Current theme key
   */
  getCurrentTheme(): LoggerTheme {
    return (this.currentOptions.loggerTheme || "default") as LoggerTheme;
  }

  /**
   * Gets the highlight color for a specific theme
   *
   * @param theme - The theme to get the highlight color for
   * @returns The ANSI color code for the theme's highlight color
   */
  getThemeHighlightColor(theme: LoggerTheme = this.getCurrentTheme()): string {
    return themeHighlights[theme] || colors.magenta;
  }

  /**
   * Highlight text with the theme's highlight color
   *
   * @param text - The text to highlight
   * @param theme - Optional theme name
   * @returns The text wrapped with the theme's highlight color ANSI codes
   */
  highlight(text: string | number | boolean, theme?: LoggerTheme): string {
    const highlightColor = this.getThemeHighlightColor(theme);
    return `${highlightColor}${text}${colors.reset}`;
  }

  /**
   * Function to enable template literal tag syntax for highlighting
   *
   * @example
   * // Returns "Status is \x1b[35menabled\x1b[0m" if default theme
   * console.log(`Status is ${h`enabled`}`);
   */
  h = (
    strings: TemplateStringsArray | string | number | boolean,
    ...values: (string | number | boolean | null | undefined)[]
  ): string => {
    if (
      typeof strings === "string" ||
      typeof strings === "number" ||
      typeof strings === "boolean"
    ) {
      // Used as a normal function h('text')
      return this.highlight(strings.toString());
    }

    // Handle template literal tag syntax (h`text`)
    const text = strings.reduce((result, string, i) => {
      return result + string + (values[i] || "");
    }, "");

    return this.highlight(text);
  };

  /**
   * Highlight multiple strings with the theme's highlight color
   *
   * @param texts - Array of text strings to highlight
   * @param theme - Optional theme name
   * @returns Array of texts wrapped with the theme's highlight color ANSI codes
   */
  highlightMany(
    texts: (string | number | boolean)[],
    theme?: LoggerTheme,
  ): string[] {
    return texts.map((text) => this.highlight(text, theme));
  }

  /**
   * URL for the API service highlighted with the current theme
   *
   * @param options - Optional configuration to override global settings
   * @returns A highlighted URL string for display in logs
   */
  highlightUrl(options?: {
    port?: number | string;
    appUrl?: string;
    isDevelopment?: boolean;
  }): string {
    const isDev =
      options?.isDevelopment ?? process.env.NODE_ENV === "development";
    const port = options?.port ?? process.env.PORT ?? 3000;
    const appUrl = options?.appUrl ?? process.env.APP_URL ?? "";

    return isDev
      ? this.highlight(`http://localhost:${port}`)
      : this.highlight(appUrl);
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
    theme: ILoggerTheme,
    indent = 0,
  ): string {
    const indentation = "  ".repeat(indent);

    // Create box drawing characters for better visual structure
    const boxChars = {
      topLeft: "┌",
      topRight: "┐",
      bottomLeft: "└",
      bottomRight: "┘",
      horizontal: "─",
      vertical: "│",
      verticalRight: "├",
      horizontalDown: "┬",
      horizontalUp: "┴",
      verticalLeft: "┤",
      cross: "┼",
    };

    // Create a horizontal line with specified width and character
    const line = (char: string, length = 80): string => char.repeat(length);

    // Function to create a boxed section with title
    const createSection = (title: string, content: string): string => {
      const width = 80;
      const titleDisplay = ` ${title} `;
      const leftFill = Math.floor((width - titleDisplay.length) / 2);
      const rightFill = width - titleDisplay.length - leftFill;

      return (
        `${colors.bold}${colors.brightCyan}${boxChars.topLeft}${line(boxChars.horizontal, leftFill)}${titleDisplay}${line(boxChars.horizontal, rightFill)}${boxChars.topRight}${colors.reset}\n` +
        `${colors.brightCyan}${boxChars.vertical}${colors.reset} ${content}\n` +
        `${colors.brightCyan}${boxChars.bottomLeft}${line(boxChars.horizontal, width)}${boxChars.bottomRight}${colors.reset}`
      );
    };

    // Format operation name and duration in a visually appealing way
    const operationTitle = `${theme.level.info}${colors.bold}${profile.operationName}${colors.reset}`;
    const durationText = profile.duration
      ? `${theme.message.info}${this.formatDuration(profile.duration)}${colors.reset}`
      : `${theme.message.warn}[In Progress]${colors.reset}`;

    // Create the main header with operation name and duration
    let header = `${colors.bold}${colors.brightMagenta}▶ OPERATION:${colors.reset} ${operationTitle}\n`;
    header += `${colors.bold}${colors.brightMagenta}▶ DURATION:${colors.reset} ${durationText}`;

    // Create the resource usage section
    let resourceUsage = "";

    if (profile.memoryUsageDiff) {
      const heapDiff = profile.memoryUsageDiff.heapUsed;
      const heapColor = heapDiff > 0 ? colors.red : colors.green;
      const sign = heapDiff > 0 ? "+" : "";

      resourceUsage += `${colors.bold}MEMORY:${colors.reset} ${heapColor}${sign}${this.formatMemorySize(heapDiff)}${colors.reset}`;

      // Add RSS if significant
      if (Math.abs(profile.memoryUsageDiff.rss) > 1024) {
        resourceUsage += ` ${colors.dim}(RSS: ${sign}${this.formatMemorySize(profile.memoryUsageDiff.rss)})${colors.reset}`;
      }
    }

    // Add CPU usage if available
    if (profile.cpuUsageDiff) {
      if (resourceUsage) resourceUsage += "\n";
      resourceUsage += `${colors.bold}CPU:${colors.reset} ${this.formatCpuUsage(profile.cpuUsageDiff)}`;
    }

    // Add metadata if available (format it nicely)
    let metadataSection = "";
    if (profile.metadata && Object.keys(profile.metadata).length > 0) {
      // Create a formatter for metadata that makes it more readable
      const formatMetadata = (
        metadata: Record<string, unknown>,
        level = 0,
      ): string => {
        const indent = "  ".repeat(level);

        return Object.entries(metadata)
          .map(([key, value]) => {
            // Format the key
            const formattedKey = `${colors.bold}${key}${colors.reset}`;

            // Format the value based on its type
            if (value === null || value === undefined) {
              return `${indent}${formattedKey}: ${colors.dim}null${colors.reset}`;
            } else if (typeof value === "object" && !Array.isArray(value)) {
              // For nested objects, recurse
              const nestedObject = formatMetadata(
                value as Record<string, unknown>,
                level + 1,
              );
              return `${indent}${formattedKey}:\n${nestedObject}`;
            } else if (Array.isArray(value)) {
              if (value.length === 0) {
                return `${indent}${formattedKey}: ${colors.dim}[]${colors.reset}`;
              } else if (typeof value[0] === "object" && value[0] !== null) {
                // For arrays of objects, format each item
                const items = value
                  .map(
                    (item, i) =>
                      `${indent}  ${colors.dim}[${i}]:${colors.reset}\n${formatMetadata(item as Record<string, unknown>, level + 2)}`,
                  )
                  .join("\n");
                return `${indent}${formattedKey}:\n${items}`;
              } else {
                // For simple arrays
                return `${indent}${formattedKey}: [${value.map((v) => JSON.stringify(v)).join(", ")}]`;
              }
            } else {
              // For primitive values
              return `${indent}${formattedKey}: ${value}`;
            }
          })
          .join("\n");
      };

      metadataSection = formatMetadata(profile.metadata);
    }

    // Create child profiles section if there are children
    let childrenSection = "";
    if (profile.children && profile.children.length > 0) {
      // For children, we'll use a simplified format with indentation to show hierarchy
      childrenSection = profile.children
        .map((child, index) => {
          const isLast = index === profile.children!.length - 1;
          const childPrefix = isLast
            ? `${indentation}${colors.brightCyan}${boxChars.bottomLeft}${boxChars.horizontal}► ${colors.reset}`
            : `${indentation}${colors.brightCyan}${boxChars.verticalRight}${boxChars.horizontal}► ${colors.reset}`;

          // For child profiles, use a simplified format
          const childName = `${theme.level.debug}${child.operationName}${colors.reset}`;
          const childDuration = child.duration
            ? `${theme.message.debug}${this.formatDuration(child.duration)}${colors.reset}`
            : `${theme.message.warn}[In Progress]${colors.reset}`;

          let childReport = `${childPrefix}${childName} - ${childDuration}`;

          // Add memory info if available
          if (child.memoryUsageDiff) {
            const heapDiff = child.memoryUsageDiff.heapUsed;
            const heapColor = heapDiff > 0 ? colors.red : colors.green;
            const sign = heapDiff > 0 ? "+" : "";

            childReport += ` ${colors.dim}|${colors.reset} Memory: ${heapColor}${sign}${this.formatMemorySize(heapDiff)}${colors.reset}`;
          }

          return childReport;
        })
        .join("\n");
    }

    // Assemble the final report
    let report = `${indentation}${header}`;

    // Add resource usage section if we have data
    if (resourceUsage) {
      report += `\n\n${indentation}${createSection("RESOURCE USAGE", resourceUsage)}`;
    }

    // Add metadata section if we have data
    if (metadataSection) {
      report += `\n\n${indentation}${createSection("METADATA", metadataSection)}`;
    }

    // Add children section if we have children
    if (childrenSection) {
      report += `\n\n${indentation}${colors.brightCyan}${colors.bold}CHILD OPERATIONS:${colors.reset}\n${childrenSection}`;
    }

    return report;
  }
}

// Export all utility function to use with the LoggerUtilities class
export const loggerUtilities = new LoggerUtilities();
export const formatMemorySize =
  loggerUtilities.formatMemorySize.bind(loggerUtilities);
export const formatDuration =
  loggerUtilities.formatDuration.bind(loggerUtilities);
export const formatCpuUsage =
  loggerUtilities.formatCpuUsage.bind(loggerUtilities);
export const formatMemoryUsage =
  loggerUtilities.formatMemoryUsage.bind(loggerUtilities);
export const parseLogLevels =
  loggerUtilities.parseLogLevels.bind(loggerUtilities);
export const getCurrentTheme =
  loggerUtilities.getCurrentTheme.bind(loggerUtilities);
export const getThemeHighlightColor =
  loggerUtilities.getThemeHighlightColor.bind(loggerUtilities);
export const highlight = loggerUtilities.highlight.bind(loggerUtilities);
export const highlightMany =
  loggerUtilities.highlightMany.bind(loggerUtilities);
export const highlightUrl = loggerUtilities.highlightUrl.bind(loggerUtilities);
export const createPerformanceReport =
  loggerUtilities.createPerformanceReport.bind(loggerUtilities);
export const h = loggerUtilities.h.bind(loggerUtilities);
export const setLoggerOptions =
  loggerUtilities.setLoggerOptions.bind(loggerUtilities);
export const getLoggerOptions =
  loggerUtilities.getLoggerOptions.bind(loggerUtilities);
export const getCurrentOptions =
  loggerUtilities.getLoggerOptions.bind(loggerUtilities);
export const getCurrentLoggerOptions =
  loggerUtilities.getLoggerOptions.bind(loggerUtilities);
export const getCurrentLoggerTheme =
  loggerUtilities.getCurrentTheme.bind(loggerUtilities);
export const getCurrentLoggerThemeHighlightColor =
  loggerUtilities.getThemeHighlightColor.bind(loggerUtilities);

// Export constants
export const validLogLevels = [
  "error",
  "warn",
  "info",
  "verbose",
  "debug",
  "all",
] as const;
