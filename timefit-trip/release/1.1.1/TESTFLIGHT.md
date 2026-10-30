# Tribble 1.1.1 (33) — iOS TestFlight

2026-10-27 기록. 이번 범위는 **iOS TestFlight 내부 테스트**입니다. App Store 심사 제출·정식 출시는 포함하지 않으며 Android 작업은 보류했습니다.

| 항목 | 상태 |
| --- | --- |
| 앱 버전 / 빌드 | `1.1.1` / `33` |
| 사전 검증 | 자동화 테스트 137개 통과, TypeScript 타입 검사(`tsc`) 통과 |
| EAS iOS production | 빌드 완료, `--clear-cache` 적용 |
| 빌드 기록 | [3d274cb3-1868-40ad-9e70-1bcd56d82101](https://expo.dev/accounts/freezner/projects/tribble/builds/3d274cb3-1868-40ad-9e70-1bcd56d82101) |
| API 연결 | 운영 카카오 프록시 `https://pastelinkers.com/tribble/api` |
| IPA 검증 | 버전·서명·App Store 프로비저닝·iPhone/iPad 지원·SDK 26.2 확인, 운영 API 주소 포함·이전 검증 주소 및 카카오 서버 키 미포함 |
| App Store Connect 업로드·처리 | 업로드 및 Apple 처리 완료 |
| 내부 테스트 | 기존 `테스터` 그룹(1명) 연결, 한국어 테스트 안내 저장 완료 |
| TestFlight 설치·실기기 검증 | 미진행 |

서명된 iOS IPA 생성과 검증을 완료했습니다. [IPA 검증 기록](ios/build-33-verification.json), [소스 해시 기록](source-snapshot-build33.json)에 근거를 남겼습니다. [TestFlight 빌드 33](https://appstoreconnect.apple.com/teams/4c0b01f5-c5ee-4fb4-b857-82a560250bbf/apps/6753949093/testflight/ios/79c47565-71ac-48c8-9bd6-92589693e747)에서 Apple 처리 완료, 기존 내부 테스트 그룹 연결, 한국어 안내의 `저장 완료` 상태를 확인했습니다. [제출 기록](ios/build-33-submission.json)과 [화면 증빙](proof/testflight-build33.png)을 보관했습니다.

## 테스트할 내용

TestFlight에 사용할 한국어 안내는 [what-to-test-ko.txt](what-to-test-ko.txt)에 있습니다.

- 초당순두부마을 → 부산역을 자동차로 계산하고, 부산역 → 초량역을 도보로 계산합니다. 자동으로 이동 시간이 표시되는지 확인합니다. 고정된 분 수를 정답으로 삼지 않습니다.
- 같은 일정에서 자동차·도보·자전거·대중교통을 바꿔 계산 상태와 합계가 갱신되는지 확인합니다.
- 장소 순서·체류 시간·출발 시각을 바꾸고 도착·종료 예상 시각과 남는 시간이 함께 갱신되는지 확인합니다. 계산되지 않은 구간이 0분 또는 확정 결과로 보이지 않아야 합니다.
- 초안이 자동 보관된 뒤 홈에서 다시 열고, 앱을 완전히 종료한 후 재실행합니다. 장소 순서와 일정 입력값을 이어서 편집할 수 있는지, 필요한 이동 시간이 다시 계산되는지 확인합니다.

자동차 시간은 **조회 시점의 교통 상황에 따른 추정**이며 미래 여행 날짜의 교통 예측이 아닙니다. 대중교통도 계획한 날짜·출발 시각의 실제 시간표나 운행 여부를 확인한 결과가 아닙니다. 이 한계가 화면에서 구분되는지 함께 확인합니다.

## 후속 확인

- [x] EAS 빌드 완료 및 iOS 산출물 확인
- [x] App Store Connect 업로드·Apple 처리 완료 확인
- [x] 내부 테스트에 빌드 33 연결 및 테스트 안내 등록
- [ ] TestFlight에서 설치 후 위 시나리오 실기기 검증

