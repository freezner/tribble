const test = require('node:test');
const assert = require('node:assert/strict');
const { loadTs, trip, place, leg, deferred } = require('./helpers.cjs');

// Render the production components with native primitives replaced by inspectable nodes.
// Effects run after each render, and event handlers retain the same hook state as the UI.
function screenHarness(file, exportName, store, props = {}) {
  const hooks = [];
  let cursor = 0;
  let dirty = false;
  let pendingEffects = [];
  let tree;
  const alerts = [];
  const backHandlers = new Set();
  const appStateHandlers = new Set();
  const intervals = new Map();
  let intervalId = 0;
  const equalDeps = (a, b) => a && b && a.length === b.length && a.every((value, index) => Object.is(value, b[index]));
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
    useRef: value => {
      const index = cursor++;
      if (!hooks[index]) hooks[index] = { current: value };
      return hooks[index];
    },
    useMemo: (factory, deps) => {
      const index = cursor++;
      if (!hooks[index] || !equalDeps(hooks[index].deps, deps)) hooks[index] = { value: factory(), deps };
      return hooks[index].value;
    },
    useEffect: (effect, deps) => {
      const index = cursor++;
      if (!hooks[index] || !equalDeps(hooks[index].deps, deps)) {
        const previous = hooks[index];
        hooks[index] = { deps };
        pendingEffects.push(() => { previous?.cleanup?.(); hooks[index].cleanup = effect(); });
      }
    },
  };
  React.useCallback = (callback, deps) => React.useMemo(() => callback, deps);
  const dateMessages = {
    'planner.firstSavedDate': '최초 저장 {{date}}',
    'planner.travelDate': '여행일 {{date}}',
    'planner.lastUpdatedAt': '마지막 수정 {{date}}',
  };
  const t = (key, values = {}) => dateMessages[key]
    ? dateMessages[key].replace(/\{\{(\w+)\}\}/g, (match, name) => values[name] === undefined ? match : String(values[name]))
    : key + (values.name ? `:${values.name}` : '');
  const native = {
    ActivityIndicator: 'ActivityIndicator', FlatList: 'FlatList', SectionList: 'SectionList', Text: 'Text',
    View: 'View', TouchableOpacity: 'TouchableOpacity', TextInput: 'TextInput', ScrollView: 'ScrollView',
    KeyboardAvoidingView: 'KeyboardAvoidingView', StyleSheet: { create: styles => styles },
    Keyboard: { dismiss() {} }, Platform: { OS: 'ios' },
    Alert: { alert: (...args) => alerts.push(args) },
    BackHandler: { addEventListener: (_event, handler) => { backHandlers.add(handler); return { remove: () => backHandlers.delete(handler) }; } },
    AppState: { currentState: 'active', addEventListener: (_event, handler) => { appStateHandlers.add(handler); return { remove: () => appStateHandlers.delete(handler) }; } },
  };
  const componentNames = ['PlaceCard', 'PlaceSearchInput', 'TransportModePicker', 'TravelBadge', 'TripNameDialog', 'TripShareCard', 'TripSummaryCard', 'BottomNav'];
  const components = Object.fromEntries(componentNames.map(name => [name, name]));
  const screens = { SavedTripsScreen: 'SavedTripsScreen', TripPlannerScreen: 'TripPlannerScreen', SettingsScreen: 'SettingsScreen' };
  const useTripStore = Object.assign(() => store, { getState: () => store });
  const mocks = {
    react: React, 'react-native': native,
    'react-native-safe-area-context': { SafeAreaView: 'SafeAreaView', SafeAreaProvider: 'SafeAreaProvider' },
    '@expo/vector-icons': { MaterialIcons: 'MaterialIcons' },
    'expo-status-bar': { StatusBar: 'StatusBar' },
    'react-i18next': { useTranslation: () => ({ t }) },
    '../stores/tripStore': { useTripStore }, './src/stores/tripStore': { useTripStore },
    '../components': components, './src/components': components, './src/screens': screens,
    '../components/TripShareSheet': { TripShareSheet: 'TripShareSheet' },
    '../constants': { DEFAULT_STAY_DURATION: 60 },
    '../utils/shareTrip': { shareTripAsImage: async () => {} },
    './src/i18n': { i18nReady: Promise.resolve() },
  };
  const module = loadTs(file, mocks, {
    setInterval: (handler, milliseconds) => { const id = ++intervalId; intervals.set(id, { handler, milliseconds }); return id; },
    clearInterval: id => intervals.delete(id),
  });
  let component = module[exportName];
  const render = () => {
    let renders = 0;
    do {
      dirty = false;
      cursor = 0;
      pendingEffects = [];
      tree = component(props);
      pendingEffects.forEach(effect => effect());
      if (++renders > 20) throw new Error('Render loop');
    } while (dirty);
    return tree;
  };
  return { render, alerts, backHandlers, appStateHandlers, intervals,
    unmount: () => hooks.forEach(hook => hook?.cleanup?.()),
    useComponent: next => { component = next; hooks.length = 0; }, get tree() { return tree; } };
}

function nodes(root) {
  if (root === null || root === undefined || typeof root === 'boolean') return [];
  if (Array.isArray(root)) return root.flatMap(nodes);
  if (typeof root !== 'object') return [root];
  return [root, ...nodes(root.props?.children), ...nodes(root.props?.ListHeaderComponent)];
}
const find = (tree, predicate) => nodes(tree).find(node => node && typeof node === 'object' && predicate(node));
const listOf = harness => find(harness.render(), node => node.type === 'SectionList');
const settle = () => new Promise(resolve => setImmediate(resolve));
const basicStore = overrides => ({
  savedTrips: [], drafts: [], currentTrip: null, error: null, flushDrafts: async () => {}, refreshExpiredRoutes: async () => {},
  loadTrip: async () => {}, resumeDraft: async () => {}, deleteTrip: async () => {}, ...overrides,
});

test('home exposes untouched drafts and can resume an older draft after starting another trip', async () => {
  const older = trip('older-empty');
  const latest = trip('latest', [place('a')], { revision: 2, updatedAt: new Date('2026-10-27T00:00:00Z') });
  const calls = [];
  const store = basicStore({ drafts: [older, latest], currentTrip: latest,
    flushDrafts: async () => calls.push('flush'), resumeDraft: async id => calls.push(`resume:${id}`) });
  const harness = screenHarness('src/screens/SavedTripsScreen.tsx', 'SavedTripsScreen', store, { onSelectTrip: id => calls.push(`open:${id}`) });
  const list = listOf(harness);
  assert.deepEqual(Array.from(list.props.sections[0].data, entry => entry.id), ['latest', 'older-empty']);
  assert.ok(nodes(list.props.ListHeaderComponent).includes('planner.continuePlanning'));
  const oldCard = list.props.renderItem({ item: older, section: list.props.sections[0] });
  assert.ok(nodes(oldCard).includes('planner.emptyDraft'));
  find(oldCard, node => node.props.accessibilityLabel === 'planner.resumeTrip:older-empty').props.onPress();
  await settle();
  assert.deepEqual(calls, ['flush', 'resume:older-empty', 'open:older-empty']);
  assert.equal(store.drafts.length, 2);
});

test('home gives newer edits their own draft section without duplicating saved versions', () => {
  const saved = trip('edited', [place('a')], { revision: 1 });
  const changed = { ...saved, revision: 2, name: 'later edits' };
  const complete = trip('complete', [place('b')], { revision: 3 });
  const store = basicStore({ savedTrips: [saved, complete], drafts: [changed, { ...complete }], currentTrip: complete });
  const harness = screenHarness('src/screens/SavedTripsScreen.tsx', 'SavedTripsScreen', store);
  const list = listOf(harness);
  assert.deepEqual(Array.from(list.props.sections, section => [section.key, Array.from(section.data, entry => entry.id)]), [
    ['drafts', ['edited']], ['saved', ['complete']],
  ]);
  assert.ok(find(list.props.ListHeaderComponent, node => node.props.accessibilityLabel === 'planner.resumeTrip:later edits'));
  assert.equal(store.savedTrips[0].revision, 1);
});

test('fully saved trips do not appear as unfinished and an empty library keeps onboarding', () => {
  const saved = trip('saved', [place('a')], { revision: 1 });
  const harness = screenHarness('src/screens/SavedTripsScreen.tsx', 'SavedTripsScreen', basicStore({ savedTrips: [saved], drafts: [{ ...saved }], currentTrip: saved }));
  const list = listOf(harness);
  assert.equal(list.props.sections.length, 1);
  assert.equal(list.props.sections[0].key, 'saved');
  assert.equal(nodes(list.props.ListHeaderComponent).includes('planner.continuePlanning'), false);
  const empty = listOf(screenHarness('src/screens/SavedTripsScreen.tsx', 'SavedTripsScreen', basicStore()));
  assert.equal(empty.props.sections.length, 0);
  assert.ok(nodes(empty.props.ListEmptyComponent).includes('planner.startTrip'));
});

test('a failed draft write keeps the library in place and does not open another trip', async () => {
  let opened = false;
  let resumed = false;
  const draft = trip('draft');
  const harness = screenHarness('src/screens/SavedTripsScreen.tsx', 'SavedTripsScreen', basicStore({ drafts: [draft],
    flushDrafts: async () => { throw new Error('storage full'); }, resumeDraft: async () => { resumed = true; } }),
  { onSelectTrip: () => { opened = true; } });
  const list = listOf(harness);
  find(list.props.ListHeaderComponent, node => node.props.accessibilityLabel === 'planner.resumeTrip:draft').props.onPress();
  await settle();
  assert.equal(opened, false);
  assert.equal(resumed, false);
  assert.ok(nodes(harness.render()).includes('planner.openError'));
});

const textContent = node => nodes(node.props?.children)
  .filter(value => typeof value === 'string' || typeof value === 'number').join('');
const textNodes = root => nodes(root).filter(node => node?.type === 'Text');
const textLines = root => textNodes(root).map(textContent);
const flattenedStyle = style => Object.assign({}, ...[style].flat(Infinity).filter(value => value && typeof value === 'object'));
function libraryCard(harness, id) {
  const list = listOf(harness);
  const section = list.props.sections.find(value => value.data.some(item => item.id === id));
  assert.ok(section, `card ${id} must appear in the library`);
  return list.props.renderItem({ item: section.data.find(value => value.id === id), section });
}
function assertSmallUpdatedText(root, label, tripName) {
  const updated = textNodes(root).find(node => textContent(node) === label);
  const name = textNodes(root).find(node => textContent(node) === tripName);
  assert.ok(updated, 'last edit must include its local date and time');
  assert.ok(name, 'trip name must remain visible');
  assert.ok(flattenedStyle(updated.props.style).fontSize < flattenedStyle(name.props.style).fontSize,
    'last edit is secondary text, smaller than the trip name');
}

test('editing a saved trip the next day preserves its first saved date above its separate travel date', () => {
  // Local wall-clock constructors make the expectations independent of the machine timezone.
  // Near-midnight values expose accidental UTC ISO slicing when run in non-UTC timezones.
  const createdAt = new Date(2026, 9, 28, 23, 50);
  const saved = trip('weekend', [place('a')], { revision: 1, createdAt, updatedAt: new Date(createdAt), date: '2026-11-14' });
  const store = basicStore({ savedTrips: [saved] });
  const harness = screenHarness('src/screens/SavedTripsScreen.tsx', 'SavedTripsScreen', store);
  const before = textLines(libraryCard(harness, saved.id));
  assert.equal(before[0], '최초 저장 2026-10-28');
  assert.ok(before.some(line => line.includes('여행일 2026-11-14')));
  assert.equal(before.some(line => line.startsWith('마지막 수정')), false);

  store.savedTrips = [{ ...saved, revision: 2, updatedAt: new Date(2026, 9, 29, 8, 7), date: '2026-11-15' }];
  const afterCard = libraryCard(harness, saved.id);
  const after = textLines(afterCard);
  assert.equal(after[0], '최초 저장 2026-10-28', 'editing cannot replace the first saved date with the edit or travel date');
  assert.ok(after.some(line => line.includes('여행일 2026-11-15')));
  assert.equal(after.some(line => line.includes('여행일 2026-11-14')), false);
  const travelIndex = after.findIndex(line => line.includes('여행일 2026-11-15'));
  const scheduleIndex = after.findIndex(line => line.includes('13:00') && line.includes('18:00'));
  assert.ok(scheduleIndex >= travelIndex && scheduleIndex <= travelIndex + 1, 'travel date stays beside or immediately above the schedule');
  assertSmallUpdatedText(afterCard, '마지막 수정 2026-10-29 08:07', saved.name);
});

test('same-day edits show the time on both the draft list card and the continue card', () => {
  const draft = trip('morning-draft', [place('a')], {
    createdAt: new Date(2026, 9, 28, 0, 5), updatedAt: new Date(2026, 9, 28, 0, 47), date: '2026-11-21',
  });
  const harness = screenHarness('src/screens/SavedTripsScreen.tsx', 'SavedTripsScreen', basicStore({ drafts: [draft], currentTrip: draft }));
  const card = libraryCard(harness, draft.id);
  const header = listOf(harness).props.ListHeaderComponent;
  assert.equal(textLines(card)[0], '최초 저장 2026-10-28');
  for (const surface of [card, header]) {
    const lines = textLines(surface);
    assert.ok(lines.includes('최초 저장 2026-10-28'));
    assert.ok(lines.some(line => line.includes('여행일 2026-11-21')));
    assertSmallUpdatedText(surface, '마지막 수정 2026-10-28 00:47', draft.name);
  }
});

test('unedited trips hide last-edit text in saved, draft and continue cards', () => {
  for (const isDraft of [false, true]) {
    const createdAt = new Date(2026, 9, 28, 9, 15);
    const untouched = trip('untouched', [], { createdAt, updatedAt: new Date(createdAt), date: '2026-12-01' });
    const store = basicStore(isDraft ? { drafts: [untouched], currentTrip: untouched } : { savedTrips: [untouched] });
    const harness = screenHarness('src/screens/SavedTripsScreen.tsx', 'SavedTripsScreen', store);
    const surfaces = [libraryCard(harness, untouched.id)];
    if (isDraft) surfaces.push(listOf(harness).props.ListHeaderComponent);
    for (const surface of surfaces) {
      const lines = textLines(surface);
      assert.ok(lines.includes('최초 저장 2026-10-28'));
      assert.ok(lines.some(line => line.includes('여행일 2026-12-01')));
      assert.equal(lines.some(line => line.startsWith('마지막 수정')), false,
        'separate Date instances for the same instant still mean no later edit');
    }
  }
});

test('continue planning retains the original saved date when the draft changes the following day', () => {
  const draft = trip('continue-next-day', [place('a')], {
    createdAt: new Date(2026, 9, 28, 0, 10), updatedAt: new Date(2026, 9, 28, 0, 10), date: '2026-11-07',
  });
  const store = basicStore({ drafts: [draft], currentTrip: draft });
  const harness = screenHarness('src/screens/SavedTripsScreen.tsx', 'SavedTripsScreen', store);
  assert.ok(textLines(listOf(harness).props.ListHeaderComponent).includes('최초 저장 2026-10-28'));
  const changed = { ...draft, revision: 1, updatedAt: new Date(2026, 9, 29, 23, 59) };
  store.drafts = [changed];
  store.currentTrip = changed;
  const header = listOf(harness).props.ListHeaderComponent;
  assert.ok(textLines(header).includes('최초 저장 2026-10-28'));
  assert.ok(textLines(header).some(line => line.includes('여행일 2026-11-07')));
  assertSmallUpdatedText(header, '마지막 수정 2026-10-29 23:59', draft.name);
});

function plannerHarness(overrides = {}) {
  let guard;
  let moved = 0;
  const updates = [];
  const store = basicStore({ currentTrip: trip('draft'), isDirty: true, isSaving: false, isLoading: false,
    isPersistingDraft: false, draftSaveError: null, summary: null,
    setSchedule: update => {
      updates.push(update);
      store.currentTrip = { ...store.currentTrip, ...update, revision: store.currentTrip.revision + 1 };
    }, ...overrides });
  const harness = screenHarness('src/screens/TripPlannerScreen.tsx', 'TripPlannerScreen', store,
    { registerNavigationGuard: value => { guard = value; }, onBack() {} });
  harness.render();
  const open = () => { find(harness.render(), node => node.props.accessibilityLabel === 'planner.editSchedule').props.onPress(); harness.render(); };
  const edit = (label, value) => { find(harness.render(), node => node.type === 'TextInput' && node.props.accessibilityLabel === label).props.onChangeText(value); harness.render(); };
  return { harness, store, updates, open, edit, leave: () => guard(() => { moved += 1; }), get moved() { return moved; } };
}

const shareButton = flow => find(flow.harness.render(), node => node.props.accessibilityLabel === 'social.createCard');
const shareSheet = flow => find(flow.harness.render(), node => node.type === 'TripShareSheet');
const saveButton = flow => find(flow.harness.render(), node => node.type === 'TouchableOpacity' && ['save', 'edit'].includes(node.props.accessibilityLabel));

test('planner save label uses an explicit saved trip ID, not auto-drafts, name, or dirty status', () => {
  const current = trip('current', [place('a')], { name: 'same name', revision: 2 });
  const flow = plannerHarness({ currentTrip: current, drafts: [current],
    savedTrips: [trip('other', [place('a')], { name: current.name })] });
  assert.equal(textContent(saveButton(flow)), 'save', 'a resumed auto-draft is still a new save');
  flow.store.isDirty = false;
  assert.equal(textContent(saveButton(flow)), 'save', 'clean draft status does not make it an explicit saved trip');
  flow.store.savedTrips.push({ ...current, name: 'older saved name', revision: 0 });
  assert.equal(textContent(saveButton(flow)), 'edit', 'matching saved ID is enough even if the name or revision differs');
  flow.store.isDirty = true;
  assert.equal(textContent(saveButton(flow)), 'edit', 'unsaved changes to an existing trip remain an edit');
  flow.store.currentTrip = trip('new-trip', [place('b')]);
  assert.equal(textContent(saveButton(flow)), 'save', 'switching to a different trip restores the save label');
});

test('first save switches the planner label to edit and both labels retain the same save action', async () => {
  const flow = plannerHarness({ currentTrip: trip('save-once', [place('a')]) });
  const savedSnapshots = [];
  flow.store.saveCurrentTrip = async () => {
    savedSnapshots.push({ ...flow.store.currentTrip });
    flow.store.savedTrips = [{ ...flow.store.currentTrip }];
    flow.store.isDirty = false;
  };
  flow.open();
  flow.edit('planner.endTime', '19:00');
  saveButton(flow).props.onPress();
  await settle();
  assert.equal(savedSnapshots.length, 1);
  assert.equal(savedSnapshots[0].totalAvailableTime, 360, 'saving still applies pending valid schedule edits');
  assert.equal(textContent(saveButton(flow)), 'edit');
  assert.ok(nodes(flow.harness.render()).includes('planner.savedNotice'));
  flow.store.currentTrip = { ...flow.store.currentTrip, name: 'updated name', revision: 2 };
  flow.store.isDirty = true;
  saveButton(flow).props.onPress();
  await settle();
  assert.equal(savedSnapshots.length, 2);
  assert.equal(savedSnapshots[1].name, 'updated name');
  assert.equal(textContent(saveButton(flow)), 'edit');
});

test('save and edit labels retain disabled and failed-save behavior', async () => {
  const flow = plannerHarness({ currentTrip: trip('save-failure', [place('a')]),
    saveCurrentTrip: async () => { throw new Error('storage unavailable'); } });
  saveButton(flow).props.onPress();
  await settle();
  assert.equal(textContent(saveButton(flow)), 'save', 'a failed first save must not become an edit');
  assert.ok(nodes(flow.harness.render()).includes('planner.saveFailed'));
  for (const saved of [false, true]) {
    flow.store.savedTrips = saved ? [{ ...flow.store.currentTrip }] : [];
    flow.store.isSaving = true;
    assert.equal(saveButton(flow).props.disabled, true);
    assert.equal(saveButton(flow).props.accessibilityLabel, saved ? 'edit' : 'save');
    flow.store.isSaving = false;
    const withPlaces = flow.store.currentTrip;
    flow.store.currentTrip = { ...withPlaces, places: [] };
    assert.equal(saveButton(flow).props.disabled, true, 'empty trips still cannot be saved');
    flow.store.currentTrip = withPlaces;
    assert.equal(saveButton(flow).props.disabled, false);
  }
});

test('sharing applies dirty schedule inputs and snapshots the latest store before opening the card sheet', () => {
  const original = trip('share-schedule', [place('start'), place('end')], { legs: [leg('start', 'end')] });
  const flow = plannerHarness({ currentTrip: original });
  flow.open();
  flow.edit('planner.dateLabel', '2026-11-15');
  flow.edit('planner.startTime', '14:00');
  flow.edit('planner.endTime', '19:30');
  flow.edit('planner.bufferLabel', '45');
  shareButton(flow).props.onPress();
  const snapshot = shareSheet(flow)?.props.trip;
  assert.ok(snapshot, 'a valid itinerary opens the share preview');
  assert.equal(flow.updates.length, 1);
  assert.equal(snapshot.date, '2026-11-15');
  assert.equal(snapshot.startTimeMinutes, 840);
  assert.equal(snapshot.totalAvailableTime, 330);
  assert.equal(snapshot.bufferMinutes, 45);
  assert.equal(snapshot.revision, 1, 'snapshot includes the synchronous store update, not the old render closure');
  assert.notEqual(snapshot, flow.store.currentTrip);
  assert.equal(original.totalAvailableTime, 300);
  assert.equal(original.date, '2026-10-26');
});

test('sharing invalid or rejected schedule inputs keeps the editor open and does not capture a stale trip', () => {
  const invalidCases = [
    ['planner.dateLabel', '2026-02-30'],
    ['planner.startTime', '25:00'],
    ['planner.endTime', '12:00'],
    ['planner.bufferLabel', '241'],
  ];
  for (const [label, value] of invalidCases) {
    const flow = plannerHarness({ currentTrip: trip('invalid-share', [place('a')]) });
    flow.open(); flow.edit(label, value);
    shareButton(flow).props.onPress();
    assert.equal(shareSheet(flow), undefined, label);
    assert.equal(flow.updates.length, 0, label);
    assert.ok(nodes(flow.harness.render()).includes('planner.invalidSchedule'));
    assert.ok(find(flow.harness.tree, node => node.type === 'TextInput' && node.props.accessibilityLabel === label));
  }
  const rejected = plannerHarness({ currentTrip: trip('rejected-share', [place('a')]),
    setSchedule() { throw new Error('invalid store schedule'); } });
  rejected.open(); rejected.edit('planner.endTime', '19:00');
  shareButton(rejected).props.onPress();
  assert.equal(shareSheet(rejected), undefined);
  assert.ok(nodes(rejected.harness.render()).includes('planner.invalidSchedule'));
});

test('share reads the current store even if an automatic route result arrives after the last render', () => {
  const original = trip('late-route', [place('a'), place('b')], {
    legs: [leg('a', 'b', { status: 'pending', duration: null, distance: null })],
  });
  const flow = plannerHarness({ currentTrip: original });
  const button = shareButton(flow);
  flow.store.currentTrip = { ...original, legs: [leg('a', 'b', { duration: 37, distance: 4200 })] };
  button.props.onPress();
  const snapshot = shareSheet(flow).props.trip;
  assert.equal(snapshot.legs[0].duration, 37);
  assert.equal(snapshot.legs[0].status, 'ready');
  assert.equal(flow.updates.length, 0, 'an unchanged schedule does not cause an unnecessary edit');
});

test('open share preview retains its own itinerary through route responses and trip edits until closed', () => {
  const original = trip('frozen-share', [place('a'), place('b')], { legs: [leg('a', 'b', { duration: 20 })] });
  const flow = plannerHarness({ currentTrip: original });
  shareButton(flow).props.onPress();
  const firstSheet = shareSheet(flow);
  const snapshot = firstSheet.props.trip;
  assert.notEqual(snapshot.places, original.places);
  assert.notEqual(snapshot.places[0], original.places[0]);
  assert.notEqual(snapshot.legs, original.legs);
  assert.notEqual(snapshot.legs[0], original.legs[0]);

  // Provider completion replaces a leg, and later user edits replace trip fields.
  flow.store.currentTrip = { ...original, name: 'renamed later', totalAvailableTime: 420,
    places: [place('a', { name: 'updated stop', stayDuration: 90 }), place('b')],
    legs: [leg('a', 'b', { duration: 55 })], revision: 3 };
  assert.equal(shareSheet(flow).props.trip, snapshot);
  assert.equal(snapshot.name, 'frozen-share');
  assert.equal(snapshot.totalAvailableTime, 300);
  assert.equal(snapshot.places[0].name, 'a');
  assert.equal(snapshot.places[0].stayDuration, 60);
  assert.equal(snapshot.legs[0].duration, 20);
  assert.equal(shareButton(flow).props.disabled, true);
  shareButton(flow).props.onPress();
  assert.equal(shareSheet(flow).props.trip, snapshot, 'repeat sharing cannot replace an open preview');

  // Also guard against the captured objects sharing mutable place/leg records.
  original.places[0].name = 'mutated source';
  original.legs[0].duration = 99;
  assert.equal(snapshot.places[0].name, 'a');
  assert.equal(snapshot.legs[0].duration, 20);
  firstSheet.props.onClose();
  assert.equal(shareSheet(flow), undefined);
  shareButton(flow).props.onPress();
  assert.equal(shareSheet(flow).props.trip.name, 'renamed later');
  assert.equal(shareSheet(flow).props.trip.legs[0].duration, 55);
});

test('an empty itinerary cannot open the image share preview', () => {
  const flow = plannerHarness();
  assert.equal(shareButton(flow).props.disabled, true);
  shareButton(flow).props.onPress();
  assert.equal(shareSheet(flow), undefined);
});

test('leaving with unapplied schedule input offers apply, discard, or keep editing', () => {
  const flow = plannerHarness();
  flow.open();
  flow.edit('planner.endTime', '19:00');
  flow.leave();
  assert.equal(flow.moved, 0);
  const buttons = flow.harness.alerts.at(-1)[2];
  buttons.find(button => button.text === 'cancel').onPress();
  assert.equal(flow.moved, 0);
  flow.leave();
  flow.harness.alerts.at(-1)[2].find(button => button.text === 'planner.applyAndLeave').onPress();
  assert.equal(flow.moved, 1);
  assert.equal(flow.updates[0].totalAvailableTime, 360);
});

test('invalid schedule stays editable; explicit discard preserves the stored schedule', () => {
  const flow = plannerHarness();
  flow.open();
  flow.edit('planner.endTime', '11:00');
  flow.leave();
  flow.harness.alerts.at(-1)[2].find(button => button.text === 'planner.applyAndLeave').onPress();
  assert.equal(flow.moved, 0);
  assert.equal(flow.updates.length, 0);
  assert.ok(nodes(flow.harness.render()).includes('planner.invalidSchedule'));
  flow.leave();
  flow.harness.alerts.at(-1)[2].find(button => button.text === 'planner.discardAndLeave').onPress();
  assert.equal(flow.moved, 1);
  assert.equal(flow.updates.length, 0);
  assert.equal(flow.store.currentTrip.totalAvailableTime, 300);
});

test('draft save status distinguishes pending, failed, and stored and exposes retry', async () => {
  const flow = plannerHarness();
  flow.store.isPersistingDraft = true;
  assert.ok(nodes(flow.harness.render()).includes('planner.draftSaving'));
  flow.store.isPersistingDraft = false;
  flow.store.draftSaveError = 'storage full';
  let retried = false;
  flow.store.flushDrafts = async () => { retried = true; };
  const tree = flow.harness.render();
  assert.ok(nodes(tree).includes('planner.draftSaveFailed'));
  find(tree, node => node.type === 'TouchableOpacity' && nodes(node).includes('planner.retryDraftSave')).props.onPress();
  await settle();
  assert.equal(retried, true);
  flow.store.draftSaveError = null;
  assert.ok(nodes(flow.harness.render()).includes('planner.draftSaved'));
});

test('App waits for draft persistence before opening a new trip and stays home on failure', async () => {
  const write = deferred();
  let created = 0;
  const store = basicStore({ initialized: true, initialize: async () => {}, flushDrafts: () => write.promise, createTrip: () => { created += 1; } });
  const harness = screenHarness('App.tsx', 'default', store);
  harness.render();
  await settle();
  const outer = harness.render();
  const app = find(outer, node => typeof node.type === 'function');
  harness.useComponent(app.type);
  const home = find(harness.render(), node => node.type === 'SavedTripsScreen');
  home.props.onCreateNew();
  assert.equal(created, 0);
  assert.ok(find(harness.render(), node => node.type === 'SavedTripsScreen'));
  write.reject(new Error('storage full'));
  await settle();
  assert.equal(created, 0);
  assert.ok(find(harness.render(), node => node.type === 'SavedTripsScreen'));
  assert.equal(harness.alerts.at(-1)[0], 'planner.leaveSaveFailedTitle');
  store.flushDrafts = async () => {};
  find(harness.render(), node => node.type === 'SavedTripsScreen').props.onCreateNew();
  await settle();
  assert.equal(created, 1);
  assert.ok(find(harness.render(), node => node.type === 'TripPlannerScreen'));
});

test('tabs and Android back consult the schedule guard, then wait for draft storage', async () => {
  let writes = 0;
  let failWrite = false;
  let guardedMove;
  const store = basicStore({ initialized: true, initialize: async () => {}, currentTrip: trip('draft'),
    flushDrafts: async () => { writes += 1; if (failWrite) throw new Error('storage full'); }, createTrip() {} });
  const harness = screenHarness('App.tsx', 'default', store);
  harness.render();
  await settle();
  harness.useComponent(find(harness.render(), node => typeof node.type === 'function').type);
  find(harness.render(), node => node.type === 'BottomNav').props.onNavigate('planner');
  await settle();
  const planner = find(harness.render(), node => node.type === 'TripPlannerScreen');
  planner.props.registerNavigationGuard(proceed => { guardedMove = proceed; });
  find(harness.render(), node => node.type === 'BottomNav').props.onNavigate('settings');
  assert.equal(writes, 1, 'no navigation write before the form decision');
  assert.ok(find(harness.render(), node => node.type === 'TripPlannerScreen'));
  failWrite = true;
  guardedMove();
  await settle();
  assert.ok(find(harness.render(), node => node.type === 'TripPlannerScreen'), 'storage failure keeps the editor');
  failWrite = false;
  assert.equal([...harness.backHandlers][0](), true);
  assert.ok(find(harness.render(), node => node.type === 'TripPlannerScreen'), 'Android back also waits for the form decision');
  guardedMove();
  await settle();
  assert.ok(find(harness.render(), node => node.type === 'SavedTripsScreen'));
  const beforeBackground = writes;
  [...harness.appStateHandlers][0]('background');
  await settle();
  assert.equal(writes, beforeBackground + 1);
});

test('App refreshes expiry only while active and cleans up its minute timer', async () => {
  let refreshes = 0;
  let writes = 0;
  const store = basicStore({ initialized: true, initialize: async () => {},
    refreshExpiredRoutes: async () => { refreshes += 1; }, flushDrafts: async () => { writes += 1; } });
  const harness = screenHarness('App.tsx', 'default', store);
  harness.render();
  await settle();
  harness.useComponent(find(harness.render(), node => typeof node.type === 'function').type);
  harness.render();
  assert.equal(refreshes, 1, 'first foreground render checks cached values immediately');
  assert.equal(harness.intervals.size, 1);
  const timer = [...harness.intervals.values()][0];
  assert.equal(timer.milliseconds, 60_000);
  timer.handler();
  assert.equal(refreshes, 2);
  const appState = [...harness.appStateHandlers][0];
  appState('background');
  assert.equal(harness.intervals.size, 0);
  assert.equal(writes, 1);
  timer.handler();
  assert.equal(refreshes, 2, 'an already queued timer callback is inert in the background');
  appState('active');
  assert.equal(refreshes, 3, 'returning to the app checks expiry before the next minute');
  assert.equal(harness.intervals.size, 1);
  appState('active');
  assert.equal(harness.intervals.size, 1, 'repeated active events do not accumulate timers');
  harness.unmount();
  assert.equal(harness.intervals.size, 0);
  assert.equal(harness.appStateHandlers.size, 0);
  const beforeUnmountedCallback = refreshes;
  timer.handler();
  assert.equal(refreshes, beforeUnmountedCallback);
});
