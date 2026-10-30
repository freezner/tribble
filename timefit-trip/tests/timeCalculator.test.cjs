const test = require('node:test');
const assert = require('node:assert/strict');
const { loadTs, place, trip, leg } = require('./helpers.cjs');
const time = loadTs('src/utils/timeCalculator.ts');

test('sum includes stays, travel and buffer and consistently detects overtime', () => {
  const plan = trip('day', [place('A'), place('B')], { totalAvailableTime: 120, legs: [leg('A', 'B')] });
  const summary = time.calculateTripSummary(plan);
  assert.equal(summary.totalStayTime, 120);
  assert.equal(summary.totalTravelTime, 20);
  assert.equal(summary.bufferTime, 30);
  assert.equal(summary.totalTime, 170);
  assert.equal(summary.remainingTime, -50);
  assert.equal(summary.isOverTime, true);
  assert.equal(summary.endTimeMinutes, 950);
});

test('unknown route never becomes zero minutes or a feasibility verdict', () => {
  for (const status of ['pending', 'unavailable']) {
    const plan = trip('day', [place('A'), place('B')], { legs: [leg('A', 'B', { status, duration: null })] });
    const summary = time.calculateTripSummary(plan);
    assert.equal(summary.totalTravelTime, null);
    assert.equal(summary.totalTime, null);
    assert.equal(summary.remainingTime, null);
    assert.equal(summary.endTimeMinutes, null);
    assert.equal(summary.isOverTime, null);
    assert.equal(summary.status, status);
    assert.equal(summary.unresolvedLegCount, 1);
    assert.equal(time.calculateTimeline(plan)[1].arrivalTimeMinutes, null);
  }
});

test('orphaned last leg never contributes to the trip', () => {
  const plan = trip('day', [place('A', { travelTimeToNext: 12 })], { bufferMinutes: 0, legs: [leg('A', 'B', { duration: 12 })] });
  assert.equal(time.calculateTripSummary(plan).totalTravelTime, 0);
  assert.equal(time.calculateTripSummary(plan).totalTime, 60);
  assert.equal(time.calculateTimeline(plan)[0].leg, null);
});

test('estimated routes retain uncertainty and a timeline across midnight', () => {
  const plan = trip('day', [place('A'), place('B')], { startTimeMinutes: 1410, bufferMinutes: 0,
    legs: [leg('A', 'B', { status: 'estimated' })] });
  const rows = time.calculateTimeline(plan);
  assert.equal(rows[0].departureTimeMinutes, 1470);
  assert.equal(rows[1].arrivalTimeMinutes, 1490);
  assert.equal(time.calculateTripSummary(plan).status, 'estimated');
  assert.equal(time.calculateTripSummary(plan).estimatedLegCount, 1);
  assert.equal(time.formatClock(1490), '다음날 00:50');
  assert.equal(time.formatClock(null, { unknown: 'Unknown', nextDay: 'Next day' }), 'Unknown');
  const departure = new Date(time.departureAtForLeg(plan, 0));
  assert.equal(departure.getFullYear(), 2026);
  assert.equal(departure.getMonth(), 9);
  assert.equal(departure.getDate(), 27);
  assert.equal(departure.getHours(), 0);
  assert.equal(departure.getMinutes(), 30);
});

test('calendar validation rejects impossible dates and accepts leap days', () => {
  assert.equal(time.isValidDate('2026-02-29'), false);
  assert.equal(time.isValidDate('2028-02-29'), true);
  assert.equal(time.isValidDate('2026-13-01'), false);
  assert.equal(time.isValidDate('2026-10-00'), false);
  assert.equal(time.isValidDate('10/26/2026'), false);
});

test('empty plan has no artificial buffer-only duration', () => {
  const summary = time.calculateTripSummary(trip());
  assert.equal(summary.status, 'empty');
  assert.equal(summary.totalTime, 0);
  assert.equal(summary.bufferTime, 0);
});

test('automatic route freshness has an explicit 15-minute boundary', () => {
  const now = Date.parse('2026-10-26T12:00:00Z');
  assert.equal(time.isLegStale(leg('A', 'B', { calculatedAt: '2026-10-26T11:45:01Z' }), now), false);
  assert.equal(time.isLegStale(leg('A', 'B', { calculatedAt: '2026-10-26T11:45:00Z' }), now), true);
  assert.equal(time.isLegStale(leg('A', 'B', { calculatedAt: undefined }), now), true);
  assert.equal(time.isLegStale(leg('A', 'B', { calculatedAt: 'invalid' }), now), true);
  assert.equal(time.isLegStale(leg('A', 'B', { calculatedAt: '2026-10-26T12:05:00Z' }), now), true);
  assert.equal(time.isLegStale(leg('A', 'B', { source: 'manual', calculatedAt: '2025-01-01T00:00:00Z' }), now), false);
  assert.equal(time.isLegStale(leg('A', 'B', { status: 'estimated', source: 'none', reason: 'legacy-unverified', calculatedAt: undefined }), now), false);
});

test('route input signature changes when country metadata changes', () => {
  const original = trip('day', [place('A'), place('B')]);
  const localized = { ...original, places: original.places.map(item => ({ ...item, countryCode: 'KR' })) };
  assert.notEqual(time.routeInputSignature(original), time.routeInputSignature(localized));
});

test('TMAP cache has a strict 24-hour use limit and keeps the normal 15-minute refresh', () => {
  const now = Date.parse('2026-10-27T12:00:00Z');
  const cached = leg('A', 'B', { source: 'tmap', calculatedAt: '2026-10-26T12:00:00Z' });
  assert.equal(time.isResolvedLeg(cached, now), false);
  assert.equal(time.isTmapResultExpired(cached, now), true);
  assert.equal(time.isTmapResultExpired(cached, now - 1), false);
  assert.equal(time.isLegStale(cached, now), true);
  assert.equal(time.isLegStale({ ...cached, calculatedAt: '2026-10-27T11:45:00Z' }, now), true);
  assert.equal(time.isLegStale({ ...cached, calculatedAt: '2026-10-27T11:45:01Z' }, now), false);
  assert.equal(time.isTmapResultExpired({ ...cached, source: 'manual' }, now), false);
  assert.equal(time.isTmapResultExpired({ ...cached, calculatedAt: undefined }, now), true);
  const expiredNow = { ...cached, calculatedAt: new Date(Date.now() - time.TMAP_RESULT_MAX_AGE_MS).toISOString() };
  const summary = time.calculateTripSummary(trip('A', [place('A'), place('B')], { legs: [expiredNow] }));
  assert.equal(summary.totalTime, null);
  assert.equal(summary.isOverTime, null);
});

test('Kakao walking and cycling remain usable within a session while current traffic expires', () => {
  const now = Date.parse('2026-10-27T12:00:00Z');
  for (const mode of ['walking', 'bicycling']) {
    const cached = leg('A', 'B', { source: 'kakao', mode, calculatedAt: '2026-10-26T12:00:00Z' });
    assert.equal(time.isLegStale(cached, now), false);
    assert.equal(time.isResolvedLeg(cached, now), true);
  }
  const driving = leg('A', 'B', { source: 'kakao', mode: 'driving', calculatedAt: '2026-10-27T11:45:00Z' });
  assert.equal(time.isLegStale(driving, now - 1), false);
  assert.equal(time.isLegStale(driving, now), true);
});

test('explicit Korean itineraries request Korean clock times independently of the device time zone', () => {
  const previousZone = process.env.TZ;
  const plan = trip('korea', [place('A', { countryCode: 'KR', stayDuration: 0 }), place('B', { countryCode: 'kr' })], {
    date: '2026-11-01', startTimeMinutes: 780,
  });
  try {
    for (const zone of ['Asia/Seoul', 'UTC', 'America/Los_Angeles']) {
      process.env.TZ = zone;
      assert.equal(time.usesKoreanTimeZone(plan), true);
      assert.equal(time.departureAtForLeg(plan, 0), '2026-11-01T04:00:00.000Z');
      const midnight = { ...plan, startTimeMinutes: 1410, places: [
        { ...plan.places[0], stayDuration: 60 }, plan.places[1],
      ] };
      assert.equal(time.departureAtForLeg(midnight, 0), '2026-11-01T15:30:00.000Z');
    }
  } finally {
    if (previousZone === undefined) delete process.env.TZ;
    else process.env.TZ = previousZone;
  }
});

test('unknown, foreign and mixed-country itineraries retain the existing device-clock behavior', () => {
  const previousZone = process.env.TZ;
  try {
    process.env.TZ = 'UTC';
    assert.equal(time.usesKoreanTimeZone(trip()), false);
    for (const countries of [[undefined, undefined], ['KR', undefined], ['KR', 'JP'], ['US', 'US']]) {
      const plan = trip('other', countries.map((countryCode, index) => place(String(index), { countryCode, stayDuration: 0 })), {
        date: '2026-11-01', startTimeMinutes: 780,
      });
      assert.equal(time.usesKoreanTimeZone(plan), false);
      assert.equal(time.departureAtForLeg(plan, 0), '2026-11-01T13:00:00.000Z');
    }
  } finally {
    if (previousZone === undefined) delete process.env.TZ;
    else process.env.TZ = previousZone;
  }
});
