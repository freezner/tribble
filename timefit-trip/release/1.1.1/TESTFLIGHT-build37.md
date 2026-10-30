# Tribble 1.1.1 (37) — iOS TestFlight

2026-10-29. 여러 장 카드 공유·저장과 SNS별 출력 규격, 카드 타이틀·시간 표기를 개선한 내부 테스트 빌드입니다.

## 포함된 변경

- 저장된 여행을 편집할 때 우측 상단에 ‘수정’을 표시합니다.
- 긴 여행의 모든 카드 페이지를 PNG로 생성해 한 번에 공유·저장합니다.
- 카드에 ‘출발 시각’과 ‘도착 시각(설정)’을 명시합니다.
- 설정에서 카드 타이틀을 닉네임으로 지정할 수 있으며 빈값이면 `tribble`을 표시합니다.
- 카드 생성 시 Instagram·X·Facebook·TikTok을 고르고, Instagram·Facebook에서는 게시물/스토리를 선택합니다. 출력 크기·여백·페이지 수가 선택한 형식에 맞춰 바뀝니다.
- Instagram 게시물 1080×1440, Facebook 게시물 1440×1800, X 1200×1200, 스토리·TikTok 1080×1920 출력입니다. SNS 프로필 표시는 출력 규격 선택과 독립적입니다.

## 검증과 배포

- 자동 테스트 259개와 TypeScript 검사 통과. 이번 배포 보완은 사진 접근 설명 두 설정 파일에 한정하며 JSON·plist 값 일치와 diff 검사를 통과했습니다.
- [이전 카드 개선의 시뮬레이터 빌드·두 장 사진 저장 검증](../card-improvements/VALIDATION.md).
- [SNS 6가지 형식의 실제 PNG 13장 검증](../sns-card-presets/VALIDATION.md).
- [소스 스냅샷](source-snapshot-build37.json): 앱 파일 68개. 문서·로그·자격증명은 앱 소스 스냅샷 대상에서 제외했습니다.
- [EAS 빌드](https://expo.dev/accounts/freezner/projects/tribble/builds/f1d9f6ea-a87f-41f2-8829-f4f302d2e498): production / clear-cache, 완료.
- [IPA 검증](ios/build-37-verification.json): 서명·App Store 프로비저닝·운영 API·카드 기능·두 사진 목적 설명 포함, 카카오 서버 키 미포함 확인.
- [제출 기록](ios/build-37-submission.json): EAS 전송·Apple 처리 완료. 기존 내부 `테스터` 그룹 1명 연결 확인.
- [TestFlight 빌드 37](https://appstoreconnect.apple.com/teams/4c0b01f5-c5ee-4fb4-b857-82a560250bbf/apps/6753949093/testflight/ios/162b2cb8-cb3b-417d-899b-7c5d1e5e1f81): [한국어 테스트 안내](what-to-test-build37-ko.txt) 저장 및 원문 일치 확인. [완료 화면](proof/testflight-build37.png).

## Apple 처리 오류 보완

앞선 빌드 36은 EAS 빌드·전송을 완료했지만 Apple 처리에서 오류 90683(`NSPhotoLibraryUsageDescription` 누락)으로 거절되어 테스터에게 배포되지 않았습니다. [Apple 처리 기록](ios/build-36-submission.json), [오류 화면](proof/testflight-build36-processing-error.png).

`react-native-share` 12.3.1의 미사용 Instagram 공유 경로에도 사진 API 참조가 컴파일됩니다. 빌드 37은 기존 `NSPhotoLibraryAddUsageDescription`을 유지하면서 `NSPhotoLibraryUsageDescription`을 app.json과 네이티브 Info.plist에 추가했습니다. 현재 앱은 임시 PNG URL을 `Share.open`으로 시스템 공유창에 전달하며, Instagram 전용 `shareSingle`·기존 사진 탐색·사진 읽기 권한 요청 경로를 실행하지 않습니다. 설명 키 선언이 권한 허용을 뜻하지는 않습니다. [Apple의 SDK 목적 설명 안내](https://developer.apple.com/videos/play/tech-talks/110152/).

TestFlight 내부 테스트 범위입니다. 정식 App Store 심사 제출과 Android 빌드는 수행하지 않았습니다. 실제 iPhone의 각 SNS 앱에서 이미지 수신·크롭·게시 및 취소 흐름은 테스터가 확인해야 합니다.
