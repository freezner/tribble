# Google Play 등록 자료

작성·규격 확인: 2026-10-27. 외부 게시 전 로컬 준비 자료입니다.

## 한국어 메타데이터

[metadata/ko-KR.json](metadata/ko-KR.json)에 앱 이름, 짧은 설명, 전체 설명, 릴리스 노트, 지원·개인정보 URL과 기존 공개 문의 이메일을 보관했습니다. 전체 설명은 현재 iOS 설명의 기능·제한을 동일하게 반영했습니다.

| 필드 | 문자 수 | 제한 |
| --- | ---: | ---: |
| `appName` | 19 | 30 |
| `shortDescription` | 44 | 80 |
| `fullDescription` | 968 | 4,000 |
| `releaseNotes` | 339 | 500 |

공백·문장부호·줄바꿈을 포함한 Unicode 문자 수를 확인했습니다. 이 문구에서는 UTF-16 코드 단위 수도 같은 값입니다. 릴리스 노트를 콘솔에 넣을 때 언어 구분 태그가 필요한 화면에서는 본문을 `<ko-KR>`와 `</ko-KR>` 사이에 넣습니다.

근거: [앱 이름·설명 규격](https://support.google.com/googleplay/android-developer/answer/9859152?hl=en), [언어별 릴리스 노트 500자 제한](https://support.google.com/googleplay/android-developer/answer/9859348?hl=en).

## 등록 아이콘

[store-icon.png](store-icon.png)는 기존 `assets/icon.png`를 기계적으로 512×512로 축소했습니다. 도형·배경·문구를 새로 만들거나 합성하지 않았고 원본 파일은 보존했습니다.

- 512×512, 32비트 RGBA PNG, 278,084바이트.
- 모든 픽셀의 alpha 값은 255로 완전히 불투명합니다.
- Google Play의 512×512, 32비트 PNG, 최대 1,024KB 규격에 맞춥니다.

## 피처 그래픽

- [feature-graphic.png](feature-graphic.png): 1024×500, 24비트 RGB PNG, 투명도 없음.
- 코랄·아이보리 브랜드와 경로 모티프에 `Tribble`, `가고 싶은 곳을, 내 시간 안에.` 문구만 사용했습니다.
- Codex 내장 ImageGen으로 생성하고 기계적으로 리사이즈했습니다. [생성 원본과 프롬프트](feature-graphic-source/README.md)를 보관했습니다.

## 아직 준비하지 않은 자료

- **Android 스크린샷:** 실제 Android 화면 캡처를 별도로 준비해야 합니다. iOS 스크린샷을 복사하거나 재사용하지 않았습니다.

근거: [Google Play 미리보기 자산 규격](https://support.google.com/googleplay/android-developer/answer/9866151?hl=en).
