const test = require('node:test');
const assert = require('node:assert/strict');
const { loadTs } = require('./helpers.cjs');
const { parseSocialProfile, SOCIAL_PLATFORMS, SOCIAL_PLATFORM_NAMES } = loadTs('src/utils/socialProfiles.ts');
const plain = value => JSON.parse(JSON.stringify(value));

test('each platform accepts a handle or @handle and creates a canonical HTTPS profile URL', () => {
  const expected = {
    instagram: ['Trip.Notes_1', 'https://www.instagram.com/Trip.Notes_1/'],
    x: ['Trip_Notes', 'https://x.com/Trip_Notes'],
    facebook: ['Trip.Notes', 'https://www.facebook.com/Trip.Notes'],
    tiktok: ['trip.notes_1', 'https://www.tiktok.com/@trip.notes_1'],
  };
  assert.deepEqual(Array.from(SOCIAL_PLATFORMS), ['instagram', 'x', 'facebook', 'tiktok']);
  assert.deepEqual(plain(SOCIAL_PLATFORM_NAMES), { instagram: 'Instagram', x: 'X', facebook: 'Facebook', tiktok: 'TikTok' });
  for (const [platform, [handle, url]] of Object.entries(expected)) {
    for (const input of [handle, `  @${handle}  `]) {
      assert.deepEqual(plain(parseSocialProfile(platform, input)), { platform, handle, url });
    }
  }
});

test('profile URLs normalize supported host aliases and discard tracking query/hash', () => {
  for (const [platform, url, handle, canonical] of [
    ['instagram', 'HTTPS://INSTAGRAM.COM/Trip_1/?igsh=tracking#bio', 'Trip_1', 'https://www.instagram.com/Trip_1/'],
    ['x', 'https://mobile.twitter.com/Trip_1?s=21', 'Trip_1', 'https://x.com/Trip_1'],
    ['x', 'https://www.x.com/Trip_1/', 'Trip_1', 'https://x.com/Trip_1'],
    ['facebook', 'https://m.facebook.com/Trip.Notes/?mibextid=tracking', 'Trip.Notes', 'https://www.facebook.com/Trip.Notes'],
    ['tiktok', 'https://www.tiktok.com/@Trip_1?_t=tracking#bio', 'Trip_1', 'https://www.tiktok.com/@Trip_1'],
    ['instagram', 'https://www.instagram.com/Trip%5F1/', 'Trip_1', 'https://www.instagram.com/Trip_1/'],
  ]) assert.deepEqual(plain(parseSocialProfile(platform, url)), { platform, handle, url: canonical });
});

test('Facebook numeric profile IDs round-trip without losing profile.php identity', () => {
  const expected = { platform: 'facebook', handle: '100012345678901', url: 'https://www.facebook.com/profile.php?id=100012345678901' };
  for (const input of ['https://www.facebook.com/profile.php?id=100012345678901&mibextid=tracking', expected.handle, '@' + expected.handle]) {
    const profile = parseSocialProfile('facebook', input);
    assert.deepEqual(plain(profile), expected);
    assert.deepEqual(plain(parseSocialProfile('facebook', profile.url)), expected);
  }
  for (const suffix of ['', '?id=', '?id=not-a-number', '?id=1&id=2', '?id=-1', '?id=1.2']) {
    assert.throws(() => parseSocialProfile('facebook', 'https://facebook.com/profile.php' + suffix), /invalid-social-profile/);
  }
});

test('foreign and lookalike hosts, userinfo, non-HTTPS schemes and custom ports are rejected', () => {
  for (const input of ['https://instagram.com.evil.example/alice', 'https://evilinstagram.com/alice',
    'https://instagram.com@evil.example/alice', 'https://evil.example@instagram.com/alice',
    'https://user:password@instagram.com/alice', 'https://instagram.com:8443/alice',
    'https://instagram.com./alice', 'https://instagrаm.com/alice', 'https://facebook.com/alice',
    'http://instagram.com/alice', 'javascript:alert(1)', 'data:text/html,bad', '//instagram.com/alice',
    'instagram.com/alice', 'https://instagram.com\\@evil.example/alice']) {
    assert.throws(() => parseSocialProfile('instagram', input), /invalid-social-profile/);
  }
});

test('posts, share/redirect links and non-profile paths cannot be registered as a profile', () => {
  for (const [platform, input] of [
    ['instagram', 'https://www.instagram.com/p/post-id/'], ['instagram', 'https://www.instagram.com/accounts/'],
    ['x', 'https://x.com/alice/status/123'], ['x', 'https://x.com/intent/tweet?url=https://evil.example'],
    ['facebook', 'https://www.facebook.com/share/abcdef'], ['facebook', 'https://www.facebook.com/login.php?next=https://evil.example'],
    ['tiktok', 'https://www.tiktok.com/@alice/video/123'], ['tiktok', 'https://www.tiktok.com/alice'],
    ['tiktok', 'https://vm.tiktok.com/shortlink/'], ['instagram', 'https://instagram.com/'],
  ]) assert.throws(() => parseSocialProfile(platform, input), /invalid-social-profile/);
});

test('empty, malformed, encoded separator and unsupported platform inputs fail safely', () => {
  for (const input of ['', ' ', '@', '@@alice', 'a b', 'a\nb', 'a\tb', 'a/b', 'a?b', '.', '..',
    'https://instagram.com/alice%2Fother', 'https://instagram.com/%ZZ', 'a'.repeat(2049), null, 42]) {
    assert.throws(() => parseSocialProfile('instagram', input), /invalid-social-profile/);
  }
  assert.throws(() => parseSocialProfile('unknown', 'alice'), /invalid-social-profile/);
});

test('existing short or official handles are not rejected by new-account registration rules', () => {
  for (const [platform, handle] of [['x', 'x'], ['x', 'NASA'], ['x', 'AdminSupport'], ['instagram', 'a'], ['facebook', 'fb'], ['tiktok', 'a']]) {
    const profile = parseSocialProfile(platform, handle);
    assert.equal(profile.handle, handle);
    assert.deepEqual(plain(parseSocialProfile(platform, profile.url)), plain(profile));
  }
});
