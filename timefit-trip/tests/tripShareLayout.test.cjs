const test = require('node:test');
const assert = require('node:assert/strict');
const { loadTs, place, trip, leg } = require('./helpers.cjs');
const { SHARE_CARD_CONFIGS, SHARE_CARD_DIMENSIONS, SHARE_CARD_EXPORT_DIMENSIONS, normalizeTripShareFormat,
  getTripSharePageCount, getTripSharePage } = loadTs('src/utils/tripShareLayout.ts');
const expectedPresets = {
  feed: { canvas: [360, 450], output: [1080, 1350], capacity: 3 },
  story: { canvas: [360, 640], output: [1080, 1920], capacity: 5 },
  'instagram-feed': { canvas: [360, 480], output: [1080, 1440], capacity: 3 },
  'instagram-story': { canvas: [360, 640], output: [1080, 1920], capacity: 4 },
  'facebook-feed': { canvas: [360, 450], output: [1440, 1800], capacity: 3 },
  'facebook-story': { canvas: [360, 640], output: [1080, 1920], capacity: 4 },
  'x-post': { canvas: [400, 400], output: [1200, 1200], capacity: 2 },
  'tiktok-photo': { canvas: [360, 640], output: [1080, 1920], capacity: 4 },
};

function planWithStops(count, overrides = {}) {
  const places = Array.from({ length: count }, (_, index) => place(`stop-${index + 1}`, { countryCode: 'KR' }));
  return trip('우리의 하루 여행', places, {
    legs: places.slice(0, -1).map((item, index) => leg(item.id, places[index + 1].id)), ...overrides,
  });
}

test('feed and story use exportable 4:5 and 9:16 canvases', () => {
  assert.equal(SHARE_CARD_DIMENSIONS.feed.width, 360);
  assert.equal(SHARE_CARD_DIMENSIONS.feed.height, 450);
  assert.equal(SHARE_CARD_DIMENSIONS.story.width, 360);
  assert.equal(SHARE_CARD_DIMENSIONS.story.height, 640);
  assert.equal(SHARE_CARD_DIMENSIONS.feed.width / SHARE_CARD_DIMENSIONS.feed.height, 4 / 5);
  assert.equal(SHARE_CARD_DIMENSIONS.story.width / SHARE_CARD_DIMENSIONS.story.height, 9 / 16);
});

test('each SNS preset has its intended canvas and export size without stretching', () => {
  for (const record of [SHARE_CARD_CONFIGS, SHARE_CARD_DIMENSIONS, SHARE_CARD_EXPORT_DIMENSIONS]) {
    assert.deepEqual(Object.keys(record).sort(), Object.keys(expectedPresets).sort());
  }
  for (const [format, expected] of Object.entries(expectedPresets)) {
    const canvas = SHARE_CARD_DIMENSIONS[format];
    const output = SHARE_CARD_EXPORT_DIMENSIONS[format];
    assert.deepEqual([canvas.width, canvas.height], expected.canvas);
    assert.deepEqual([output.width, output.height], expected.output);
    assert.equal(canvas.width / canvas.height, output.width / output.height);
    assert.equal(SHARE_CARD_CONFIGS[format].canvas, canvas);
    assert.equal(SHARE_CARD_CONFIGS[format].export, output);
    assert.equal(normalizeTripShareFormat(format), format);
  }
});

test('every stop appears once in original order across all legacy and SNS card formats', () => {
  for (const [format, { capacity }] of Object.entries(expectedPresets)) {
    for (const count of [0, 1, 3, 4, 5, 6, 11, 20]) {
      const plan = planWithStops(count);
      const before = JSON.stringify(plan);
      const pages = Array.from({ length: getTripSharePageCount(plan, format) }, (_, index) => getTripSharePage(plan, format, index));
      assert.equal(pages.length, Math.max(1, Math.ceil(count / capacity)));
      const stops = pages.flatMap(page => Array.from(page.stops));
      assert.deepEqual(stops.map(stop => stop.place.id), plan.places.map(item => item.id));
      assert.deepEqual(stops.map(stop => stop.globalIndex), Array.from({ length: count }, (_, index) => index));
      assert.equal(stops.filter(stop => stop.isFirst).length, count ? 1 : 0);
      assert.equal(stops.filter(stop => stop.isLast).length, count ? 1 : 0);
      assert.ok(pages.every(page => page.stops.length <= capacity));
      if (count) {
        assert.equal(stops[0].isFirst, true);
        assert.equal(stops.at(-1).isLast, true);
      }
      assert.equal(JSON.stringify(plan), before, 'export pagination must not mutate the itinerary');
    }
  }
});

test('out-of-range, non-finite, fractional and empty page requests stay within bounds', () => {
  const plan = planWithStops(8);
  for (const requested of [-100, -Infinity, NaN, undefined]) assert.equal(getTripSharePage(plan, 'feed', requested).pageIndex, 0);
  for (const requested of [100, Infinity]) assert.equal(getTripSharePage(plan, 'feed', requested).pageIndex, 2);
  assert.equal(getTripSharePage(plan, 'feed', 1.8).pageIndex, 1);
  assert.equal(getTripSharePage(plan, 'unexpected', 1).format, 'feed');
  const empty = getTripSharePage(planWithStops(0), 'story', Infinity);
  assert.equal(empty.pageCount, 1);
  assert.equal(empty.pageIndex, 0);
  assert.equal(empty.startIndex, 0);
  assert.equal(empty.endIndex, 0);
  assert.equal(empty.stops.length, 0);
  assert.equal(empty.summary.status, 'empty');
  assert.equal(empty.summary.totalTime, 0);
  for (const invalid of [undefined, null, {}, 'unexpected', '', 'constructor', '__proto__', 'toString']) {
    assert.equal(normalizeTripShareFormat(invalid), 'feed');
    assert.equal(getTripSharePage(plan, invalid).format, 'feed');
    assert.equal(getTripSharePageCount(plan, invalid), 3);
  }
  for (const [format, { capacity }] of Object.entries(expectedPresets)) {
    const lastPage = getTripSharePage(plan, format, Infinity);
    assert.equal(lastPage.pageIndex, Math.ceil(plan.places.length / capacity) - 1);
    assert.equal(lastPage.stops.at(-1).place.id, 'stop-8');
    assert.equal(getTripSharePage(planWithStops(0), format).pageCount, 1);
  }
});

test('page boundaries retain full-trip totals, arrival times and the outgoing connecting leg', () => {
  const plan = planWithStops(4);
  const first = getTripSharePage(plan, 'feed', 0);
  const second = getTripSharePage(plan, 'feed', 1);
  assert.equal(first.stops[2].timeline.leg.toPlaceId, 'stop-4');
  assert.equal(first.stops[2].isLast, false);
  assert.equal(second.stops[0].isFirst, false);
  assert.equal(second.stops[0].isLast, true);
  assert.equal(second.stops[0].globalIndex, 3);
  assert.equal(second.stops[0].timeline.arrivalTimeMinutes, 1020);
  assert.equal(second.stops[0].timeline.departureTimeMinutes, 1080);
  assert.equal(second.stops[0].timeline.leg, null);
  for (const page of [first, second]) {
    assert.equal(page.summary.totalStayTime, 240);
    assert.equal(page.summary.totalTravelTime, 60);
    assert.equal(page.summary.bufferTime, 30);
    assert.equal(page.summary.totalTime, 330);
    assert.equal(page.summary.remainingTime, -30);
    assert.equal(page.summary.isOverTime, true);
  }
  const threeStops = getTripSharePage(planWithStops(3), 'feed');
  assert.equal(threeStops.summary.totalTime, 250);
  assert.equal(threeStops.summary.remainingTime, 50);
});

test('unknown and expired routes never imply a known arrival or spare-time verdict on a later page', () => {
  for (const unavailable of [
    { status: 'pending', duration: 777 },
    { status: 'unavailable', duration: null },
    { source: 'tmap', duration: 777, calculatedAt: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString() },
  ]) {
    const plan = planWithStops(6);
    plan.legs[0] = { ...plan.legs[0], ...unavailable };
    const page = getTripSharePage(plan, 'feed', 1);
    assert.equal(page.summary.totalTime, null);
    assert.equal(page.summary.remainingTime, null);
    assert.equal(page.summary.isOverTime, null);
    assert.ok(page.stops.every(stop => stop.timeline.arrivalTimeMinutes === null));
  }
});

test('manual estimates are disclosed on every page, including pages without that leg', () => {
  const plan = planWithStops(6);
  plan.legs[4] = { ...plan.legs[4], source: 'manual', status: 'estimated', duration: 35 };
  for (let index = 0; index < getTripSharePageCount(plan, 'feed'); index++) {
    const page = getTripSharePage(plan, 'feed', index);
    assert.equal(page.hasManualTimes, true);
    assert.equal(page.summary.status, 'estimated');
    assert.equal(page.summary.totalTime, 505);
  }
});

function renderCard(props) {
  const React = { createElement: (type, nodeProps, ...children) => ({ type, props: { ...nodeProps, children } }) };
  const translations = { hours: '시간', minutes: '분', estimate: '추정', manualEntry: '직접 입력', arrival: '도착', departure: '출발', walking: '도보', nextDay: '다음날', estimatedDuration: '약 {{duration}}', sharedWithTribble: 'Tribble로 만든 여행' };
  const { TripShareCard } = loadTs('src/components/TripShareCard.tsx', {
    react: React,
    'react-native': { View: 'View', Text: 'Text', StyleSheet: { create: value => value } },
    'react-i18next': { useTranslation: () => ({ t: (key, options = {}) => (translations[key] || options.defaultValue || key).replace(/{{(\w+)}}/g, (_, name) => String(options[name] ?? '')) }) },
  });
  return TripShareCard(props);
}
function nodes(root) {
  if (root == null || typeof root === 'boolean') return [];
  if (Array.isArray(root)) return root.flatMap(nodes);
  if (typeof root !== 'object') return [root];
  return [root, ...nodes(root.props?.children)];
}
const textOf = root => nodes(root).filter(node => typeof node === 'string' || typeof node === 'number').join(' ').replace(/\s+/g, ' ');

test('rendered second page uses global times and optional profile attribution', () => {
  const tree = renderCard({ trip: planWithStops(4), pageIndex: 1, profile: { platform: 'instagram', handle: 'our.day', url: 'https://www.instagram.com/our.day/' } });
  const text = textOf(tree);
  assert.match(text, /stop-4/);
  assert.doesNotMatch(text, /stop-1|stop-2|stop-3/);
  assert.match(text, /17:00/);
  assert.match(text, /예상 30분 초과/);
  assert.match(text, /5시간 30분/);
  assert.match(text, /전체 4곳 중 4–4/);
  assert.match(text, /Instagram · @our\.day/);
  assert.match(text, /여행 일자 2026-10-26/);
  assert.doesNotMatch(text, /KST|계획 기준 예상 시간입니다/);
  const title = nodes(tree).find(node => node?.props?.children?.[0] === '우리의 하루 여행');
  assert.equal(title.props.numberOfLines, 2);
  assert.equal(title.props.ellipsizeMode, 'tail');
});

test('rendered cards disclose manual estimates and conceal unresolved cached durations', () => {
  const plan = planWithStops(3);
  plan.legs[0] = { ...plan.legs[0], source: 'manual', status: 'estimated', duration: 35 };
  let text = textOf(renderCard({ trip: plan }));
  assert.doesNotMatch(text, /추정 · 직접 입력/);
  assert.match(text, /도보 · 약 35분 · 직접 입력/);
  assert.match(text, /Tribble로 만든 여행/);
  plan.legs[0] = { ...plan.legs[0], source: 'google', status: 'pending', duration: 777 };
  text = textOf(renderCard({ trip: plan }));
  assert.match(text, /전체 시간 계산 중/);
  assert.match(text, /미계산/);
  assert.doesNotMatch(text, /777|12시간 57분|여유|초과|직접 입력/);
});

test('all card formats label the configured arrival target separately from computed timeline arrivals', () => {
  for (const format of Object.keys(expectedPresets)) {
    const plan = planWithStops(3);
    const tree = renderCard({ trip: plan, format });
    const text = textOf(tree);
    assert.match(text, /출발 시각 13:00/);
    assert.match(text, /도착 시각 18:00/);
    assert.match(text, /14:20/, 'the second stop still uses its calculated arrival time');
    assert.doesNotMatch(text, /도착 시각 15:40|\(설정\)/);
    assert.match(text, /여행 일자 2026-10-26/);
    assert.doesNotMatch(text, /KST|계획 기준 예상 시간입니다/);
    assert.equal(textOf(tree.props.children[0]), 'tribble', 'the masthead contains only the title, without a status label');
    const clocks = nodes(tree).filter(node => typeof node?.type === 'function' && /출발 시각|도착 시각/.test(textOf(node)));
    assert.equal(clocks.length, 2);
    assert.ok(clocks.every(node => node.props.numberOfLines === 1 && node.props.adjustsFontSizeToFit));

    plan.startTimeMinutes = 1380;
    plan.totalAvailableTime = 180;
    plan.legs[0] = { ...plan.legs[0], status: 'pending', duration: null };
    const overnight = textOf(renderCard({ trip: plan, format }));
    assert.match(overnight, /출발 시각 23:00/);
    assert.match(overnight, /도착 시각 다음날 02:00/);
    assert.match(overnight, /전체 시간 계산 중/);
  }
});

test('card header trims a custom Unicode title and falls back to tribble for blank input', () => {
  const plan = planWithStops(3);
  const header = tree => tree.props.children[0].props.children[0];
  for (const title of [undefined, '', ' \n\t ']) {
    assert.equal(textOf(header(renderCard({ trip: plan, title }))), 'tribble');
  }
  const custom = '👨‍👩‍👧‍👦 제주여행 e\u0301 ✨ '.repeat(6).trim();
  for (const format of Object.keys(expectedPresets)) {
    const tree = renderCard({ trip: plan, format, title: `  ${custom}\n` });
    const titleNode = header(tree);
    assert.equal(textOf(titleNode), custom, 'keep the original graphemes for native text layout rather than slicing UTF-16');
    assert.equal(titleNode.props.numberOfLines, 1);
    assert.equal(titleNode.props.ellipsizeMode, 'tail');
    assert.equal(titleNode.props.adjustsFontSizeToFit, true);
    assert.match(textOf(tree), /우리의 하루 여행/, 'the trip name remains independent of the custom header');
  }
});

const flatStyle = style => Array.isArray(style) ? Object.assign({}, ...style.filter(Boolean).map(flatStyle)) : style || {};

test('SNS overlay insets keep card content clear and every full page fits its fixed canvas', () => {
  for (const [format, expected] of Object.entries(expectedPresets)) {
    const tree = renderCard({ trip: planWithStops(expected.capacity + 1), format, title: '여행하는 우리 👨‍👩‍👧‍👦' });
    const rootStyle = flatStyle(tree.props.style);
    assert.equal(rootStyle.width, expected.canvas[0]);
    assert.equal(rootStyle.height, expected.canvas[1]);
    const children = tree.props.children.filter(Boolean);
    const timeline = children.find(node => flatStyle(node.props.style).minHeight === 0);
    const stopNodes = nodes(timeline).filter(node => node?.type === 'View' && node.props.key?.startsWith('stop-'));
    assert.equal(stopNodes.length, expected.capacity);
    const fixedHeight = children.filter(node => node !== timeline).reduce((sum, node) => {
      const style = flatStyle(node.props.style);
      assert.equal(typeof style.height, 'number');
      return sum + style.height + (style.marginTop || 0) + (style.marginBottom || 0);
    }, 0);
    const stopsHeight = stopNodes.reduce((sum, node) => sum + flatStyle(node.props.style).height, 0);
    assert.ok(rootStyle.paddingTop + fixedHeight + stopsHeight + rootStyle.paddingBottom <= rootStyle.height,
      `${format}: full timeline must fit between the top content and footer without clipping`);
    if (['instagram-story', 'facebook-story', 'tiktok-photo'].includes(format)) {
      assert.equal(rootStyle.paddingTop, 40);
      assert.equal(rootStyle.paddingBottom, 64);
      assert.equal(rootStyle.paddingRight, format === 'tiktok-photo' ? 40 : 16);
    } else {
      assert.equal(rootStyle.paddingTop, 16);
      assert.equal(rootStyle.paddingBottom, 16);
    }
  }
});

test('SNS pages preserve whole-trip totals and endpoint markers after their different page breaks', () => {
  const plan = planWithStops(9);
  plan.legs[0] = { ...plan.legs[0], source: 'manual', status: 'estimated', duration: 35 };
  for (const format of Object.keys(expectedPresets)) {
    const last = getTripSharePage(plan, format, Infinity);
    const first = getTripSharePage(plan, format, 0);
    assert.equal(first.summary.totalTime, 745);
    assert.equal(last.summary.totalTime, 745);
    assert.equal(first.hasManualTimes, true);
    assert.equal(last.hasManualTimes, true);
    assert.equal(last.stops.at(-1).globalIndex, 8);
    assert.equal(last.stops.at(-1).timeline.arrivalTimeMinutes, 1435);
    assert.equal(last.stops.at(-1).isLast, true);
    assert.ok(last.stops.every(stop => !stop.isFirst));
  }
});
