/**
 * Request logging — one structured line per completed request.
 *
 * Responsibility: record method, route pattern, status and latency for Cloud Logging.
 * Boundary: never logs bodies, query strings or raw paths (which may carry user data);
 * only the matched route pattern is recorded.
 */
import type { Request, RequestHandler } from 'express';
import type { LogSeverity, Logger } from '../logger.js';

/** Statuses at or above these thresholds are logged with a higher severity. */
const SERVER_ERROR_STATUS = 500;
const CLIENT_ERROR_STATUS = 400;

/** Pattern of the matched route, or a fixed label for static files and fallbacks. */
function routePattern(req: Request): string {
  const route: unknown = req.route;
  if (typeof route === 'object' && route !== null && 'path' in route) {
    return `${req.baseUrl}${String(route.path)}`;
  }
  return req.path.startsWith('/api') ? '/api/*' : 'static';
}

function severityFor(status: number): LogSeverity {
  if (status >= SERVER_ERROR_STATUS) return 'ERROR';
  if (status >= CLIENT_ERROR_STATUS) return 'WARNING';
  return 'INFO';
}

/**
 * Creates the request-log middleware.
 * @example
 * app.use(createRequestLog(logger, Date.now));
 */
export function createRequestLog(logger: Logger, now: () => number): RequestHandler {
  return (req, res, next) => {
    const startedAt = now();
    res.on('finish', () => {
      logger.log(severityFor(res.statusCode), 'request', {
        method: req.method,
        route: routePattern(req),
        status: res.statusCode,
        latencyMs: now() - startedAt,
      });
    });
    next();
  };
}
