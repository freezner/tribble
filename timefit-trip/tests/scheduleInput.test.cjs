const test = require('node:test');
const assert = require('node:assert/strict');
const { loadTs } = require('./helpers.cjs');
const { parseClockInput, isValidLocalDate } = loadTs('src/utils/scheduleInput.ts');

test('wall-clock inputs reject overflow instead of silently moving the trip to another day', () => {
  assert.equal(parseClockInput('0:00'), 0);
  assert.equal(parseClockInput(' 23:59 '), 1439);
  for (const value of ['24:00', '12:60', '-1:00', '13', '13:0', '12:30:00', '']) {
    assert.equal(parseClockInput(value), null, value);
  }
});

test('trip dates validate calendar days and leap years without Date overflow', () => {
  for (const value of ['2026-10-26', '2028-02-29', '2000-02-29']) {
    assert.equal(isValidLocalDate(value), true, value);
  }
  for (const value of ['2026-02-29', '2100-02-29', '2026-04-31', '2026-13-01', '2026-00-01', '2026-01-00']) {
    assert.equal(isValidLocalDate(value), false, value);
  }
});

test('trip dates reject ambiguous formats and unsupported years', () => {
  for (const value of ['26-10-26', '2026-1-1', '2026/10/26', '1999-12-31', '2101-01-01', '']) {
    assert.equal(isValidLocalDate(value), false, value);
  }
});
