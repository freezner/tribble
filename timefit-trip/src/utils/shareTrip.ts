import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { Alert } from 'react-native';

/**
 * 여정을 이미지로 캡처하고 공유합니다
 */
export const shareTripAsImage = async (viewRef: any, tripName: string) => {
  try {
    console.log('여정 캡처 시작:', tripName);

    // View를 이미지로 캡처
    const uri = await captureRef(viewRef, {
      format: 'png',
      quality: 1,
      fileName: `${tripName}_${Date.now()}.png`,
    });

    console.log('캡처 완료:', uri);

    // 공유 가능 여부 확인
    const isAvailable = await Sharing.isAvailableAsync();
    if (!isAvailable) {
      Alert.alert('오류', '이 기기에서는 공유 기능을 사용할 수 없습니다.');
      return;
    }

    // 공유 실행
    await Sharing.shareAsync(uri, {
      mimeType: 'image/png',
      dialogTitle: `${tripName} 공유`,
      UTI: 'public.png',
    });

    console.log('공유 완료');
  } catch (error) {
    console.error('공유 실패:', error);
    Alert.alert('오류', '이미지 공유 중 문제가 발생했습니다.');
  }
};

