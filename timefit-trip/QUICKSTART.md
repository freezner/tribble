# 빠른 시작 가이드 ⚡

5분 안에 TimeFit Trip 앱을 실행하세요!

## 1단계: 패키지 설치 📦

⚠️ **npm 캐시 오류가 발생하면 먼저 실행하세요:**

```bash
sudo chown -R $(whoami) ~/.npm
```

그 다음 패키지를 설치합니다:

```bash
cd timefit-trip
npm install --legacy-peer-deps
```

> **참고**: `--legacy-peer-deps` 플래그는 필수입니다!

## 2단계: Google API 키 설정 🔑

1. [Google Cloud Console](https://console.cloud.google.com) 접속
2. 새 프로젝트 생성
3. 다음 API 활성화:
   - **Places API**
   - **Distance Matrix API**
   - **Directions API**
4. API 키 생성
5. `src/constants/index.ts` 파일을 열고 API 키 입력:

```typescript
export const GOOGLE_API_KEY = '여기에_API_키_붙여넣기';
```

## 3단계: 앱 실행 🚀

```bash
npm start
```

그리고:
- **iOS**: `i` 키 누르기 (macOS만 가능)
- **Android**: `a` 키 누르기
- **웹**: `w` 키 누르기
- **모바일**: Expo Go 앱에서 QR 코드 스캔

## 완료! 🎉

앱이 실행되면:
1. 장소를 검색하고 추가하세요
2. 자동으로 이동 시간이 계산됩니다
3. 시간 초과 여부를 즉시 확인하세요
4. 우측 상단 '저장' 버튼으로 여행을 저장하세요

---

**문제가 있나요?** 📖
- 자세한 가이드: [SETUP.md](./SETUP.md) 참고
- 프로젝트 설명: [README.md](./README.md) 참고

