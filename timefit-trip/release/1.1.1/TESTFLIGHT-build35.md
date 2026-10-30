# Tribble 1.1.1 (35) — iOS TestFlight

2026-10-29. SNS 프로필 등록 및 여행 카드 이미지 공유를 포함한 iOS 내부 테스트 빌드입니다.

- 설정에서 Instagram·X·Facebook·TikTok 공개 프로필을 기기에 등록·수정·삭제합니다. OAuth 로그인이나 자동 게시 기능은 아닙니다.
- 피드 4:5 / 스토리 9:16 카드 미리보기, 선택한 프로필 표시, 긴 경로의 페이지 분할 및 PNG 공유를 제공합니다.
- 이전 빌드 34의 최초 저장일·수정일 구분과 기존 카카오 경로 계산·초안 이어쓰기를 포함합니다.
- 자동화 테스트 191개·타입 검사·Xcode 26.2 네이티브 시뮬레이터 빌드 및 실제 PNG 1080×1350/1920 캡처 검증 완료. [기능 검증 상세](../social-sharing/VALIDATION.md)
- [EAS 빌드](https://expo.dev/accounts/freezner/projects/tribble/builds/7159f79f-b0d6-4e71-a494-6c8941e50e48): 완료, production / clear-cache
- [소스 스냅샷](source-snapshot-build35.json): 61개 파일 기록. 업로드 이후 앱 소스 변경 없음 확인.
- [IPA 검증](ios/build-35-verification.json): 버전·서명·App Store 프로비저닝·운영 API·SNS 기능 포함 확인. 서버 카카오 키 미포함 확인.
- [제출 기록](ios/build-35-submission.json): EAS 제출 및 Apple 처리 완료.
- [TestFlight 빌드 35](https://appstoreconnect.apple.com/teams/4c0b01f5-c5ee-4fb4-b857-82a560250bbf/apps/6753949093/testflight/ios/ed3259d6-8679-4a7d-b7e9-f21f8f417fe1): 기존 내부 `테스터` 그룹(1명) 연결 확인, [한국어 테스트 안내](what-to-test-build35-ko.txt) 저장 및 내용 일치 확인.
- [배포 완료 화면](proof/testflight-build35.png)

실제 SNS 앱의 이미지 수신·게시·확장 내 취소는 iPhone에서 확인해야 합니다. 정식 App Store 심사 제출과 Android 빌드는 진행하지 않았습니다. 기존 빌드 33·34 기록은 그대로 유지합니다.
