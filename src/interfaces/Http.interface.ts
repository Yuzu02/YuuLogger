import { IncomingHttpHeaders } from "http";
import { Request, Response } from "express";
import { ParamsDictionary } from "express-serve-static-core";
import { FastifyReply, FastifyRequest } from "fastify";
import { ParsedQs } from "qs";

/**
 * Union type for HTTP request objects supported by the framework
 * Combines Express and Fastify request types with optional extensions
 */
export interface ExtendedRequest {
  correlationId?: string;
  raw?: {
    socket?: {
      remoteAddress?: string;
    };
  };
  originalUrl?: string;
  url?: string;
  path?: string;
  method?: string;
  params?:
    | Record<string, string | number | boolean | undefined>
    | ParamsDictionary;
  query?:
    | Record<string, string | string[] | number | boolean | undefined>
    | ParsedQs;
  body?: unknown;
  headers?: IncomingHttpHeaders;
  ip?: string;
  __framework?: string; // Optional marker for tests
  // Express specific properties
  baseUrl?: string;
  res?: unknown;
  connection?: { remoteAddress?: string };
  // Fastify specific properties
  id?: string;
  server?: unknown;
}

/**
 * Union type for HTTP response objects supported by the framework
 * Combines Express and Fastify response types with optional extensions
 */
export interface ExtendedResponse {
  correlationId?: string;
  statusCode?: number;
  raw?: {
    statusCode?: number;
    getHeaders?: () => Record<string, string | string[] | number | undefined>;
  };
  getHeaders?: () => Record<string, string | string[] | number | undefined>;
  setHeader?: (name: string, value: string | string[] | number) => void;
  __framework?: string; // Optional marker for tests
  // Express specific properties
  status?: (code: number) => unknown;
  locals?: unknown;
  set?: (field: string, value?: string) => unknown;
  // Fastify specific properties
  sent?: boolean;
  server?: unknown;
  header?: (name: string, value: string) => unknown;
}

/**
 * Express request type
 */
export type ExpressRequest = Request & {
  correlationId?: string;
};

/**
 * Express response type
 */
export type ExpressResponse = Response & {
  correlationId?: string;
};

/**
 * Fastify request type with extensions
 */
export type FastifyRequestExt = Omit<FastifyRequest, "params" | "query"> & {
  correlationId?: string;
  params?:
    | Record<string, string | number | boolean | undefined>
    | ParamsDictionary;
  query?:
    | Record<string, string | string[] | number | boolean | undefined>
    | ParsedQs;
};

/**
 * Fastify response type with extensions
 */
export type FastifyReplyExt = FastifyReply & {
  correlationId?: string;
};

/**
 * Common request type that can be either Express or Fastify
 */
export type RequestType = ExtendedRequest;

/**
 * Common response type that can be either Express or Fastify
 */
export type ResponseType = ExtendedResponse;

/**
 * Next function type for middleware
 */
export type NextFunction = (error?: Error | unknown) => void;

/**
 * Helper function to determine if a request is from Express
 * @param request The request object
 * @returns True if the request is an Express request
 */
export function isExpressRequest(
  request: RequestType,
): request is ExpressRequest {
  return (
    request.__framework === "express" ||
    // Check for Express-specific properties
    ("baseUrl" in request &&
      typeof (request as { res?: unknown }).res !== "undefined")
  );
}

/**
 * Helper function to determine if a response is from Express
 * @param response The response object
 * @returns True if the response is an Express response
 */
export function isExpressResponse(
  response: ResponseType,
): response is ExpressResponse {
  return (
    response.__framework === "express" ||
    // Check for Express-specific properties
    (typeof response.status === "function" &&
      typeof (response as { locals?: unknown }).locals !== "undefined")
  );
}

/**
 * Helper function to determine if a request is from Fastify
 * @param request The request object
 * @returns True if the request is a Fastify request
 */
export function isFastifyRequest(
  request: RequestType,
): request is FastifyRequestExt {
  return (
    request.__framework === "fastify" ||
    // Check for Fastify-specific properties
    ("id" in request && "raw" in request && "server" in request)
  );
}

/**
 * Helper function to determine if a response is from Fastify
 * @param response The response object
 * @returns True if the response is a Fastify response
 */
export function isFastifyResponse(response: ResponseType): boolean {
  return (
    response.__framework === "fastify" ||
    // Check for Fastify-specific properties
    ("sent" in response && "raw" in response && "server" in response)
  );
}
