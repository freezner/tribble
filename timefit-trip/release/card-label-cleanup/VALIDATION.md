# 카드 문구 정리 및 장소별 Google Maps 링크

2026-10-29 작업 트리 검증. 이후 TestFlight 1.1.1(38)의 업로드·Apple 처리·내부 그룹 연결·한국어 테스트 안내 저장을 완료했습니다. [배포 기록](../1.1.1/TESTFLIGHT-build38.md)을 참고하세요.

## 변경 사항

- 카드 생성 화면에서 SNS·게시 형태·픽셀 크기를 반복하던 규격 안내 줄을 제거했습니다.
- 카드 이미지에 `여행 일자`를 추가하고 KST, 우측 상단 상태 문구, `계획 기준 예상 시간입니다`를 제거했습니다.
- `도착 시각(설정)`을 `도착 시각`으로 바꿨습니다. 날짜·시각 계산과 페이지별 경로 구성은 유지합니다.
- 일정 화면의 각 장소명에 Google Maps 링크와 작은 외부 링크 아이콘을 추가했습니다. 이름 수정은 기존 더 보기 메뉴에서 할 수 있습니다.
- Google 장소 ID가 있으면 해당 ID와 저장된 좌표를 사용합니다. Kakao 등 공급자 접두어가 붙은 ID는 Google ID로 전달하지 않고 좌표 핀을 엽니다. 표시 이름을 수정해도 원래 위치가 유지됩니다.
- 지도 열기 실패 안내와 요청 진행 중 중복 실행 방지를 적용했습니다. PNG 파일 자체에는 링크를 넣지 않습니다.

## 검증

- `npm test`: 262개 통과.
- `npm run typecheck`: 통과.
- `git diff --check`: 통과.
- iPhone 16e / iOS 26.2의 기존 Debug 네이티브 빌드와 현재 Metro 소스로 확인했습니다.
- 일정의 `서울숲` 장소명을 누르면 Safari의 Google Maps에 저장된 좌표가 열렸습니다. Google Maps 앱은 시뮬레이터에 설치되어 있지 않아 앱 직접 실행은 검증하지 않았습니다. 캡처에는 Google의 앱 설치 안내가 함께 표시됩니다.
- Instagram 게시물 카드의 실제 PNG 두 장을 생성했습니다. 두 장 모두 1080×1440이며, 날짜 제목·출발/도착 시각·푸터가 잘리지 않는 것을 이미지로 확인했습니다.
- iOS 공유창에 `2개의 이미지`, `Save 2 Images`가 표시됩니다. 이번 검증에서는 사진 보관함 저장을 실행하지 않았습니다.
- 6개 SNS 프리셋과 2개 기존 프리셋의 크기·페이지 분할·모든 장소 포함 여부는 기존 테스트에서 확인했습니다.
- 임시 여행 데이터는 원래 시뮬레이터 저장소로 복구했고, 전용 시뮬레이터와 Metro를 종료했습니다.

## 증빙

- [카드 생성 화면](proof/instagram-feed-preview.png)
- [실제 PNG 1페이지](proof/instagram-feed-1.png)
- [실제 PNG 2페이지](proof/instagram-feed-2.png)
- [두 장이 첨부된 iOS 공유창](proof/ios-share-two-images.png)
- [Google Maps 이동 결과](proof/google-place.png)
- [PNG 크기와 해시](native-export-verification.json)

구현 기준: [Google Maps URLs 공식 문서](https://developers.google.com/maps/documentation/urls/get-started#search). HTTPS 지도 URL은 API 키 없이 사용할 수 있으며, Google Maps 앱을 사용할 수 없는 환경에서는 브라우저에서 열립니다.
