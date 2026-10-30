import { createServer } from 'node:http';
import route from '../api/route.mjs';
import places from '../api/places.mjs';

export const LISTEN_HOST = '127.0.0.1';
export const SHUTDOWN_GRACE_MS = 10_000;

export function parsePort(value) {
  if (value === undefined || value === '') return 8787;
  if (typeof value !== 'string' || !/^\d+$/.test(value)) throw new Error('PORT must be an integer from 1 to 65535');
  const port = Number(value);
  if (!Number.isSafeInteger(port) || port < 1 || port > 65535) throw new Error('PORT must be an integer from 1 to 65535');
  return port;
}

/** Creates an unbound HTTP server. Production entrypoints bind only to LISTEN_HOST. */
export function createNodeServer({ routeHandler = route, placesHandler = places } = {}) {
  const handlers = new Map([['/api/route', routeHandler], ['/api/places', placesHandler]]);
  const server = createServer({
    requestTimeout: 15_000,
    headersTimeout: 10_000,
    // Node's 30-second default would delay enforcement of the shorter limits.
    connectionsCheckingInterval: 1_000,
    keepAliveTimeout: 5_000,
  }, (req, res) => {
    const path = req.url?.split('?')[0];
    if (path === '/healthz') {
      // Liveness only: this does not inspect credentials, spend quota, or prove
      // provider readiness. Keep its body independent of runtime configuration.
      res.setHeader('Cache-Control', 'no-store');
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      if (req.method !== 'GET' && req.method !== 'HEAD') {
        res.statusCode = 405;
        res.setHeader('Allow', 'GET, HEAD');
        res.end();
        return;
      }
      const body = '{"status":"ok"}';
      res.setHeader('Content-Length', Buffer.byteLength(body));
      res.end(req.method === 'HEAD' ? undefined : body);
      return;
    }
    const handler = handlers.get(path);
    if (!handler) { res.statusCode = 404; res.end(); return; }
    void Promise.resolve().then(() => handler(req, res)).catch(() => {
      if (res.destroyed || res.writableEnded) return;
      if (res.headersSent) { res.destroy(); return; }
      res.statusCode = 500;
      res.setHeader('Cache-Control', 'no-store');
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      // Never reflect exception messages, which can contain provider details.
      res.end('{"reason":"internal-error"}');
    });
  });
  server.setTimeout(15_000, socket => socket.destroy());
  return server;
}

/** Stop accepting connections, allow active responses to finish, then force close. */
export function closeNodeServer(server, graceMs = SHUTDOWN_GRACE_MS) {
  if (!Number.isInteger(graceMs) || graceMs < 1 || graceMs > SHUTDOWN_GRACE_MS) {
    return Promise.reject(new Error('Invalid shutdown grace period'));
  }
  return new Promise((resolve, reject) => {
    const forceClose = setTimeout(() => server.closeAllConnections(), graceMs);
    forceClose.unref();
    server.close(error => {
      clearTimeout(forceClose);
      if (error && error.code !== 'ERR_SERVER_NOT_RUNNING') reject(error);
      else resolve();
    });
  });
}

export function installShutdownHandlers(server, signalTarget = process) {
  let closing;
  const shutdown = () => {
    if (!closing) closing = closeNodeServer(server).catch(() => { signalTarget.exitCode = 1; });
    return closing;
  };
  const dispose = () => {
    signalTarget.removeListener('SIGTERM', shutdown);
    signalTarget.removeListener('SIGINT', shutdown);
    server.removeListener('close', dispose);
  };
  signalTarget.on('SIGTERM', shutdown);
  signalTarget.on('SIGINT', shutdown);
  server.once('close', dispose);
  return dispose;
}
