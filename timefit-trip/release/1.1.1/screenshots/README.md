# Tribble 1.1.1 App Store 스크린샷

2026-10-30 · **iPhone 5장과 iPad 5장 촬영·검수 완료**. 09:36–09:39 KST에 현재 앱 화면을 JPEG 원본으로 저장했습니다. 동일 원본 10장을 App Store Connect 한국어에 등록하고 영어에서는 기본 언어 자산을 상속하도록 확인했습니다. 09:44 KST에 iOS 1.1.1(39)과 함께 심사 제출되어 현재 **심사 대기 중**입니다. [기존 1.1.0 스크린샷과 등록 기록](../../1.1.0/screenshots/README.md)은 그대로 보존합니다.

## 촬영 기준

- 별도로 만든 iPhone 17 Pro와 iPad Pro 13형(M5) 시뮬레이터에서 현재 프로덕션 앱 UI를 촬영합니다. [기기 목록](capture/devices.json)을 참고합니다.
- [공개 장소 예시 입력](capture/public-input-fixture.json)은 여행 이름·장소·좌표·체류 시간과 `pending` 이동 구간만 담습니다. 이동 시간과 거리는 미리 넣지 않습니다. 앱을 열어 운영 프록시의 자동 경로 결과를 받은 뒤 촬영하며, 결과 미확인 상태를 자동 계산 완료로 표현하지 않습니다.
- 성수·북촌 일정은 기능 설명을 위한 예시입니다. 카드 표시 이름은 ‘오늘의 작은 여행’이며 개인 SNS 프로필은 등록하지 않습니다.
- 프로덕션 `src`와 `index.js`를 촬영용으로 수정하지 않았습니다. [촬영 전 소스 해시](capture/source-before.json)와 [촬영 후 소스 해시](capture/source-after.json)의 41개 파일이 모두 일치합니다. build39 소스 스냅샷 전체도 촬영 전 일치 확인했습니다.
- [촬영 도구](capture/simulator-capture.py)는 `simctl`에서 JPEG를 직접 생성합니다. 이미지 보정·합성·크기 변경·캡션 추가 없이 원본을 사용하며, 파일마다 촬영 시각·규격·SHA-256을 `.capture.json`에 기록합니다.

| 기기 | 원본 규격 | 형식 |
| --- | --- | --- |
| iPhone 17 Pro | 1206 × 2622 | RGB JPEG, 투명도 없음 |
| iPad Pro 13형(M5) | 2064 × 2752 | RGB JPEG, 투명도 없음 |

## 최종 파일

두 기기 모두 아래 순서로 촬영했습니다. 각 이미지 옆의 `.capture.json` 파일에 촬영 시각·규격·SHA-256이 있습니다. 전체 파일 검증은 [verification.json](capture/verification.json)에 기록했습니다.

| 순서 | 보여줄 내용 | iPhone | iPad |
| --- | --- | --- | --- |
| 01 | 자동 이동 시간을 반영한 일정 요약과 ‘카드 생성’ 버튼 | [01-overview.jpg](iphone/01-overview.jpg) | [01-overview.jpg](ipad/01-overview.jpg) |
| 02 | Instagram 형식 선택과 여행 카드 미리보기 | [02-card-instagram.jpg](iphone/02-card-instagram.jpg) | [02-card-instagram.jpg](ipad/02-card-instagram.jpg) |
| 03 | 네 가지 교통수단과 카카오 자동 이동 시간 | [03-transport.jpg](iphone/03-transport.jpg) | [03-transport.jpg](ipad/03-transport.jpg) |
| 04 | 여행 날짜·출발·마감 시각·이동 및 대기 여유 설정 | [04-time-settings.jpg](iphone/04-time-settings.jpg) | [04-time-settings.jpg](ipad/04-time-settings.jpg) |
| 05 | 초안 이어쓰기와 여행 라이브러리 | [05-drafts.jpg](iphone/05-drafts.jpg) | [05-drafts.jpg](ipad/05-drafts.jpg) |

최종 검수에서 주요 글자·버튼의 가독성, 시간 합계와 경로 상태, Expo·개발·오류 오버레이와 시스템 알림 부재, 실제 파일 규격·RGB 모드·해시 일치를 확인했습니다. 화면 아래로 이어지는 콘텐츠는 앱의 실제 스크롤 화면 그대로입니다. 카드 형식 선택은 SNS 로그인이나 자동 게시를 뜻하지 않습니다. 자동 경로는 촬영 시점의 예상값이며 미래 교통·운행이나 실제 도착 시각을 보장하지 않습니다.

두 기기에서 성수 예시 일정을 열어 운영 프록시로 실제 경로를 조회했습니다. 도보 구간 27분·13분·10분, 이동 합계 50분, 체류 150분, 여유 30분으로 총 230분·남는 시간 70분이 표시됐습니다. fixture의 미확인 경로를 계산 완료로 미리 채워 넣지 않았습니다.

## 실행 기록

메모리 부족 재발을 줄이기 위해 기존 시뮬레이터 네이티브 앱을 재사용하고, 현재 소스를 `Metro --no-dev --minify --max-workers 1` 및 Node 힙 2GB 제한으로 제공했습니다. iPhone 촬영 후 완전히 종료한 다음 iPad를 부팅해 촬영했습니다. 네이티브 재빌드와 시뮬레이터 동시 실행은 하지 않았습니다. 촬영 완료 후 두 전용 기기와 촬영용 Metro를 종료했습니다.

이미지 10장의 합계 크기는 2,290,684바이트입니다. 촬영 종료 후 시스템 메모리 여유 54%, 디스크 여유 약 28GiB를 확인했습니다. 앱 미리보기 동영상은 이번 촬영 범위에 포함하지 않습니다. App Store 등록 완료 여부는 [배포 진행 기록](../store-20261030-submission.json)을 확인하세요.
