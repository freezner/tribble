# Tribble 1.1.1 (34) — iOS TestFlight

2026-10-29. 기존 빌드 33에 이어 여행 카드 날짜 표시 수정을 포함하는 **iOS 내부 테스트 빌드**입니다.

- 최초 저장일은 초안 생성·첫 자동 보관 시점으로 고정합니다.
- 여행일은 별도 표시하고 마지막 수정 날짜·시각은 작게 표시합니다.
- 자동 경로 재계산과 조회는 마지막 수정 시각을 변경하지 않습니다.
- 자동화 테스트 145개와 TypeScript 타입 검사 통과. 날짜 UI는 한국·미국 시간대에서 검증했습니다.
- [빌드 소스 기록](source-snapshot-build34.json), [테스트 안내](what-to-test-build34-ko.txt)
- [EAS 빌드](https://expo.dev/accounts/freezner/projects/tribble/builds/2e45d146-6e37-4379-8c86-54a79058ee78): 완료 (`--clear-cache`)
- [IPA 검증](ios/build-34-verification.json): 버전·서명·프로비저닝·운영 API 주소·날짜 표시 수정 포함 확인, 카카오 서버 키 미포함 확인
- App Store Connect 업로드·Apple 처리: 완료. [TestFlight 빌드 34](https://appstoreconnect.apple.com/teams/4c0b01f5-c5ee-4fb4-b857-82a560250bbf/apps/6753949093/testflight/ios/437b5258-15d5-4223-aae4-0fac3fae5d9c)에서 확인
- 내부 테스트: 기존 `테스터` 그룹(1명) 연결 및 한국어 테스트 안내 저장 완료
- [배포 완료 화면](proof/testflight-build34.png)
- [제출 기록](ios/build-34-submission.json)
- TestFlight 실기기 설치·실행: 사용자 테스트 예정

정식 App Store 심사 제출과 Android 빌드는 이번 범위에 포함하지 않습니다. 기존 [빌드 33 기록](TESTFLIGHT.md)은 유지합니다.
