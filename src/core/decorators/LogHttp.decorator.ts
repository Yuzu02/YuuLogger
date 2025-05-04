import { UseInterceptors, applyDecorators } from "@nestjs/common";
import { HttpLoggerOptions } from "../../interfaces/httpLogger.interface";
import { HttpLoggerInterceptor } from "../interceptors/HttpLogger.interceptor";

/**
 * Decorator for logging HTTP requests
 *
 * The `@LogHttp()` decorator provides a convenient way to apply the HttpLoggerInterceptor
 * to controllers or individual methods. It automatically logs details of HTTP requests,
 * including method, route, status code, response time, and errors.
 *
 * @param options - Optional configuration for the interceptor or an array of excluded paths
 * @returns A decorator that can be applied to classes or methods
 *
 * @example
 * // Apply to a controller (affects all endpoints)
 * @LogHttp()
 * @Controller('users')
 * export class UsersController {}
 *
 * @example
 * // Apply to a controller excluding some routes
 * @LogHttp({ excludePaths: ['/users/health', '/users/metrics'] })
 * @Controller('users')
 * export class UsersController {}
 *
 * @example
 * // Apply to a specific endpoint with detailed options
 * @LogHttp({
 *   logRequestHeaders: true,
 *   logResponseHeaders: true
 * })
 * @Get(':id')
 * findOne(@Param('id') id: string) {}
 *
 * @example
 * // Shorthand form to exclude routes
 * @LogHttp(['/health', '/metrics'])
 * @Controller()
 * export class AppController {}
 */
export function LogHttp(
  options?: HttpLoggerOptions | string[],
): ClassDecorator & MethodDecorator {
  // Handle the case when an array of excluded paths is passed
  if (Array.isArray(options)) {
    return applyDecorators(
      UseInterceptors(
        new HttpLoggerInterceptor({
          excludePaths: options,
        }),
      ),
    );
  }

  // Handle the normal case with options
  return applyDecorators(UseInterceptors(new HttpLoggerInterceptor(options)));
}
