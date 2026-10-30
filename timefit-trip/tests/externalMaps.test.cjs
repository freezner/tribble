const test = require('node:test');
const assert = require('node:assert/strict');
const { loadTs } = require('./helpers.cjs');
const { getExternalRouteLink, getGooglePlaceLink } = loadTs('src/utils/externalMaps.ts');

const origin = { id: 'a', name: '초당순두부마을', address: '강원특별자치도 강릉시 강문동 초당순두부길 47', latitude: 37.7925599, longitude: 128.9170172, placeId: 'google-origin-id' };
const destination = { id: 'b', name: '부산역', address: '부산광역시 초량동', latitude: 35.114495, longitude: 129.03933, placeId: 'google-destination-id' };

test('saved Chodang → Busan trip opens Kakao with both actual endpoints and driving mode', () => {
  const link = getExternalRouteLink(origin, destination, 'driving');
  assert.equal(link.provider, 'kakao');
  assert.equal(decodeURIComponent(link.url), 'https://map.kakao.com/link/by/car/초당순두부마을,37.7925599,128.9170172/부산역,35.114495,129.03933');
  assert.equal(link.url.includes('google-origin-id'), false);
  assert.equal(link.url.includes('google-destination-id'), false);
});

test('each selected mode is preserved instead of silently switching to transit', () => {
  for (const [mode, routeMode] of Object.entries({ driving: 'car', transit: 'traffic', walking: 'walk', bicycling: 'bicycle' })) {
    assert.ok(getExternalRouteLink({ ...origin, countryCode: 'KR' }, { ...destination, countryCode: 'KR' }, mode).url.includes(`/by/${routeMode}/`));
  }
});

test('explicit country overrides address guesses and overseas routes use Google coordinates', () => {
  const from = { ...origin, countryCode: 'JP', latitude: 35.681236, longitude: 139.767125 };
  const to = { ...destination, countryCode: 'JP', latitude: 35.628471, longitude: 139.73876 };
  const link = getExternalRouteLink(from, to, 'driving');
  assert.equal(link.provider, 'google');
  const url = new URL(link.url);
  assert.equal(url.searchParams.get('origin'), '35.681236,139.767125');
  assert.equal(url.searchParams.get('destination'), '35.628471,139.73876');
  assert.equal(url.searchParams.get('travelmode'), 'driving');
  assert.equal(url.searchParams.get('api'), '1');
});

test('country codes support localized addresses and delimiter characters cannot add route points', () => {
  const link = getExternalRouteLink({ ...origin, countryCode: 'KR', address: '', name: '식당/카페, 본점 & 별관' }, { ...destination, countryCode: 'KR', address: '' }, 'walking');
  assert.equal(link.provider, 'kakao');
  const points = new URL(link.url).pathname.split('/');
  assert.equal(points.length, 6);
  assert.equal(decodeURIComponent(points[4]).split(',').length, 3);
  assert.equal(link.url.includes('&'), false);
});

test('invalid coordinates or mode never produce a map link', () => {
  for (const latitude of [NaN, Infinity, 91, -91]) assert.equal(getExternalRouteLink({ ...origin, latitude }, destination, 'driving'), null);
  assert.equal(getExternalRouteLink(origin, { ...destination, longitude: 181 }, 'driving'), null);
  assert.equal(getExternalRouteLink(origin, destination, 'flying'), null);
});

test('Google place links preserve the Google ID and coordinates as separate encoded parameters', () => {
  const placeId = 'ChIJ-google-id_123&query=another-place';
  const url = new URL(getGooglePlaceLink({ ...origin, placeId: `  ${placeId}  ` }));
  assert.equal(url.origin, 'https://www.google.com');
  assert.equal(url.pathname, '/maps/search/');
  assert.equal(url.searchParams.get('api'), '1');
  assert.equal(url.searchParams.get('query'), '37.7925599,128.9170172');
  assert.equal(url.searchParams.get('query_place_id'), placeId);
  assert.equal(url.searchParams.getAll('query').length, 1, 'ID delimiters cannot replace the actual location');
  assert.deepEqual([...url.searchParams.keys()], ['api', 'query', 'query_place_id']);
});

test('Kakao or missing IDs use original coordinates and renaming a stop never redirects its place link', () => {
  for (const placeId of [undefined, '', '  ', 'kakao:123456', 'tmap:789']) {
    const saved = { ...origin, placeId };
    const originalLink = getGooglePlaceLink(saved);
    const renamedLink = getGooglePlaceLink({ ...saved, name: '내가 정한 이름 & query=부산역', address: '다른 표시 주소' });
    assert.equal(renamedLink, originalLink, 'editable labels must not change the saved location');
    const url = new URL(renamedLink);
    assert.equal(url.searchParams.get('query'), `${saved.latitude},${saved.longitude}`);
    assert.equal(url.searchParams.has('query_place_id'), false, 'other providers IDs must not be treated as Google IDs');
    assert.equal([...url.searchParams.keys()].length, 2);
  }
  assert.equal(getGooglePlaceLink({ ...origin, name: '수정한 구글 장소명' }), getGooglePlaceLink(origin),
    'a renamed Google place also keeps both its original ID and coordinate query');
});

test('invalid place coordinates block Google links even with a Google ID, while valid zero coordinates remain supported', () => {
  for (const latitude of [NaN, Infinity, -Infinity, 90.1, -90.1, undefined, null, '37.5']) {
    assert.equal(getGooglePlaceLink({ ...origin, latitude }), null, `invalid latitude: ${latitude}`);
  }
  for (const longitude of [NaN, Infinity, -Infinity, 180.1, -180.1, undefined, null, '127']) {
    assert.equal(getGooglePlaceLink({ ...origin, longitude }), null, `invalid longitude: ${longitude}`);
  }
  const validZero = new URL(getGooglePlaceLink({ ...origin, latitude: 0, longitude: 0, placeId: undefined }));
  assert.equal(validZero.searchParams.get('query'), '0,0');
});
