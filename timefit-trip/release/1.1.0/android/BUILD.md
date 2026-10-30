# Tribble Android 1.1.0 빌드 기록

기준일: 2026-10-27. 최신 제출 대상은 Android 1.1.0 (6)입니다. Google Play 개인 계정 생성과 Android 기기 인증은 완료했으나, 본인 확인·전화번호 인증 대기로 앱 생성·업로드·심사는 진행하지 못했습니다.

## 최신 빌드 6

- [EAS 빌드](https://expo.dev/accounts/freezner/projects/tribble/builds/eb1d7f66-faae-407c-b98f-a4b2e296ab37): `FINISHED`, 2026-10-27 01:06:51 KST 완료. 앱 버전 `1.1.0`, `versionCode=6`.
- 한국 경로 지원 제한 안내, 카카오맵/Google Maps 외부 연결, 자동차 통신 오류 시 임의 추정 제거, 수동 입력 보호를 포함합니다. 한국 자동차 이동 시간을 자동으로 가져오는 기능은 아직 없습니다.
- [AAB](tribble-1.1.0-6.aab), 29,877,384 bytes, SHA-256 `8054fa46f1edb35dec376de97ea66680a7a8255b5c8a389993e9a476bcd68239`. [다운로드 기록](tribble-1.1.0-6.build.json).
- 최신 검증 결과는 [build-6 폴더](build-6/)에 별도로 보관하며, 아래 빌드 5 검증 자료는 이전 이력으로 유지합니다.
- [검증 요약](build-6/verification.json): bundletool validate, AAB/ APK 서명, package·1.1.0(6)·min24/target36, 권한, 16KB ELF/RELRO 및 APK zipalign 모두 통과했습니다. AAB/APK 모두 이번 경로 수정의 3개 문자열 포함을 확인했습니다.
- 같은 AAB와 기존 업로드 키로 생성한 [범용 APK](tribble-1.1.0-6.apk): 60,353,157 bytes, SHA-256 `3ed0f948669683540bed931424d237ce41dc7477b79c751d33f38961307b31db`. 기존 업로드 인증서와 일치하며 APK v2/v3 서명을 확인했습니다.
- 실제 Android/16KB 기기 실행과 Play 수신 검증은 미실시입니다.
- Play Console에서 “앱 만들기”를 다시 확인했으나 계정 확인 완료 필요 안내로 차단됐습니다. [최신 차단 증빙](proof/build6-account-blocked.jpg).

## 배포 상태

- 사용자 지시에 따라 조직 가입에서 개인 가입으로 방향을 변경했으며, 2026-10-27 `마이플랜비` 개인 계정의 생성과 콘솔 홈 진입을 확인했습니다. 계정 ID는 `5816378196465290804`, Google 계정은 `freezner3@gmail.com`입니다. 등록비 납부 여부는 UI에서 별도 확인하지 않았습니다.
- “앱 만들기”는 계정 확인 미완료 안내로 차단된 상태이며, 앱 레코드 생성·AAB 업로드·심사 제출은 미완료입니다. 2026-10-27 최신 홈 화면에는 본인 확인과 전화번호 인증 두 항목만 조치 필요로 남아 있습니다. [현재 본인·전화번호 인증 대기 증빙](proof/identity-verification-pending.jpg), [이전 3개 인증 항목 증빙](proof/account-verification-pending.jpg).
- 사용자는 본인 확인에 필요한 명세서를 현재 갖고 있지 않아 진행하지 못했다고 알렸습니다. 사용자가 직접 Google에 본인 확인 자료를 제출해야 하며, 명세서의 종류나 대체 자료 조건은 아직 확정하지 않았습니다. 이전 에이전트 시도에서는 `idv-payments-popupIframe`이 로딩 상태였고 신분증 입력·제출은 하지 않았습니다. 현재 선택한 개인 계정에는 D‑U‑N‑S 번호가 필요하지 않습니다.
- 2026-10-26의 결제 프로필 iframe 로딩 정지와 사용자 인계는 이전 진행 이력입니다. [개인 가입 진행 증빙](proof/personal-account-setup.jpg)을 보존합니다.
- 이전 조직 가입 검토 중 D‑U‑N‑S 번호 발급·조회에 관해 NICE Q&A 문의를 접수했습니다. 이 문의는 취소하지 않았으며 [접수 증빙](proof/duns-inquiry-sent.jpg)과 [문의 이력](duns-inquiry-draft.md)을 보존합니다. 전달받은 한국 사업자등록번호 10자리는 D‑U‑N‑S 입력란에 사용하지 않았습니다.
- 신규 개인 계정의 공개 출시 전에는 최소 12명이 연속 14일 이상 참여를 선택한 상태로 비공개 테스트를 진행하고 프로덕션 액세스를 신청해야 합니다. 아직 시작하지 않았습니다. [Google 공식 테스트 요건](https://support.google.com/googleplay/android-developer/answer/14151465?hl=ko).
- Play Console의 Android 기기 인증은 완료했습니다. 사용자 완료 진술과 최신 홈 화면에서 기기 인증 항목이 사라진 것을 함께 확인했습니다. 이는 Tribble APK 실행 검증과 별개이며, 실제 앱 실행 테스트·Android 스크린샷은 여전히 미완료입니다. [Google 공식 기기 인증 요건](https://support.google.com/googleplay/android-developer/answer/14316361?hl=ko).
- 한국 개인 개발자는 Google Play에 표시될 개발자 전화번호를 제공하고 인증해야 합니다. 현재 UI에서는 신분증 승인 등 다른 인증을 완료한 뒤 전화 인증을 진행하도록 안내하며, 전화 인증은 미완료입니다. 에이전트가 NICE 문의용으로 받은 전화번호를 Google Play에 전송하거나 공개하지 않았습니다. [Google 공식 한국 개발자 연락처 요건](https://support.google.com/googleplay/android-developer/answer/6223646?hl=ko).
- [EAS production Android 빌드](https://expo.dev/accounts/freezner/projects/tribble/builds/ae5f16f2-f28f-400b-b4af-3356e56ae48a): **FINISHED**. 앱 버전 `1.1.0`, 원격 `versionCode`는 최초 4에서 5로 증가했습니다. 완료 시각은 2026-10-26 14:35:29 UTC(23:35:29 KST)입니다.
- 2026-10-27에 기존 AAB·APK의 SHA-256과 ZIP 무결성을 재확인했습니다. 아래 산출물과 체크섬은 그대로이며 재빌드하지 않았습니다.

## 빌드 설정과 서명

- 패키지: `com.tribble.tribbleapp`.
- Expo SDK 54.0.38 / React Native 0.81.5 / Hermes, 기존 아키텍처 설정 유지.
- `minSdkVersion=24`, `compileSdkVersion=36`, `targetSdkVersion=36`.
- EAS 이미지: `ubuntu-24.04-jdk-17-ndk-r27b`, Node 20.19.4, NDK 27.1.12297006, AGP 8.11.0, Gradle 8.14.3.
- production 환경의 기존 Google Maps 공개 클라이언트 키를 사용하며, 비밀값은 이 문서에 기록하지 않습니다.
- 이전 EAS Android 빌드·원격 버전·서명 키가 없음을 확인한 뒤 새 업로드 키를 생성했습니다. 패키지는 변경하지 않았습니다.
- 업로드 키 보관 폴더: `/Users/hyungjin/.config/tribble/signing/android-20261026T142851Z`. 폴더 권한 0700, 키·암호 파일 권한 0600. 프로젝트 밖에 보관하며 백업이 필요한 장기 유지 자료입니다.
- 로컬 `credentials.json`은 Git/EAS 소스 아카이브에서 제외합니다. Android keystore 설정 추가 시 iOS 서명 설정은 보존했습니다.
- 키 alias: `tribble-upload`, RSA 2048비트. 이 키는 업로드 서명 키이며, 이후 Google Play App Signing에서 관리할 앱 서명 키와 구분합니다.
- 공개 인증서 SHA-256: `A6:40:CE:E6:29:F9:78:26:FA:C8:F8:5F:C1:13:45:D1:28:EB:C2:ED:C7:D4:F7:C3:0A:6C:95:25:9B:17:A6:25`.

## 이번 Android 변경

- production AAB 빌드와 로컬 서명·SDK 54용 빌드 이미지를 명시했습니다.
- 사용하지 않는 `SYSTEM_ALERT_WINDOW` 권한을 앱 구성과 네이티브 manifest에서 차단했습니다.
- Settings의 공개 개인정보처리방침 링크를 포함합니다.
- 기존 `allowBackup=true`는 OS 백업 가능성을 설명하는 개인정보처리방침과 함께 유지했습니다.
- Android 작업에서는 iOS 자산·서명을 변경하지 않았습니다. 별도 개인정보 정합성 보완으로 CoarseLocation 선언과 Settings 개인정보 링크를 포함한 iOS 빌드 31을 후속 실행했습니다.

## 이전 빌드 5 검증 기록

- 제출용 AAB: `release/1.1.0/android/tribble-1.1.0-5.aab`, 29,873,168 bytes(약 28.49 MiB). 로컬 파일 존재와 ZIP 무결성을 확인했습니다. 빌드 산출물은 Git/EAS 소스 아카이브에서 제외합니다.
- AAB SHA-256: `24c0469a65c6e03adef31497e979eee63671752406ae149bdf2823f5c45cab18`.
- EAS 네이티브 빌드 증거: `compileReleaseKotlin`, `packageReleaseBundle`, `signReleaseBundle`, `bundleRelease` 완료, `BUILD SUCCESSFUL in 5m 11s`.
- `bundletool 1.18.3 validate`: 종료 코드 0.
- `jarsigner -verify`: 종료 코드 0, `jar verified.`. JAR 서명 인증서의 SHA-256이 위 새 업로드 인증서와 일치합니다. 자체 서명 인증서에 대한 표준 경고는 존재하며 이는 Android 업로드 키에서 예상하는 결과입니다.
- 최종 [AndroidManifest.xml](AndroidManifest.xml): 패키지 `com.tribble.tribbleapp`, `versionName=1.1.0`, `versionCode=5`, `minSdk=24`, `targetSdk=36`, `allowBackup=true`, `extractNativeLibs=false`.
- 실제 권한: `INTERNET`, `VIBRATE`, 앱 전용 signature 권한 `com.tribble.tribbleapp.DYNAMIC_RECEIVER_NOT_EXPORTED_PERMISSION`. `SYSTEM_ALERT_WINDOW`, 위치·사진·미디어·저장소 권한은 없습니다.
- [BundleConfig.json](BundleConfig.json): `optimizations.uncompressNativeLibraries.alignment=PAGE_ALIGNMENT_16K`.
- [ELF 검사 결과](elf-alignment.json): `arm64-v8a`/`x86_64`의 `.so` 24개 모두 PT_LOAD 정렬 16,384 이상, 오프셋·가상주소 합동 조건 충족. GNU_RELRO 끝 정렬 또는 독립 LOAD 및 후속 쓰기 영역 분리 조건도 전부 통과했습니다.
- 동일 AAB에서 공식 bundletool로 만든 범용 APK: `release/1.1.0/android/tribble-1.1.0-5.apk`, 60,353,157 bytes. 네이티브 라이브러리 48개가 압축되지 않은 상태로 포함됩니다.
- Build Tools 36의 `zipalign -c -P 16 -v 4`: 종료 코드 0, `Verification successful`. [검사 출력](zipalign-verification.txt).
- APK 자체 검사: `aapt2 dump badging`으로 `com.tribble.tribbleapp`, `1.1.0`, `versionCode=5`, `targetSdk=36` 확인. `apksigner verify --verbose --print-certs` 종료 코드 0, 업로드 인증서 SHA-256 일치. [서명 검사](apk-signing-verification.txt).
- APK SHA-256: `78e83f865c5361284b847652e2b2406f33df4011732953d588be8c6990818256`.

검증 도구는 공식 Google bundletool GitHub release와 Android SDK 배포 서버에서 받았습니다. Build Tools 36 배포 ZIP의 공식 SHA-1을 대조했습니다. 도구는 `/Users/hyungjin/.cache/tribble-build-tools`에 있으며 Android SDK·에뮬레이터 전체 설치는 수행하지 않았습니다.

실제 Android 기기 또는 16KB Android 에뮬레이터에서의 시작·검색·일정 계산·저장·공유 실행은 아직 검증하지 않았습니다. 파일 정렬 검증과 런타임 검증은 별개입니다.

공식 기준: [대상 API 수준](https://developer.android.com/google/play/requirements/target-sdk), [16KB 페이지 지원 및 검증](https://developer.android.com/guide/practices/page-sizes), [bundletool](https://developer.android.com/tools/bundletool).
