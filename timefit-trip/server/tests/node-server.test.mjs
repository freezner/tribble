import test from 'node:test';
import assert from 'node:assert/strict';
import { request } from 'node:http';
import { connect } from 'node:net';
import { once, EventEmitter } from 'node:events';
import { setTimeout as delay } from 'node:timers/promises';
import { createNodeServer, closeNodeServer, installShutdownHandlers, LISTEN_HOST, SHUTDOWN_GRACE_MS, parsePort } from '../src/node-server.mjs';
import { createHandler } from '../src/http.mjs';
import { createKakaoService } from '../src/route.mjs';

async function listen(t, options) {
  const server = createNodeServer(options);
  server.listen(0, LISTEN_HOST);
  await once(server, 'listening');
  t.after(() => closeNodeServer(server, 20));
  assert.equal(server.address().address, '127.0.0.1');
  return server;
}

function send(server, path, { method = 'GET', body, headers = {} } = {}) {
  return new Promise((resolve, reject) => {
    const req = request({ hostname: LISTEN_HOST, port: server.address().port, path, method, headers, agent: false }, res => {
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks).toString() }));
      res.on('error', reject);
    });
    req.on('error', reject);
    req.end(body);
  });
}

test('GET and HEAD health checks are no-store liveness only and never call Kakao', async t => {
  let upstreamCalls = 0;
  const service = createKakaoService({ env: {}, fetchImpl: async () => { upstreamCalls++; throw new Error('Unexpected upstream call'); } });
  const server = await listen(t, { routeHandler: createHandler(service.route), placesHandler: createHandler(service.places, 'places') });
  const get = await send(server, '/healthz?ignored=mock-sensitive-value');
  assert.equal(get.status, 200);
  assert.equal(get.body, '{"status":"ok"}');
  assert.equal(get.headers['cache-control'], 'no-store');
  assert.equal(get.headers['content-type'], 'application/json; charset=utf-8');
  assert.equal(get.headers['x-content-type-options'], 'nosniff');
  const head = await send(server, '/healthz', { method: 'HEAD' });
  assert.equal(head.status, 200);
  assert.equal(head.body, '');
  assert.equal(head.headers['content-length'], String(Buffer.byteLength(get.body)));
  assert.equal(head.headers['cache-control'], 'no-store');
  // A healthy HTTP process may have no configured provider. This is not readiness.
  const places = await send(server, '/api/places', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{"query":"부산역"}' });
  assert.equal(places.status, 503);
  assert.equal(JSON.parse(places.body).reason, 'not-configured');
  assert.equal(upstreamCalls, 0);
});

test('health rejects other methods, unknown paths remain 404, and API handlers retain the raw request', async t => {
  const calls = [];
  const handler = endpoint => async (req, res) => {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    calls.push({ endpoint, method: req.method, url: req.url, body: Buffer.concat(chunks).toString() });
    res.statusCode = endpoint === 'route' ? 202 : 201;
    res.setHeader('Cache-Control', 'no-store');
    res.end(JSON.stringify({ endpoint }));
  };
  const server = await listen(t, { routeHandler: handler('route'), placesHandler: handler('places') });
  const unsupported = await send(server, '/healthz', { method: 'POST', body: '{}' });
  assert.equal(unsupported.status, 405);
  assert.equal(unsupported.headers.allow, 'GET, HEAD');
  for (const path of ['/missing', '/healthz/', '/constructor', '/api/route/extra']) {
    assert.equal((await send(server, path)).status, 404);
  }
  const route = await send(server, '/api/route?existing=query', { method: 'POST', body: '{"mode":"walking"}' });
  const places = await send(server, '/api/places', { method: 'POST', body: '{"query":"부산역"}' });
  assert.equal(route.status, 202);
  assert.equal(places.status, 201);
  assert.deepEqual(calls, [
    { endpoint: 'route', method: 'POST', url: '/api/route?existing=query', body: '{"mode":"walking"}' },
    { endpoint: 'places', method: 'POST', url: '/api/places', body: '{"query":"부산역"}' },
  ]);
});

test('unexpected handler failures return a generic no-store error without exception details', async t => {
  const server = await listen(t, { routeHandler: async () => { throw new Error('mock-provider-detail'); } });
  const response = await send(server, '/api/route', { method: 'POST' });
  assert.equal(response.status, 500);
  assert.equal(response.body, '{"reason":"internal-error"}');
  assert.equal(response.headers['cache-control'], 'no-store');
});

test('standalone server has bounded inbound, idle and keep-alive waits', async t => {
  const server = await listen(t);
  assert.equal(server.requestTimeout, 15_000);
  assert.equal(server.headersTimeout, 10_000);
  assert.equal(server.connectionsCheckingInterval, 1_000);
  assert.equal(server.timeout, 15_000);
  assert.equal(server.keepAliveTimeout, 5_000);
});

test('PORT accepts only a configured TCP port, with the existing default', () => {
  assert.equal(parsePort(undefined), 8787);
  assert.equal(parsePort(''), 8787);
  assert.equal(parsePort('8787'), 8787);
  assert.equal(parsePort('1'), 1);
  assert.equal(parsePort('65535'), 65535);
  for (const value of ['0', '-1', '65536', '1.5', '1e3', '0x80', ' 8787 ', 'localhost', 'NaN', 8787, null]) {
    assert.throws(() => parsePort(value), /PORT must be an integer/);
  }
});

test('graceful shutdown finishes an active response and stops listening', async t => {
  let reply;
  let started;
  const requested = new Promise(resolve => { started = resolve; });
  const server = await listen(t, { routeHandler: (_req, res) => { reply = res; started(); } });
  const response = send(server, '/api/route');
  await requested;
  let stopped = false;
  const closing = closeNodeServer(server, 500).then(() => { stopped = true; });
  assert.equal(server.listening, false);
  await delay(10);
  assert.equal(stopped, false);
  reply.end('completed');
  assert.equal((await response).body, 'completed');
  await closing;
});

test('graceful shutdown forcibly closes an unfinished request at the deadline', async t => {
  const server = await listen(t, { routeHandler: async req => { try { for await (const _chunk of req) {} } catch {} } });
  const socket = connect(server.address().port, LISTEN_HOST);
  socket.on('error', () => {});
  await once(socket, 'connect');
  const closed = new Promise(resolve => socket.once('close', resolve));
  socket.write('POST /api/route HTTP/1.1\r\nHost: localhost\r\nContent-Length: 100\r\n\r\n{');
  await delay(10);
  await closeNodeServer(server, 30);
  await closed;
  assert.equal(socket.destroyed, true);
});

test('SIGTERM and SIGINT trigger one graceful shutdown and release signal listeners', async () => {
  assert.equal(SHUTDOWN_GRACE_MS, 10_000);
  const signals = new EventEmitter();
  const server = new EventEmitter();
  let closes = 0;
  let complete;
  server.close = callback => { closes++; complete = callback; };
  server.closeAllConnections = () => assert.fail('graceful close should cancel the deadline');
  const dispose = installShutdownHandlers(server, signals);
  try {
    signals.emit('SIGTERM');
    signals.emit('SIGINT');
    signals.emit('SIGTERM');
    assert.equal(closes, 1);
    complete();
    server.emit('close');
    await Promise.resolve();
    assert.equal(signals.listenerCount('SIGTERM'), 0);
    assert.equal(signals.listenerCount('SIGINT'), 0);
  } finally { dispose(); }
});
