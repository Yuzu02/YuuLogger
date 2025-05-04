// Export module and service
export { YuuLogModule, YUU_LOG_OPTIONS } from "./YuuLogger.module";
export { YuuLogService } from "./services/YuuLogger.service";

// Export interfaces
export type {
  LogLevel,
  LoggerTheme,
  YuuLogOptions,
  YuuLogOptionsFactory,
  YuuLogAsyncOptions,
  StructuredLogEntry,
  SamplingOptions,
} from "./interfaces/YuuLogger.interfaces";

// Export HTTP interfaces
export type {
  RequestType,
  ResponseType,
  NextFunction,
} from "./interfaces/Http.interface";

// Export decorators
export { Measure } from "./core/decorators/Measure.decorator";
export { LogHttp } from "./core/decorators/LogHttp.decorator";

// Export interceptors
export { PerformanceInterceptor } from "./core/interceptors/Performance.interceptor";
export { HttpLoggerInterceptor } from "./core/interceptors/HttpLogger.interceptor";

export type { HttpLoggerOptions } from "./interfaces/httpLogger.interface";
export type { PerformanceInterceptorOptions } from "./interfaces/Performance.interface";

/* 
// Export middleware
export {
  RequestLoggerMiddleware,
  type RequestLoggerOptions,
} from "./core/middleware/RequestLogger.middleware";

*/

// Export controllers
export { MetricsController } from "./core/controllers/Metrics.controller";

// Export utilities
export {
  // Main formatters and utilities
  createPerformanceReport,
  formatDuration,
  formatMemorySize,
  formatCpuUsage,
  formatMemoryUsage,
  // Text highlighting and marking
  highlight,
  highlightMany,
  highlightUrl,
  h, // Template tag function for highlighting text
  // Configuration options
  getLoggerOptions,
  setLoggerOptions,
  // Environment parsing utilities
  parseLogLevels,
  validLogLevels,
} from "./utils/logger/Logger.utilities";
export type {
  PerformanceMetrics,
  ProfileData,
} from "./interfaces/PerformanceProfiler.interface";

// Export theme utilities
export {
  loggerThemes,
  colors,
  themeHighlights,
} from "./utils/logger/Logger.themes";
