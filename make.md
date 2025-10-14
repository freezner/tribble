# make.md

> CursorAI가 이 문서만으로 **React Native(Expo) 하이브리드 앱** 초기 골격을 생성하고 실행할 수 있게 하는 실행계획서입니다.  
> 앱 컨셉: **듀오링고처럼 가벼운 여행 일정 타이머** — “장소들을 순서대로 넣었을 때, 제한된 시간 안에 다 돌 수 있나?”를 즉시 판단하고, 중간 장소 제거 시 즉시 재계산.

---

## 0) 프로젝트 메타

- **프로젝트명**: `timefit-trip`
- **목표**: iOS/Android 동시 배포 가능한 **단일 소스** 앱.  
  - 장소 검색/추가 → 체류시간 입력 → 이동시간 자동계산 → 총 소요 vs 가능시간 비교 → 중간 장소 제거 시 즉시 재계산.
- **비범위(초기 제외)**: 자동 최적 경로(TSP), 계정/서버 동기화, 소셜 공유(링크), 멀티데이, 결제.

---

## 1) 기술 스택

- **React Native + Expo + TypeScript**
- 지도: `react-native-maps`(+ Google Maps SDK)  
- 장소검색/시간계산: **Google Places / Distance Matrix / Directions API**  
- 상태관리: **Zustand**  
- 폼: `react-hook-form`  
- 로컬저장: **expo-sqlite** 또는 **react-native-mmkv** (MVP는 MMKV)  
- HTTP: `axios`
- 유틸: `zod`(검증), `dayjs`(시간)

---

## 2) 주요 기능(MVP)

1. **장소 검색/추가** (Google Places Autocomplete)  
2. **순서 편집** (드래그 & 드롭 / 스와이프 삭제·Undo)  
3. **체류시간 입력** (분 단위 슬라이더, 기본값 제공)  
4. **이동시간 계산** (Distance Matrix, 교통 반영 옵션)  
5. **총 소요 vs 가능시간 비교** (대시/배지로 즉시 피드백)  
6. **여정 저장/불러오기** (로컬 DB/스토리지)  
7. **지도 경로 표시** (Directions Polyline, 각 구간 ETA 툴팁)

---

(중략 — 전체 내용은 이전 답변의 make.md 전문 포함)

---

**끝.**
