import { RefObject } from 'react';
import { PixelRatio, Platform, View } from 'react-native';
import { captureRef, releaseCapture } from 'react-native-view-shot';
import { SHARE_CARD_EXPORT_DIMENSIONS, TripShareFormat } from './tripShareLayout';

/** Opens the OS image share sheet. Its completion does not confirm a social post. */
export const shareTripAsImages = async (
  viewRefs: RefObject<View | null>[], tripName: string, format: TripShareFormat = 'feed',
): Promise<'opened' | 'unavailable'> => {
  if (Platform.OS !== 'ios' && Platform.OS !== 'android') return 'unavailable';
  if (!viewRefs.length || viewRefs.some(ref => !ref.current)) throw new Error('share-view-not-ready');
  // Load only on supported native platforms (the module requires a native build).
  const Share = require('react-native-share').default as typeof import('react-native-share').default;
  const dimensions = SHARE_CARD_EXPORT_DIMENSIONS[format];
  // view-shot 4 uses points on iOS and bitmap pixels on Android.
  const pixelRatio = Platform.OS === 'ios' ? PixelRatio.get() : 1;
  const uris: string[] = [];
  const batchId = Date.now();
  let shareStarted = false;
  try {
    // Capture sequentially to keep peak bitmap memory bounded and preserve page order.
    // Do not open the chooser if any page failed: a partial route is misleading.
    for (const [index, viewRef] of viewRefs.entries()) {
      uris.push(await captureRef(viewRef, {
        format: 'png', result: 'tmpfile', width: dimensions.width / pixelRatio,
        height: dimensions.height / pixelRatio,
        // Keep view-shot's cleanup prefix on Android as well as a page-specific name.
        fileName: `ReactNative-snapshot-image-tribble-${batchId}-${index + 1}`,
      }));
    }
    shareStarted = true;
    await Share.open({
      urls: uris, type: 'image/png', title: tripName,
      failOnCancel: false, useInternalStorage: true,
    });
    return 'opened';
  } finally {
    // iOS completes after dismissal. Android's chooser can return before the recipient
    // reads the file, so leave Android temp files to view-shot/cache cleanup.
    if (Platform.OS === 'ios' || !shareStarted) {
      for (const uri of uris) { try { releaseCapture(uri); } catch { /* best-effort temporary file cleanup */ } }
    }
  }
};

