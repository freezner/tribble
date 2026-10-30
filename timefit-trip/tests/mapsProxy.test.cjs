const test = require('node:test');
const assert = require('node:assert/strict');
const { loadTs } = require('./helpers.cjs');

test('proxy URLs contain only the public base and supported resource path', () => {
  const previous = process.env.EXPO_PUBLIC_KAKAO_API_URL;
  try {
    process.env.EXPO_PUBLIC_KAKAO_API_URL = 'https://maps.example/api/';
    const { getMapsApiUrl } = loadTs('src/services/mapsProxy.ts');
    assert.equal(getMapsApiUrl('route'), 'https://maps.example/api/route');
    assert.equal(getMapsApiUrl('places'), 'https://maps.example/api/places');
    for (const base of ['', 'bad', 'http://maps.example/api', 'https://user:secret@maps.example/api', 'https://maps.example/api?key=secret', 'https://maps.example/api#key']) {
      process.env.EXPO_PUBLIC_KAKAO_API_URL = base;
      assert.equal(getMapsApiUrl('places'), null);
    }
    process.env.EXPO_PUBLIC_KAKAO_API_URL = 'http://192.168.0.4:8787/api';
    assert.equal(getMapsApiUrl('route'), null);
    const development = loadTs('src/services/mapsProxy.ts', {}, { __DEV__: true });
    assert.equal(development.getMapsApiUrl('route'), 'http://192.168.0.4:8787/api/route');
  } finally {
    if (previous === undefined) delete process.env.EXPO_PUBLIC_KAKAO_API_URL;
    else process.env.EXPO_PUBLIC_KAKAO_API_URL = previous;
  }
});
