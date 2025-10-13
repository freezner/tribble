# 아이폰에 앱 설치하기 📱

TimeFit Trip 앱을 아이폰에 설치하는 3가지 방법을 소개합니다.

## 🚀 방법 1: Expo Go 사용 (가장 쉬움, 추천!)

Expo Go 앱을 통해 **즉시** 테스트할 수 있습니다.

### 1단계: Expo Go 설치
1. 아이폰에서 App Store 열기
2. **"Expo Go"** 검색
3. 앱 다운로드 및 설치

### 2단계: 개발 서버 시작
```bash
cd /Users/hyungjin/git-repo/tribble/timefit-trip
npm start
```

### 3단계: QR 코드 스캔
1. 터미널에 QR 코드가 표시됨
2. 아이폰 카메라로 QR 코드 스캔
3. Expo Go 앱이 자동으로 열리며 앱 실행

### 장점
- ✅ 가장 빠르고 쉬움
- ✅ 코드 변경 시 즉시 반영 (Hot Reload)
- ✅ 무료

### 단점
- ❌ 네이티브 모듈 제한 (현재 앱은 모두 지원됨)
- ❌ 개발 서버가 실행 중이어야 함
- ❌ 같은 Wi-Fi 네트워크에 있어야 함

---

## 📦 방법 2: TestFlight (실제 앱처럼)

Apple TestFlight을 통해 실제 앱처럼 설치할 수 있습니다.

### 사전 준비
- Apple Developer 계정 ($99/년) 필요
- Expo 계정 (무료)

### 1단계: EAS CLI 설치
```bash
npm install -g eas-cli
eas login
```

### 2단계: 프로젝트 설정
```bash
cd /Users/hyungjin/git-repo/tribble/timefit-trip
eas build:configure
```

### 3단계: iOS 빌드
```bash
eas build --platform ios
```

빌드 타입 선택 시:
- **Simulator build** (시뮬레이터용)
- **Internal distribution** (TestFlight용) ← 선택

### 4단계: TestFlight 배포
1. 빌드 완료 후 Expo 대시보드에서 다운로드
2. [App Store Connect](https://appstoreconnect.apple.com) 접속
3. TestFlight 섹션에서 빌드 업로드
4. 테스터 추가 (자신의 Apple ID)

### 5단계: 아이폰에 설치
1. App Store에서 **TestFlight** 앱 설치
2. 이메일로 받은 초대 링크 클릭
3. TestFlight에서 앱 다운로드

### 장점
- ✅ 실제 앱과 동일한 환경
- ✅ 개발 서버 필요 없음
- ✅ 여러 테스터에게 공유 가능

### 단점
- ❌ Apple Developer 계정 필요 ($99/년)
- ❌ 빌드 시간 소요 (10-20분)
- ❌ 설정이 복잡함

---

## 🔧 방법 3: Development Build (권장, 중급)

네이티브 기능을 모두 사용하면서 빠른 개발이 가능합니다.

### 1단계: Development Build 생성
```bash
eas build --profile development --platform ios
```

### 2단계: 빌드 다운로드
1. 빌드 완료 후 QR 코드가 표시됨
2. 아이폰 카메라로 QR 코드 스캔
3. 프로필 설치 (Settings → General → VPN & Device Management)
4. 앱 설치

### 3단계: 개발 서버 연결
```bash
npx expo start --dev-client
```

### 장점
- ✅ 모든 네이티브 기능 사용 가능
- ✅ Hot Reload 지원
- ✅ 빠른 개발 가능

### 단점
- ❌ 초기 빌드 시간 소요
- ❌ Apple Developer 계정 필요 (무료 계정 7일 제한)

---

## 📱 빠른 시작 (추천)

### Option A: 같은 Wi-Fi에서 테스트 (가장 쉬움)
```bash
# 1. 개발 서버 시작
cd /Users/hyungjin/git-repo/tribble/timefit-trip
npm start

# 2. Expo Go 앱에서 QR 스캔
```

### Option B: Expo Go 터널 모드 (다른 네트워크에서도 가능)
```bash
# 1. 터널 모드로 시작
npx expo start --tunnel

# 2. Expo Go 앱에서 QR 스캔
```

---

## 🔍 문제 해결

### Q1: QR 코드가 스캔되지 않아요
**해결:**
- 아이폰과 Mac이 같은 Wi-Fi에 연결되어 있는지 확인
- 터널 모드 사용: `npx expo start --tunnel`
- Expo Go 앱 내에서 수동으로 URL 입력

### Q2: "Network response timed out" 오류
**해결:**
```bash
# 방화벽 설정 확인 또는 터널 모드 사용
npx expo start --tunnel
```

### Q3: 앱이 열리지 않아요
**해결:**
1. Expo Go 앱 재시작
2. 개발 서버 재시작 (`r` 키)
3. 아이폰 재부팅

### Q4: Google API가 작동하지 않아요
**해결:**
- Google Cloud Console에서 API 키의 "Application restrictions" 확인
- iOS Bundle ID 추가 (`host.exp.exponent` 또는 `com.yourname.timefittrip`)

---

## 📋 체크리스트

### Expo Go로 시작하기 (5분)
- [ ] App Store에서 Expo Go 설치
- [ ] `npm start` 실행
- [ ] QR 코드 스캔
- [ ] 앱 실행 확인

### TestFlight로 배포하기 (1시간)
- [ ] Apple Developer 계정 가입
- [ ] EAS CLI 설치
- [ ] `eas build --platform ios` 실행
- [ ] TestFlight 업로드
- [ ] 테스터로 자신 추가
- [ ] 아이폰에서 다운로드

---

## 💡 추천 워크플로우

### 개발 중
→ **Expo Go** 사용 (빠른 테스트)

### 실제 테스트
→ **Development Build** 사용 (모든 기능 테스트)

### 배포 전
→ **TestFlight** 사용 (베타 테스터와 공유)

### 앱 스토어 출시
→ **Production Build** + App Store 제출

---

## 🎯 지금 바로 시작하기

**가장 빠른 방법 (1분):**

1. App Store에서 **Expo Go** 설치
2. 터미널에서 실행:
   ```bash
   cd /Users/hyungjin/git-repo/tribble/timefit-trip
   npm start
   ```
3. 아이폰으로 QR 코드 스캔
4. 완료! 🎉

---

## 📚 추가 리소스

- [Expo Go 가이드](https://docs.expo.dev/get-started/expo-go/)
- [EAS Build 문서](https://docs.expo.dev/build/introduction/)
- [TestFlight 가이드](https://developer.apple.com/testflight/)
- [App Store 배포](https://docs.expo.dev/submit/introduction/)

도움이 필요하면 언제든 문의하세요! 🙋‍♂️

