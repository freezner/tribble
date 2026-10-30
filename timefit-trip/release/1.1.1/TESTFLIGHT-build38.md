# Tribble 1.1.1 (38) — iOS TestFlight

2026-10-29. 카드 이미지 문구를 정리하고 일정 화면의 장소명을 Google Maps로 연결한 내부 테스트 빌드입니다.

## 포함된 변경

- 카드 생성 화면의 SNS·게시 형태·픽셀 규격 중복 안내를 제거했습니다.
- 카드 날짜 위에 ‘여행 일자’를 추가하고 KST, 우측 상단 상태 문구, 하단 ‘계획 기준 예상 시간입니다’를 제거했습니다.
- ‘도착 시각(설정)’을 ‘도착 시각’으로 변경했습니다.
- 일정의 각 장소명을 누르면 Google Maps에서 저장된 위치를 엽니다. Google 장소 ID가 있으면 함께 사용하고, 카카오 등 다른 공급자 ID는 좌표 핀으로 연결합니다. 표시 이름을 수정해도 원래 위치를 사용합니다.
- 기존 모든 페이지 PNG 공유·SNS별 규격·카드 타이틀 설정을 포함합니다.

## 검증과 배포

- 자동 테스트 262개, TypeScript 검사, diff 검사 통과. [기능·iOS 시뮬레이터 검증](../card-label-cleanup/VALIDATION.md).
- [소스 스냅샷](source-snapshot-build38.json): 앱 파일 68개. 업로드 이후 해시 일치 확인.
- [EAS 빌드](https://expo.dev/accounts/freezner/projects/tribble/builds/c11e8b28-d613-4bc6-8cf1-0c44e5f2b27c): production iOS Release 완료.
- [IPA 검증](ios/build-38-verification.json): 버전·서명·App Store 프로비저닝·운영 API·새 카드 문구·Google Maps 링크·기존 SNS 기능·두 사진 목적 설명 포함과 카카오 서버 키 미포함 확인.
- [제출 기록](ios/build-38-submission.json): EAS 전송 및 Apple 처리 완료, 기존 내부 ‘테스터’ 그룹 1명 연결 확인.
- [TestFlight 빌드 38](https://appstoreconnect.apple.com/teams/4c0b01f5-c5ee-4fb4-b857-82a560250bbf/apps/6753949093/testflight/ios/cae16389-2d52-4e34-b798-b25513901207): [한국어 테스트 안내](what-to-test-build38-ko.txt) 저장 완료와 원문 일치 확인.
- [완료 화면](proof/testflight-build38.png).

실제 iPhone에서 Google Maps 앱으로 전환·복귀, SNS별 이미지 수신·저장 동작을 확인해야 합니다. 정식 App Store 심사 제출과 Android 빌드는 진행하지 않았습니다. 지원·개인정보 문서는 로컬에 갱신했으며 공개 원격 문서 변경은 이번 업로드에 포함되지 않습니다.
