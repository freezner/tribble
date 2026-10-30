# App Store 스크린샷 목록

갱신: 2026-10-27 · Tribble 1.1.0 한국 자동차 구간 안내·외부 지도 연결 반영 작업.

기존 스크린샷 10장 중 **9장은 유지**했고, iPhone 교통수단 화면 1장을 **교체**, iPad 교통수단 화면 1장을 **추가**했습니다. 최종 **iPhone 6장·iPad 5장, 총 11장의 App Store 등록을 완료**했습니다. 새 두 이미지의 육안·규격·해시 검증과 Apple 이미지 처리가 완료되었으며, App Store Connect에 표시된 썸네일을 직접 확인했습니다.

## 파일과 상태

| 기기 | 파일 | 상태 | 보여주는 내용 |
| --- | --- | --- | --- |
| iPhone | [01-start.png](iphone/01-start.png) | 유지 | 첫 여행 만들기 |
| iPhone | [02-overview.png](iphone/02-overview.png) | 유지 | 예상 종료와 남는 시간, 체류·이동·여유 합계 |
| iPhone | [03-schedule.png](iphone/03-schedule.png) | 유지 | 날짜·시작·마감·이동 및 대기 여유 설정 |
| iPhone | [04-timeline.png](iphone/04-timeline.png) | 유지 | 체류 조절·방문 순서·직접 입력 및 추정 표시 |
| iPhone | [05-transport.png](iphone/05-transport.png) | **교체·등록 완료** | 한국 자동차 구간의 지원 제한 안내·카카오맵 확인·직접 입력 |
| iPhone | [06-library.png](iphone/06-library.png) | 유지 | 저장한 여행과 초안 |
| iPad | [01-start.png](ipad/01-start.png) | 유지 | 첫 여행 만들기 |
| iPad | [02-overview.png](ipad/02-overview.png) | 유지 | 일정 요약과 타임라인 |
| iPad | [03-schedule.png](ipad/03-schedule.png) | 유지 | 날짜·시작·마감·이동 및 대기 여유 설정 |
| iPad | [04-library.png](ipad/04-library.png) | 유지 | 저장한 여행과 초안 |
| iPad | [05-transport.png](ipad/05-transport.png) | **추가·등록 완료** | 한국 자동차 구간의 지원 제한 안내·카카오맵 확인·직접 입력 |

파일의 확인 규격은 iPhone **1206×2622**, iPad **2064×2752**, 8비트 RGB PNG(투명도 없음)입니다. 새 두 파일도 PNG 헤더와 SHA-256을 [촬영 검증 기록](capture/verification.json)에 대조해 일치함을 확인했습니다. 이미지는 실제 앱 UI 캡처이며 별도 마케팅 캡션이 이미지에 합성되어 있지 않습니다. 교체 전 iPhone 이미지는 [previous-build31/iphone-05-transport.png](previous-build31/iphone-05-transport.png)에 보존했습니다.

## 캡션 매핑

문구 원본: [한국어 metadata](../metadata/ko-KR.json), [영어 metadata](../metadata/en-US.json).

- `screenshotCaptions` 배열은 아래 iPhone 파일 순서에 대응합니다. 기존 배열 형식은 유지하고 6개로 정리했습니다.
- `ipadScreenshotCaptions`는 iPad 파일명을 키로 사용하는 객체이며 새 교통수단 화면도 포함합니다.
- 캡션은 로컬 문구 목록입니다. 이 키를 추가한 것만으로 이미지에 글자가 합성되거나 App Store에 등록되지는 않습니다.

| iPhone 순서·파일 | 한국어 | English |
| --- | --- | --- |
| 1 · `01-start.png` | 가고 싶은 곳을, 내 시간 안에 | A plan that fits your day |
| 2 · `02-overview.png` | 예상 종료와 여유를 한눈에 | See your finish time and time to spare |
| 3 · `03-schedule.png` | 시작·마감과 여유를 내 계획대로 | Set your start, deadline, and buffer |
| 4 · `04-timeline.png` | 머무를 시간과 방문 순서를 내 뜻대로 | Adjust your stays. Reorder your stops. |
| 5 · `05-transport.png` | 지도에서 확인하고 직접 입력 | Check a map. Enter the travel time. |
| 6 · `06-library.png` | 초안과 저장한 여행을 한곳에 | Your drafts and saved trips, together |

iPad는 `01-start`, `02-overview`, `03-schedule`에 동일 화면의 문구를 사용하고, `04-library`에는 iPhone 6번 문구, 새 `05-transport`에는 iPhone 5번 문구를 사용합니다.

## 새 교통수단 화면 촬영·검증 결과

2026-10-27 Expo Go SDK54·iOS 26.2에서 임시 `StoreCapture.tsx` 진입점을 사용해 **변경하지 않은 실제 `TripPlannerScreen`·`TransportModePicker`**를 고정 예시 데이터와 함께 렌더링했습니다. [촬영 fixture 원본](capture/StoreCapture.tsx.txt)을 보관했습니다. 예시는 초당순두부마을 → 부산역, 자동차, `provider-coverage`, 이동 시간 `null` 상태입니다. 실제 경로 API의 이동 시간을 얻었다는 의미는 아닙니다.

촬영 담당자는 프로덕션 소스 11개 파일의 해시 불변을 확인했습니다. [검증 기록](capture/verification.json)의 `routingSourceMatchesSubmittedBuild32`와 `indexRestored`는 모두 `true`이며, 현재 `index.js`의 SHA-256도 기록된 복원 해시와 직접 대조해 일치함을 확인했습니다.

두 최종 PNG를 직접 확인한 결과 출발·도착 장소, 한국 Google 경로 지원 제한 안내, 카카오맵에서 시간 확인 버튼, 지도 교통수단·출발 시각 확인 힌트, 분 입력과 적용이 읽을 수 있게 보입니다. 교통수단 네 항목과 자동차 선택 상태도 표시되며 재계산 버튼은 없습니다. Expo 로딩 표시·개발 메뉴·오류 오버레이는 보이지 않습니다. iPad는 실제 제품의 최대 폭을 적용한 하단 모달을 보여줍니다.

입력란의 회색 `20`은 현재 제품 UI의 빈 입력 placeholder이며, 해당 구간의 계산 결과나 실제 확인한 이동 시간이 아닙니다. 이 화면은 지도 확인 후 수동 입력하는 과정을 보여주며 카카오맵 시간을 자동으로 가져온다고 표현하지 않습니다.

App Store Connect에서 iPhone 05 교체와 iPad 05 추가, Apple 처리 완료 및 최종 등록 구성을 확인했습니다. [iPhone 6장 등록 확인 증빙](../proof/screenshots-iphone-build32.jpg)과 [iPad 5장 등록 확인 증빙](../proof/screenshots-ipad-build32.jpg)을 보관했습니다. 앱 미리보기 동영상은 이번 작업에 포함하지 않습니다.
