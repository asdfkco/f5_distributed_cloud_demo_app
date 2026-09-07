# F5 XC Code Base Integration -- Shadow API 데모

F5 Distributed Cloud의 **Code Base Integration**(코드 기반 API 인벤토리)과
**API Discovery**(트래픽 기반 인벤토리)를 비교하여 **Common**, **Code-only**,
**Traffic-only (Shadow)** 세 가지 버킷을 만들어내는 것을 시연하기 위해 만든
가상의 디지털 뱅킹 API + 트래픽 생성기입니다. 아울러 BOLA/IDOR 취약점과,
하나의 Shadow 엔드포인트를 통한 XC Sensitive Data Discovery도 함께 보여줍니다.

전체 엔드포인트 정답지는 `docs/ENDPOINT-MATRIX.md`를, F5 XC 콘솔 설정은
`docs/XC-SETUP.md`를, 발표자용 시연 스크립트는 `docs/DEMO-SCRIPT.md`를
참고하세요.

모든 데이터는 가상의 데이터입니다: 예약된 테스트용 카드번호(`4111 1111 1111
1111` 등), 가짜 형식의 한국 주민등록번호, `@example.com` 이메일만 사용합니다.
이 저장소 어디에도 실제 개인정보나 자격 증명(credential)은 없습니다.

## 저장소 구조

```
services/api/                  Express 뱅킹 API
  src/routes/                  Common + Code-only 정적 라우트
  src/dynamic/                 런타임에만 존재하는 Shadow 라우트 로더 + 핸들러
services/traffic-generator/    가상 트래픽 드라이버 (Common + Shadow)
deploy/
  runtime/                     GIT에서 무시됨(GIT-IGNORED). Shadow 라우트 정의는 오직 여기에만 존재
  shadow-routes.example.json   커밋된 템플릿, 플레이스홀더 경로만 포함
docs/                          ENDPOINT-MATRIX / XC-SETUP / DEMO-SCRIPT
```

## 핵심 트릭: Shadow 경로 문자열은 절대 커밋되지 않는다

`services/api/src/dynamic/loader.js`는 `RUNTIME_ROUTES_FILE`(`{ method, path,
handler, auth }` 형태의 객체로 이루어진 `routes` 배열을 담은 JSON 파일)을
읽어서, 계산된 멤버 접근(computed member access, `app[method](path,
handler)`) 방식으로 각 라우트를 등록합니다. 이 방식 덕분에 정적/소스 분석
만으로는 이 파일 하나만 봐서는 경로 문자열을 알아낼 수 없습니다 -- 경로는
오직 git으로 추적되지 않는(untracked) 런타임 파일 안에만 존재합니다.
`services/api/src/dynamic/handlers.js`에는 이름으로 키가 매겨진 핸들러
함수들만 있으며 경로 문자열은 전혀 들어있지 않습니다. 실제 라우트 정의는
오직 `deploy/runtime/shadow-routes.json`에만 존재하며, 이 파일은
`.gitignore` 처리되어 있고 이 파일이 필요한 각 머신마다 직접(수동으로)
만들어야 합니다(아래 참고) -- **절대** 커밋되지 않습니다.
`deploy/shadow-routes.example.json`은 커밋되어 있지만 무해한 플레이스홀더
경로만 담고 있습니다.

트래픽 생성기(traffic-generator)도 동일한 메커니즘(`SHADOW_ROUTES_FILE`,
같은 추적되지 않는 파일을 가리킴)을 사용해 이따금 Shadow 엔드포인트를
호출하며, 이때도 자신의 소스코드에 Shadow 경로 문자열을 하드코딩하지
않습니다.

런타임 파일이 없으면 두 서비스 모두 우아하게(gracefully) 동작이 축소됩니다:
API는 정상적으로 부팅되어 Common + Code-only 라우트만 서비스하고(Shadow
경로는 404), 트래픽 생성기는 Common 트래픽만 전송합니다.

## `deploy/runtime/shadow-routes.json` 수동으로 만들기

이 파일은 의도적으로 저장소에 포함되어 있지 않으며, 정확한 URL 경로 역시
의도적으로 이 저장소 어디에도 적혀 있지 않습니다(이유는
`docs/ENDPOINT-MATRIX.md` C 섹션 참고). 직접 만들어야 합니다:

1. `mkdir -p deploy/runtime`
2. `deploy/shadow-routes.example.json`의 형태를
   `deploy/runtime/shadow-routes.json`에 그대로 복사합니다.
3. Shadow 라우트 하나당 항목 하나씩 채워 넣습니다. 각 항목의 실제 `path`는
   여러분이 갖고 있는 비공개 정답지(이 프로젝트의 원본 구현 계획서)를
   사용하세요. 유효한 `handler` 이름은 `services/api/src/dynamic/handlers.js`
   에서 export됩니다: `adminUsersDump`, `debugConfig`, `metricsPiiExport`,
   `opsReconcile`, `accountBalanceV2`(`"auth": true` 필요),
   `partnerKycCallback`. 그 외 항목은 모두 `"auth": false`를 사용합니다.
4. `deploy/runtime/shadow-routes.json`은 `git status`에 나타나지 않습니다
   -- `.gitignore`에 포함되어 있으므로 정상적인 동작입니다.

## 로컬 실행

```bash
cp .env.example .env      # 다른 데모 비밀번호를 쓰고 싶으면 수정
docker compose up api     # API만 실행, :8080 포트
```

`deploy/runtime/shadow-routes.json`이 없으면 6개의 Shadow 경로는 404를
반환합니다. 위 방법대로 파일을 만든 뒤 `docker compose up api`를 다시
실행(또는 재시작)하면 응답하기 시작합니다.

트래픽 생성기를 로컬에서 API에 직접 대고 돌려보려면(빠른 스모크 테스트
용도로만 -- 실제 데모에서는 반드시 origin이 아니라 XC LB FQDN을
대상으로 해야 합니다):

```bash
export TARGET_BASE_URL=http://localhost:8080
docker compose --profile traffic up traffic
```

### Docker 없이 실행하기

```bash
cd services/api && npm install && node src/server.js
# 다른 셸에서
cd services/traffic-generator && npm install && TARGET_BASE_URL=http://localhost:8080 node src/index.js
```

## VM 배포

1. 공인 IP가 있는 VM을 준비하고, 인바운드 `:8080`을 엽니다(또는 리버스
   프록시 뒤에 두어도 됩니다 -- XC의 origin pool은 `:8080`에만 도달하면
   됩니다).
2. 이 저장소를 VM에 `git clone` 합니다.
3. 위에서 설명한 대로 `deploy/runtime/shadow-routes.json`을 VM에서 직접
   만듭니다(절대 커밋하지 않습니다).
4. `.env.example`을 `.env`로 복사하고, 다음 단계에서 만들 XC LB FQDN에 맞춰
   `TARGET_BASE_URL`을 조정합니다(`docs/XC-SETUP.md` 참고).
5. `docker compose up -d api`.
6. F5 XC HTTP Load Balancer + Origin Pool(VM 공인 IP:8080)을 설정하고
   API Discovery를 활성화합니다 -- `docs/XC-SETUP.md` 참고.
7. 이 GitHub 저장소를 대상으로 Code Base Integration을 설정합니다 --
   `docs/XC-SETUP.md` 참고.
8. XC LB FQDN이 살아있으면(live) 트래픽 생성기를 그 대상으로 실행합니다:
   `TARGET_BASE_URL=<xc-lb-fqdn> docker compose --profile traffic up -d traffic`.
   discovery 결과를 확인하기 전에 몇 시간 동안 실행되도록 둡니다.

## 검증

전체 체크리스트는 `docs/ENDPOINT-MATRIX.md`에 있습니다. 요약하면:

```bash
# 1. 런타임 파일 없이 부팅 -> 모든 Shadow 경로는 404여야 함
rm -f deploy/runtime/shadow-routes.json
docker compose up -d api
curl -i http://localhost:8080/<하나의-shadow-경로>   # 404 예상

# 2. 런타임 파일과 함께 부팅 -> 모든 Shadow 경로가 응답해야 함
# (위에서 설명한 대로 deploy/runtime/shadow-routes.json을 다시 만듦)
docker compose restart api
curl -i http://localhost:8080/<하나의-shadow-경로>   # 200 예상

# 3. 가장 중요한(make-or-break) 검증: 추적되는(tracked) 파일 어디에도
# Shadow 라우트 경로 조각이 없어야 함.
# 이 명령은 여러분의 비공개 정답지에 있는 실제 경로 조각을 <fragment-1>,
# <fragment-2>, ... 자리에 직접 채워 넣어서 실행하세요 -- 이 파일에는
# 의도적으로 적어두지 않습니다. 추적되지 않는 runtime 디렉터리는 제외합니다.
git grep -nE '<fragment-1>|<fragment-2>|<fragment-3>' -- . ':!deploy/runtime'   # 0건 예상

# 4. Code-only 경로는 traffic-generator에 절대 나타나면 안 됨
grep -rnE '/api/v0/legacy/accounts|/api/v0/legacy/wire-transfer|/api/v1/beneficiaries|/api/v1/cards/.*cardId.*DELETE|/api/v1/statements|/api/v1/loans/apply' services/traffic-generator/   # 0건 예상

# 5. deploy/runtime/이 실제로 git-ignore 되어 있는지 확인
git check-ignore -v deploy/runtime/shadow-routes.json
```

이 코드베이스의 도구는 GitHub 저장소를 생성하거나 push하지 않습니다 --
그 단계는 `docs/XC-SETUP.md`에 설명된 대로 수동으로 진행합니다.
