const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const ROOT = path.resolve(__dirname, '..');

function loadTs(relativePath, mocks = {}, globals = {}) {
  const cache = new Map();
  function load(filename) {
    const absolute = path.isAbsolute(filename) ? filename : path.resolve(ROOT, filename);
    if (cache.has(absolute)) return cache.get(absolute).exports;
    const module = { exports: {} };
    cache.set(absolute, module);
    const compiled = ts.transpileModule(fs.readFileSync(absolute, 'utf8'), {
      fileName: absolute,
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true, jsx: ts.JsxEmit.React },
    }).outputText;
    const localRequire = name => {
      if (Object.prototype.hasOwnProperty.call(mocks, name)) return mocks[name];
      if (name.startsWith('.')) {
        const base = path.resolve(path.dirname(absolute), name);
        if (Object.prototype.hasOwnProperty.call(mocks, base)) return mocks[base];
        const resolved = [base, `${base}.ts`, `${base}.tsx`, `${base}.js`, path.join(base, 'index.ts')].find(file => fs.existsSync(file) && fs.statSync(file).isFile());
        if (!resolved) throw new Error(`Cannot resolve ${name} from ${absolute}`);
        return load(resolved);
      }
      return require(require.resolve(name, { paths: [ROOT] }));
    };
    vm.runInNewContext(compiled, { module, exports: module.exports, require: localRequire,
      console, Date, Promise, Math, JSON, Error, Number, String, Array, Object, Set, Map,
      setTimeout, clearTimeout, setInterval, clearInterval, process, URL, AbortController, ...globals }, { filename: absolute });
    return module.exports;
  }
  return load(relativePath);
}

function memoryStorage(initial = {}) {
  const data = new Map(Object.entries(initial));
  return { data, getItem: async key => data.has(key) ? data.get(key) : null,
    setItem: async (key, value) => { data.set(key, value); }, removeItem: async key => { data.delete(key); } };
}
function deferred() { let resolve, reject; const promise = new Promise((res, rej) => { resolve = res; reject = rej; }); return { promise, resolve, reject }; }
function place(id, overrides = {}) { return { id, name: id, address: `${id} address`, latitude: 37.5, longitude: 127, stayDuration: 60, ...overrides }; }
function trip(id = 'trip', places = [], overrides = {}) {
  return { id, name: id, places, totalAvailableTime: 300, transportMode: 'walking', createdAt: new Date('2026-10-26T00:00:00Z'),
    updatedAt: new Date('2026-10-26T00:00:00Z'), date: '2026-10-26', startTimeMinutes: 780, bufferMinutes: 30, legs: [], revision: 0, schemaVersion: 2, ...overrides };
}
function leg(from, to, overrides = {}) { return { id: `leg:${from}:${to}`, fromPlaceId: from, toPlaceId: to, mode: 'walking', status: 'ready', duration: 20, distance: 1000, source: 'google', calculatedAt: '2026-10-26T00:00:00Z', departureAt: null, ...overrides }; }
const estimate = (duration = 20) => ({ status: 'ready', duration, distance: 1000, source: 'google', calculatedAt: new Date().toISOString() });
module.exports = { loadTs, memoryStorage, deferred, place, trip, leg, estimate };
