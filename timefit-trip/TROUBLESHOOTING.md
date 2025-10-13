# 문제 해결 가이드 🔧

## 🚗 이동 시간이 계산되지 않는 문제

### 증상
- 장소를 2개 이상 추가했는데 이동 시간이 표시되지 않음
- PlaceCard에 "이동 XX분" 표시가 없음
- TripSummaryCard에서 총 이동 시간이 0분으로 표시됨

### 원인 진단

#### 1단계: 콘솔 로그 확인

터미널에서 다음 로그를 확인하세요:

**정상 동작 시:**
```
✅ 이동 시간 계산 시작: 2개 장소, 교통수단: driving
✅ [1/1] 이동 시간 계산: 서울타워 → 경복궁
✅ Distance Matrix API 호출: {...}
✅ Distance Matrix API 응답: {"status": "OK", ...}
✅ 계산 완료: 15분, 5200m
✅ 이동 시간 계산 종료
```

**오류 발생 시:**
```
❌ Distance Matrix API 오류: REQUEST_DENIED This API key is not authorized...
❌ 계산 실패: 서울타워 → 경복궁
```

#### 2단계: API 권한 확인

Distance Matrix API도 REQUEST_DENIED 오류가 나면:

1. [Google Cloud Console](https://console.cloud.google.com) 접속
2. **"API 및 서비스"** → **"라이브러리"**
3. **"Distance Matrix API"** 검색 → **"사용 설정"** 클릭

> **중요**: Places API뿐만 아니라 **Distance Matrix API도 반드시 활성화**해야 합니다!

#### 3단계: 장소 개수 확인

이동 시간 계산은 **최소 2개의 장소**가 있어야 작동합니다:

```
장소 1개: 이동 시간 계산 안 됨
장소 2개: 1개 구간 이동 시간 계산
장소 3개: 2개 구간 이동 시간 계산
```

### 해결 방법

#### 방법 1: Distance Matrix API 활성화

1. Google Cloud Console → API 라이브러리
2. "Distance Matrix API" 검색
3. "사용 설정" 클릭
4. 앱 재시작 (터미널에서 `r` 키)

#### 방법 2: 새 API 키 생성

모든 API에 대한 권한이 있는 새 API 키를 생성하세요:

1. 콘솔 → "사용자 인증 정보" → "+ 사용자 인증 정보 만들기" → "API 키"
2. API 제한사항 설정:
   - ✅ Places API
   - ✅ Distance Matrix API
   - ✅ Directions API
3. `src/constants/index.ts`에서 API 키 교체
4. 앱 재시작

#### 방법 3: 청구 계정 확인

청구 계정이 연결되지 않으면 API가 작동하지 않습니다:

1. 콘솔 → "결제"
2. 결제 계정 연결 (매달 $200 무료 크레딧)

### 테스트 방법

1. **장소 2개 추가**:
   - 예: "서울타워", "경복궁"

2. **화면 확인**:
   - 🚗 "이동 시간 계산 중..." 메시지 표시됨
   - PlaceCard에 "→ 이동 XX분" 표시됨
   - TripSummaryCard에서 이동 시간 표시됨

3. **콘솔 로그 확인**:
   ```
   ✅ Distance Matrix API 응답: {"status": "OK"}
   ✅ 계산 완료: 15분, 5200m
   ```

---

## 🔍 기타 문제들

### 장소 검색이 안 됨

**증상**: 입력해도 검색 결과가 안 나옴

**해결**:
1. Places API 활성화 확인
2. API 키 권한 확인
3. `GOOGLE_API_SETUP.md` 참고

### 저장이 안 됨

**증상**: 저장 버튼 눌러도 반응 없음

**해결**:
1. 장소 최소 1개 이상 추가
2. 콘솔에서 "저장 완료" 로그 확인
3. AsyncStorage 오류 확인

### 앱이 느림

**증상**: 이동 시간 계산이 오래 걸림

**이유**: Distance Matrix API는 각 구간마다 개별 호출합니다
- 2개 장소: 1번 API 호출 (~1초)
- 3개 장소: 2번 API 호출 (~2초)
- 10개 장소: 9번 API 호출 (~9초)

**개선 방향**: 향후 batch API 호출로 최적화 예정

---

## 📋 체크리스트

이동 시간 계산이 안 될 때:

- [ ] 장소가 2개 이상인가?
- [ ] Distance Matrix API가 활성화되었나?
- [ ] API 키가 올바른가?
- [ ] 청구 계정이 연결되었나?
- [ ] 콘솔 로그에서 REQUEST_DENIED 오류가 나는가?
- [ ] "이동 시간 계산 중..." 메시지가 표시되는가?
- [ ] 앱을 재시작했는가?

모든 항목을 확인했는데도 안 되면, 터미널 로그를 캡처해서 문의하세요!

