# Google Play 피처 그래픽 생성 기록

작성: 2026-10-26. Codex 내장 ImageGen으로 생성했으며 외부에 게시하지 않았습니다.

- 최종 등록 파일: [../feature-graphic.png](../feature-graphic.png), 1024×500, 24비트 RGB PNG, 투명도 없음.
- 최종 생성 원본: [generated.png](generated.png), 1793×877. 원본을 `sips -z 500 1024`로 기계적으로 리사이즈했습니다. 그 밖의 픽셀 편집이나 합성은 하지 않았습니다.
- 첫 생성 결과: [initial.png](initial.png). 앱 이름의 첫 글자가 소문자로 생성되어 아래 수정 프롬프트로 대문자 `T`를 바로잡았습니다. 등록에는 사용하지 않습니다.
- 참조 이미지: 프로젝트 `assets/icon.png`. 기존 코랄·아이보리 브랜드와 둥근 형태를 참고했습니다.
- 최종 이미지의 문구: `Tribble`, `가고 싶은 곳을, 내 시간 안에.`

## 최초 생성 프롬프트

```text
Use case: ads-marketing
Asset type: final Google Play feature graphic for Tribble, a horizontal 1024×500 composition (approximately 2.048:1 aspect ratio).
Primary request: Create one polished, simple, contemporary brand banner for a calm day-trip planning app.
Input image 1: reference image for the existing Tribble brand's burnt-coral and ivory palette and soft rounded route geometry. It is a style reference, not an image to edit or paste as a square app-icon tile.
Scene/backdrop: warm opaque ivory background, clean and flat with generous negative space.
Subject and composition: large beautifully typeset app name, clear Korean tagline below it, balanced with a restrained abstract rounded travel-path motif and a few small waypoint dots. Keep the motif subtle and graphic; let the text remain the dominant focus. Keep all essential content comfortably inside the canvas with generous safe margins.
Style: sophisticated minimal editorial brand design, precise type, smooth curves, restrained use of coral, no busy illustration, no photographic scene.
Color palette: ivory approximately #FFF9EC and warm burnt coral approximately #AE4F3D, matching the reference.
Text (verbatim, and the only text in the image):
"Tribble"
"가고 싶은 곳을, 내 시간 안에."
Typography: large crisp mixed-case "Tribble"; the Korean sentence must be fully correct and legible, including the comma and final period, with natural Korean spacing. Do not add or omit any characters.
Constraints: one finished full-bleed horizontal graphic; opaque background; no fake app screenshots, phone frames, storefront mockup, rank claims, discounts, badges, store logos, extra slogans, labels, watermark, heavy shadows, or gradients that impair legibility. Do not repeat the app icon as the main image. Render the text and path as a cohesive finished graphic.
```

## 수정 프롬프트

첫 생성 결과를 편집 대상으로 전달했습니다.

```text
Use case: text-localization
Edit target: the supplied Tribble Google Play feature graphic.
Change only the first letter of the large app name: it must read exactly "Tribble" with an uppercase capital T, followed by lowercase "ribble". The current artwork incorrectly reads "tribble" with lowercase t.
Keep the same rounded typography family and the existing coral color, ivory background, layout, route motif, overall horizontal aspect ratio, and all other artwork unchanged.
Keep the Korean tagline exactly "가고 싶은 곳을, 내 시간 안에." including comma, spaces, and period. No extra text.
The only visible text must be "Tribble" and "가고 싶은 곳을, 내 시간 안에.". Render the uppercase T clearly as a capital T, with a top horizontal bar and vertical stem. Opaque output.
```
