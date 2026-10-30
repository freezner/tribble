const test = require('node:test');
const assert = require('node:assert/strict');
const { loadTs, deferred } = require('./helpers.cjs');

const EXPORT_PRESETS = [
  ['feed', 1080, 1350],
  ['story', 1080, 1920],
  ['instagram-feed', 1080, 1440],
  ['instagram-story', 1080, 1920],
  ['facebook-feed', 1440, 1800],
  ['facebook-story', 1080, 1920],
  ['x-post', 1200, 1200],
  ['tiktok-photo', 1080, 1920],
];

function sharingHarness(overrides = {}) {
  const calls = [];
  const uri = 'file:///tmp/tribble-card-1.png';
  let captureCount = 0;
  const viewRef = { current: { nativeView: true } };
  const { shareTripAsImages } = loadTs('src/utils/shareTrip.ts', {
    'react-native': { Platform: { OS: overrides.os ?? 'ios' }, PixelRatio: { get: () => overrides.pixelRatio ?? 3 } },
    'react-native-view-shot': {
      captureRef: async (ref, options) => {
        calls.push({ type: 'capture', ref, options });
        captureCount++;
        return overrides.capture ? overrides.capture(ref, options) : `file:///tmp/tribble-card-${captureCount}.png`;
      },
      releaseCapture: value => { calls.push({ type: 'release', uri: value }); overrides.release?.(value); },
    },
    'react-native-share': { default: {
      open: async options => {
        calls.push({ type: 'share', options });
        return overrides.share?.(options);
      },
    } },
  });
  return { shareTripAsImages, calls, uri, viewRef };
}

for (const pixelRatio of [2, 3]) for (const [format, width, height] of EXPORT_PRESETS) {
  test(`iOS ${pixelRatio}x ${format} targets a ${width}×${height} PNG and releases it after the share sheet dismisses`, async () => {
    const dismissal = deferred();
    const flow = sharingHarness({ pixelRatio, share: () => dismissal.promise });
    const result = flow.shareTripAsImages([flow.viewRef], '성수 여행', format);
    await new Promise(resolve => setImmediate(resolve));
    assert.deepEqual(flow.calls.map(call => call.type), ['capture', 'share']);
    const capture = flow.calls.find(call => call.type === 'capture');
    assert.equal(capture.ref, flow.viewRef);
    assert.equal(capture.options.format, 'png');
    assert.equal(capture.options.result, 'tmpfile');
    // view-shot v4's iOS context uses points and the screen scale, unlike Android pixels.
    assert.equal(capture.options.width, width / pixelRatio);
    assert.equal(capture.options.height, height / pixelRatio);
    assert.equal(capture.options.width * pixelRatio, width, 'native screen scale must not multiply the target PNG width');
    assert.equal(capture.options.height * pixelRatio, height, 'native screen scale must not multiply the target PNG height');
    assert.match(capture.options.fileName, /^ReactNative-snapshot-image-tribble-\d+-1$/);
    const sharing = flow.calls.find(call => call.type === 'share');
    assert.deepEqual(Array.from(sharing.options.urls), [flow.uri]);
    assert.equal(sharing.options.type, 'image/png');
    assert.equal(sharing.options.title, '성수 여행');
    assert.equal(sharing.options.failOnCancel, false);
    assert.equal(flow.calls.some(call => call.type === 'release'), false, 'recipient can still read while the sheet is open');
    dismissal.resolve();
    assert.equal(await result, 'opened');
    assert.deepEqual(flow.calls.map(call => call.type), ['capture', 'share', 'release']);
    assert.equal(flow.calls.at(-1).uri, flow.uri);
  });
}

test('native cancellation resolves as opened, never as a confirmed social post', async () => {
  // A dismissed OS sheet never confirms a post or its account.
  const flow = sharingHarness({ share: async () => ({ dismissedAction: true, success: false }) });
  const result = await flow.shareTripAsImages([flow.viewRef], 'cancelled');
  assert.equal(result, 'opened');
  assert.notEqual(result, 'posted');
  assert.notEqual(result, 'success');
  assert.equal(flow.calls.filter(call => call.type === 'release').length, 1);
});

test('web sharing does not capture or load a native share module', async () => {
  const web = sharingHarness({ os: 'web' });
  assert.equal(await web.shareTripAsImages([web.viewRef], 'web'), 'unavailable');
  assert.equal(web.calls.length, 0);
});

test('an empty batch or any unmounted page prevents every capture and share', async () => {
  const flow = sharingHarness();
  for (const refs of [[], [{ current: null }], [flow.viewRef, { current: null }]]) {
    await assert.rejects(flow.shareTripAsImages(refs, 'not ready'), /share-view-not-ready/);
  }
  assert.equal(flow.calls.length, 0);
});

test('capture failure is surfaced without opening sharing or releasing a nonexistent file', async () => {
  const failure = new Error('capture failed');
  const flow = sharingHarness({ capture: async () => { throw failure; } });
  await assert.rejects(flow.shareTripAsImages([flow.viewRef], 'failure'), error => error === failure);
  assert.deepEqual(flow.calls.map(call => call.type), ['capture']);
});

test('iOS sharing failure is surfaced after releasing the captured temporary file', async () => {
  const failure = new Error('share failed');
  const flow = sharingHarness({ share: async () => { throw failure; } });
  await assert.rejects(flow.shareTripAsImages([flow.viewRef], 'failure'), error => error === failure);
  assert.deepEqual(flow.calls.map(call => call.type), ['capture', 'share', 'release']);
  assert.equal(flow.calls.at(-1).uri, flow.uri);
});

test('best-effort iOS cleanup cannot turn a dismissed share sheet into a failure or mask the real share error', async () => {
  const release = () => { throw new Error('cleanup failed'); };
  const dismissed = sharingHarness({ release });
  assert.equal(await dismissed.shareTripAsImages([dismissed.viewRef], 'dismissed'), 'opened');
  const failure = new Error('original share failed');
  const failed = sharingHarness({ release, share: async () => { throw failure; } });
  await assert.rejects(failed.shareTripAsImages([failed.viewRef], 'failed'), error => error === failure);
});

for (const [format, width, height] of EXPORT_PRESETS) {
  test(`Android 3x ${format} preserves pixel dimensions and keeps the image available after chooser completion`, async () => {
    const flow = sharingHarness({ os: 'android', pixelRatio: 3 });
    assert.equal(await flow.shareTripAsImages([flow.viewRef], 'Android trip', format), 'opened');
    await new Promise(resolve => setImmediate(resolve));
    assert.deepEqual(flow.calls.map(call => call.type), ['capture', 'share']);
    const shared = flow.calls.at(-1);
    assert.deepEqual(Array.from(shared.options.urls), [flow.uri]);
    assert.equal(shared.options.type, 'image/png');
    assert.equal(shared.options.useInternalStorage, true);
    const { options } = flow.calls.find(call => call.type === 'capture');
    assert.equal(options.width, width, 'Android capture width is already in pixels');
    assert.equal(options.height, height, 'Android capture height is already in pixels');
  });
}

for (const os of ['ios', 'android']) {
  for (const [format, width, height] of EXPORT_PRESETS) {
    test(`${os} shares every ${format} page at ${width}×${height}, in route order, and waits for dismissal`, async () => {
      const dismissal = deferred();
      const flow = sharingHarness({ os, share: () => dismissal.promise });
      const views = [1, 2, 3].map(page => ({ current: { page } }));
      const result = flow.shareTripAsImages(views, 'all pages', format);
      await new Promise(resolve => setImmediate(resolve));
      assert.deepEqual(flow.calls.map(call => call.type), ['capture', 'capture', 'capture', 'share']);
      const captures = flow.calls.filter(call => call.type === 'capture');
      assert.deepEqual(captures.map(call => call.ref), views);
      for (const [index, capture] of captures.entries()) {
        const nativeScale = os === 'ios' ? 3 : 1;
        assert.equal(capture.options.width * nativeScale, width, 'every page uses the selected preset width');
        assert.equal(capture.options.height * nativeScale, height, 'every page uses the selected preset height');
        assert.match(capture.options.fileName, new RegExp(`^ReactNative-snapshot-image-tribble-\\d+-${index + 1}$`));
      }
      const share = flow.calls.find(call => call.type === 'share');
      assert.deepEqual(Array.from(share.options.urls), [1, 2, 3].map(index => `file:///tmp/tribble-card-${index}.png`));
      assert.equal(flow.calls.filter(call => call.type === 'release').length, 0);
      dismissal.resolve({ success: true });
      assert.equal(await result, 'opened');
      assert.equal(flow.calls.filter(call => call.type === 'release').length, os === 'ios' ? 3 : 0);
    });
  }

  test(`${os} a failed later page never opens a partial share and cleans earlier captures`, async () => {
    let count = 0;
    const flow = sharingHarness({ os, capture: async () => {
      if (++count === 2) throw new Error('page two failed');
      return 'file:///tmp/first.png';
    } });
    await assert.rejects(flow.shareTripAsImages([flow.viewRef, flow.viewRef], 'failed batch'), /page two failed/);
    assert.deepEqual(flow.calls.map(call => call.type), ['capture', 'capture', 'release']);
    assert.equal(flow.calls.at(-1).uri, 'file:///tmp/first.png');
  });
}
