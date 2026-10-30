const test = require('node:test');
const assert = require('node:assert/strict');
const { loadTs, trip, place, deferred } = require('./helpers.cjs');
const tick = () => new Promise(resolve => setImmediate(resolve));

function nodes(root) {
  if (root == null || typeof root === 'boolean') return [];
  if (Array.isArray(root)) return root.flatMap(nodes);
  if (typeof root !== 'object') return [root];
  return [root, ...nodes(root.props?.children)];
}
const find = (tree, predicate) => nodes(tree).find(node => node && typeof node === 'object' && predicate(node));
const textOf = tree => nodes(tree).filter(node => typeof node === 'string' || typeof node === 'number').join('');
const byText = (tree, text) => find(tree, node => node.type === 'TouchableOpacity' && textOf(node) === text);
const byLabel = (tree, label) => find(tree, node => node.props.accessibilityLabel === label);
const profile = { platform: 'instagram', handle: 'trip_notes', url: 'https://www.instagram.com/trip_notes/' };
const socialState = extra => ({ profiles: {}, initialized: true, isSaving: false, error: null,
  initialize: async () => {}, saveProfile: async () => {}, removeProfile: async () => {}, clearError() {}, ...extra });

function harness(name, store, props = {}, share = async () => 'opened', preferences = { title: '', initialized: true, error: null, initialize: async () => {} }) {
  const hooks = [], frames = [];
  let cursor = 0, dirty = false, effects = [];
  const same = (a, b) => a && b && a.length === b.length && a.every((value, index) => Object.is(value, b[index]));
  const React = {
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
        const previous = hooks[index]; hooks[index] = { deps };
        effects.push(() => { previous?.cleanup?.(); hooks[index].cleanup = effect(); });
      }
    },
  };
  const native = Object.fromEntries(['ActivityIndicator', 'Modal', 'View', 'Text', 'TouchableOpacity', 'TextInput',
    'KeyboardAvoidingView', 'ScrollView'].map(value => [value, value]));
  Object.assign(native, { StyleSheet: { create: value => value }, Platform: { OS: 'ios' },
    useWindowDimensions: () => ({ width: 390, height: 844 }), Alert: { alert() {} }, Linking: { openURL: async () => {} } });
  const component = loadTs(`src/components/${name}.tsx`, {
    react: React, 'react-native': native, '@expo/vector-icons': { MaterialIcons: 'MaterialIcons' },
    'react-native-safe-area-context': { SafeAreaView: 'SafeAreaView', SafeAreaProvider: 'SafeAreaProvider' },
    'react-i18next': { useTranslation: () => ({ t: (key, values = {}) => {
      if (key === 'social.page') return `${key}:${values.current}/${values.total}`;
      if (key === 'social.postImageLimit') return `${key}:${values.platform}:${values.count}/${values.limit}`;
      return key + (values.platform ? `:${values.platform}` : '');
    } }) },
    '../stores/socialStore': { useSocialStore: () => store },
    '../stores/cardPreferencesStore': { useCardPreferencesStore: () => preferences },
    '../utils/shareTrip': { shareTripAsImages: share }, './TripShareCard': { TripShareCard: 'TripShareCard' },
  }, { requestAnimationFrame: callback => { frames.push(callback); return frames.length; } })[name];
  const render = () => {
    let tree, count = 0;
    do {
      cursor = 0; dirty = false; effects = [];
      tree = component(props);
      // Native layout events are deliberately not automatic: tests control the acknowledgement.
      nodes(tree).filter(node => node?.props?.ref).forEach(node => { node.props.ref.current = { key: node.props.key }; });
      effects.forEach(effect => effect());
      if (++count > 20) throw new Error('Render loop');
    } while (dirty);
    return tree;
  };
  return { render, frames, frame: async () => { frames.splice(0).forEach(callback => callback(0)); await tick(); } };
}

test('failed profile hydration shows retry and keeps editing disabled until retry succeeds', async () => {
  let attempts = 0;
  const store = socialState({ initialized: false });
  store.initialize = async () => {
    if (++attempts === 1) { store.error = 'social-profiles-read-failed'; throw new Error(store.error); }
    store.profiles = { instagram: profile }; store.initialized = true; store.error = null;
  };
  const screen = harness('SocialProfilesSection', store);
  screen.render(); await tick();
  let tree = screen.render();
  assert.match(textOf(tree), /social.loadFailed/);
  assert.equal(byLabel(tree, 'social.editProfile:Instagram').props.disabled, true);
  byText(tree, 'planner.retry').props.onPress(); await tick();
  tree = screen.render();
  assert.equal(attempts, 2);
  assert.equal(byLabel(tree, 'social.editProfile:Instagram').props.disabled, false);
  assert.match(textOf(tree), /@trip_notes/);
  assert.doesNotMatch(textOf(tree), /social.loadFailed/);
});

test('profile save failure preserves the editor and input, while successful deletion closes it', async () => {
  const deletion = deferred();
  const saved = [];
  const store = socialState({ profiles: { instagram: profile },
    saveProfile: async (platform, input) => { saved.push([platform, input]); throw new Error('social-profiles-write-failed'); } });
  store.removeProfile = async platform => {
    store.isSaving = true; await deletion.promise;
    const next = { ...store.profiles }; delete next[platform]; store.profiles = next; store.isSaving = false;
  };
  const screen = harness('SocialProfilesSection', store);
  byLabel(screen.render(), 'social.editProfile:Instagram').props.onPress();
  let tree = screen.render();
  find(tree, node => node.type === 'TextInput').props.onChangeText('@edited_name');
  byText(screen.render(), 'save').props.onPress(); await tick();
  tree = screen.render();
  assert.deepEqual(saved, [['instagram', '@edited_name']]);
  assert.equal(find(tree, node => node.type === 'Modal').props.visible, true);
  assert.equal(find(tree, node => node.type === 'TextInput').props.value, '@edited_name');
  assert.match(textOf(tree), /social.saveFailed/);
  assert.equal(store.profiles.instagram.handle, 'trip_notes');
  byText(tree, 'social.removeProfile').props.onPress(); await tick();
  assert.equal(find(screen.render(), node => node.type === 'Modal').props.visible, true);
  assert.equal(find(screen.render(), node => node.type === 'TextInput').props.editable, false);
  deletion.resolve(); await tick();
  assert.equal(find(screen.render(), node => node.type === 'Modal').props.visible, false);
  assert.equal(store.profiles.instagram, undefined);
});

const shareButton = tree => byText(tree, 'social.shareAllCards') ?? byText(tree, 'social.preparing');
const captures = tree => nodes(tree).filter(node => node?.props?.collapsable === false && typeof node.props.onLayout === 'function');
const layOutAll = tree => captures(tree).forEach(node => node.props.onLayout());
const shareTrip = (stopCount = 8) => trip('share', Array.from({ length: stopCount }, (_, index) => place(String(index))));
const cards = tree => nodes(tree).filter(node => node?.type === 'TripShareCard');
const preview = tree => cards(tree)[0];

test('share defaults to no profile and waits for layout after every selection; rapid taps share once', async () => {
  const sharing = deferred();
  const calls = [];
  let closed = 0;
  const screen = harness('TripShareSheet', socialState({ profiles: { instagram: profile } }),
    { trip: shareTrip(), onClose: () => { closed++; } }, async (...args) => { calls.push(args); await sharing.promise; return 'opened'; });
  let tree = screen.render();
  assert.equal(byLabel(tree, 'Instagram').props.accessibilityState.selected, true);
  assert.equal(preview(tree).props.format, 'instagram-feed');
  assert.equal(byText(tree, 'social.noProfile').props.accessibilityState.selected, true);
  assert.ok(nodes(tree).filter(node => node?.type === 'TripShareCard').every(node => node.props.profile === undefined));
  assert.equal(shareButton(tree).props.disabled, true);
  shareButton(tree).props.onPress();
  assert.equal(screen.frames.length, 0);
  layOutAll(tree);
  assert.equal(shareButton(screen.render()).props.disabled, false);

  for (const select of [tree => byText(tree, 'social.storyPlacement'), tree => byLabel(tree, 'social.nextCard'),
    tree => byText(tree, 'Instagram · @trip_notes')]) {
    select(screen.render()).props.onPress(); tree = screen.render();
    assert.equal(shareButton(tree).props.disabled, true);
    shareButton(tree).props.onPress();
    assert.equal(screen.frames.length, 0, 'disabled configuration must not begin capture');
    assert.equal(calls.length, 0);
    layOutAll(tree);
    assert.equal(shareButton(screen.render()).props.disabled, false);
  }
  const button = shareButton(screen.render());
  button.props.onPress(); button.props.onPress();
  assert.equal(screen.frames.length, 1, 'a ref guard prevents duplicate taps before the next render');
  assert.equal(shareButton(screen.render()).props.disabled, true);
  find(screen.render(), node => node.type === 'Modal').props.onRequestClose();
  assert.equal(closed, 0);
  await screen.frame();
  assert.equal(calls.length, 0, 'capture waits for both animation frames');
  await screen.frame();
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0].slice(1), ['share', 'instagram-story']);
  assert.equal(calls[0][0].length, 2, 'both story pages are passed, even while previewing page two');
  assert.match(calls[0][0][0].current.key, /:0$/);
  assert.match(calls[0][0][1].current.key, /:1$/);
  sharing.resolve(); await tick();
  assert.equal(shareButton(screen.render()).props.disabled, false);
});

test('returning to a previously laid-out selection still requires layout of its newly mounted capture view', () => {
  for (const [away, back] of [
    [tree => byText(tree, 'social.storyPlacement'), tree => byText(tree, 'social.post')],
    [tree => byLabel(tree, 'social.nextCard'), tree => byLabel(tree, 'social.previousCard')],
    [tree => byText(tree, 'Instagram · @trip_notes'), tree => byText(tree, 'social.noProfile')],
  ]) {
    const screen = harness('TripShareSheet', socialState({ profiles: { instagram: profile } }), { trip: shareTrip(), onClose() {} });
    const originalTree = screen.render();
    const originalLayout = () => layOutAll(originalTree);
    originalLayout();
    away(screen.render()).props.onPress();
    const awayTree = screen.render();
    const intermediateLayout = () => layOutAll(awayTree);
    assert.equal(shareButton(awayTree).props.disabled, true);
    back(screen.render()).props.onPress();
    const tree = screen.render();
    assert.equal(shareButton(tree).props.disabled, true, 'an older key acknowledgement cannot authorize a remounted capture view');
    originalLayout(); intermediateLayout();
    assert.equal(shareButton(screen.render()).props.disabled, true,
      'late callbacks from either previous mount cannot mark the current view as ready');
    shareButton(tree).props.onPress();
    assert.equal(screen.frames.length, 0);
    layOutAll(tree);
    assert.equal(shareButton(screen.render()).props.disabled, false);
    intermediateLayout(); originalLayout();
    assert.equal(shareButton(screen.render()).props.disabled, false,
      'late callbacks cannot erase the current view readiness after its layout completed');
  }
});


test('sharing waits for every page layout, including out-of-order and duplicate callbacks', () => {
  const screen = harness('TripShareSheet', socialState(), { trip: shareTrip(), onClose() {} });
  const tree = screen.render();
  const pages = captures(tree);
  assert.equal(pages.length, 3);
  pages[2].props.onLayout(); pages[0].props.onLayout(); pages[0].props.onLayout();
  assert.equal(shareButton(screen.render()).props.disabled, true, 'two distinct ready pages are not three');
  pages[1].props.onLayout();
  assert.equal(shareButton(screen.render()).props.disabled, false);
});

test('title hydration blocks sharing, retry preserves every page, and a changed title needs fresh layout', async () => {
  const preferences = { title: '', initialized: false, error: 'read-failed', initialize: async () => {} };
  const screen = harness('TripShareSheet', socialState(), { trip: shareTrip(), onClose() {} }, undefined, preferences);
  const initial = screen.render(); layOutAll(initial);
  assert.equal(shareButton(screen.render()).props.disabled, true);
  assert.match(textOf(screen.render()), /social.cardTitleLoadFailed/);
  preferences.initialize = async () => { preferences.title = '나의 여행'; preferences.initialized = true; preferences.error = null; };
  byText(screen.render(), 'planner.retry').props.onPress(); await tick();
  const loaded = screen.render();
  assert.equal(shareButton(loaded).props.disabled, true);
  assert.ok(nodes(loaded).filter(node => node?.type === 'TripShareCard').every(node => node.props.title === '나의 여행'));
  layOutAll(initial);
  assert.equal(shareButton(screen.render()).props.disabled, true, 'old default-title layouts cannot enable nickname capture');
  layOutAll(loaded);
  assert.equal(shareButton(screen.render()).props.disabled, false);
});

test('failed batch sharing re-enables retry without closing the preview', async () => {
  let closed = 0;
  const screen = harness('TripShareSheet', socialState(), { trip: shareTrip(), onClose() { closed++; } }, async () => { throw new Error('capture failed'); });
  layOutAll(screen.render());
  shareButton(screen.render()).props.onPress();
  await screen.frame(); await screen.frame(); await tick();
  const tree = screen.render();
  assert.equal(shareButton(tree).props.disabled, false);
  assert.match(textOf(tree), /shareError/);
  assert.equal(closed, 0);
});

const PRESETS = [
  { destination: 'Instagram', format: 'instagram-feed', label: 'social.post', canvas: [360, 480], output: [1080, 1440], ratio: '3:4', pages: 3 },
  { destination: 'Instagram', format: 'instagram-story', label: 'social.storyPlacement', canvas: [360, 640], output: [1080, 1920], ratio: '9:16', pages: 2 },
  { destination: 'X', format: 'x-post', label: 'social.post', canvas: [400, 400], output: [1200, 1200], ratio: '1:1', pages: 4 },
  { destination: 'Facebook', format: 'facebook-feed', label: 'social.post', canvas: [360, 450], output: [1440, 1800], ratio: '4:5', pages: 3 },
  { destination: 'Facebook', format: 'facebook-story', label: 'social.storyPlacement', canvas: [360, 640], output: [1080, 1920], ratio: '9:16', pages: 2 },
  { destination: 'TikTok', format: 'tiktok-photo', label: 'social.photoPost', canvas: [360, 640], output: [1080, 1920], ratio: '9:16', pages: 2 },
];

test('social preset mapping provides the supported placements and preserves advisory post limits', () => {
  const mapping = loadTs('src/utils/socialSharePresets.ts');
  assert.deepEqual(JSON.parse(JSON.stringify(mapping.SOCIAL_SHARE_FORMATS)), {
    instagram: ['instagram-feed', 'instagram-story'], x: ['x-post'],
    facebook: ['facebook-feed', 'facebook-story'], tiktok: ['tiktok-photo'],
  });
  assert.equal(Object.keys(mapping.SOCIAL_SHARE_PRESET_DETAILS).length, PRESETS.length);
  for (const preset of PRESETS) {
    assert.equal(mapping.SOCIAL_SHARE_PRESET_DETAILS[preset.format].label, preset.label);
    assert.equal(mapping.SOCIAL_SHARE_PRESET_DETAILS[preset.format].ratio, preset.ratio);
  }
  assert.deepEqual(JSON.parse(JSON.stringify(mapping.SOCIAL_POST_IMAGE_LIMITS)), { x: 4, tiktok: 35 });
});

for (const preset of PRESETS) {
  test(`${preset.format} is available without a profile, hides technical size labels, and shares every page from preview page two`, async () => {
    const calls = [];
    const screen = harness('TripShareSheet', socialState(), { trip: shareTrip(), onClose() {} },
      async (...args) => { calls.push(args); return 'opened'; });
    let tree = screen.render();
    for (const destination of ['Instagram', 'X', 'Facebook', 'TikTok']) {
      assert.equal(byLabel(tree, destination).props.disabled, false, `${destination} size selection does not require an account`);
    }
    byLabel(tree, preset.destination).props.onPress();
    tree = screen.render();
    if (preset.format.endsWith('-story')) {
      byText(tree, 'social.storyPlacement').props.onPress();
      tree = screen.render();
    }
    assert.equal(byLabel(tree, preset.destination).props.accessibilityState.selected, true);
    assert.equal(byText(tree, 'social.noProfile').props.accessibilityState.selected, true);
    assert.ok(cards(tree).every(card => card.props.profile === undefined));
    assert.ok(cards(tree).every(card => card.props.format === preset.format));
    assert.equal(captures(tree).length, preset.pages);
    assert.equal(preview(tree).props.pageIndex, 0);
    const sizeLabel = `${preset.destination} · ${preset.label} · ${preset.output[0]} × ${preset.output[1]} px · ${preset.ratio}`;
    assert.equal(find(tree, node => node.type === 'Text' && textOf(node) === sizeLabel), undefined, 'technical output dimensions are omitted from the creation screen');
    for (const capture of captures(tree)) {
      assert.equal(capture.props.style.width, preset.canvas[0]);
      assert.equal(capture.props.style.height, preset.canvas[1]);
    }
    assert.match(textOf(tree), new RegExp(`social.page:1/${preset.pages}`));
    assert.equal(shareButton(tree).props.disabled, true);
    layOutAll(tree);
    byLabel(screen.render(), 'social.nextCard').props.onPress();
    tree = screen.render();
    assert.equal(preview(tree).props.pageIndex, 1);
    assert.equal(shareButton(tree).props.disabled, true);
    assert.deepEqual(captures(tree).map(capture => cards(capture)[0].props.pageIndex),
      Array.from({ length: preset.pages }, (_, index) => index));
    layOutAll(tree);
    shareButton(screen.render()).props.onPress();
    await screen.frame(); await screen.frame();
    assert.equal(calls.length, 1);
    assert.deepEqual(calls[0].slice(1), ['share', preset.format]);
    assert.equal(calls[0][0].length, preset.pages, 'preview navigation must never select only one page for export');
    for (const [index, ref] of calls[0][0].entries()) {
      assert.ok(ref.current.key.includes(`:${preset.format}:`));
      assert.ok(ref.current.key.endsWith(`:${index}`));
    }
  });
}

test('changing SNS resets the preview to page one and waits for all new layouts', () => {
  const screen = harness('TripShareSheet', socialState(), { trip: shareTrip(), onClose() {} });
  let tree = screen.render();
  layOutAll(tree);
  for (const [destination, format, pageCount] of [
    ['X', 'x-post', 4], ['Facebook', 'facebook-feed', 3],
    ['TikTok', 'tiktok-photo', 2], ['Instagram', 'instagram-feed', 3],
  ]) {
    byLabel(screen.render(), 'social.nextCard').props.onPress();
    const previous = screen.render();
    layOutAll(previous);
    assert.equal(preview(previous).props.pageIndex, 1);
    byLabel(screen.render(), destination).props.onPress();
    tree = screen.render();
    assert.equal(preview(tree).props.pageIndex, 0);
    assert.equal(preview(tree).props.format, format);
    const pendingPages = captures(tree);
    assert.equal(pendingPages.length, pageCount);
    assert.notEqual(pendingPages[0].props.ref, captures(previous)[0].props.ref);
    layOutAll(previous);
    assert.equal(shareButton(screen.render()).props.disabled, true, 'old SNS callbacks cannot acknowledge the new batch');
    pendingPages.slice(0, -1).forEach(page => page.props.onLayout());
    assert.equal(shareButton(screen.render()).props.disabled, true, 'every distinct new page must finish layout');
    pendingPages.at(-1).props.onLayout();
    assert.equal(shareButton(screen.render()).props.disabled, false);
  }
});

test('Instagram and Facebook stories use distinct capture generations despite identical dimensions', async () => {
  const calls = [];
  const screen = harness('TripShareSheet', socialState(), { trip: shareTrip(), onClose() {} },
    async (...args) => { calls.push(args); return 'opened'; });
  byText(screen.render(), 'social.storyPlacement').props.onPress();
  let previous = screen.render();
  layOutAll(previous);
  const initialKey = captures(previous)[0].props.key;
  for (const [destination, format] of [['Facebook', 'facebook-story'], ['Instagram', 'instagram-story']]) {
    byLabel(screen.render(), destination).props.onPress();
    const intermediateFeed = screen.render();
    byText(intermediateFeed, 'social.storyPlacement').props.onPress();
    const current = screen.render();
    assert.notEqual(captures(current)[0].props.key, captures(previous)[0].props.key);
    assert.notEqual(captures(current)[0].props.key, initialKey, 'round trip to the same format must remount and re-acknowledge');
    assert.ok(captures(current).every(page => page.props.style.width === 360 && page.props.style.height === 640));
    assert.ok(cards(current).every(card => card.props.format === format));
    layOutAll(previous); layOutAll(intermediateFeed);
    assert.equal(shareButton(screen.render()).props.disabled, true);
    layOutAll(current);
    shareButton(screen.render()).props.onPress();
    await screen.frame(); await screen.frame();
    assert.equal(calls.at(-1)[2], format);
    assert.equal(calls.at(-1)[0].length, 2);
    previous = current;
  }
});

test('X explains its four-image posting limit without truncating an oversized capture batch', async () => {
  for (const [stopCount, pageCount] of [[8, 4], [9, 5]]) {
    const calls = [];
    const screen = harness('TripShareSheet', socialState(), { trip: shareTrip(stopCount), onClose() {} },
      async (...args) => { calls.push(args); return 'opened'; });
    byLabel(screen.render(), 'X').props.onPress();
    const tree = screen.render();
    const limitNotice = find(tree, node => node.props.accessibilityRole === 'alert' && textOf(node).startsWith('social.postImageLimit'));
    assert.equal(!!limitNotice, pageCount > 4);
    if (limitNotice) assert.equal(textOf(limitNotice), 'social.postImageLimit:X:5/4');
    assert.equal(captures(tree).length, pageCount);
    layOutAll(tree);
    shareButton(screen.render()).props.onPress();
    await screen.frame(); await screen.frame();
    assert.equal(calls[0][0].length, pageCount, 'the warning must not silently remove route cards');
    assert.equal(calls[0][2], 'x-post');
  }
});

test('signature profile selection and SNS output preset remain independent', () => {
  const xProfile = { platform: 'x', handle: 'route_notes', url: 'https://x.com/route_notes' };
  const screen = harness('TripShareSheet', socialState({ profiles: { instagram: profile, x: xProfile } }),
    { trip: shareTrip(), onClose() {} });
  byText(screen.render(), 'Instagram · @trip_notes').props.onPress();
  let tree = screen.render();
  assert.ok(cards(tree).every(card => card.props.profile === profile && card.props.format === 'instagram-feed'));
  byLabel(tree, 'TikTok').props.onPress();
  tree = screen.render();
  assert.ok(cards(tree).every(card => card.props.profile === profile && card.props.format === 'tiktok-photo'));
  layOutAll(tree);
  byText(screen.render(), 'X · @route_notes').props.onPress();
  tree = screen.render();
  assert.ok(cards(tree).every(card => card.props.profile === xProfile && card.props.format === 'tiktok-photo'));
  assert.equal(byLabel(tree, 'TikTok').props.accessibilityState.selected, true);
  assert.equal(captures(tree).length, 2);
  assert.equal(shareButton(tree).props.disabled, true, 'changing a signature requires fresh card layout');
  assert.doesNotMatch(textOf(tree), /1080 × 1920 px/);
  byLabel(tree, 'Facebook').props.onPress();
  tree = screen.render();
  assert.ok(cards(tree).every(card => card.props.profile === xProfile && card.props.format === 'facebook-feed'));
  byText(tree, 'social.noProfile').props.onPress();
  tree = screen.render();
  assert.ok(cards(tree).every(card => card.props.profile === undefined && card.props.format === 'facebook-feed'));
  assert.equal(byLabel(tree, 'Facebook').props.accessibilityState.selected, true);
  assert.equal(captures(tree).length, 3);
  assert.doesNotMatch(textOf(tree), /1440 × 1800 px/);
});
