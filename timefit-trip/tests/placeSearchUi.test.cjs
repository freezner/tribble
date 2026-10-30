const test = require('node:test');
const assert = require('node:assert/strict');
const { loadTs, deferred } = require('./helpers.cjs');

const result = (id, name) => ({ id: `kakao:${id}`, name, address: `${name} 주소`, latitude: 35.1, longitude: 129.0, countryCode: 'KR' });
const tick = async () => { await Promise.resolve(); await Promise.resolve(); await Promise.resolve(); };
function nodes(root) {
  if (root == null || typeof root === 'boolean') return [];
  if (Array.isArray(root)) return root.flatMap(nodes);
  if (typeof root !== 'object') return [root];
  return [root, ...nodes(root.props?.children)];
}
const find = (tree, predicate) => nodes(tree).find(node => node && typeof node === 'object' && predicate(node));
const textOf = tree => nodes(tree).filter(node => typeof node === 'string').join(' ');

function harness() {
  let cursor = 0;
  let dirty = false;
  let effects = [];
  let tree;
  let mounted = true;
  let writesAfterUnmount = 0;
  let timerId = 0;
  const timers = new Map();
  const hooks = [];
  const calls = [];
  const selected = [];
  const same = (a, b) => a && b && a.length === b.length && a.every((value, index) => Object.is(value, b[index]));
  const React = {
    createElement: (type, props, ...children) => ({ type, props: { ...props, children } }),
    useState: initial => {
      const index = cursor++;
      if (!hooks[index]) hooks[index] = { value: initial };
      return [hooks[index].value, value => {
        if (!mounted) writesAfterUnmount += 1;
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
  class PlaceSearchError extends Error { constructor(code) { super(code); this.code = code; } }
  const native = Object.fromEntries(['View', 'Text', 'TextInput', 'ScrollView', 'TouchableOpacity', 'ActivityIndicator'].map(name => [name, name]));
  native.StyleSheet = { create: value => value, hairlineWidth: 1 };
  const { PlaceSearchInput } = loadTs('src/components/PlaceSearchInput.tsx', {
    react: React, 'react-native': native, '@expo/vector-icons': { MaterialIcons: 'MaterialIcons' },
    'react-i18next': { useTranslation: () => ({ t: (key, options) => options?.name ? `${key}:${options.name}` : key }) },
    '../services/placesApi': {
      PlaceSearchError,
      searchPlaces: (query, options) => { const pending = deferred(); calls.push({ query, ...options, ...pending }); return pending.promise; },
    },
  }, {
    setTimeout: (callback, delay) => { const id = ++timerId; timers.set(id, { callback, delay }); return id; },
    clearTimeout: id => timers.delete(id),
  });
  const render = () => {
    let count = 0;
    do {
      cursor = 0; dirty = false; effects = [];
      tree = PlaceSearchInput({ onPlaceSelected: place => selected.push(place) });
      effects.forEach(effect => effect());
      if (++count > 20) throw new Error('Render loop');
    } while (dirty);
    return tree;
  };
  const input = value => { find(render(), node => node.type === 'TextInput').props.onChangeText(value); return render(); };
  const runTimers = () => {
    const pending = [...timers.values()];
    timers.clear();
    for (const timer of pending) { assert.equal(timer.delay, 350); void timer.callback(); }
    return render();
  };
  const unmount = () => { mounted = false; hooks.forEach(hook => hook.cleanup?.()); };
  return { render, input, runTimers, unmount, calls, selected, PlaceSearchError,
    get pendingTimers() { return timers.size; }, get writesAfterUnmount() { return writesAfterUnmount; } };
}

test('search keeps a domestic scope hint and debounces only the latest two-character query', () => {
  const screen = harness();
  assert.match(textOf(screen.render()), /placeSearchDomesticHint/);
  screen.input('부');
  screen.runTimers();
  screen.input('😀');
  screen.runTimers();
  assert.equal(screen.calls.length, 0);
  screen.input('부산');
  screen.input('부산역');
  assert.equal(screen.pendingTimers, 1);
  assert.equal(screen.calls.length, 0);
  screen.runTimers();
  assert.equal(screen.calls.length, 1);
  assert.equal(screen.calls[0].query, '부산역');
  assert.match(textOf(screen.render()), /searching/);
  screen.input('부산역');
  assert.equal(screen.calls[0].signal.aborted, false, 'repeated identical input does not cancel the only active query');
  assert.equal(screen.pendingTimers, 0);
});

test('late results and errors from an aborted query cannot replace the current search', async () => {
  const screen = harness();
  screen.input('서울역'); screen.runTimers();
  screen.input('부산역'); screen.runTimers();
  assert.equal(screen.calls[0].signal.aborted, true);
  screen.calls[1].resolve([result(2, '부산역')]);
  await tick();
  screen.calls[0].resolve([result(1, '서울역')]);
  await tick();
  assert.match(textOf(screen.render()), /부산역/);
  assert.doesNotMatch(textOf(screen.render()), /서울역/);
  screen.input('대전역'); screen.runTimers();
  screen.input('대구역'); screen.runTimers();
  screen.calls[3].resolve([result(4, '대구역')]);
  screen.calls[2].reject(new screen.PlaceSearchError('network'));
  await tick();
  assert.match(textOf(screen.render()), /대구역/);
  assert.doesNotMatch(textOf(screen.render()), /routeReason.network|searchRetry/);
});

test('empty results and failures stay distinct and retry repeats the same search', async () => {
  const screen = harness();
  screen.input('없는장소'); screen.runTimers();
  screen.calls[0].resolve([]); await tick();
  assert.match(textOf(screen.render()), /searchEmpty/);
  assert.doesNotMatch(textOf(screen.render()), /searchRetry/);
  screen.input('부산역'); screen.runTimers();
  screen.calls[1].reject(new screen.PlaceSearchError('quota')); await tick();
  let tree = screen.render();
  assert.match(textOf(tree), /routeReason.quota/);
  assert.doesNotMatch(textOf(tree), /searchEmpty/);
  find(tree, node => node.type === 'TouchableOpacity' && textOf(node) === 'searchRetry').props.onPress();
  screen.render(); screen.runTimers();
  assert.equal(screen.calls[2].query, '부산역');
  screen.calls[2].resolve([result(2, '부산역')]); await tick();
  tree = screen.render();
  assert.match(textOf(tree), /placeSearchProvider/);
  assert.doesNotMatch(textOf(tree), /Google|routeReason.quota/);
});

test('choosing a Kakao result adds its coordinates once without a Details request', async () => {
  const screen = harness();
  screen.input('부산역'); screen.runTimers();
  screen.calls[0].resolve([result(2, '부산역')]); await tick();
  const choice = find(screen.render(), node => node.props.accessibilityLabel === 'addSelectedPlace:부산역');
  choice.props.onPress(); choice.props.onPress();
  assert.equal(screen.selected.length, 1);
  assert.deepEqual(JSON.parse(JSON.stringify(screen.selected[0])), {
    name: '부산역', address: '부산역 주소', latitude: 35.1, longitude: 129,
    placeId: 'kakao:2', countryCode: 'KR',
  });
  const tree = screen.render();
  assert.equal(find(tree, node => node.type === 'TextInput').props.value, '');
  assert.doesNotMatch(textOf(tree), /부산역|loadingPlace/);
  screen.runTimers();
  assert.equal(screen.calls.length, 1);
  screen.input('서울역'); screen.runTimers();
  screen.calls[1].resolve([result(1, '서울역')]); await tick();
  find(screen.render(), node => node.props.accessibilityLabel === 'addSelectedPlace:서울역').props.onPress();
  assert.equal(screen.selected.length, 2, 'a later search may add another place');
});

test('clear and unmount abort requests without resurrecting results or writing state', async () => {
  const screen = harness();
  screen.input('부산역'); screen.runTimers();
  screen.input('');
  assert.equal(screen.calls[0].signal.aborted, true);
  screen.calls[0].resolve([result(2, '부산역')]); await tick();
  assert.doesNotMatch(textOf(screen.render()), /부산역|searchEmpty/);
  screen.input('서울역'); screen.runTimers();
  screen.unmount();
  assert.equal(screen.calls[1].signal.aborted, true);
  screen.calls[1].reject(new screen.PlaceSearchError('network')); await tick();
  assert.equal(screen.writesAfterUnmount, 0);
  assert.equal(screen.pendingTimers, 0);
});
