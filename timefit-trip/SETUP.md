# TimeFit Trip - 설치 및 설정 가이드 🚀

이 문서는 프로젝트를 처음 설정할 때 필요한 상세한 가이드입니다.

## 1. 사전 준비사항

### 필수 소프트웨어

- **Node.js**: v18 이상
- **npm** 또는 **yarn**: 패키지 매니저
- **Expo CLI**: (선택사항) `npm install -g expo-cli`

### 개발 환경 (선택사항)

- **iOS 개발**: macOS + Xcode
- **Android 개발**: Android Studio + Android SDK
- **모바일 테스트**: Expo Go 앱 (iOS/Android)

## 2. 프로젝트 설정

### 2.1. 저장소 클론

```bash
cd timefit-trip
```

### 2.2. npm 캐시 문제 해결 (macOS/Linux)

npm 설치 시 권한 오류가 발생하면:

```bash
# 방법 1: npm 캐시 디렉토리 소유권 변경
sudo chown -R $(whoami) ~/.npm

# 방법 2: npm 캐시 정리
npm cache clean --force
```

### 2.3. 패키지 설치

```bash
# npm 사용 (권장)
npm install --legacy-peer-deps

# 또는 yarn 사용
yarn install
```

> **중요**: npm을 사용하는 경우 반드시 `--legacy-peer-deps` 플래그를 사용해야 합니다.

## 3. Google Cloud API 설정

### 3.1. Google Cloud Console 접속

1. [Google Cloud Console](https://console.cloud.google.com) 접속
2. 새 프로젝트 생성 또는 기존 프로젝트 선택

### 3.2. API 활성화

다음 API들을 활성화하세요:

1. **Places API**
   - 장소 검색 및 자동완성에 사용
   
2. **Distance Matrix API**
   - 두 지점 간 이동 시간 및 거리 계산에 사용
   
3. **Directions API**
   - 경로 정보 및 폴리라인 생성에 사용

### 3.3. API 키 생성

1. `API 및 서비스` > `사용자 인증 정보`로 이동
2. `+ 사용자 인증 정보 만들기` > `API 키` 선택
3. 생성된 API 키 복사
4. (선택사항) API 키 제한 설정:
   - 애플리케이션 제한: iOS/Android 앱
   - API 제한: Places API, Distance Matrix API, Directions API만 허용

### 3.4. API 키 설정

**방법 1: constants 파일 직접 수정 (간단)**

`src/constants/index.ts` 파일을 열고 다음 부분을 수정:

```typescript
export const GOOGLE_API_KEY = 'YOUR_ACTUAL_API_KEY_HERE';
```

**방법 2: 환경 변수 사용 (권장)**

향후 expo-constants를 사용한 환경 변수 관리로 개선 예정

## 4. 프로젝트 실행

### 4.1. 개발 서버 시작

```bash
npm start
# 또는
expo start
```

### 4.2. 플랫폼별 실행

#### iOS (macOS만 가능)

```bash
npm run ios
```

또는 Expo Go 앱에서 QR 코드 스캔

#### Android

```bash
npm run android
```

또는 Expo Go 앱에서 QR 코드 스캔

#### 웹

```bash
npm run web
```

브라우저에서 http://localhost:19006 접속

## 5. 빌드 및 배포

### 5.1. EAS Build 설정 (Expo Application Services)

```bash
npm install -g eas-cli
eas login
eas build:configure
```

### 5.2. 앱 빌드

```bash
# Android APK
eas build --platform android

# iOS IPA
eas build --platform ios

# 둘 다
eas build --platform all
```

## 6. 문제 해결

### 6.1. 패키지 설치 실패

**증상**: `npm install` 시 EACCES 또는 EEXIST 오류

**해결**:
```bash
# 캐시 정리
npm cache clean --force

# 권한 수정
sudo chown -R $(whoami) ~/.npm

# 재설치
rm -rf node_modules package-lock.json
npm install
```

### 6.2. Metro Bundler 오류

**증상**: "Unable to resolve module"

**해결**:
```bash
# Metro 캐시 정리
npx expo start --clear
```

### 6.3. iOS 시뮬레이터 연결 실패

**증상**: 앱이 시뮬레이터에서 열리지 않음

**해결**:
```bash
# Xcode에서 시뮬레이터 재시작
open -a Simulator

# Expo 재시작
npx expo start --ios
```

### 6.4. Android 에뮬레이터 연결 실패

**증상**: "No devices/emulators found"

**해결**:
```bash
# Android Studio에서 에뮬레이터 시작
# 또는
~/Library/Android/sdk/emulator/emulator -avd Pixel_4_API_30

# adb 재시작
adb kill-server
adb start-server
```

### 6.5. Google API 오류

**증상**: 장소 검색이 작동하지 않음

**확인사항**:
1. API 키가 올바르게 설정되었는지 확인
2. Google Cloud Console에서 API가 활성화되었는지 확인
3. API 키 제한 설정이 앱과 일치하는지 확인
4. API 사용량 할당량 확인

## 7. 추가 리소스

- [Expo 문서](https://docs.expo.dev/)
- [React Native 문서](https://reactnative.dev/)
- [Google Maps Platform](https://developers.google.com/maps)
- [Zustand 문서](https://github.com/pmndrs/zustand)

## 8. 지원

문제가 계속되면:
1. GitHub Issues에 문제 등록
2. Expo 커뮤니티 포럼 참고
3. React Native 공식 Discord 참고

---

**Happy Coding! 🎉**

