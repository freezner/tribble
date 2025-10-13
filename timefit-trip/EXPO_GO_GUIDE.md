# Expo Go 실행 가이드 📱

이 프로젝트는 **Expo Go**에서 바로 실행 가능하도록 설정되었습니다!

## ✅ 변경 사항

### AsyncStorage 사용
- ❌ ~~react-native-mmkv~~ (네이티브 모듈, Expo Go 불가)
- ✅ **@react-native-async-storage/async-storage** (Expo Go 호환)

로컬 저장소 기능은 AsyncStorage를 사용하여 동일하게 작동합니다.

## 🚀 실행 방법

### 1. 터미널에서 실행
```bash
npm start
```

### 2. Expo Go 앱에서 실행

#### iOS
- App Store에서 "Expo Go" 설치
- 카메라로 QR 코드 스캔

#### Android  
- Google Play에서 "Expo Go" 설치
- Expo Go 앱에서 QR 코드 스캔

### 3. 시뮬레이터/에뮬레이터 실행

터미널에서 다음 키를 누르세요:
- **i** - iOS 시뮬레이터 (macOS만)
- **a** - Android 에뮬레이터
- **w** - 웹 브라우저

## 📝 참고 사항

### Expo Go에서 사용 불가능한 기능
- react-native-mmkv (네이티브 저장소)
- 기타 네이티브 모듈

### Development Build가 필요한 경우
다음 기능이 필요하면 Development Build를 사용하세요:

```bash
# EAS Build 설정
npx eas-cli login
npx eas build:configure

# Development Build 생성
npx eas build --profile development --platform ios
npx eas build --profile development --platform android
```

## 🎯 MVP 기능 (모두 Expo Go 지원)

- ✅ 장소 검색 (Google Places API)
- ✅ 이동 시간 계산 (Distance Matrix API)
- ✅ 여정 저장/불러오기 (AsyncStorage)
- ✅ 시간 계산 및 요약
- ✅ 장소 추가/삭제

모든 핵심 기능이 Expo Go에서 정상 작동합니다! 🎉

