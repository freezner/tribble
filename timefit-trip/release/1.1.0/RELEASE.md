# Tribble 1.1.0 출시 인수 기록

기준일: 2026-10-27 01:33 KST. 경로 지원 안내와 외부 지도 연결 수정을 포함한 iOS 빌드 32에 최신 스크린샷·설명을 반영해 재제출했습니다.

## 현재 상태

**iOS 1.1.0 (32)를 2026-10-27 01:33 KST에 재제출했고 “심사 대기 중”을 확인했습니다. 승인 후 자동 출시하며, 현재 실제 판매 버전은 1.0.6입니다. Android 1.1.0 (6) 빌드를 완료했으나 Google Play의 본인 확인·전화번호 인증이 남아 앱 생성과 업로드가 차단됩니다. 양 플랫폼의 이번 업데이트 승인·실제 출시는 아직 확인되지 않았습니다.**

| 항목 | 확인된 상태 |
| --- | --- |
| 현재 심사 제출 버전 | iOS 앱 1.1.0 / 1.1.0 (32) |
| App Store Connect 앱 ID | `6753949093` |
| 빌드 28 | 개인정보 신고 정합성 보완 과정에서 취소 |
| 이전 빌드 29 | `FINISHED` — 네이티브 컴파일·서명 통과. 아이콘 갱신 전 빌드로 최종 제출 대상에서 제외. [빌드 기록](https://expo.dev/accounts/freezner/projects/tribble/builds/24bc3447-784f-4f71-993b-41c3156cea0a) |
| 이전 빌드 29 제출 | 업로드·처리 완료, 최종 대상으로 사용하지 않음. [제출 기록](https://expo.dev/accounts/freezner/projects/tribble/submissions/1e64aea2-ec2a-4c85-83af-d4bc942a636c) |
| 이전 빌드 30 | `FINISHED` — 네이티브 컴파일·서명 성공, 완료 시각 2026-10-26 12:42:26 UTC. 심사 취소 완료, 빌드 31로 교체. [2dcf8ea9-3c68-4ec7-b984-4fb9d0658f77](https://expo.dev/accounts/freezner/projects/tribble/builds/2dcf8ea9-3c68-4ec7-b984-4fb9d0658f77) |
| 빌드 30 EAS 제출 | `FINISHED`, `error: null` — 업로드 완료. [6222b62e-fba0-4d11-90bd-63a2aff42d9d](https://expo.dev/accounts/freezner/projects/tribble/submissions/6222b62e-fba0-4d11-90bd-63a2aff42d9d) |
| 빌드 31 | `FINISHED` — 네이티브 아카이브 성공. 개인정보 manifest에 `CoarseLocation`을 앱 기능·제품 개인 맞춤화 목적으로 추가, 사용자 연결 예·추적 아니오. [695bd5b6-eacf-4c04-821c-7ea73b24636f](https://expo.dev/accounts/freezner/projects/tribble/builds/695bd5b6-eacf-4c04-821c-7ea73b24636f) |
| 빌드 31 EAS 제출 | `FINISHED`, `error: null` — 업로드 완료. [43823e90-6e44-4baf-9a23-ad11a3249f50](https://expo.dev/accounts/freezner/projects/tribble/submissions/43823e90-6e44-4baf-9a23-ad11a3249f50) |
| 빌드 32 | `FINISHED` — 한국 경로 지원 안내·외부 지도 연결·수동 입력 보호 포함. [51703739-ce73-4bde-81bd-6cc81e8953cc](https://expo.dev/accounts/freezner/projects/tribble/builds/51703739-ce73-4bde-81bd-6cc81e8953cc) |
| 빌드 32 EAS 제출 | `FINISHED` — [1f3dc913-13bd-4cae-8d5f-ac490074b606](https://expo.dev/accounts/freezner/projects/tribble/submissions/1f3dc913-13bd-4cae-8d5f-ac490074b606) |
| App Store 빌드 처리·연결 | 빌드 32 처리 완료, iOS 앱 1.1.0에 연결·저장 완료 |
| App Store 심사 제출 | 빌드 32 심사 대기 중 — 2026-10-27 01:33 KST 재제출 완료 |
| 최종 App Store 심사 제출 ID | [e3d73a32-2821-4aed-9fe6-33215e41ed73](https://appstoreconnect.apple.com/apps/6753949093/distribution/reviewsubmissions/details/e3d73a32-2821-4aed-9fe6-33215e41ed73) |
| 이전 빌드 31 심사 | `e791affc-3118-4784-9897-011d95ba08c6` — 취소 완료, 빌드 32로 교체 |
| 이전 App Store 심사 제출 ID | `247909e2-f7a8-43bb-9e81-aa616b7bb334` — 빌드 30, 2026-10-26 21:46 KST 제출 후 취소 |
| 출시 설정 | 자동 출시·모든 사용자 즉시 업데이트·평점 유지 확인 |
| 승인·실제 출시 | 미완료 |

## 구현 및 빌드 기준

- 날짜·시작·마감 시각과 이동·대기 여유를 기준으로 하루 일정을 계산합니다.
- 장소별 체류 시간·방문 순서와 구간별 교통수단·이동 시간을 편집하며, 계산 결과·추정·계산 불가·직접 입력을 구분합니다.
- 초안 자동 보관, 여행 저장·삭제 확인, 일정 이미지 공유와 태블릿 본문 폭 조정을 반영했습니다.
- 이번 업데이트에서는 코랄 배경에 둥근 소문자 `t`를 넣은 아이콘을 `assets/icon.png`에 반영하고 iOS·Android·favicon·splash 자산을 동기화했습니다. 선택 원본과 생성 프롬프트는 [아이콘 기록](icon/README.md)에 보관했습니다.
- Expo 54.0.38, React Native 0.81.5, React 19.1을 사용합니다.
- 클라우드 빌드 환경은 Xcode 26.2이며, iOS 최소 지원 버전은 15.1입니다.
- 서명 갱신을 완료했으며, 만료일은 2027-10-26입니다.

## 완료한 검증과 산출물

- 최신 회귀 테스트 73개와 TypeScript 타입 검사를 통과했습니다. 기존 JavaScript 번들 내보내기 검증도 완료했습니다.
- Expo Go에서 iPhone·iPad 실행 및 공유 PNG 생성을 확인했습니다.
- 빌드 29·30·31·32에서 클라우드 네이티브 빌드를 통과했습니다. 최종 빌드 32 IPA에서 버전 `1.1.0`, 빌드 `32`, 개인정보 4개 유형과 원본 선언의 일치, 경로 수정 문자열 포함 및 `codesign --verify --deep --strict` 성공을 확인했습니다. [IPA 검증 기록](ios/build-32-verification.json), [소스 해시 기록](source-snapshot-build32-6.json). 최종 서명 빌드의 실행 검증은 별도 확인이 필요합니다.
- 실제 앱 화면 기반 RGB 스크린샷: [iPhone 6장](screenshots/iphone/), [iPad 5장](screenshots/ipad/).
- 스토어 문구 원본: [한국어](metadata/ko-KR.json), [영어](metadata/en-US.json).

## App Store Connect 반영

- 기존 빌드 31의 심사를 취소하고 한국 경로 안내를 보완한 빌드 32로 교체·재제출했습니다. 2026-10-27 01:33 KST “심사 대기 중”을 확인했습니다. [최종 빌드 32 제출 증빙](proof/submission-build32-screenshots.jpg), [제출 기록](ios/build-32-submission.json). 이전 30·31 제출 증빙도 보관합니다.
- 자동 출시·모든 사용자 즉시 업데이트·기존 평점 유지 설정을 확인했습니다. 승인과 실제 출시는 아직 미완료입니다.
- 한국 내 자동차 자동 계산 제한, 카카오맵/Google Maps 열기 → 앱 복귀 → 분 단위 직접 입력 흐름을 한국어 설명·업데이트 내역에 반영했습니다. 심사 메모에 초당순두부마을 → 부산역 재현 방법을 추가했습니다.
- 현재 기능에 맞춰 설명·업데이트 안내를 반영했습니다. 한국 자동차 이동 시간은 자동 계산하지 않으며, 카카오맵에서 확인한 뒤 분 단위로 직접 입력하는 흐름을 명시했습니다.
- iPhone 교통수단 화면 1장을 교체하고 iPad 교통수단 화면 1장을 추가해 최종 iPhone 6장·iPad 5장을 등록했습니다. Apple 이미지 처리 완료, 새 썸네일과 순서를 확인했습니다. [iPhone 등록 증빙](proof/screenshots-iphone-build32.jpg), [iPad 등록 증빙](proof/screenshots-ipad-build32.jpg), [촬영·검증 기록](screenshots/README.md).
- 01:12 KST에 제출한 빌드 32 심사 `99310202-a9d5-4b57-9ff6-abc46aa87ca0`는 이미지 갱신을 위해 취소했고, 위 최종 심사로 재제출했습니다. 기존 01:12 [제출 증빙](proof/submission-build32.jpg)은 이력으로 보존합니다.
- 큰 Face ID iPhone 크기에 연결돼 있던 이전 스크린샷 6장은 연결을 해제했습니다. 자산 보관함의 원본은 유지했으며, 모든 기존 표시 크기에서 최신 스크린샷 상속을 확인했습니다.
- 지원 URL: https://github.com/freezner/tribble/blob/main/timefit-trip/SUPPORT.md
- 개인정보 URL: https://github.com/freezner/tribble/blob/main/timefit-trip/privacy.md
- 위 지원·개인정보 URL 연결을 완료했습니다.
- 개인정보 신고 4개 유형을 게시했습니다. 기존 `SearchHistory`, `OtherUsageData`, `OtherDiagnosticData`는 앱 기능·분석 목적으로 신고했습니다. 추가한 `CoarseLocation`(대략적인 위치)은 앱 기능·제품 개인 맞춤화 목적으로 신고했습니다. 모두 사용자 연결은 예, 추적은 아니오입니다. [게시 완료 증빙](proof/privacy-build31.jpg)을 보관했습니다.
- 공개 지원·개인정보 문서를 2026-10-27 기준으로 갱신하고 원격 내용과 로컬의 일치를 확인했습니다. 외부 지도 버튼을 누르면 선택한 장소의 좌표·교통수단과 카카오맵의 경우 편집 가능한 장소명이 전달되며, Google 키·장소 ID·전체 일정·출발시각·기기 GPS는 전달하지 않는다고 설명합니다. 기존 Google 요청 로그·보관·삭제 범위 안내도 유지했습니다. [개인정보 검토 기록](metadata/route-link-privacy-review.md).

## Android 및 Google Play 준비

- 최신 Android 1.1.0 (6)이 `FINISHED` 상태입니다. 완료 시각은 2026-10-27 01:06:51 KST이며 이번 경로 수정이 포함됩니다. [빌드](https://expo.dev/accounts/freezner/projects/tribble/builds/eb1d7f66-faae-407c-b98f-a4b2e296ab37), [AAB](android/tribble-1.1.0-6.aab), [다운로드 기록](android/tribble-1.1.0-6.build.json).
- 빌드 6 AAB와 동일 서명의 [범용 APK](android/tribble-1.1.0-6.apk)의 버전·권한·서명 및 16KB ELF/RELRO/ZIP 정렬 검증을 통과했습니다. [검증 요약](android/build-6/verification.json). 실제 기기 실행은 미검증입니다.
- 2026-10-27 이번 반영 작업에서도 Play Console의 “앱 만들기”를 확인했으며, 계정 확인 완료 필요 안내로 차단됐습니다. [최신 차단 증빙](android/proof/build6-account-blocked.jpg). 아래 빌드 5 기록은 이전 이력입니다.
- Android AAB 1.1.0 (versionCode 5) 빌드가 `FINISHED` 상태이며, 완료 시각은 2026-10-26 14:35:29 UTC입니다. [ae5f16f2-f28f-400b-b4af-3356e56ae48a](https://expo.dev/accounts/freezner/projects/tribble/builds/ae5f16f2-f28f-400b-b4af-3356e56ae48a).
- 이전 빌드 5 [AAB](android/tribble-1.1.0-5.aab)와 동일 AAB에서 생성한 [범용 APK](android/tribble-1.1.0-5.apk)의 구조·버전·권한·서명을 검증했습니다. 대상 API 36, `PAGE_ALIGNMENT_16K`, 64비트 네이티브 라이브러리 24개의 ELF 정렬 조건과 APK `zipalign -P 16` 검사를 모두 통과했습니다. 상세 근거·체크섬은 [Android 빌드 기록](android/BUILD.md)에 보관했습니다.
- 2026-10-27에 기존 AAB·APK의 SHA-256과 ZIP 무결성을 재확인했습니다. 산출물은 변경하지 않았으며 재빌드하지 않았습니다.
- 실제 Android 기기 또는 16KB 에뮬레이터에서의 시작·검색·계산·저장·공유 실행은 아직 검증하지 않았습니다. 파일 정렬 검증이 런타임 검증을 대신하지는 않습니다.
- Google Play는 조직 가입에서 개인 가입으로 방향을 변경한 뒤, 2026-10-27 개인 계정 “마이플랜비”의 생성과 콘솔 홈 진입을 확인했습니다. 계정 ID는 `5816378196465290804`, Google 계정은 `freezner3@gmail.com`입니다. 등록비 납부 여부는 UI에서 별도 확인하지 않았습니다.
- “앱 만들기”는 계정 확인 미완료 안내로 차단된 상태이며, 앱 레코드 생성·AAB 업로드·심사 제출은 미완료입니다. 2026-10-27 최신 홈 화면에는 본인 확인과 전화번호 인증 두 항목만 조치 필요로 남아 있습니다. [현재 본인·전화번호 인증 대기 증빙](android/proof/identity-verification-pending.jpg), [이전 3개 인증 항목 증빙](android/proof/account-verification-pending.jpg).
- 사용자는 본인 확인에 필요한 명세서를 현재 갖고 있지 않아 진행하지 못했다고 알렸습니다. 사용자가 직접 Google에 본인 확인 자료를 제출해야 하며, 명세서의 종류나 대체 자료 조건은 아직 확정하지 않았습니다. 이전 에이전트 시도에서는 `idv-payments-popupIframe`이 로딩 상태였고 신분증 입력·제출은 하지 않았습니다. 현재 선택한 개인 계정에는 D‑U‑N‑S 번호가 필요하지 않습니다.
- 2026-10-26의 결제 프로필 iframe 로딩 정지와 사용자 인계는 이전 진행 이력입니다. [개인 가입 진행 증빙](android/proof/personal-account-setup.jpg)을 보존합니다.
- 새 개인 계정의 공개 출시 전에는 최소 12명이 연속 14일 이상 참여를 선택한 상태로 비공개 테스트를 진행한 뒤 프로덕션 액세스를 신청해야 합니다. 이 요건은 아직 충족하지 않았습니다. [Google 공식 테스트 요건](https://support.google.com/googleplay/android-developer/answer/14151465?hl=ko).
- Play Console의 Android 기기 인증은 완료했습니다. 사용자 완료 진술과 최신 홈 화면에서 기기 인증 항목이 사라진 것을 함께 확인했습니다. 이는 Tribble APK 실행 검증과 별개이며, 실제 앱 실행 테스트·Android 스크린샷은 여전히 미완료입니다. [Google 공식 기기 인증 요건](https://support.google.com/googleplay/android-developer/answer/14316361?hl=ko).
- 한국 개인 개발자는 Google Play에 표시될 개발자 전화번호를 제공하고 인증해야 합니다. 현재 UI에서는 신분증 승인 등 다른 인증을 완료한 뒤 전화 인증을 진행하도록 안내하며, 전화 인증은 미완료입니다. 에이전트가 NICE 문의용으로 받은 전화번호를 Google Play에 전송하거나 공개하지 않았습니다. [Google 공식 한국 개발자 연락처 요건](https://support.google.com/googleplay/android-developer/answer/6223646?hl=ko).
- 이전 조직 가입 검토 중 Google 개발자용 한국 D‑U‑N‑S 공식 안내에서 연결된 NICE Q&A에 문의를 등록했습니다. 사용자에게 명시적인 발송 승인과 연락처를 받아 진행한 접수 이력으로 유지하며, 문의를 취소하지 않았습니다. 전화번호는 출시 문서에 보관하지 않습니다. [문의 전달 완료 증빙](android/proof/duns-inquiry-sent.jpg), [문의 기록](android/duns-inquiry-draft.md).
- 한국어 메타데이터, 512×512 등록 아이콘, 1024×500 피처 그래픽을 로컬에 준비했습니다. [Google Play 등록 자료](android/STORE_ASSETS.md). 실제 Android 스크린샷은 아직 준비하지 않았으며 iOS 스크린샷을 재사용하지 않았습니다.

## Git 상태와 인계 사항

앱 코드의 Git 커밋·게시 작업은 수행하지 않았습니다. 공개 원격 `main`에는 아래 문서 전용 커밋 다섯 개를 추가했습니다.

1. [`2bc8c0e`](https://github.com/freezner/tribble/commit/2bc8c0e4245a4141fb720eb341f7d2c3fce85e62): 지원 문서 신규 게시 및 개인정보 안내 갱신.
2. [`9aaf585`](https://github.com/freezner/tribble/commit/9aaf585b6e27fc5fbf3e94c98658b601b799050f): Google 요청 로그·보관 및 삭제 범위 보완.
3. [`3c4e570`](https://github.com/freezner/tribble/commit/3c4e57062a9fc3f2ef2415964330af9300dcbaf9): Google의 IP 기반 대략적인 위치 처리 안내 추가.
4. [`b0e0124`](https://github.com/freezner/tribble/commit/b0e0124a207efb1e536e52a49245acaec317a1e9): 외부 지도 데이터 전달과 이용 방법을 개인정보 문서에 반영.
5. [`7a4cda1`](https://github.com/freezner/tribble/commit/7a4cda12c73471df62b5aecb03edb308c49b9a14): 한국 경로 지원 제한·지도 확인 후 수동 입력 방법을 지원 문서에 반영.

로컬 `SUPPORT.md`와 `privacy.md`는 공개 문서와 동기화했습니다. 이후 앱 코드를 게시할 때 위 원격 문서 커밋을 반영해야 합니다.

iOS의 남은 외부 단계는 Apple 심사이며, 결과에 따라 승인·실제 출시 상태를 갱신해야 합니다. Android는 사용자가 본인 확인 자료를 직접 제출하고, 신분증 승인 등 다른 인증 완료 후 전화번호 인증을 진행해야 합니다. 기기 인증은 완료했으나 앱 실행 테스트는 별도로 남아 있습니다. 이후 앱 레코드 생성·AAB 업로드, 앱 실행 확인·스크린샷 준비·스토어 등록, 12명·연속 14일 비공개 테스트, 프로덕션 액세스 신청·승인과 출시 제출이 필요합니다. iOS 자동 출시·모든 사용자 즉시 업데이트·평점 유지 설정은 2026-10-27에 재확인했으며, 양 플랫폼 모두 승인과 실제 출시는 아직 확인되지 않았습니다.

## 2026-10-27 한국 자동차 경로 후속 수정 — iOS 심사 제출·Android 빌드 완료

- 사용자 재현 구간은 초당순두부마을 → 부산역입니다. 실제 Google Distance Matrix 요청에서 자동차는 `ZERO_RESULTS`, 같은 구간 대중교통은 `OK`, 같은 키로 요청한 도쿄역 → 시나가와역 자동차는 `OK`였습니다. Google의 공식 한국 경로 지원 제한과 일치합니다. 이 검증에 키 값이나 키를 포함한 URL을 기록하지 않았습니다.
- Places 국가 코드로 확인된 한국 구간의 자동차·도보·자전거 `ZERO_RESULTS`를 `provider-coverage`로 안내하고, 장소 식별 실패(`NOT_FOUND`)는 `place-not-found`로 분리합니다. 인증·할당량·성공 응답은 기존 의미를 유지합니다.
- 출발·도착지와 교통수단이 입력된 카카오맵/Google Maps를 열고, 돌아와 시간을 직접 입력할 수 있습니다. 자동차 통신 오류에 고정 속도로 직선거리 시간을 생성하던 처리를 제거했습니다. 한국 자동차 시간을 앱에서 자동으로 가져오는 기능은 아직 구현되지 않았습니다.
- 전체 회귀 검사 73개, TypeScript 및 diff 공백 검사를 통과했습니다. iOS 26.2 / Expo Go SDK 54에서 두 장소 검색·추가, 자동차 선택, 지원 제한 안내, 카카오 연결 페이지 전환, 앱 복귀, 276분 직접 입력과 요약·타임라인 반영을 확인했습니다. [지원 제한과 복구 화면](proof/korean-driving-recovery.jpg).
- 같은 공식 링크를 데스크톱 카카오맵에서도 열어 두 장소·자동차 모드와 실제 경로(검증 시점 4시간 36분·372.9km)를 확인했습니다. 이는 조회 시점의 지도 예상값이며 일정의 지정 출발시각에 대한 보장값은 아닙니다. [지도 경로 확인 화면](proof/kakao-driving-route.jpg). 시뮬레이터에서 카카오맵 앱은 설치하지 않았으며 모바일 연결 페이지 이후의 지도 조작은 자동화 도구 제한으로 검증하지 못했습니다.
- 이 변경은 **iOS 빌드 32·Android 빌드 6에 포함**됐습니다. iOS는 App Store 심사 대기 중이며 Android는 계정 인증 때문에 업로드 전입니다. GitHub 지원·개인정보 문서도 갱신했습니다. 기존 iOS 빌드 31·Android 빌드 5에는 이 수정이 없습니다.
- 국내 자동차 자동 계산의 다음 단계는 카카오모빌리티 일반/미래 경로 API 연동과 REST API 키를 앱에 넣지 않는 서버 중계입니다. 서비스용 키와 서버 운영 구성이 아직 준비되지 않았습니다.
