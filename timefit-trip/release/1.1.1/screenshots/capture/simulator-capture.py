#!/usr/bin/env python3
"""Simulator-only fixture/capture helper. Never targets an existing personal device.

The fixture contains user input and pending routes only. The unmodified App
obtains live route estimates after launch. Screenshots are direct simctl JPEGs;
this helper does not alter image pixels, resize, compose, or remove alpha.
"""
import argparse
import datetime
import hashlib
import json
import pathlib
import plistlib
import subprocess

HERE = pathlib.Path(__file__).resolve().parent
BUNDLE = 'com.tribble.tribbleapp'
PREFIX = 'Tribble Store39 '


def simctl(*args):
    return subprocess.check_output(['xcrun', 'simctl', *args], text=True).strip()


def device(udid):
    devices = json.loads(simctl('list', 'devices', 'available', '--json'))['devices']
    found = [d for group in devices.values() for d in group if d['udid'] == udid]
    if len(found) != 1 or not found[0]['name'].startswith(PREFIX):
        raise SystemExit('Refusing a device outside the dedicated Store39 capture set')
    return found[0]


def seed(udid):
    selected = device(udid)
    container = pathlib.Path(simctl('get_app_container', udid, BUNDLE, 'data'))
    storage = container / 'Library' / 'Application Support' / BUNDLE / 'RCTAsyncLocalStorage_V1'
    manifest_path = storage / 'manifest.json'
    if manifest_path.exists():
        raise SystemExit('Refusing to overwrite existing storage. Reinstall only on the dedicated capture device.')
    fixture = json.loads((HERE / 'public-input-fixture.json').read_text())
    assert all(leg['status'] == 'pending' and leg['duration'] is None and leg['distance'] is None
               for trip in fixture['drafts'] for leg in trip['legs'])
    values = {
        'tribble:library:v2': json.dumps(fixture, ensure_ascii=False, separators=(',', ':')),
        'user-language': 'ko',
        'tribble:card-preferences:v1': json.dumps({'version': 1, 'title': '오늘의 작은 여행'}, ensure_ascii=False),
        'tribble:social-profiles:v1': json.dumps({'version': 1, 'profiles': {}}),
    }
    storage.mkdir(parents=True, exist_ok=True)
    manifest = {}
    for key, value in values.items():
        if len(value.encode('utf-16-le')) // 2 <= 1024:
            manifest[key] = value
        else:
            (storage / hashlib.md5(key.encode()).hexdigest()).write_text(value)
            manifest[key] = None
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False))
    prefs_path = container / 'Library' / 'Preferences' / f'{BUNDLE}.plist'
    prefs_path.parent.mkdir(parents=True, exist_ok=True)
    prefs = plistlib.loads(prefs_path.read_bytes()) if prefs_path.exists() else {}
    prefs.update({'RCT_jsLocation': '127.0.0.1:8097', 'RCT_enableDev': False,
                  'RCT_enableMinification': True})
    prefs_path.write_bytes(plistlib.dumps(prefs))
    print(json.dumps({'seededDevice': selected['name'], 'udid': udid, 'realRouteCalculationRequired': True}))


def capture(udid, output):
    selected = device(udid)
    path = pathlib.Path(output).resolve()
    if path.suffix.lower() not in ['.jpg', '.jpeg'] or path.exists():
        raise SystemExit('Choose a new .jpg/.jpeg output; raw PNGs may include alpha')
    path.parent.mkdir(parents=True, exist_ok=True)
    simctl('io', udid, 'screenshot', '--type=jpeg', str(path))
    from PIL import Image
    with Image.open(path) as img:
        dimensions = list(img.size)
        mode = img.mode
    expected = [1206, 2622] if 'iPhone' in selected['name'] else [2064, 2752]
    if dimensions != expected or mode != 'RGB':
        raise SystemExit(f'Unexpected raw capture: {dimensions} {mode}; expected {expected} RGB')
    proof = {'capturedAt': datetime.datetime.now(datetime.timezone.utc).isoformat(),
             'deviceName': selected['name'], 'udid': udid, 'filename': path.name,
             'dimensions': dimensions, 'mode': mode,
             'sha256': hashlib.sha256(path.read_bytes()).hexdigest(),
             'method': 'xcrun simctl io screenshot --type=jpeg; no image editing'}
    path.with_suffix('.capture.json').write_text(json.dumps(proof, indent=2) + '\n')
    print(json.dumps(proof))


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest='command', required=True)
    p = sub.add_parser('seed'); p.add_argument('udid')
    p = sub.add_parser('capture'); p.add_argument('udid'); p.add_argument('output')
    args = parser.parse_args()
    if args.command == 'seed': seed(args.udid)
    else: capture(args.udid, args.output)
