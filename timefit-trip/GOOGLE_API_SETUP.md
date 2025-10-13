# Google API 설정 가이드 🔑

## 문제: REQUEST_DENIED 오류

**오류 메시지**: "This API key is not authorized to use this service or API."

이 오류는 API 키가 Places API를 사용할 권한이 없거나, API가 활성화되지 않았을 때 발생합니다.

## ✅ 해결 방법

### 1단계: Google Cloud Console 접속

1. [Google Cloud Console](https://console.cloud.google.com) 접속
2. 프로젝트 선택 (또는 새 프로젝트 생성)

### 2단계: API 활성화

다음 API들을 **반드시 모두** 활성화해야 합니다:

1. **Places API** (New) 또는 **Places API (Legacy)**
   - 콘솔 왼쪽 메뉴 → "API 및 서비스" → "라이브러리"
   - "Places API" 검색
   - **"사용 설정"** 클릭

2. **Distance Matrix API**
   - 같은 방법으로 검색하여 활성화

3. **Directions API**
   - 같은 방법으로 검색하여 활성화

### 3단계: 청구 계정 설정 (중요!)

Google Maps Platform은 **무료 크레딧**을 제공하지만, **청구 계정 연결이 필수**입니다:

1. 콘솔 왼쪽 메뉴 → "결제"
2. "결제 계정 연결" 클릭
3. 신용카드 정보 입력 (매달 $200 무료 크레딧 제공)

> **참고**: 무료 크레딧 범위 내에서 사용하면 과금되지 않습니다.

### 4단계: API 키 생성 또는 확인

#### 방법 A: 새 API 키 생성 (권장)

1. 콘솔 → "API 및 서비스" → "사용자 인증 정보"
2. "+ 사용자 인증 정보 만들기" → "API 키" 클릭
3. API 키 복사

#### 방법 B: 기존 API 키 수정

1. 콘솔 → "API 및 서비스" → "사용자 인증 정보"
2. 기존 API 키 클릭
3. "API 제한사항" 섹션:
   - "키 제한" 선택
   - 다음 API만 선택:
     - Places API
     - Distance Matrix API
     - Directions API
4. "저장" 클릭

### 5단계: API 키를 앱에 적용

`src/constants/index.ts` 파일 열기:

```typescript
export const GOOGLE_API_KEY = '여기에_새로운_API_키_붙여넣기';
```

### 6단계: 앱 재시작

```bash
# 터미널에서
npm start
# 그리고 'r' 키를 눌러 새로고침
```

## 🧪 테스트 방법

1. 앱에서 장소 검색 (예: "서울타워")
2. 터미널 로그 확인:
   ```
   ✅ Google Places API 응답: {"predictions": [...], "status": "OK"}
   ```
3. ❌ 여전히 오류가 나면:
   ```
   ERROR: REQUEST_DENIED
   ```

## 🔍 문제 해결 체크리스트

- [ ] Google Cloud Console 프로젝트 생성됨
- [ ] **Places API** 활성화됨
- [ ] **Distance Matrix API** 활성화됨
- [ ] **Directions API** 활성화됨
- [ ] **청구 계정** 연결됨 (필수!)
- [ ] API 키가 올바르게 복사됨
- [ ] API 키 제한사항이 올바르게 설정됨
- [ ] 앱 재시작함

## 💡 자주 묻는 질문

### Q1: 청구 계정 연결이 필수인가요?
**A**: 네, Google Maps Platform은 청구 계정 연결이 필수입니다. 하지만 매달 $200의 무료 크레딧을 제공하므로, 일반적인 개발/테스트 용도로는 과금되지 않습니다.

### Q2: API 키가 작동하지 않아요
**A**: 
1. API 활성화 후 **1-2분 정도 기다려** 보세요
2. API 키 제한사항을 확인하세요
3. 새 API 키를 생성해 보세요

### Q3: 여전히 REQUEST_DENIED 오류가 나요
**A**:
1. 청구 계정이 활성화되었는지 확인
2. 다음 URL로 직접 테스트:
   ```
   https://maps.googleapis.com/maps/api/place/autocomplete/json?input=서울&key=YOUR_API_KEY
   ```
3. 브라우저에서 열어서 응답 확인

## 📚 참고 링크

- [Google Maps Platform 시작하기](https://developers.google.com/maps/get-started)
- [Places API 문서](https://developers.google.com/maps/documentation/places/web-service)
- [API 키 제한 설정](https://cloud.google.com/docs/authentication/api-keys)
- [요금 정보](https://developers.google.com/maps/billing-and-pricing)

---

**도움이 필요하면** 터미널 로그와 함께 문의하세요! 🙋‍♂️

