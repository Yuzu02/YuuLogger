import { ProfileData } from "./PerformanceProfiler.interface";
import { LoggerTheme, YuuLogOptions } from "./YuuLogger.interfaces";

/**
 * Interface for logger utility functions
 */
export interface ILoggerUtilities {
  /**
   * Get the current logger options
   *
   * @returns Current logger options
   */
  getLoggerOptions(): YuuLogOptions;

  /**
   * Set the logger options
   *
   * @param options - Logger options to set
   */
  setLoggerOptions(options: YuuLogOptions): void;

  /**
   * Format memory size to human-readable format
   *
   * @param bytes - Memory size in bytes
   * @returns Formatted memory size with units
   */
  formatMemorySize(bytes: number): string;

  /**
   * Format duration in milliseconds to human-readable format
   *
   * @param ms - Duration in milliseconds
   * @returns Formatted duration with appropriate units
   */
  formatDuration(ms: number): string;

  /**
   * Format CPU usage to human-readable format
   *
   * @param cpuUsage - CPU usage object from process.cpuUsage()
   * @returns Formatted CPU usage string
   */
  formatCpuUsage(cpuUsage: NodeJS.CpuUsage): string;

  /**
   * Format memory usage to human-readable format
   *
   * @param memoryUsage - Memory usage object from process.memoryUsage()
   * @returns Formatted memory usage string
   */
  formatMemoryUsage(memoryUsage: NodeJS.MemoryUsage): string;

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
    indent?: number,
  ): string;

  /**
   * Helper function to parse comma-separated log levels
   *
   * @param value - The input value to parse
   * @returns An array of valid log levels
   */
  parseLogLevels(value: unknown): string[];

  /**
   * Gets the current logger theme from options
   *
   * @returns Current theme key
   */
  getCurrentTheme(): LoggerTheme;

  /**
   * Gets the highlight color for a specific theme
   *
   * @param theme - The theme to get the highlight color for
   * @returns The ANSI color code for the theme's highlight color
   */
  getThemeHighlightColor(theme?: LoggerTheme): string;

  /**
   * Highlight text with the theme's highlight color
   *
   * @param text - The text to highlight
   * @param theme - Optional theme name
   * @returns The text wrapped with the theme's highlight color ANSI codes
   */
  highlight(text: string | number | boolean, theme?: LoggerTheme): string;

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
  ): string[];

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
  }): string;

  /**
   * Template literal tag for highlighting text
   */
  h: (
    strings: TemplateStringsArray | string | number | boolean,
    ...values: (string | number | boolean | null | undefined)[]
  ) => string;
}

/**
 * Interface for level-specific log colors
 */
export interface ILoggerLevelColors {
  error: string;
  warn: string;
  info: string;
  debug: string;
  verbose: string;
}

/**
 * Interface for logger themes that defines the color scheme
 */
export interface ILoggerTheme {
  appName: string;
  pid: string;
  timestamp: string;
  context: string;
  level: ILoggerLevelColors;
  message: ILoggerLevelColors;
}

/**
 * Type for theme highlight colors used for emphasis
 */
export type IThemeHighlight = {
  [theme in LoggerTheme]: string;
};

/**
 * Extended logger theme interface that combines both structured and simple approaches
 */
export interface IBasicThemeInfo extends ILoggerLevelColors {
  name: string;
  highlight: string;
  background: string;
  text: string;
  success: string;
  trace: string;
  log: string;
}

export type LoggerThemeRecord = Record<LoggerTheme, ILoggerTheme>;
