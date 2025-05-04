import { Injectable } from "@nestjs/common";
import * as winston from "winston";
import { ILogFormatter } from "../../interfaces/LogFormatter.interface";
import {
  LoggerTheme,
  StructuredLogEntry,
  YuuLogOptions,
} from "../../interfaces/YuuLogger.interfaces";
import { colors, loggerThemes } from "./Logger.themes";

/**
 * LogFormatter class responsible for handling all log formatting logic
 *
 * This class creates and manages different formatting styles for console, file
 * and external service logs, applying appropriate themes and colors.
 */
@Injectable()
export class LogFormatter implements ILogFormatter {
  private readonly options: YuuLogOptions;
  private readonly pid: number;

  /**
   * Creates a new LogFormatter instance
   *
   * @param options - Configuration options for the logger
   */
  constructor(options: YuuLogOptions) {
    this.options = options;
    this.pid = process.pid;
  }

  /**
   * Create console format for Winston with appropriate colors and styling
   *
   * @returns Winston format object for console output
   */
  createConsoleFormat(): winston.Logform.Format {
    // Obtain the selected theme from options
    const selectedTheme = this.options.loggerTheme || "default";
    const theme =
      loggerThemes[selectedTheme as LoggerTheme] || loggerThemes.default;

    return winston.format.combine(
      winston.format.timestamp({
        format: "MM/DD/YYYY, hh:mm:ss A",
      }),
      winston.format.printf((info) => {
        const { timestamp, level, message, context } = info;
        const APP_NAME = this.options.appName;
        const levelUpperCase = level.toUpperCase();

        // Apply colors according to the selected theme
        let colorizedLevel: string;
        let colorizedMsg = message;

        switch (level) {
          case "error":
            colorizedLevel = `${theme.level.error}${levelUpperCase}${colors.reset}`;
            colorizedMsg = `${theme.message.error}${message}${colors.reset}`;
            break;
          case "warn":
            colorizedLevel = `${theme.level.warn}${levelUpperCase}${colors.reset}`;
            colorizedMsg = `${theme.message.warn}${message}${colors.reset}`;
            break;
          case "info":
            colorizedLevel = `${theme.level.info}${levelUpperCase}${colors.reset}`;
            colorizedMsg = `${theme.message.info}${message}${colors.reset}`;
            break;
          case "debug":
            colorizedLevel = `${theme.level.debug}${levelUpperCase}${colors.reset}`;
            colorizedMsg = `${theme.message.debug}${message}${colors.reset}`;
            break;
          case "verbose":
            colorizedLevel = `${theme.level.verbose}${levelUpperCase}${colors.reset}`;
            colorizedMsg = `${theme.message.verbose}${message}${colors.reset}`;
            break;
          default:
            colorizedLevel = levelUpperCase;
        }

        const colorizedAppName = `${theme.appName}[${APP_NAME}]${colors.reset}`;
        const colorizedTimestamp = `${theme.timestamp}${timestamp}${colors.reset}`;
        const colorizedPid = `${theme.pid}${this.pid}${colors.reset}`;
        const colorizedContext = context
          ? `${theme.context}[${context}]${colors.reset}`
          : "";

        return `${colorizedAppName} ${colorizedPid} - ${colorizedTimestamp}     ${colorizedLevel} ${colorizedContext} ${colorizedMsg}`;
      }),
    );
  }

  /**
   * Create file format for Winston
   *
   * @returns Winston format object for file output
   */
  createFileFormat(): winston.Logform.Format {
    return winston.format.combine(
      winston.format.timestamp(),
      winston.format.json(),
    );
  }

  /**
   * Create external service format for Winston
   *
   * @returns Winston format object for external services
   */
  createExternalFormat(): winston.Logform.Format {
    return winston.format.combine(
      winston.format.timestamp(),
      winston.format.metadata({
        fillExcept: ["message", "level", "timestamp", "context"],
      }),
    );
  }

  /**
   * Format a structured log entry for external services
   *
   * @param entry - The structured log entry to format
   * @returns A flattened object suitable for external logging services
   */
  formatStructuredEntry(entry: StructuredLogEntry): Record<string, unknown> {
    // Create a flat object for external services
    const formattedEntry: Record<string, unknown> = {
      message: entry.message,
      level: entry.level,
      context: entry.context,
      timestamp: entry.timestamp,
    };

    // Add data if they exist, flattening them for external services
    if (entry.data) {
      Object.entries(entry.data).forEach(([key, value]) => {
        // Add data with prefixes to maintain structure
        if (typeof value === "object" && value !== null) {
          Object.entries(value as Record<string, unknown>).forEach(
            ([subKey, subValue]) => {
              formattedEntry[`${key}_${subKey}`] = subValue;
            },
          );
        } else {
          formattedEntry[key] = value;
        }
      });
    }

    return formattedEntry;
  }
}
