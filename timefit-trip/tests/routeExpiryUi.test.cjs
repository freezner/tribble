const test = require('node:test');
const assert = require('node:assert/strict');
const { loadTs, trip, place, leg } = require('./helpers.cjs');

function harness(file, componentName, props, store = {}) {
  let cursor = 0;
  let dirty = false;
  let effects = [];
  let tree;
  const hooks = [];
  const same = (a, b) => a && b && a.length === b.length && a.every((value, index) => Object.is(value, b[index]));
  const React = {
    Fragment: 'Fragment',
    createElement: (type, nodeProps, ...children) => ({ type, props: { ...nodeProps, children } }),
    useState: initial => {
      const index = cursor++;
      if (!hooks[index]) hooks[index] = { value: typeof initial === 'function' ? initial() : initial };
      return [hooks[index].value, value => {
        const next = typeof value === 'function' ? value(hooks[index].value) : value;
        if (!Object.is(next, hooks[index].value)) { hooks[index].value = next; dirty = true; }
      }];
    },
    useRef: value => { const index = cursor++; if (!hooks[index]) hooks[index] = { current: value }; return hooks[index]; },
    useEffect: (effect, deps) => {
      const index = cursor++;
      if (!hooks[index] || !same(hooks[index].deps, deps)) {
        const previous = hooks[index];
        hooks[index] = { deps };
        effects.push(() => { previous?.cleanup?.(); hooks[index].cleanup = effect(); });
      }
    },
  };
  const native = Object.fromEntries(['View', 'Text', 'Pressable', 'ActivityIndicator', 'Modal', 'TextInput', 'KeyboardAvoidingView', 'ScrollView', 'TouchableOpacity'].map(name => [name, name]));
  Object.assign(native, { StyleSheet: { create: value => value, absoluteFill: {} }, Platform: { OS: 'ios' }, Keyboard: { dismiss() {} }, Alert: { alert() {} }, Linking: { openURL: async () => {} } });
  const names = ['PlaceCard', 'PlaceSearchInput', 'TransportModePicker', 'TravelBadge', 'TripNameDialog', 'TripShareCard', 'TripSummaryCard'];
  const component = loadTs(file, {
    react: React, 'react-native': native, '@expo/vector-icons': { MaterialIcons: 'MaterialIcons' },
    'react-native-safe-area-context': { useSafeAreaInsets: () => ({ bottom: 0 }), SafeAreaView: 'SafeAreaView' },
    'react-i18next': { useTranslation: () => ({ t: (key, options = {}) => options.duration ? `${key}:${options.duration}` : key }) },
    '../stores/tripStore': { useTripStore: () => store }, '../components': Object.fromEntries(names.map(name => [name, name])),
    '../components/TripShareSheet': { TripShareSheet: 'TripShareSheet' },
    '../constants': { DEFAULT_STAY_DURATION: 60 }, '../utils/shareTrip': { shareTripAsImage: async () => {} },
  })[componentName];
  const render = () => {
    let count = 0;
    do {
      cursor = 0; dirty = false; effects = [];
      tree = component(props);
      effects.forEach(effect => effect());
      if (++count > 20) throw new Error('Render loop');
    } while (dirty);
    return tree;
  };
  return { render, props, store };
}

function nodes(root) {
  if (root == null || typeof root === 'boolean') return [];
  if (Array.isArray(root)) return root.flatMap(nodes);
  if (typeof root !== 'object') return [root];
  return [root, ...nodes(root.props?.children)];
}
const find = (tree, predicate) => nodes(tree).find(node => node && typeof node === 'object' && predicate(node));
const textOf = tree => nodes(tree).filter(node => typeof node === 'string').join(' ');
const cachedLeg = calculatedAt => leg('A', 'B', { source: 'tmap', status: 'ready', duration: 37, distance: 987600, calculatedAt });
const day = 24 * 60 * 60 * 1000;
const freshTime = () => new Date(Date.now() - 60_000).toISOString();
const expiredTime = () => new Date(Date.now() - day - 1).toISOString();

test('expired TMAP badge hides duration and distance, including its accessibility label', () => {
  const screen = harness('src/components/TravelBadge.tsx', 'TravelBadge', { leg: cachedLeg(expiredTime()), onPress() {}, onRetry() {} });
  const tree = screen.render();
  assert.doesNotMatch(textOf(tree), /37|987\.6/);
  assert.match(textOf(tree), /routeUnavailableAction/);
  assert.ok(find(tree, node => node.type === 'Pressable' && textOf(node).includes('retry')));
  const badge = find(tree, node => !!node.props.accessibilityLabel);
  assert.doesNotMatch(badge.props.accessibilityLabel, /37|987\.6/);
});

test('fresh TMAP and old manual badges remain usable; pending cached values cannot leak', () => {
  const screen = harness('src/components/TravelBadge.tsx', 'TravelBadge', { leg: cachedLeg(freshTime()) });
  assert.match(textOf(screen.render()), /37minutes/);
  assert.match(textOf(screen.render()), /987\.6 km/);
  screen.props.leg = { ...cachedLeg(expiredTime()), source: 'manual', status: 'estimated' };
  assert.match(textOf(screen.render()), /37minutes/);
  screen.props.leg = { ...cachedLeg(expiredTime()), status: 'pending' };
  assert.doesNotMatch(textOf(screen.render()), /37|987\.6/);
  assert.match(textOf(screen.render()), /routePending/);
});

test('Kakao estimates show distance once while keeping current traffic and timetable caveats', () => {
  const screen = harness('src/components/TravelBadge.tsx', 'TravelBadge', { leg: cachedLeg(freshTime()) });
  for (const reason of ['current-traffic', 'current-schedule']) {
    screen.props.leg = { ...cachedLeg(freshTime()), source: 'kakao', status: 'estimated', reason };
    const tree = screen.render();
    const text = textOf(tree);
    assert.equal(text.match(/987\.6 km/g)?.length, 1);
    assert.equal(text.match(/kakaoAttribution/g)?.length, 1);
    assert.ok(text.includes(`routeReason.${reason}`));
    assert.match(text, /estimatedDuration:37minutes/);
    assert.equal(find(tree, node => node.type === 'Text' && textOf(node) === 'estimate'), undefined);
  }
  screen.props.leg = { ...cachedLeg(expiredTime()), source: 'manual', status: 'estimated' };
  assert.match(textOf(screen.render()), /manualEntry · estimate/);
  screen.props.leg = { ...cachedLeg(freshTime()), status: 'estimated' };
  assert.match(textOf(screen.render()), /tmapAttribution/);
  assert.match(textOf(screen.render()), /estimate/);
});

test('the planner labels KST only when every place explicitly uses Korea time', () => {
  const store = { savedTrips: [], currentTrip: trip('trip', [place('A', { countryCode: 'KR' }), place('B', { countryCode: 'kr' })]), summary: null };
  const screen = harness('src/screens/TripPlannerScreen.tsx', 'TripPlannerScreen', {}, store);
  let tree = screen.render();
  assert.match(textOf(tree), /koreanTimeZone/);
  assert.ok(find(tree, node => node.props.accessibilityLabel === 'planner.editSchedule · koreanTimeZone'));
  for (const places of [[], [place('A')], [place('A', { countryCode: 'KR' }), place('B', { countryCode: 'JP' })]]) {
    store.currentTrip = { ...store.currentTrip, places };
    tree = screen.render();
    assert.doesNotMatch(textOf(tree), /koreanTimeZone/);
  }
});

function picker(legValue, extra = {}) {
  return harness('src/components/TransportModePicker.tsx', 'TransportModePicker', {
    visible: true, selectedMode: 'driving', origin: place('A'), destination: place('B'),
    travelLeg: legValue, travelTime: 37, travelSource: 'tmap', onSelect() {}, onClose() {}, onManualDuration() {}, ...extra,
  });
}
const expandManual = screen => { find(screen.render(), node => node.type === 'Pressable' && textOf(node).includes('adjustTravelTime')).props.onPress(); return screen.render(); };

test('expired or unverifiable TMAP picker result cannot appear or prefill manual input', () => {
  let applied;
  const screen = picker(cachedLeg(expiredTime()), { onManualDuration: value => { applied = value; } });
  let tree = expandManual(screen);
  assert.equal(find(tree, node => node.type === 'TextInput').props.value, '');
  assert.doesNotMatch(textOf(tree), /37minutes|autoTravelTime/);
  find(tree, node => node.type === 'Pressable' && textOf(node) === 'apply').props.onPress();
  assert.equal(applied, undefined);
  assert.match(textOf(screen.render()), /invalidTravelDuration/);
  screen.props.travelLeg = undefined;
  tree = expandManual(screen);
  assert.doesNotMatch(textOf(tree), /37minutes|autoTravelTime/);
  assert.equal(find(tree, node => node.type === 'TextInput').props.value, '');
});

test('open picker clears an inherited time at the 24-hour boundary without erasing user edits', () => {
  const originalNow = Date.now;
  let now = Date.parse('2026-10-28T12:00:00Z');
  Date.now = () => now;
  try {
    const cached = cachedLeg(new Date(now - day + 1).toISOString());
    const screen = picker(cached);
    expandManual(screen);
    assert.equal(find(screen.render(), node => node.type === 'TextInput').props.value, '37');
    now += 1;
    assert.equal(find(screen.render(), node => node.type === 'TextInput').props.value, '');
    assert.doesNotMatch(textOf(screen.render()), /37minutes|autoTravelTime/);
    find(screen.render(), node => node.type === 'TextInput').props.onChangeText('240');
    screen.props.travelLeg = { ...cached, calculatedAt: new Date(now).toISOString(), duration: 45 };
    assert.equal(find(screen.render(), node => node.type === 'TextInput').props.value, '240');
    now += day;
    assert.equal(find(screen.render(), node => node.type === 'TextInput').props.value, '240');
    assert.doesNotMatch(textOf(screen.render()), /45minutes|autoTravelTime/);
    screen.props.visible = false;
    screen.render();
    screen.props.visible = true;
    expandManual(screen);
    assert.equal(find(screen.render(), node => node.type === 'TextInput').props.value, '');
  } finally { Date.now = originalNow; }
});

test('old explicit manual time remains visible in the picker', () => {
  const screen = picker({ ...cachedLeg(expiredTime()), source: 'manual', status: 'estimated', reason: 'manual' });
  const tree = expandManual(screen);
  assert.match(textOf(tree), /37minutes/);
  assert.equal(find(tree, node => node.type === 'TextInput').props.value, '37');
  assert.doesNotMatch(textOf(tree), /routeUnavailable/);
});

test('open planner picker follows the current leg instead of the originally selected snapshot', () => {
  const first = cachedLeg(freshTime());
  const store = { savedTrips: [], currentTrip: trip('trip', [place('A'), place('B')], { legs: [first] }), isDirty: true, summary: null };
  const screen = harness('src/screens/TripPlannerScreen.tsx', 'TripPlannerScreen', {}, store);
  find(screen.render(), node => node.type === 'TravelBadge').props.onPress();
  let modal = find(screen.render(), node => node.type === 'TransportModePicker');
  assert.equal(modal.props.travelLeg, first);
  assert.equal(modal.props.visible, true);
  const pending = { ...first, status: 'pending', duration: null, distance: null, reason: 'stale' };
  store.currentTrip = { ...store.currentTrip, legs: [pending] };
  modal = find(screen.render(), node => node.type === 'TransportModePicker');
  assert.equal(modal.props.travelLeg, pending);
  assert.equal(modal.props.travelTime, null);
  const expired = cachedLeg(expiredTime());
  store.currentTrip = { ...store.currentTrip, legs: [expired] };
  modal = find(screen.render(), node => node.type === 'TransportModePicker');
  assert.equal(modal.props.travelLeg, expired);
  assert.equal(modal.props.travelTime, null);
  const refreshed = { ...cachedLeg(freshTime()), duration: 45 };
  store.currentTrip = { ...store.currentTrip, legs: [refreshed] };
  modal = find(screen.render(), node => node.type === 'TransportModePicker');
  assert.equal(modal.props.travelLeg, refreshed);
  assert.equal(modal.props.travelTime, 45);
});
