const test = require('node:test');
const assert = require('node:assert/strict');
const { loadTs, deferred } = require('./helpers.cjs');
const tick = () => new Promise(resolve => setImmediate(resolve));
function nodes(root) {
  if (root == null || typeof root === 'boolean') return [];
  if (Array.isArray(root)) return root.flatMap(nodes);
  if (typeof root !== 'object') return [root];
  return [root, ...nodes(root.props?.children)];
}
const find = (tree, predicate) => nodes(tree).find(node => node && typeof node === 'object' && predicate(node));
const textOf = tree => nodes(tree).filter(node => typeof node === 'string').join('');
const input = tree => find(tree, node => node.type === 'TextInput');
const button = (tree, text) => find(tree, node => node.type === 'TouchableOpacity' && textOf(node) === text);
const state = extra => ({ title: '', initialized: true, isSaving: false, error: null,
  initialize: async () => {}, saveTitle: async () => {}, clearError() { this.error = null; }, ...extra });

function harness(store) {
  const hooks = [];
  let cursor = 0, dirty = false, effects = [];
  const same = (a, b) => a && b && a.length === b.length && a.every((value, index) => Object.is(value, b[index]));
  const React = {
    createElement: (type, props, ...children) => ({ type, props: { ...props, children } }),
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
      if (!hooks[index] || !same(hooks[index].deps, deps)) { hooks[index] = { deps }; effects.push(effect); }
    },
  };
  const native = Object.fromEntries(['ActivityIndicator', 'View', 'Text', 'TouchableOpacity', 'TextInput'].map(name => [name, name]));
  native.StyleSheet = { create: value => value };
  const { CardPreferencesSection } = loadTs('src/components/CardPreferencesSection.tsx', {
    react: React, 'react-native': native,
    'react-i18next': { useTranslation: () => ({ t: key => key }) },
    '../stores/cardPreferencesStore': { useCardPreferencesStore: () => store, CARD_TITLE_MAX_LENGTH: 40 },
  });
  return { render: () => {
    let tree, iterations = 0;
    do {
      cursor = 0; dirty = false; effects = [];
      tree = CardPreferencesSection(); effects.forEach(effect => effect());
      if (++iterations > 20) throw new Error('Render loop');
    } while (dirty);
    return tree;
  } };
}

test('card title editor waits for hydration and allows retry after a read failure without showing an empty saved value', async () => {
  let attempts = 0;
  const store = state({ initialized: false });
  store.initialize = async () => {
    if (++attempts === 1) { store.error = 'card-preferences-read-failed'; throw new Error(store.error); }
    store.title = '기존 이름'; store.initialized = true; store.error = null;
  };
  const screen = harness(store);
  const first = screen.render();
  assert.equal(input(first).props.editable, false);
  assert.equal(button(first, 'save').props.disabled, true);
  await tick();
  let tree = screen.render();
  assert.match(textOf(tree), /social.cardTitleLoadFailed/);
  button(tree, 'planner.retry').props.onPress(); await tick();
  tree = screen.render();
  assert.equal(attempts, 2);
  assert.equal(input(tree).props.value, '기존 이름');
  assert.equal(input(tree).props.editable, true);
  assert.doesNotMatch(textOf(tree), /social.cardTitleLoadFailed/);
});

test('a failed title save keeps the edited name visible and retry publishes success only after completion', async () => {
  const gate = deferred();
  const calls = [];
  const store = state({ title: '기존 이름' });
  store.saveTitle = async value => {
    calls.push(value);
    if (calls.length === 1) throw new Error('card-preferences-write-failed');
    await gate.promise; store.title = value.trim();
  };
  const screen = harness(store);
  input(screen.render()).props.onChangeText(' 새 이름 ');
  button(screen.render(), 'save').props.onPress(); await tick();
  let tree = screen.render();
  assert.equal(input(tree).props.value, ' 새 이름 ');
  assert.equal(store.title, '기존 이름');
  assert.match(textOf(tree), /social.cardTitleSaveFailed/);
  assert.doesNotMatch(textOf(tree), /social.cardTitleSaved/);
  const retry = button(tree, 'save');
  retry.props.onPress(); retry.props.onPress();
  assert.equal(calls.length, 2, 'rapid double taps cannot create two writes');
  assert.equal(input(screen.render()).props.editable, false);
  assert.doesNotMatch(textOf(screen.render()), /social.cardTitleSaved/);
  gate.resolve(); await tick();
  tree = screen.render();
  assert.equal(input(tree).props.value, '새 이름');
  assert.match(textOf(tree), /social.cardTitleSaved/);
  assert.doesNotMatch(textOf(tree), /social.cardTitleSaveFailed/);
  assert.equal(button(tree, 'save').props.disabled, true);
});

test('clearing a saved title is allowed and shows the tribble fallback, while invalid input gives a useful error', async () => {
  const calls = [];
  const store = state({ title: '내 이름' });
  store.saveTitle = async value => {
    calls.push(value);
    if (value.includes('\n')) throw new Error('invalid-card-title');
    store.title = value.trim();
  };
  const screen = harness(store);
  assert.equal(input(screen.render()).props.maxLength, 40);
  input(screen.render()).props.onChangeText('bad\nname');
  button(screen.render(), 'save').props.onPress(); await tick();
  assert.match(textOf(screen.render()), /social.cardTitleInvalid/);
  assert.equal(store.title, '내 이름');
  input(screen.render()).props.onChangeText('');
  const tree = screen.render();
  assert.equal(button(tree, 'save').props.disabled, false);
  button(tree, 'save').props.onPress(); await tick();
  assert.equal(store.title, '');
  assert.equal(input(screen.render()).props.value, '');
  assert.equal(input(screen.render()).props.placeholder, 'tribble');
  assert.deepEqual(calls, ['bad\nname', '']);
});
