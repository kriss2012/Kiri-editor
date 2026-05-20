/**
 * Kiri Editor Tracing Middleware
 * Phase 6 Implementation: Distributed Tracing & Request ID Propagation
 * 
 * This middleware ensures every request has a unique trace ID and propagates
 * it across microservices (Agent Manager, Sync Service, etc.) for observability.
 */

const { v4: uuidv4 } = require('uuid');

/**
 * Middleware to inject and propagate trace IDs
 */
const tracingMiddleware = (req, res, next) => {
  // 1. Get trace ID from header (if it's a cross-service call) or generate new one
  const traceId = req.headers['x-trace-id'] || uuidv4();

  // 2. Attach to request object for use in logs and downstream calls
  req.traceId = traceId;

  // 3. Set response header for client-side tracking
  res.setHeader('x-trace-id', traceId);

  // 4. Log the incoming request with context
  console.log(`[Trace:${traceId}] ${req.method} ${req.originalUrl}`);

  // 5. Cleanup / Metrics on response finish
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[Trace:${traceId}] Completed in ${duration}ms (Status: ${res.statusCode})`);
    
    // In a production environment, we would send this data to
    // Jaeger / Prometheus / OpenTelemetry Collector here.
  });

  next();
};

module.exports = tracingMiddleware;
