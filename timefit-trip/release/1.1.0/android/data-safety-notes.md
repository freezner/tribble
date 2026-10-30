# Tribble 1.1.0 Android 데이터 보안·콘텐츠 신고 검토

검토일: 2026-10-26. 대상 패키지: `com.tribble.tribbleapp`.

이 문서는 로컬 코드, 의존성, 최종 Android AAB에서 추출한 Manifest와 공식 문서를 대조한 팩트시트다. **사실**, **신고 권고**, **미확인**을 구분했다. `1.1.0`/`versionCode=5` AAB의 정적 빌드·권한 검증은 완료됐고, 실제 Android 기기/에뮬레이터 실행과 네트워크 동작, Play Console 데이터 보안 입력·제출은 아직 완료되지 않았다. 모든 배포 중 Android 버전을 함께 확인해야 하며, iOS 답변을 그대로 복사하지 않는다.

## 핵심 결론

- `데이터를 수집하지 않음`으로 신고하면 현재 코드와 맞지 않는다. Google REST API로 검색·경로 요청을 전송한다.
- GPS를 읽지는 않지만 **IP 기반 대략 위치 사용은 있다.** Autocomplete Legacy의 `locationbias` 기본값이 적용된다.
- 앱에 계정·광고·결제·자체 여행 서버는 없다. 여행 삭제는 기기 저장소에 대한 기능이며 Google 요청 로그 삭제가 아니다.
- Android `allowBackup=true`다. 여행이 기기 밖으로 절대 이동하지 않거나 앱 삭제로 모든 사본이 즉시 삭제된다고 설명하면 안 된다.

## 1. 코드와 의존성에서 확인한 사실

| 대상 | 확인 결과와 근거 |
|---|---|
| 핵심 의존성 | Expo 54, React Native 0.81.5, AsyncStorage 2.2.0, Axios, expo-sharing 14.0.8, react-native-view-shot 4.0.3, i18next, Zustand, UI 라이브러리. `package.json` |
| 광고·분석 SDK | 앱 의존성/소스에 AdMob, Firebase Analytics, Crashlytics, Sentry, 광고 ID 접근 코드가 없다. 개발 도구나 Android/Play 자체 진단을 앱의 별도 분석 SDK로 간주하지 않았다. 최종 AAB 의존성은 별도 확인 대상이다. |
| 지도 SDK | Google Maps/Places 네이티브 SDK를 사용하지 않는다. Axios로 Places Autocomplete Legacy·Place Details Legacy·Distance Matrix REST를 호출한다. SDK 전용 개인정보 표를 그대로 적용하지 않는다. `src/services/googleApi.ts:73,92,117` |
| 추가 API | `getDirections` 함수는 있으나 현재 화면 호출처가 없다. 운영 경로 계산은 Distance Matrix다. `src/services/googleApi.ts:180` |
| 로그인·계정 | 가입·로그인·OAuth·서버 계정·프로필·구독 기능이 없다. 일정 ID는 로컬 객체 식별자이고 Google 요청에 보내지 않는다. |
| 자체 저장 | 여행 이름, 장소 이름/주소/좌표/place ID, 일정 날짜/시각, 체류·이동·여유 시간, 교통수단, 결과, 초안은 AsyncStorage에 저장한다. 언어 설정은 별도 키다. 앱 수준 추가 암호화는 없다. `src/utils/storage.ts`, `src/hooks/useLanguage.ts:14` |
| 로그 | 앱 소스에서 검색어·API 키·경로 원문을 console/자체 원격 로그에 기록하는 코드가 발견되지 않았다. Google 서버 로그는 아래와 별개다. |
| 삭제 | 개별 삭제는 저장본+초안을 삭제한다. 전체 삭제는 모든 여행+초안과 legacy 복구 사본을 지운다. 언어 설정, 이미 공유한 파일, OS 백업, Google 로그는 이 작업의 대상이 아니다. `src/utils/storage.ts:136,148`, `src/screens/SettingsScreen.tsx:21` |

### Android 권한·컴포넌트

최종 AAB에서 추출한 [AndroidManifest.xml](AndroidManifest.xml)과 [빌드 검사 기록](BUILD.md)을 확인했다. 대상은 `tribble-1.1.0-5.aab`이며 실제 파일 SHA-256이 빌드 기록의 `24c0469a65c6e03adef31497e979eee63671752406ae149bdf2823f5c45cab18`과 일치한다. 패키지 `com.tribble.tribbleapp`, 버전 `1.1.0`/`5`, min SDK 24, target SDK 36이다.

| 항목 | 최종 AAB Manifest 확인 결과 | 해석 |
|---|---|---|
| INTERNET | 선언 | 검색·경로 HTTPS 통신 |
| VIBRATE | 선언 | 현재 JS에서 사용처는 확인되지 않음. 데이터 접근 권한은 아님 |
| 앱 전용 동적 수신 권한 | `com.tribble.tribbleapp.DYNAMIC_RECEIVER_NOT_EXPORTED_PERMISSION`, protectionLevel `0x2`(signature) | 일반 사용자 데이터 접근 권한이 아닌 앱 수신 보호용 권한 |
| SYSTEM_ALERT_WINDOW | 없음 | 소스에서 차단한 권한이 최종 병합 결과에서도 제거됨 |
| 위치 권한 3종 | 없음 | coarse/fine/background GPS 권한 없음. IP 지역 추론과는 별개 |
| 저장소·사진·영상·오디오 읽기/쓰기 | 없음 | 기존 사진·미디어 라이브러리를 읽는 기능 없음 |
| 카메라·마이크·연락처·SMS·전화·캘린더·AD_ID | 없음 | 최종 병합 결과에서도 해당 권한 없음 |
| FileProvider | SharingFileProvider와 FileSystemFileProvider 모두 `exported=false`, `grantUriPermissions=true` | 생성 파일의 URI 공유 지원. 전체 사진 라이브러리 접근 권한은 없음 |
| debug/HTTP 설정 | `debuggable`, `usesCleartextTraffic`, `networkSecurityConfig` 속성 없음 | 개발용 `debuggable=true`/`usesCleartextTraffic=true`가 최종 Manifest에 없음. 앱 API URL은 HTTPS이며 실제 트래픽 검증은 미완료 |
| Expo OTA | `expo.modules.updates.ENABLED=false` | 최종 AAB에서도 비활성 설정 |
| 백업 | `allowBackup=true`; `fullBackupContent`, `dataExtractionRules` 속성 없음 | 백업 제한 규칙 미지정. 아래 OS 백업 조건 유지 |
| 네이티브 라이브러리 | `extractNativeLibs=false` | 라이브러리 패키징 설정이며 데이터 수집 항목은 아님 |

Manifest의 `queries`에는 HTTPS VIEW, OPEN_DOCUMENT_TREE, SEND가 있다. 이는 처리 가능한 다른 앱을 조회하는 선언이며 저장소 접근 허가나 문서 읽기 실행의 증거가 아니다. AndroidX Startup provider도 `exported=false`다. ProfileInstallReceiver는 exported 상태지만 `android.permission.DUMP`로 보호되며, 앱이 DUMP 권한을 요청하는 `uses-permission` 선언은 없다.

## 2. 실제 데이터 흐름

### Google 요청

`src/services/googleApi.ts`는 다음 값을 직접 Google에 보낸다. API 키의 값이나 요청 URL 원문은 이 문서에 기록하지 않는다.

| 발생 시점 | 전송 정보 |
|---|---|
| 검색창에 두 글자 이상 입력 후 debounce | 검색어, 결과 언어, 프로젝트 API 키 |
| 검색 결과의 장소 선택 | Google place ID, 요청 fields, 언어, 프로젝트 API 키 |
| 구간 계산·재계산 | 출발/도착 place ID 또는 위경도, 교통수단, 언어·region, 지원되는 경우 출발 timestamp, 프로젝트 API 키 |
| 모든 HTTPS 요청 | 네트워크 상대가 접속 IP 등 통신 정보를 받음. VPN/NAT 등에 따라 기기의 물리 위치와 다를 수 있음 |

**확인된 API 기본 동작:** 현재 검색 호출에는 `locationbias`, `location`, `radius`가 없다. Google의 해당 Legacy API 문서는 `locationbias` 생략 시 IP 주소 기반 지역 편향을 기본으로 사용한다고 명시한다. 따라서 GPS 미사용만으로 위치 처리가 없다고 할 수 없다. 목적지 좌표 자체와 사용자의 현재 위치는 구별한다. API 문서가 추정 위치의 정확한 면적이나 실제 좌표값을 보장하지는 않는다. [Places Autocomplete Legacy 공식 문서](https://developers.google.com/maps/documentation/places/web-service/legacy/autocomplete#locationbias)

**Google 보관 사실:** Maps Platform은 모든 요청을 로그로 기록하며, 일반적으로 IP, 요청 매개변수, 요청 시각, 응답 상태 등이 포함된다. 서비스 개선·기술 지원·운영·보안·용량 계획에 사용되고 업무상 필요에 따라 보관된다. 고정 보관 일수, 이 프로젝트의 로그 접근 내역, 추론된 지역값의 별도 보관 여부는 확인되지 않았다. [Google 보안·보관 문서](https://developers.google.com/maps/security/compliance/security-compliance#data_collection_usage_and_retention)

Google 약관 4.4는 검색어·IP·좌표의 수집/보관 및 Google 제품·서비스 개선 사용을 다루며 controller-controller 조건을 연결한다. 이 사실만으로 광고 추적이 있다고 단정하지도, 개발자 지시에만 따르는 처리자라고 단정하지도 않는다. [Google Maps Platform 약관](https://cloud.google.com/maps-platform/terms)

### 이미지 공유

사용자가 공유 버튼을 눌러 현재 일정 PNG를 만들고 OS 공유 창에서 대상 앱을 선택한다. 자동 서버 업로드·사진첩 읽기·자동 앨범 저장·다른 사용자의 게시물 수신은 없다. 파일 이름에도 여행 이름이 포함된다. `src/utils/shareTrip.ts:9` 및 expo-sharing의 Android `ACTION_SEND`/FileProvider 코드로 확인했다. [Expo Sharing 54 공식 문서](https://docs.expo.dev/versions/v54.0.0/sdk/sharing/)

**판단:** 사용자가 의도적으로 대상 앱을 선택하는 이 흐름에는 Play의 사용자 주도 공유 예외가 적용될 여지가 명확하다. 이 예외를 근거로 Google 자동 검색·로그 전송까지 일괄 제외하면 안 된다. 공유 버튼만으로 Photos/Files의 상시 수집을 신고할 근거도 없다.

### OS 백업

**사실:** 최종 AAB Manifest에서 `allowBackup=true`와 `fullBackupContent`/`dataExtractionRules` 미지정을 확인했다. AsyncStorage Android 구현은 앱 데이터베이스 경로를 사용한다.

**공식 동작과 조건:** Android Auto Backup의 기본 대상에 앱 데이터베이스·내부 파일·설정이 포함된다. 사용자 백업 설정·기기 상태·네트워크 등 조건에 따라 실행되며 재설치/새 기기에서 복원될 수 있다. Android 9 이상에서 화면 잠금 등을 충족할 때 종단 간 암호화가 적용되므로 min SDK 24인 모든 지원 기기에 이를 보장할 수 없다. 일부 Android 12+ 기기는 `allowBackup=false`여도 기기간 전송이 가능하다. [Android Auto Backup](https://developer.android.com/identity/data/autobackup)

**미확인:** 실제 기기의 백업 활성 상태·전송 방식·보관 내용·삭제 반영 시점은 확인하지 않았다. 개발자 서버 동기화와 OS 백업은 별개지만, 현재 설정에서 모든 로컬 여행이 영구적으로 기기 안에만 있다고 주장할 수 없다. Play의 외부 클라우드 업로드 예외는 구현 조건이 있으므로 OS 백업에 자동 적용됐다고 인증하지 않는다. 로컬 전용 항목의 최종 신고 범위와 백업 정책을 함께 결정해야 한다.

## 3. Google Play 기준으로 판단한 신고안

Play의 수집은 기기 밖 전송이다. 일시 처리도 폼에는 답하며, 메모리에서 요청 처리만 한 경우에 한정해 공개 라벨 예외가 있다. 제3자 전송에는 공유 여부 판단이 추가된다. iOS의 `사용자와 연결됨` 항목을 Play 항목으로 옮기지 않는다. [Android 데이터 공개 정의](https://developer.android.com/about/versions/14/features/app-metadata#data-collection)

서비스 제공자 예외는 개발자 대신 지시에 따라 처리하는 경우다. Optional은 실제 선택 가능성이 있어야 하고 핵심 기능에 필요하면 Required다. IP는 실제 용도에 따라 분류하며, IP로 추론한 위치도 위치 항목에 포함된다. [Play Data safety 공식 안내](https://support.google.com/googleplay/android-developer/answer/10787469?hl=en)

아래는 현재 구현을 위한 권고다. `공유 Yes`는 Google의 독립 사용과 로그를 고려해 예외를 임의로 적용하지 않은 판단이다. Google이 각 REST API/데이터 유형에 대한 예외 충족 근거를 제공하면 재검토할 수 있다.

| Play 항목 | 수집·공유 권고 | 일시 처리·필수 여부 | 목적 및 확실성 |
|---|---|---|---|
| App activity → In-app search history | Collected Yes / Shared Yes | Ephemeral No / Required | App functionality 확실. Google 개선·운영 로그를 고려한 Analytics, Fraud prevention/security는 보수적 목적 매핑이며 필드별 Google 목적표는 미공개 |
| Location → Approximate location | Collected Yes / Shared Yes 권고 | Ephemeral No 권고 / Required | IP 지역 편향에 따른 App functionality + Personalization. 입력 IP가 로그로 남아 일시 처리 보장을 할 수 없음. 추론 지역값 자체의 보관·추가 분석 용도는 미확인 |
| App info and performance → Diagnostics | Collected Yes / Shared Yes 권고 | Ephemeral No / Required | Google 응답 상태·요청 운영 로그. Analytics 및 Fraud prevention/security, 기능 유지 목적. 별도 앱 충돌 수집으로 확대하지 않음 |
| App activity → Other actions 또는 App interactions | 추가 검토 | 로그 보관 시 No | 경로 요청 시각·교통수단·요청 사용 기록의 분류 후보. 모든 화면 탭이나 앱 실행 이벤트를 수집하는 코드는 없으므로 그 의미로 신고하지 않음 |
| Device or other IDs | 일괄 Yes로 확정하지 않음 | 미확인 | 프로젝트 공용 API 키는 사용자 기기 식별자가 아님. IP의 별도 기기 식별 사용은 API 문서에서 확인되지 않음 |
| Precise location | 현재 근거로 선택하지 않음 | 해당 없음 | GPS 권한/접근 없음. 선택한 목적지 좌표를 사용자의 현재 정밀 위치로 자동 분류하지 않음 |
| Other user-generated content / Files and docs / Photos | 여행 로컬 저장만으로 수집 확정하지 않음 | OS 백업 판단 별도 | 여행 제목·일정 이미지의 자체 서버 업로드 없음. 사용자 주도 공유 예외와 OS 백업 조건을 각각 확인 |

**Approximate location을 Optional로 권고하지 않는 이유:** 새 장소 추가가 Google 검색에 의존하며 현재 앱에는 IP 지역 편향을 끄는 선택이나 완전한 오프라인 장소 생성 기능이 없다. 단순히 사용자가 검색을 전혀 하지 않거나 빈 여행만 만들 수 있다는 사실을 핵심 기능의 선택적 수집으로 보지 않았다. 수동 이동 시간 입력은 이미 추가된 장소 사이의 시간을 보완하는 기능이다.

**공유 예외를 확정하지 않는 이유:** 결과 목록의 `Google Maps` 표시는 첫 요청 뒤에 나타난다. 사용자가 Google을 통한 요청을 사전에 충분히 인지·동의했다고 그 표시 하나로 단정하기 어렵고, 자체 서비스 개선용 로그까지 사용자 주도 공유 예외가 적용되는지 확인되지 않았다. 따라서 현재 신고에서는 공유를 누락하지 않는 쪽을 권고한다.

### 보안·삭제 질문

- **전송 중 암호화:** 확인한 운영 API는 HTTPS만 사용하므로 앱 자체 요청은 Yes 근거가 있다. 최종 AAB Manifest에 개발용 평문 허용 설정은 없지만, 전체 실행 트래픽을 관찰한 것은 아니다. 실제 다른 수집 전송이 없는지 런타임 검증은 남아 있다. OS 백업의 종단 간 암호화와 이 질문은 같은 의미가 아니다.
- **계정 생성:** 없음. 로그인 방식은 해당 없음. 계정 생성 앱에 요구되는 계정 삭제 동선을 있다고 꾸며 답하지 않는다. [Play 계정 삭제 요건](https://support.google.com/googleplay/android-developer/answer/13327111?hl=en)
- **수집 데이터 삭제 요청:** 로컬 삭제 기능만으로 Google 요청 로그의 삭제 요청 지원을 Yes로 답하지 않는다. 운영자가 수행 가능한 절차나 보관 기간 보장이 아직 없다. `90일 내 자동 삭제`도 확인되지 않았다.
- **독립 보안 심사:** 수행 근거 없음. Google 플랫폼 자체 인증을 Tribble의 MASA 인증으로 신고하지 않는다.

## 4. 앱 콘텐츠 신고용 사실

| 질문 범위 | 코드에서 확인한 답변 재료 |
|---|---|
| 앱 액세스 | 계정/로그인/유료 장벽 없음. 모든 화면 접근 가능. 장소 추가·경로 조회는 정상 네트워크/Google API가 필요하며 일부 경로는 수동 시간 입력으로 보완 |
| 광고 포함 | 자체 광고, 광고 SDK, 유료 홍보 노출 로직 없음. Google Maps 출처 표시는 광고 아님 |
| 결제/구독/현금화 | 인앱 상품·구독·결제·현금성 보상·도박 기능 없음 |
| 사용자 상호작용/공개 UGC | 채팅·공개 게시·팔로우·타인 여행 열람 없음. 사용자가 외부 앱으로 이미지 공유는 가능. 이를 앱 내 커뮤니티 기능으로 설명하지 않음 |
| 위치 공유 | GPS/실시간 위치를 타 사용자에게 공유하는 기능 없음. 사용자가 선택한 장소가 포함된 일정 이미지는 공유 가능 |
| 인터넷 콘텐츠 | 임의 URL 브라우저/WebView 없음. Google 장소 이름·주소 검색 결과는 외부에서 옴. 리뷰·사진을 요청하지 않음 |
| 민감 콘텐츠 | 앱 기본 화면/샘플에 폭력·성적 콘텐츠·도박·약물 콘텐츠 없음. 장소 검색은 업종 제한이 없어 술집 등 장소 이름이 나올 수 있으므로 외부 검색 콘텐츠 관련 실제 IARC 문항은 이를 고려해 답변 |
| 건강/금융/뉴스/정부 | 해당 서비스 기능 없음. 보행 교통수단 선택은 건강 데이터 수집이나 피트니스 추적이 아님 |
| 타깃 연령 | 코드만으로 사업자의 의도된 타깃을 확정할 수 없음. 일반 여행 계획 UI이며 어린이용 설계 근거는 발견되지 않음. 계정 소유자가 실제 대상층과 마케팅을 기준으로 결정 |

콘텐츠 등급은 실제 IARC 설문으로 산출한다. 낮은 등급을 미리 보장하거나 가능한 모든 연령대를 자동 선택하지 않는다. [콘텐츠 등급 안내](https://support.google.com/googleplay/android-developer/answer/9859655), [타깃 연령 안내](https://support.google.com/googleplay/android-developer/answer/9867159)

## 5. 출시 전 남은 확인과 수정 상태

1. **앱 링크 포함:** 초기 점검 때 없던 Settings 개인정보처리방침 링크가 이번 빌드에 포함됐다는 BUILD.md 기록과 소스 반영을 확인했다. Play는 Console과 앱 내 링크 또는 본문을 요구한다. Android에서 링크가 실제 열리는지 실행 검증은 남아 있다. [Play User Data 정책](https://support.google.com/googleplay/android-developer/answer/10144311?hl=en)
2. **공개 문서 반영 완료:** `privacy.md`의 IP 기반 대략 지역 검색 문단은 별도 승인 작업으로 공개 main에 반영됐다. [커밋 3c4e570](https://github.com/freezner/tribble/commit/3c4e57062a9fc3f2ef2415964330af9300dcbaf9). 당시 비로그인 HTTP 200 및 공개 원문과 로컬 본문의 일치를 검증했다. 이번 최종 Manifest 갱신에서는 공개 원격을 변경하지 않았다.
3. **AAB 정적 검증 완료:** 병합 권한·provider·백업·debug/cleartext 속성은 위 표의 실제 결과로 확정했다. BUILD.md에는 bundletool 검증, AAB/APK 서명, 64비트 ELF 정렬 및 APK zipalign 통과가 기록돼 있다. 이는 기기 실행 검증과 별개다. VIBRATE 선언은 남아 있으나 현재 앱 코드의 사용처는 확인되지 않았다.
4. **실행·제출 미완료:** 실제 Android 기기 또는 16KB 에뮬레이터의 시작·검색·계산·저장·공유 실행과 Play Console 데이터 보안 입력/제출은 아직 하지 않았다. 정적 검증 완료를 앱 출시나 실행 성공으로 표현하지 않는다.
5. **신고 확정 전 결정:** OS 백업은 `allowBackup=true` 유지로 확정됐으며 실제 백업 동작과 Google 공유 예외, 추가 로그 유형별 분류는 남은 검토 대상이다. 확인되지 않은 내용을 `수집 없음`, `공유 없음`, `익명`, `즉시 삭제`로 바꾸지 않는다.

## 6. 새 IP 근거에 따른 기존 iOS 후속 조치

이 절은 Android 조사에서 새로 확인한 사실을 기존 iOS 제출과 대조한 것이다. **이번 작업에서 ASC 변경·심사 취소·iOS 빌드 변경은 하지 않았다.**

- 현재 `app.json`의 `ios.privacyManifests`와 `ios/Tribble/PrivacyInfo.xcprivacy`에는 SearchHistory/OtherUsageData/OtherDiagnosticData가 있고 CoarseLocation이 없다.
- 기존의 `IP 기반 위치 활용은 미확인` 판단은 Autocomplete Legacy 기본 동작 확인으로 철회한다. ASC의 **Coarse Location 추가** 및 공개 정책과의 정합성 검토가 필요하다. GPS 위치 권한을 새로 추가하는 작업이 아니다.
- 원본 IP와 요청 로그 보관을 고려하면 Linked=true가 보수적인 권고다. Tracking은 광고 연결의 별도 판단이며 이번 IP 근거만으로 true로 바꾸지 않는다. 목적은 App Functionality가 명확하고 지역별 검색 순위에는 Product Personalization 추가를 검토한다. 추론 지역값의 Analytics 사용은 필드별 근거 없이 자동 추가하지 않는다.
- 다음 바이너리에서 `NSPrivacyCollectedDataTypeCoarseLocation` 항목을 app config와 native manifest 양쪽에 동기화하는 것이 권고안이다. 목적 상수는 `NSPrivacyCollectedDataTypePurposeAppFunctionality`, 지역 기반 결과 개인화로 분류할 경우 `NSPrivacyCollectedDataTypePurposeProductPersonalization`이다. [Apple 데이터 유형 상수](https://developer.apple.com/documentation/bundleresources/app-privacy-configuration/nsprivacycollecteddatatypes/nsprivacycollecteddatatype), [Apple App Privacy 정의](https://developer.apple.com/app-store/app-privacy-details/)
- 이미 제출된 심사의 처리 방식과 메타데이터 수정 시점은 계정 소유자가 결정한다. 개인정보 답변과 바이너리 manifest는 별도이므로 현재 원격 상태를 확인하고 진행한다. [Apple 개인정보 답변 관리](https://developer.apple.com/help/app-store-connect/manage-app-information/manage-app-privacy)

### iOS 1.1.0(30) 심사 대기 상태: 의무와 제출 취소 여부의 구분

**공식 문서에서 확인된 내용:** Apple의 현재 `Privacy manifest files` 문서는 앱/SDK가 수집하는 각 데이터 유형과 목적을 번들 manifest에 기록하도록 한다. `Describing data use in privacy manifests`도 각 수집 유형을 `NSPrivacyCollectedDataTypes`에 추가하도록 안내한다. 이는 로컬 시스템 API 접근 사유만 다루는 문서가 아니다. 직접 REST 호출이나 서버의 IP 기반 추론이라는 이유로 제외한다는 예외는 발견하지 못했다. [Privacy manifest files](https://developer.apple.com/documentation/bundleresources/privacy-manifest-files), [수집 데이터 기록 방법](https://developer.apple.com/documentation/bundleresources/describing-data-use-in-privacy-manifests)

**이 앱에 대한 적용 판단:** IP로 지역을 사용하고 그 입력을 Google이 보관하므로 Coarse Location 공개를 권고한다. 같은 판단을 채택하면 앱 manifest도 보완하는 것이 문서 취지에 맞다. Google 네이티브 SDK를 링크하지 않으므로 별도 Google SDK manifest가 이 REST 흐름을 대신 기술하지도 않는다. 다만 Google이 추론된 지역값 자체를 어떻게 보관하는지와 그 해상도는 공개 문서로 확정하지 못했으며, 이 특정 REST 패턴에 대한 Apple의 개별 심사 해석을 받은 것은 아니다.

**명시적 업로드 차단과는 구별:** Apple은 required-reason API 미신고, 대상 SDK의 필수 manifest 누락, 잘못된 키/값을 포함한 manifest의 거절 요건을 별도로 설명한다. 이번 발견은 그 오류가 확인된 상황이 아니라 수집 항목의 내용 정합성 문제다. 유효한 문법으로 업로드에 성공했다는 사실도 내용의 정확성을 보증하지는 않는다. [Manifest 추가·형식 요건](https://developer.apple.com/documentation/bundleresources/adding-a-privacy-manifest-to-your-app-or-third-party-sdk), [필수 이유 API 요건](https://developer.apple.com/documentation/bundleresources/describing-use-of-required-reason-api)

**처리 결론:** ASC 개인정보 라벨과 공개 정책은 새 바이너리 없이 보완할 수 있다. 그러나 그것만으로 제출된 binary의 manifest 내용까지 변경되지는 않는다. 공식 문서에서 이 상황에 대해 심사 대기를 즉시 취소하라는 규칙이나 반드시 자동 거절된다는 규칙은 찾지 못했으므로, `취소·재빌드가 확정된 필수 절차`라고 단정하지 않는다. 양쪽의 불일치를 확실히 없애는 방법은 manifest를 보완한 새 빌드 제출이다. 이미 제출된 1.1.0(30)의 철회/교체 여부는 소유자가 이 차이와 남은 불확실성을 확인해 결정하며, 이 조사에서는 철회나 외부 변경을 수행하지 않았다.

**후속 결정 기록:** 이 보고 후 주 작업자는 정합성을 해소하기 위해 build 31을 준비하고, 사용 가능해진 뒤 build 30을 교체하기로 결정했다. 예정된 Coarse Location 선언은 Linked=true, Tracking=false, App Functionality + Product Personalization이다. 이는 위 조사에 따른 운영 결정이며 이 문서는 build 31의 생성·제출 완료를 증명하지 않는다. 공개 정책, ASC 라벨, `app.json`, 실제 build 31 번들 manifest의 네 곳이 일치하는지 최종 확인한다.
