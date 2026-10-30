import { isIP } from 'node:net';
import { MAX_BODY_BYTES, unavailable } from './route.mjs';

const localProxyAddresses = new Set(['127.0.0.1', '::1', '::ffff:127.0.0.1']);

export function resolveClientIp(req, env = process.env) {
  const socketIp = req.socket?.remoteAddress ?? 'unknown';
  // Vercel supplies this header at its edge; retain the existing platform behavior.
  if (env.VERCEL === '1') {
    const forwarded = req.headers?.['x-vercel-forwarded-for'];
    return typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : socketIp;
  }
  const realIp = req.headers?.['x-real-ip'];
  // The local reverse proxy must overwrite X-Real-IP, never pass a client value through.
  if (env.ROUTE_TRUST_LOCAL_PROXY === 'true' && localProxyAddresses.has(socketIp)
    && typeof realIp === 'string' && isIP(realIp) !== 0) return realIp;
  return socketIp;
}

export async function readRequestBody(req) {
  const length = Number(req.headers['content-length']);
  if (Number.isFinite(length) && length > MAX_BODY_BYTES) throw new Error('request-too-large');
  if (req.body !== undefined) return req.body;
  let size = 0;
  const chunks = [];
  for await (const chunk of req) {
    size += Buffer.byteLength(chunk);
    if (size > MAX_BODY_BYTES) throw new Error('request-too-large');
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

export function createHandler(service, endpoint = 'route') {
  return async function handler(req, res) {
    let result;
    try {
      const body = req.method === 'POST' ? await readRequestBody(req) : undefined;
      const clientIp = resolveClientIp(req);
      result = await service({ method: req.method, headers: req.headers, body, clientIp });
    } catch (error) {
      result = { statusCode: error?.message === 'request-too-large' ? 413 : 400,
        headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' },
        body: endpoint === 'places'
          ? { places: [], reason: error?.message === 'request-too-large' ? 'request-too-large' : 'invalid-request', calculatedAt: new Date().toISOString() }
          : unavailable(error?.message === 'request-too-large' ? 'request-too-large' : 'invalid-request', Date.now()) };
    }
    for (const [name, value] of Object.entries(result.headers)) res.setHeader(name, value);
    res.statusCode = result.statusCode;
    res.end(result.body === null ? undefined : JSON.stringify(result.body));
  };
}
