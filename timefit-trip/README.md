# TimeFit Trip 🗺️⏱️

듀오링고처럼 가벼운 여행 일정 타이머 앱입니다. 장소들을 순서대로 넣었을 때, 제한된 시간 안에 다 돌 수 있는지 즉시 판단하고, 중간 장소 제거 시 즉시 재계산합니다.

## 📱 주요 기능 (MVP)

1. **장소 검색/추가** - Google Places Autocomplete 사용
2. **순서 편집** - 드래그 & 드롭 / 스와이프 삭제
3. **체류시간 입력** - 분 단위 슬라이더, 기본값 제공
4. **이동시간 계산** - Distance Matrix, 교통 반영 옵션
5. **총 소요 vs 가능시간 비교** - 대시/배지로 즉시 피드백
6. **여정 저장/불러오기** - 로컬 DB/스토리지 (MMKV)
7. **지도 경로 표시** - Directions Polyline, 각 구간 ETA 툴팁

## 🛠️ 기술 스택

- **프레임워크**: React Native + Expo + TypeScript
- **지도**: react-native-maps (+ Google Maps SDK)
- **장소검색/시간계산**: Google Places / Distance Matrix / Directions API
- **상태관리**: Zustand
- **폼**: react-hook-form
- **로컬저장**: AsyncStorage
- **HTTP**: axios
- **유틸**: zod (검증), dayjs (시간)

## 🚀 시작하기

### 사전 준비

1. Node.js 18+ 설치
2. Expo CLI 설치 (선택사항)
3. Google Cloud Console에서 API 키 발급:
   - Places API
   - Distance Matrix API
   - Directions API

### 설치 방법

⚠️ **중요**: npm 캐시 권한 문제가 있는 경우, 다음 명령어를 먼저 실행하세요:

```bash
sudo chown -R $(whoami) ~/.npm
```

1. 프로젝트 클론 후 디렉토리로 이동:
```bash
cd timefit-trip
```

2. 패키지 설치:
```bash
npm install --legacy-peer-deps
# 또는
yarn install
```

> **참고**: `--legacy-peer-deps` 플래그는 패키지 간 의존성 충돌을 해결하기 위해 필요합니다.

3. 환경 변수 설정:
   - `src/constants/index.ts` 파일에서 `GOOGLE_API_KEY`를 본인의 API 키로 변경

```typescript
export const GOOGLE_API_KEY = 'YOUR_GOOGLE_API_KEY_HERE';
```

### 실행 방법

```bash
# iOS 시뮬레이터
npm run ios

# Android 에뮬레이터
npm run android

# 웹
npm run web

# Expo Go 앱으로 실행
npm start
```

## 📁 프로젝트 구조

```
timefit-trip/
├── src/
│   ├── components/        # 재사용 가능한 UI 컴포넌트
│   │   ├── PlaceCard.tsx
│   │   ├── PlaceSearchInput.tsx
│   │   ├── TripSummaryCard.tsx
│   │   └── index.ts
│   ├── screens/          # 화면 컴포넌트
│   │   ├── TripPlannerScreen.tsx
│   │   ├── SavedTripsScreen.tsx
│   │   └── index.ts
│   ├── stores/           # Zustand 상태 관리
│   │   └── tripStore.ts
│   ├── services/         # API 서비스
│   │   └── googleApi.ts
│   ├── utils/            # 유틸리티 함수
│   │   ├── timeCalculator.ts
│   │   └── storage.ts
│   ├── types/            # TypeScript 타입 정의
│   │   └── index.ts
│   └── constants/        # 상수 정의
│       └── index.ts
├── App.tsx               # 앱 진입점
└── package.json
```

## 🎯 사용 방법

1. **새 여행 만들기**: 앱 실행 시 자동으로 새 여행이 생성됩니다
2. **장소 검색**: 상단 검색창에서 장소를 검색하고 선택
3. **체류 시간 설정**: 각 장소의 체류 시간을 조정 (기본 60분)
4. **이동 시간 확인**: 자동으로 계산된 이동 시간 확인
5. **요약 확인**: 총 소요 시간과 가능 시간 비교
6. **저장**: 우측 상단 '저장' 버튼으로 여행 저장

## 🔄 향후 개발 예정 기능

- [ ] React Navigation 통합 (탭/스택 네비게이션)
- [ ] 체류 시간 슬라이더 UI
- [ ] 드래그 앤 드롭으로 장소 순서 변경
- [ ] 지도에 경로 표시
- [ ] 교통 수단 선택 (자동차/도보/대중교통/자전거)
- [ ] 가용 시간 설정 UI
- [ ] Undo/Redo 기능
- [ ] 테마 설정 (라이트/다크 모드)

## 📝 라이선스

MIT

## 👨‍💻 개발자

CursorAI로 생성된 프로젝트입니다.

