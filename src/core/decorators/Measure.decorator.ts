import { applyDecorators, UseInterceptors } from "@nestjs/common";
import { PerformanceInterceptorOptions } from "../../interfaces/Performance.interface";
import { PerformanceInterceptor } from "../interceptors/Performance.interceptor";

/**
 * Decorator to measure the performance of a controller or endpoint
 *
 * The `@Measure()` decorator provides a convenient way to apply the PerformanceInterceptor
 * to controllers or individual methods. It automatically tracks execution time, memory usage,
 * and other performance metrics for the decorated component.
 *
 * @param optionsOrName - Either a configuration object or a string name for the operation
 * @returns A decorator that can be applied to classes or methods
 *
 * @example
 * // Apply to a controller (affects all endpoints)
 * @Measure()
 * @Controller('users')
 * export class UsersController {}
 *
 * @example
 * // Apply to a controller with a custom operation name
 * @Measure('User Management')
 * @Controller('users')
 * export class UsersController {}
 *
 * @example
 * // Apply to a specific endpoint with detailed options
 * @Measure({
 *   operationName: 'Get User Profile',
 *   includeRequestBody: true,
 *   includeResponseBody: true
 * })
 * @Get(':id')
 * findOne(@Param('id') id: string) {}
 *
 * @example
 * // Simple string shorthand for naming an operation
 * @Measure('List All Products')
 * @Get()
 * findAll() {}
 */
export function Measure(
  optionsOrName?: PerformanceInterceptorOptions | string,
): ClassDecorator & MethodDecorator {
  // Handle string shorthand for operation name
  let options: PerformanceInterceptorOptions = {};

  if (typeof optionsOrName === "string") {
    options = { operationName: optionsOrName };
  } else if (optionsOrName) {
    options = optionsOrName;
  }

  return applyDecorators(UseInterceptors(new PerformanceInterceptor(options)));
}
