# Tribble 카카오 경로·장소 서버

카카오 공식 REST API로 국내 장소 검색과 자동차·도보·자전거·대중교통 이동 시간을 계산하는 Node 22 서버입니다. 외부 패키지가 없고 `KAKAO_REST_API_KEY`는 서버 환경변수로만 읽습니다. 기존 TMAP 어댑터를 대체했으며 TMAP 키나 Google 키로 우회하지 않습니다.

2026-10-27 모의 공급자·HTTP 테스트 46개를 로컬 및 배포 대상 Ubuntu의 Node 22.22.2에서 통과했습니다. 사용자 확인을 거쳐 기존 미사용 카카오 앱을 Tribble로 정리하고, 무료 쿼터·카카오맵 활성화·유료 API 미사용 상태를 콘솔에서 확인했습니다. Git 제외 로컬 `server/.env`에 서버 키를 설정해 장소 검색 및 현재 자동차·도보·자전거·대중교통의 실제 성공 응답을 확인했습니다. 같은 날 관리자가 운영 서버 설치를 완료했으며, `tribble-api.service`의 상시 실행과 공개 HTTPS health 응답을 확인했습니다. 미래 교통 API 활성화·유료 설정·제휴 신청은 수행하지 않았습니다. 실제 이용 범위와 저장 정책은 아래 출시 전 확인 사항을 따릅니다. 기본 자동차 계산은 미래 여행에도 **현재 교통 기준 추정**을 제공합니다. 미래 자동차 API는 이용 승인을 확인한 후 `KAKAO_FUTURE_DRIVING_ENABLED=true`로 명시적으로 선택해야 합니다.

## 실행과 배포

```sh
cd server
cp .env.example .env
# 키는 .env에 로컬로 입력합니다. 명령행 인자·로그·앱 번들에 넣지 않습니다.
node --env-file=.env src/dev.mjs
```

로컬 주소는 `http://127.0.0.1:8787/api/route`, `http://127.0.0.1:8787/api/places`입니다. `npm start`는 이미 주입된 환경변수를 사용하며 `.env`를 자동 로드하지 않습니다. 저장소 루트에서 `npm test --prefix server`로 테스트합니다. 테스트는 외부 네트워크나 실제 키를 사용하지 않습니다.

`GET /healthz`와 `HEAD /healthz`는 프로세스 생존 확인용이며 카카오를 호출하거나 쿼터를 사용하지 않습니다. 키의 유효성이나 카카오 연결 성공을 보증하는 검사는 아닙니다. 서버는 `127.0.0.1`에만 바인딩하며 기본 포트는 8787입니다. 요청·유휴 연결 대기를 제한하고, SIGTERM/SIGINT를 받으면 신규 연결을 막고 최대 10초 동안 진행 중 응답을 마칩니다.

Vercel Root Directory는 `server`, Framework Preset은 Other, Node.js는 22.x입니다. 빌드 단계는 필요하지 않습니다. 서버 환경변수에 `KAKAO_REST_API_KEY`를 설정합니다. 운영자가 로그인·프로젝트·사용 조건을 확인한 후 저장소 루트에서 `vercel --cwd server`로 Preview를 만들고 검증 후 `vercel --cwd server --prod`로 배포할 수 있습니다. 이 문서의 명령은 실행 안내이며 이미 배포했다는 뜻이 아닙니다.

[Vercel Hobby](https://vercel.com/docs/plans/hobby)는 개인·비상업 용도로 제한됩니다. 위 명령은 선택 가능한 어댑터의 안내입니다. 실제 운영 배포는 기존 `pastelinkers.com` 서버의 Node 22와 Nginx를 사용합니다. 공개 API 기본 주소는 `https://pastelinkers.com/tribble/api`이며, 별도 systemd 서비스 `tribble-api`를 사용합니다. 기존 사이트 프로세스·컨테이너는 변경하지 않고 canonical HTTPS 서버에 `/tribble/` 경로만 추가했습니다.

`api/route.mjs`와 `api/places.mjs`는 Vercel Node Function 진입점입니다. 실행 상한은 15초, 업스트림 기본 타임아웃은 8초입니다. [Vercel Node.js 문서](https://vercel.com/docs/functions/runtimes/node-js)의 `.mjs` 지원을 사용합니다. Vercel에서는 [플랫폼이 전달하는 `x-vercel-forwarded-for`](https://vercel.com/docs/headers/request-headers)를 요청 제한에 사용합니다. 독립 서버는 기본적으로 소켓 주소를 사용합니다. `ROUTE_TRUST_LOCAL_PROXY=true`일 때만 loopback 소켓에서 전달된 단일 유효 IP의 `X-Real-IP`를 신뢰합니다. Nginx에서 반드시 이 헤더를 `$remote_addr`로 덮어써야 하며, 클라이언트의 헤더를 그대로 전달하면 안 됩니다.

앱에는 서버의 HTTPS 주소만 연결합니다. `KAKAO_REST_API_KEY`를 `EXPO_PUBLIC_` 변수에 넣지 않습니다. `.env*`와 `.vercel/`은 Git 제외 대상입니다.

### 운영 상태 — 2026-10-27 설치 완료

관리자가 설치 스크립트를 실행한 뒤 SSH로 systemd 상태와 loopback 바인딩을 확인하고, 공개 HTTPS health 응답을 확인했습니다.

| 항목 | 확인된 운영 설정 |
| --- | --- |
| 서비스 | `tribble-api.service`: active/running, enabled |
| 런타임·바인딩 | Ubuntu 24.04, Node 22.22.2, `127.0.0.1:8787` |
| 공개 API 기본 주소 | `https://pastelinkers.com/tribble/api` |
| 생존 확인 | `https://pastelinkers.com/tribble/healthz` → `{"status":"ok"}` |
| 현재 릴리스 | `/home/pastelinkers/tribble/current` → `releases/20261027T010952Z` |
| 서버 키·운영 환경 파일 | `/home/pastelinkers/tribble/shared/server.env` — mode 0600, 서버 전용 |
| 적용된 Nginx 설정 SHA-256 | `1975526be4ea969b9fa1e210c3756f6173a34f7fbbb043b156ea074b77c80d68` |

키 값은 문서·앱 번들에 포함하지 않습니다. health는 생존 확인용이며 실제 API와 구분해 검증합니다. 설치 후 공개 HTTPS에서 장소 검색 4건과 자동차·도보·자전거·대중교통이 모두 성공했고, API 응답의 `source: kakao`와 `Cache-Control: no-store`를 확인했습니다. 검증한 자동차 요청은 `estimated/current-traffic`, 대중교통 요청은 `estimated/current-schedule`로 반환해 미래 출발 시각을 반영했다고 표시하지 않았습니다. health는 HTTP 200/no-store, 경로 API의 GET은 HTTP 405였으며 기존 사이트 루트의 HTTP 302 응답도 유지되었습니다. 공급자 응답 원문은 이 기록에 보관하지 않습니다.

설치 완료는 카카오의 서비스 이용·데이터 저장 범위 승인을 뜻하지 않으며, 아래 보관과 이용 조건의 미확정 사항은 그대로 남아 있습니다.

### 기존 Pastelinkers 서버의 최초 설치 기록과 재실행 제한

배치 구조는 `/home/pastelinkers/tribble/releases/<release>/`의 서버 소스, 이를 가리키는 `current` 심볼릭 링크, `shared/server.env`(0600), `deploy/`의 검토된 설치 파일입니다. 환경 파일에는 서버 키와 `PORT=8787`, `ROUTE_TRUST_LOCAL_PROXY=true`, 미래 자동차 API 비활성화 설정을 둡니다. 기존 사이트와 Tribble은 같은 서버 자원을 사용하지만 별도 프로세스이며, Tribble 서비스의 메모리 상한은 256 MiB입니다.

`deploy/pastelinkers.com.prepared.conf`는 기존 설정에 `/tribble/` location만 삽입한 검토용 파일입니다. `prepare-nginx.py`는 원본 해시와 삽입 위치를 검사하며 기존 출력 파일을 덮어쓰지 않습니다. `install-pastelinkers.sh`는 root 권한으로 최초 설치할 때만 사용합니다. 기존 `tribble-api` unit이나 수정된 Nginx 설정이 발견되면 중단합니다.

2026-10-27 관리자가 서버에서 실행한 최초 설치 명령입니다. 현재 설치된 서버에 다시 실행하는 업데이트 명령이 아닙니다:

```sh
sudo bash /home/pastelinkers/tribble/deploy/install-pastelinkers.sh
```

설치기는 `/var/backups/tribble-api/install-*`에 원본을 보관하고 새 `tribble-api` 서비스만 시작합니다. 로컬 health를 확인한 뒤 Nginx 설정을 교체하고 `nginx -t` 성공 시 reload합니다. 설치 중 검증 실패 시 해당 설치가 만든 서비스와 Nginx 변경을 되돌리며, 동시 변경이 발견되면 덮어쓰지 않고 관리자 확인을 요구합니다. 기존 사이트 컨테이너를 재시작하지 않습니다. 서비스 재시작·후속 릴리스 갱신에는 이 최초 설치 스크립트를 재사용하지 않습니다.

앱 연결 주소는 `EXPO_PUBLIC_KAKAO_API_URL=https://pastelinkers.com/tribble/api`이며 로컬 앱 환경과 EAS 프로젝트 `@freezner/tribble`의 production 환경에 설정·확인했습니다. 설치 전 임시 loopback 프로세스의 실제 API 검증을 마친 뒤 해당 프로세스를 종료하고 systemd 서비스로 전환했습니다. 설치 후 공개 HTTPS를 통한 health와 실제 API 검증 결과는 위 운영 상태에 기록했습니다. 이 서버 배포와 앱 스토어의 새 바이너리 배포는 별도 작업입니다.

## 경로 계약

`POST /api/route`, `Content-Type: application/json`:

```json
{
  "origin": { "lat": 37.5665, "lng": 126.978 },
  "destination": { "lat": 37.5701, "lng": 126.985 },
  "mode": "walking",
  "departureAt": "2026-10-28T01:00:00Z"
}
```

`mode`는 `walking`, `driving`, `transit`, `bicycling` 중 하나입니다. `departureAt`은 선택 사항이며 초와 시간대를 포함한 유효한 ISO 문자열이어야 합니다. 좌표는 유한한 숫자, 위도 ±90·경도 ±180만 허용합니다. 요청은 최대 2 KiB이며 알 수 없는 필드, 외부 URL, 공급자 옵션은 거절합니다.

응답 예시이며 실제 측정값은 아닙니다:

```json
{
  "status": "ready",
  "duration": 11,
  "distance": 800,
  "source": "kakao",
  "reason": "walking-route",
  "calculatedAt": "2026-10-27T03:00:00.000Z",
  "departureAt": "2026-10-28T01:00:00.000Z"
}
```

`duration`은 분(`ceil(초 / 60)`), `distance`는 미터입니다. 실패는 `status: unavailable`, 시간·거리 `null`, `source: none`입니다. `ready`는 공급자 경로 응답을 얻었다는 의미이며 실제 도착 시간을 보장하지 않습니다.

| 모드/조건 | 고정 업스트림 GET | 성공 의미 |
| --- | --- | --- |
| 도보 | `dapi.kakao.com/v2/routing/walk` | `ready / walking-route` |
| 자전거 | `dapi.kakao.com/v2/routing/bicycle` | `ready / bicycling-route` |
| 대중교통 | `dapi.kakao.com/v2/routing/publictraffic` | `estimated / current-schedule` |
| 자동차, 시각 없음 또는 현재 ±60초 | `apis-navi.kakaomobility.com/v1/directions` | `ready / current-traffic` |
| 자동차, 현재보다 60초 넘게 미래, 기본 설정 | 현재 자동차 API | `estimated / current-traffic`; 계획 시각 교통 예측 아님 |
| 자동차, 현재보다 60초 넘게 미래, future flag=true | `apis-navi.kakaomobility.com/v1/future/directions` | `ready / predicted-traffic` |
| 자동차, 현재보다 60초 넘게 과거 | 현재 자동차 API | `estimated / current-traffic`; 과거 교통 복원 아님 |

모두 서버의 `Authorization: KakaoAK ...` 헤더로 인증하고 리디렉션을 거절합니다. 기본 현재 교통 모드는 첫 호출 전에 정하는 운영 방식이며 공급자 오류 뒤의 fallback이 아닙니다. 미래 API를 명시적으로 켠 경우 그 실패를 현재 교통이나 직선 거리로 대체하지 않습니다.

[카카오맵 공식 REST 문서](https://developers.kakao.com/docs/ko/kakaomap/rest-api)에 따라 도보·자전거는 `start_x/start_y/end_x/end_y`, WGS84 좌표를 전송합니다. `status=OK`일 때 `route.properties.totalTime`(초), `totalDistance`(미터)를 읽습니다. 도보 기본 탐색은 넓은 길, 자전거는 자전거도로 우선이며 사용자에게 보장되지 않은 무장애 경로라고 표시하지 않습니다.

대중교통은 같은 좌표 입력을 사용하고, 정상 `routes[].properties` 중 시간이 가장 짧은 결과를 선택합니다. 공식 요청에는 출발시각 입력이 없습니다. 따라서 항상 추정으로 반환하며 `departureAt`의 시간표나 운행 가능 여부를 확인했다고 주장하지 않습니다. 도보·자전거도 시각별 교통 예측을 제공하지 않습니다.

[현재 자동차](https://developers.kakaomobility.com/guide/navi-api/directions.html)와 [미래 자동차](https://developers.kakaomobility.com/guide/navi-api/future.html)는 `origin=경도,위도`, `destination=경도,위도`, `summary=true`, `alternatives=false`, `priority=RECOMMEND`를 사용합니다. 미래 출발은 `departure_time=YYYYMMDDHHMM`으로 변환합니다. 서버는 한국 시각(UTC+9)의 분 단위를 전송하므로 초 단위 정밀도는 없습니다. 공식 문서의 요구는 현재 이후 시각이며, 최대 미래 기간은 임의로 가정하지 않습니다. 응답에 요청시각 재확인 필드가 문서화되어 있지 않아 TMAP의 `departureTime` 검증을 적용하지 않습니다. `routes[].result_code=0`의 `summary.duration`(초), `summary.distance`(미터)를 읽습니다.

## 장소 검색 계약

`POST /api/places`, `Content-Type: application/json`:

```json
{ "query": "부산역" }
```

검색어는 trim 후 Unicode code point 2~100자이며 제어문자를 허용하지 않습니다. `query` 외 필드는 거절합니다. 고정 `GET https://dapi.kakao.com/v2/local/search/keyword.json`에 query, `page=1`, `size=15`, `sort=accuracy`를 전송합니다. 장소 상세를 다시 조회하지 않고 최대 15개 결과를 반환합니다.

```json
{
  "places": [
    {
      "id": "kakao:12345",
      "name": "부산역",
      "address": "부산 동구 중앙대로 206",
      "latitude": 35.1152,
      "longitude": 129.0422,
      "countryCode": "KR"
    }
  ]
}
```

예시는 계약 설명용입니다. 실제 ID는 공급자 document.id에 `kakao:`를 붙입니다. 도로명 주소가 없으면 지번 주소를 사용하고 문자열 x/y를 숫자 경도/위도로 검증합니다. 비정상 결과와 중복 ID는 선택 목록에서 제외합니다. 정상 빈 검색은 `200 / {places:[]}`입니다. 오류는 non-2xx와 `{places:[],reason,calculatedAt}`로 반환하므로 빈 결과와 구분해야 합니다. 검색어·장소명·좌표를 서버 로그에 기록하지 않습니다.

## 오류와 호출 보호

| HTTP | reason |
| --- | --- |
| 200, ready/estimated | `walking-route`, `bicycling-route`, `current-schedule`, `current-traffic`, `predicted-traffic` |
| 200, unavailable | `no-route` — 공식 문서의 명시적 경로 실패 상태 |
| 400 / 413 / 415 / 405 | `invalid-request` / `request-too-large` / `invalid-content-type` / `method-not-allowed` |
| 403 | `origin-not-allowed` |
| 429 | `rate-limit`, `daily-limit`, `busy`, `quota` |
| 503 | `not-configured`, `server-configuration` |
| 504 | `timeout` |
| 502 | `authentication`, `network`, `upstream-error`, `invalid-response` |

공급자 401/403과 인증·권한 코드는 `authentication`, 429 및 공식 쿼터 코드 -10은 `quota`로 정규화합니다. 원문 에러·API 키·URL의 좌표와 검색어·응답 내용을 로그나 에러 메시지로 노출하지 않습니다. 응답은 최대 4 MiB, 자동 재시도는 없습니다. [자동차 경로 결과 코드](https://developers.kakaomobility.com/guide/navi-api/reference.html) 및 [HTTP/공통 오류](https://developers.kakaomobility.com/guide/navi-api/solution.html)를 사용하며 알 수 없는 오류를 경로 성공으로 처리하지 않습니다.

| 환경변수 | 기본값 | 범위/설명 |
| --- | --- | --- |
| `KAKAO_REST_API_KEY` | 없음 | 서버 전용, 없으면 503 |
| `KAKAO_FUTURE_DRIVING_ENABLED` | `false` | 문자열 `true` 또는 `false`만 허용; true는 미래 API 승인 확인 후 선택, 미설정/빈 값은 false |
| `ROUTE_UPSTREAM_TIMEOUT_MS` | 8000 | 100~10000ms |
| `ROUTE_RATE_LIMIT_PER_MINUTE` | 30 | 1~300, 클라이언트 IP별 1분 요청 수 |
| `ROUTE_UPSTREAM_DAILY_LIMIT` | 900 | 1~900, **API별·인스턴스별 최근 24시간** 업스트림 시도 수 |
| `ROUTE_MAX_CONCURRENT` | 4 | 1~20, 인스턴스의 동시 업스트림 요청 |
| `ROUTE_TRUST_LOCAL_PROXY` | `false` | `true`일 때만 loopback 프록시의 유효한 `X-Real-IP` 사용; Nginx에서 헤더 덮어쓰기 필수 |
| `ROUTE_ALLOWED_ORIGINS` | 빈 값 | 허용하는 웹 Origin의 쉼표 구분 목록 |

자동차 현재/미래, 도보, 자전거, 대중교통, 장소 검색은 각각 별도 호출 카운터를 사용합니다. 실패한 업스트림 시도도 한도에 포함됩니다. 달력 날짜 리셋 시각을 추정하지 않도록 최근 24시간을 사용합니다. IP는 프로세스별 임의 salt와 해시로만 메모리에 보관하며 최대 10,000개 클라이언트에 제한합니다.

**이 보호는 인스턴스별 메모리 제한입니다.** 재시작·여러 Vercel 인스턴스·다른 앱이나 서버에서 같은 키 사용을 합산하지 못합니다. 900은 전역 무료량 또는 과금 차단 보장이 아닙니다. Origin 없는 네이티브 요청을 허용하며 CORS는 앱 인증이 아닙니다. 비용이 최우선이면 공급자 유료 설정을 꺼 둔 상태와 무료 쿼터 적용 앱 여부를 확인하고, 실제 공개 운영 규모에 맞는 분산 호출 제한을 별도로 갖춰야 합니다.

## 보관과 이용 조건

**완료된 경로·검색 응답을 메모리 캐시나 파일/DB에 저장하지 않습니다.** 동시에 진행 중인 동일 요청만 한 번의 업스트림 호출을 공유하고 완료 즉시 참조를 제거합니다. HTTP 응답은 `Cache-Control: no-store`입니다. 과거의 `ROUTE_CACHE_TTL_SECONDS`는 사용하지 않습니다. 카운터에는 시각만, 중복 요청 식별에는 해시만 보관합니다.

[2026-10-20 카카오맵 담당자 답변](https://devtalk.kakao.com/t/api/152264/2)은 지도 없는 시간 비교를 실시간 호출과 출처 표시 전제로 안내하고, 임시 캐시 재사용 및 API 결과로 만든 비교 점수 보관을 허용하지 않습니다. 명시된 저장 허용 항목은 장소 ID·카카오맵 URL입니다. **클라이언트의 여행 저장에도 카카오 응답·파생 계산값을 그대로 보관하면 안 되며**, 장소명·주소·좌표를 장기 저장해 재사용하는 범위가 허용된다고 이 서버 구현만으로 보장하지 않습니다. 사용자 직접 입력과 공급자 데이터를 구분하는 클라이언트 정책이 필요합니다. 화면의 적절한 위치에 카카오 출처를 표시해야 합니다.

[2026-10-21 현재 자동차 담당자 답변](https://devtalk.kakao.com/t/fairmeet/152280)은 비상업 학교 프로젝트의 카카오 장소 좌표 전달·지도 없는 표시를 허용하되 기술 지원 한계와 무저장·무재사용 조건을 안내합니다. 이 답변을 모든 상업 서비스에 일반화하지 않습니다. [2026-09-11 미래 자동차 담당자 답변](https://devtalk.kakao.com/t/future-directions-api-v1-future-directions/151611)은 상업 서비스 이용에 제휴가 필요하다고 안내합니다. 코드가 호출 가능한 형태라는 사실과 실제 계정·서비스 이용 승인은 다릅니다. 본 작업에서는 제휴나 유료 이용을 신청하지 않았습니다.

서버가 자체 로그를 남기지 않아도 호스팅 사업자·공급자의 전송/접속 기록은 별도입니다. 업스트림 GET URL에는 조회 좌표나 검색어가 포함됩니다. 서비스의 개인정보 안내에는 서버 및 카카오로의 전송과 운영 기록을 실제 설정에 맞게 반영해야 합니다.

## 요금 근거 — 2026-10-27 확인

[2026-07-21 실제 오픈 공지](https://devtalk.kakao.com/t/api-4/150764) 기준 공개 도보·자전거·대중교통은 카카오맵 API 활성화 후 별도 심사 없이 사용 가능합니다. 카카오모빌리티의 제휴용 도보 API와 다른 제품입니다.

[카카오 쿼터·요금표](https://developers.kakao.com/docs/ko/getting-started/quota)는 각 도보·자전거·대중교통 일 1,000건, 키워드 장소 검색 일 100,000건을 표시합니다. 신규 활성화 앱은 계정의 첫 카카오맵 활성화 앱만 무료 대상이며 두 번째 앱·초과 사용에는 비즈월렛과 유료 설정이 필요합니다. 카카오맵 초과 단가는 경로 각 10원, 장소 검색 2원이고 [유료 API 청구 문서](https://developers.kakao.com/docs/ko/app-setting/paid-api)에 따라 부가세 10%가 추가됩니다. 일간 무료량을 월간 일괄 사용 가능량으로 바꾸어 해석하지 않습니다.

[카카오모빌리티 가격표](https://developers.kakaomobility.com/price/)의 현재 자동차는 일 10,000건, 미래 자동차는 일 5,000건이고 무료 초과분 월 100만 건 구간까지 각각 8원/건입니다. 공개 표에서 VAT 여부는 확인되지 않았으며 실제 상업 이용 조건·제휴 견적을 별도로 확인해야 합니다. 이 프록시는 가격이나 승인 조건을 변경하지 않습니다.
