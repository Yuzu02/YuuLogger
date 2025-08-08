// Export module and service

export { LogHttp } from "./core/decorators/LogHttp.decorator";
// Export decorators
export { Measure } from "./core/decorators/Measure.decorator";
export { HttpLoggerInterceptor } from "./core/interceptors/HttpLogger.interceptor";
// Export interceptors
export { PerformanceInterceptor } from "./core/interceptors/Performance.interceptor";
// Export HTTP interfaces
export type {
  NextFunction,
  RequestType,
  ResponseType,
} from "./interfaces/Http.interface";
export type { HttpLoggerOptions } from "./interfaces/httpLogger.interface";
export type { PerformanceInterceptorOptions } from "./interfaces/Performance.interface";
// Export interfaces
export type {
  LoggerTheme,
  LogLevel,
  SamplingOptions,
  StructuredLogEntry,
  YuuLogAsyncOptions,
  YuuLogOptions,
  YuuLogOptionsFactory,
} from "./interfaces/YuuLogger.interfaces";
export { YuuLogService } from "./services/YuuLogger.service";
export { YUU_LOG_OPTIONS, YuuLogModule } from "./YuuLogger.module";

/* 
// Export middleware
export {
  RequestLoggerMiddleware,
  type RequestLoggerOptions,
} from "./core/middleware/RequestLogger.middleware";

*/

// Export controllers
export { MetricsController } from "./core/controllers/Metrics.controller";
export type {
  PerformanceMetrics,
  ProfileData,
} from "./interfaces/PerformanceProfiler.interface";
// Export theme utilities
export {
  colors,
  loggerThemes,
  themeHighlights,
} from "./utils/logger/Logger.themes";
// Export utilities
export {
  // Main formatters and utilities
  createPerformanceReport,
  formatCpuUsage,
  formatDuration,
  formatMemorySize,
  formatMemoryUsage,
  // Configuration options
  getLoggerOptions,
  h, // Template tag function for highlighting text
  // Text highlighting and marking
  highlight,
  highlightMany,
  highlightUrl,
  // Environment parsing utilities
  parseLogLevels,
  setLoggerOptions,
  validLogLevels,
} from "./utils/logger/Logger.utilities";
