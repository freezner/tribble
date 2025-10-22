# Tribble 🗺️⏱️

여행 시간을 계획하는 똑똑한 타이머 앱입니다. 장소들을 순서대로 추가하면, 제한된 시간 안에 다 돌 수 있는지 즉시 확인할 수 있습니다.

## 📱 주요 기능

- **장소 검색** - Google Places API 자동완성
- **이동 시간 자동 계산** - 교통 수단별 (자동차/도보/대중교통/자전거)
- **실시간 시간 관리** - 체류 + 이동 = 총 소요 시간
- **직관적인 요약** - 듀오링고 스타일 UI
- **여정 저장/관리** - 로컬 저장소
- **이미지 공유** - 카카오톡, 메시지로 공유

## 🛠️ 기술 스택

- React Native + Expo (SDK 51)
- TypeScript
- Zustand (상태 관리)
- AsyncStorage (로컬 저장)
- Google Maps Platform API
- axios, zod, dayjs
- iOS 14.0+ (배포 타겟)
- Xcode 16+ (iOS 18 SDK 지원)

---

## 🚀 빠른 시작

### 1. 패키지 설치

```bash
cd timefit-trip
npm install --legacy-peer-deps
```

### 2. Google API 키 설정

`src/constants/index.ts` 파일에서:

```typescript
export const GOOGLE_API_KEY = 'YOUR_API_KEY_HERE';
```

**Google Cloud Console에서 다음 API 활성화 필요:**
- Places API
- Distance Matrix API
- Directions API

👉 [Google Cloud Console](https://console.cloud.google.com)

### 3. 앱 실행

```bash
npm start
```

- **i**: iOS 시뮬레이터
- **a**: Android 에뮬레이터
- **w**: 웹 브라우저

---

## 📁 프로젝트 구조

```
timefit-trip/
├── src/
│   ├── components/          # UI 컴포넌트
│   │   ├── PlaceCard.tsx           # 장소 카드
│   │   ├── PlaceSearchInput.tsx    # 장소 검색
│   │   ├── TripSummaryCard.tsx     # 요약 카드
│   │   ├── TravelBadge.tsx         # 이동 정보 뱃지
│   │   ├── TransportModePicker.tsx # 교통수단 선택
│   │   ├── TripNameDialog.tsx      # 여정 이름 입력
│   │   └── TripShareCard.tsx       # 공유용 카드
│   ├── screens/             # 화면
│   │   ├── TripPlannerScreen.tsx   # 여정 편집
│   │   └── SavedTripsScreen.tsx    # 저장된 목록
│   ├── stores/              # 상태 관리
│   │   └── tripStore.ts            # Zustand 스토어
│   ├── services/            # API
│   │   └── googleApi.ts            # Google Maps API
│   ├── utils/               # 유틸리티
│   │   ├── timeCalculator.ts       # 시간 계산
│   │   ├── storage.ts              # AsyncStorage
│   │   └── shareTrip.ts            # 이미지 공유
│   ├── types/               # TypeScript 타입
│   │   └── index.ts
│   └── constants/           # 상수
│       └── index.ts
├── App.tsx                  # 앱 진입점
├── app.json                 # Expo 설정
├── eas.json                 # EAS Build 설정
└── package.json
```

---

## 🔧 개발 가이드

### 로컬 개발

```bash
# 개발 서버 시작
npm start

# iOS 시뮬레이터
npm run ios

# Android 에뮬레이터
npm run android

# 캐시 정리
npx expo start --clear
```

### 주요 컴포넌트

#### TripStore (상태 관리)
```typescript
const {
  currentTrip,        // 현재 여정
  savedTrips,         // 저장된 여정들
  summary,            // 시간 요약
  addPlace,           // 장소 추가
  removePlace,        // 장소 삭제
  recalculateTravelTimes, // 이동 시간 재계산
} = useTripStore();
```

#### 이동 시간 계산
- Google Distance Matrix API 우선 사용
- API 실패 시 직선 거리 기반 추정 (Haversine formula)
- 교통 수단별 속도: 자동차(25km/h), 도보(4.5km/h), 대중교통(20km/h), 자전거(15km/h)

---

## 🐛 문제 해결

### npm 설치 오류

**증상**: `EACCES: permission denied`

**해결:**
```bash
sudo chown -R $(whoami) ~/.npm
npm cache clean --force
npm install --legacy-peer-deps
```

### "too many open files" 오류

**해결:**
```bash
# Watchman 설치
brew install watchman
```

### Google API 오류

**증상**: `REQUEST_DENIED`

**해결:**
1. Google Cloud Console에서 API 활성화
   - Places API
   - Distance Matrix API
   - Directions API
2. 청구 계정 연결 (매달 $200 무료)
3. API 키를 `src/constants/index.ts`에 입력

### 이동 시간 미계산

**원인**: API가 ZERO_RESULTS 반환

**자동 해결**: 직선 거리 기반 추정값으로 폴백됨

**로그 확인:**
```
⚠️ API ZERO_RESULTS, walking 모드로 직선 거리 추정 사용
⚠️ 추정 계산 (walking): 직선거리 2000m → 실제거리 2400m, 속도 4.5km/h → 32분
```

### iOS SDK 버전 오류

**증상**: `SDK version issue. This app was built with the iOS 17.5 SDK`

**해결:**
1. **Xcode 업데이트**: Xcode 16 이상 필요
2. **배포 타겟 설정**: iOS 14.0 이상
3. **CocoaPods 재설치**:
   ```bash
   cd ios
   rm -rf Pods Podfile.lock
   pod install
   ```
4. **EAS 빌드 설정 업데이트**:
   ```json
   {
     "ios": {
       "xcodeVersion": "16.0",
       "image": "latest"
     }
   }
   ```

**Apple 요구사항**: 2025년 4월 24일부터 iOS 18 SDK 필수
👉 [Expo 공식 안내](https://expo.dev/blog/apple-sdk-minimum-requirements)

---

## 📱 아이폰 설치

### Expo Go 사용 (가장 쉬움)

1. App Store에서 **Expo Go** 설치
2. 터미널: `npm start`
3. 아이폰 카메라로 QR 코드 스캔

### 다른 네트워크에서

```bash
npx expo start --tunnel
```

---

## 🚀 App Store 배포

### 1. Bundle ID 설정

`app.json` 파일에서:
```json
"bundleIdentifier": "com.yourname.tribble"
```

### 2. iOS SDK 요구사항 확인

**중요**: Apple은 2025년 4월 24일부터 iOS 18 SDK 필수 요구
👉 [Expo 공식 안내](https://expo.dev/blog/apple-sdk-minimum-requirements)

- **Xcode**: 16.0+ 설치 필요
- **iOS 배포 타겟**: 14.0+ 설정
- **빌드 환경**: iOS 18 SDK 사용

### 3. EAS 빌드

```bash
# EAS CLI 설치
npm install -g eas-cli

# 로그인
eas login

# 프로젝트 설정
eas build:configure

# iOS 빌드 (캐시 클리어 권장)
eas build --platform ios --profile production --clear-cache
```

**소요 시간**: 20-30분

### 4. App Store Connect 설정

1. [App Store Connect](https://appstoreconnect.apple.com) 접속
2. 새 앱 만들기
3. App ID 확인 (10자리 숫자)
4. `eas.json`에서 `ascAppId` 수정
5. 제출:
   ```bash
   eas submit --platform ios --latest
   ```

### 5. 스크린샷 및 정보 입력

- 스크린샷: 최소 3개 (1290 x 2796)
- 설명, 키워드 입력
- 연령 등급 설정 (4+)

### 6. 심사 제출

- **"심사를 위해 제출"** 클릭
- 심사 기간: 1-3일

---

## 🔑 환경 변수

### Google API 키

**필수**: Google Cloud Console에서 발급
- Places API
- Distance Matrix API  
- Directions API

**설정 위치**: `src/constants/index.ts`

**청구 계정**: 연결 필수 (매달 $200 무료 크레딧)

---

## 🎨 UI 디자인

### 듀오링고 스타일

```typescript
export const DUOLINGO_COLORS = {
  green: '#58CC02',      // 성공, 저장
  red: '#FF4B4B',        // 시간 초과, 삭제
  blue: '#1CB0F6',       // 액션, 강조
  gray: '#777777',       // 텍스트
  lightGray: '#E5E5E5',  // 배경
};
```

### 컴포넌트 구성

- **PlaceCard**: 장소 정보 (이름, 주소, 체류 시간)
- **TravelBadge**: 카드 사이 이동 정보 (교통수단, 시간, 거리)
- **TripSummaryCard**: 총 소요 vs 가능 시간 비교

---

## 📤 공유 기능

### 이미지 캡처 및 공유

```typescript
import { shareTripAsImage } from '../utils/shareTrip';

// 여정을 이미지로 공유
await shareTripAsImage(viewRef, tripName);
```

**공유 가능 앱**: 카카오톡, 메시지, 이메일, SNS 등

**이미지 내용**:
- 여정 이름 및 요약
- 전체 장소 목록
- 이동 수단 및 시간
- 워터마크

---

## 🧪 테스트

### 기본 테스트 흐름

1. **장소 검색**: "경복궁" 입력
2. **장소 선택**: 자동완성 결과 클릭
3. **두 번째 장소**: "인사동" 추가 → 이동 수단 선택 (🚶 도보)
4. **이동 시간 확인**: 자동 계산 (15분 · 1.2km)
5. **요약 확인**: 총 소요 시간 vs 가능 시간
6. **저장**: 여정 이름 입력 후 저장
7. **공유**: 📤 버튼으로 이미지 공유

### 콘솔 로그 확인

```
✅ Google Places API 응답: {"status": "OK"}
✅ 장소 추가: 경복궁
✅ 이동 시간 계산 시작: 2개 장소
✅ Distance Matrix API 호출
⚠️ API ZERO_RESULTS, walking 모드로 직선 거리 추정
✅ 계산 완료: 15분, 1200m
```

---

## 📊 데이터 구조

### Trip (여정)

```typescript
interface Trip {
  id: string;
  name: string;
  places: PlaceWithDuration[];
  totalAvailableTime: number;  // 가용 시간 (분)
  transportMode: TransportMode; // 기본 교통수단
  createdAt: Date;
  updatedAt: Date;
}
```

### PlaceWithDuration (장소)

```typescript
interface PlaceWithDuration {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  placeId?: string;
  stayDuration: number;           // 체류 시간
  travelTimeToNext?: number;      // 다음 장소까지 이동 시간
  travelDistance?: number;        // 다음 장소까지 거리
  transportModeToNext?: TransportMode; // 다음 장소까지 교통수단
}
```

---

## 🔄 업데이트 배포

### 버전 증가

`app.json` 수정:
```json
{
  "version": "1.0.0" → "1.1.0",
  "ios": {
    "buildNumber": "1" → "2"
  }
}
```

### 새 빌드 및 제출

```bash
# 빌드
eas build --platform ios --profile production

# 제출
eas submit --platform ios --latest
```

---

## 💡 개발 팁

### 빠른 개발

```bash
# Hot Reload 활성화 (Expo Go)
npm start

# 코드 변경 → 자동 새로고침
```

### 디버깅

```bash
# 상세 로그 확인
npx expo start --dev-client

# React DevTools
npx expo start --devtools
```

### 성능 최적화

- 이동 시간 계산은 비동기로 처리
- 장소 추가/삭제 시 자동 재계산
- AsyncStorage로 빠른 로컬 저장

---

## 📚 주요 파일 설명

### `src/stores/tripStore.ts`
- Zustand 기반 전역 상태 관리
- 장소 추가/삭제/수정
- 이동 시간 계산 로직
- 저장/불러오기

### `src/services/googleApi.ts`
- Google Places Autocomplete
- Distance Matrix (이동 시간 계산)
- Directions (경로 정보)
- 폴백 로직 (직선 거리 추정)

### `src/utils/timeCalculator.ts`
- 여정 요약 계산
- 시간 포맷팅
- 직선 거리 계산 (Haversine)

### `src/components/TravelBadge.tsx`
- 카드 사이 이동 정보 표시
- 교통 수단 아이콘 + 시간 + 거리
- 터치하여 교통수단 변경

---

## 🌐 Google API 설정

### 필수 API

1. **Places API** - 장소 검색
2. **Distance Matrix API** - 이동 시간 계산
3. **Directions API** - 경로 정보

### 설정 방법

1. [Google Cloud Console](https://console.cloud.google.com) 접속
2. 프로젝트 생성
3. "API 및 서비스" → "라이브러리"
4. 위 3개 API 검색하여 "사용 설정"
5. "사용자 인증 정보" → API 키 생성
6. **청구 계정 연결** (필수!)
7. API 키를 `src/constants/index.ts`에 입력

**무료 크레딧**: 매달 $200 (일반 사용은 무료)

---

## 🐛 디버깅 가이드

### 장소 검색 안 됨

**확인사항:**
1. Google API 키 설정 확인
2. Places API 활성화 확인
3. 청구 계정 연결 확인
4. 콘솔 로그 확인: `Google Places API 응답`

### 이동 시간 미계산

**자동 폴백**: API 실패 시 직선 거리로 추정

**콘솔 로그:**
```
⚠️ 추정 계산 (walking): 직선거리 2000m → 실제거리 2400m
```

**정확도 개선:**
- Distance Matrix API 활성화
- API 키 권한 확인

### 저장 안 됨

**확인:**
1. 장소 1개 이상 추가
2. 여정 이름 입력
3. AsyncStorage 오류 로그 확인

---

## 📤 배포 명령어 모음

### 개발

```bash
# Expo Go로 테스트
npm start

# iOS 시뮬레이터
npm run ios
```

### 빌드

```bash
# iOS Production 빌드
eas build --platform ios --profile production

# 캐시 없이 빌드
eas build --platform ios --clear-cache

# 빌드 상태 확인
eas build:list
```

### 제출

```bash
# App Store 제출
eas submit --platform ios --latest

# 특정 빌드 제출
eas submit --platform ios --id BUILD_ID
```

### 업데이트

```bash
# 1. app.json에서 version 증가
# 2. 빌드
eas build --platform ios

# 3. 제출
eas submit --platform ios --latest
```

---

## ⚙️ 환경 설정

### 필수 도구

- **Node.js**: v18+
- **npm**: v9+
- **Watchman**: `brew install watchman`
- **Expo CLI**: `npm install -g expo-cli`
- **EAS CLI**: `npm install -g eas-cli`

### iOS 개발 도구

- **Xcode**: 16.0+ (iOS 18 SDK 포함)
- **macOS**: Sequoia 15.4.1+ (Xcode 16 요구사항)
- **iOS 배포 타겟**: 14.0+
- **CocoaPods**: 최신 버전

### Android 개발 도구

- **Android Studio**: 최신 버전
- **Android SDK**: API 33+

---

## 🔐 보안

### API 키 관리

⚠️ **주의**: Google API 키를 Git에 커밋하지 마세요!

**프로덕션 환경:**
- 환경 변수 사용 권장
- API 키 제한 설정 (iOS Bundle ID)

### 데이터 저장

- **로컬 전용**: AsyncStorage 사용
- **서버 전송 없음**: 모든 데이터는 기기에만 저장
- **개인정보 미수집**: 계정 시스템 없음

---

## 📈 성능

### 최적화된 부분

- **비동기 계산**: 이동 시간 계산 중에도 UI 반응
- **로컬 저장**: 빠른 저장/불러오기
- **스마트 캐싱**: Google API 호출 최소화
- **폴백 시스템**: API 실패해도 추정치 제공

### 개선 여지

- 배치 API 호출 (다수 장소 동시 계산)
- 캐시된 이동 시간 재사용
- 이미지 캐싱

---

## 🎯 향후 개발 계획

- [ ] 드래그 앤 드롭으로 장소 순서 변경
- [ ] 지도에 경로 표시 (Polyline)
- [ ] 체류 시간 슬라이더
- [ ] 가용 시간 설정 UI
- [ ] 멀티데이 여행 지원
- [ ] 최적 경로 제안 (TSP)
- [ ] 계정 및 클라우드 동기화

---

## 📞 지원

### 문의

- GitHub Issues
- Expo 커뮤니티
- React Native Discord

### 참고 자료

- [Expo 문서](https://docs.expo.dev/)
- [React Native 문서](https://reactnative.dev/)
- [Google Maps Platform](https://developers.google.com/maps)
- [Zustand 문서](https://github.com/pmndrs/zustand)
- [Apple iOS 18 SDK 요구사항](https://expo.dev/blog/apple-sdk-minimum-requirements)

---

## 📄 라이선스

MIT License

---

## 🙏 감사

- Google Maps Platform (장소 검색 및 경로 계산)
- Expo (React Native 개발 환경)
- Duolingo (UI 디자인 영감)

---

**Happy Coding! 🎉**
