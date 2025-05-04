import winston from "winston";
import { StructuredLogEntry } from "./YuuLogger.interfaces";

/**
 * Interface for classes that handle log formatting
 */
export interface ILogFormatter {
  /**
   * Create console format for Winston
   * @returns Winston format object for console output
   */
  createConsoleFormat(): winston.Logform.Format;

  /**
   * Create file format for Winston
   * @returns Winston format object for file output
   */
  createFileFormat(): winston.Logform.Format;

  /**
   * Create external service format for Winston
   * @returns Winston format object for external services
   */
  createExternalFormat(): winston.Logform.Format;

  /**
   * Format a structured log entry for external services
   * @param entry The structured log entry
   * @returns Formatted entry for external service consumption
   */
  formatStructuredEntry(entry: StructuredLogEntry): Record<string, unknown>;
}
