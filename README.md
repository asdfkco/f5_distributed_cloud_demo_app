# F5 XC Code Base Integration — Shadow API 데모

F5 Distributed Cloud의 Code Base Integration(코드 기반 인벤토리)과 API Discovery(트래픽 기반 인벤토리)를 대조해서 Common / Code-only / Traffic-only(Shadow) 세 버킷이 갈리는 걸 보여주는 데모용 뱅킹 API입니다. 덤으로 BOLA와 Sensitive Data Discovery도 같이 걸립니다.

- 엔드포인트 정답지: `docs/ENDPOINT-MATRIX.md`
- XC 콘솔 설정 절차: `docs/XC-SETUP.md`
- 발표 대본: `docs/DEMO-SCRIPT.md`

데이터는 전부 가짜입니다. 예약된 테스트 카드번호(`4111 1111 1111 1111` 등), 형식만 맞춘 주민번호, `@example.com` 이메일만 씁니다. 실제 개인정보나 자격증명은 저장소 어디에도 없습니다.

## 구조

```
services/api/                  Express 뱅킹 API
  src/routes/                  Common + Code-only 정적 라우트
  src/dynamic/                 Shadow 라우트 로더 + 핸들러
services/traffic-generator/    트래픽 드라이버
deploy/
  runtime/                     git ignore 대상. Shadow 라우트 정의는 여기에만 존재
  shadow-routes.example.json   커밋된 템플릿, 플레이스홀더 경로만
docs/
```

## 핵심: Shadow 경로는 저장소에 남기지 않는다

이 데모가 성립하려면 F5 스캐너가 Shadow 엔드포인트를 **코드에서 찾지 못해야** 합니다. 그래서 경로 문자열을 저장소 밖으로 완전히 빼냈습니다.

`services/api/src/dynamic/loader.js`가 `RUNTIME_ROUTES_FILE`이 가리키는 JSON을 읽어 `app[method](path, handler)` 형태로 라우트를 등록합니다. 메서드명이 변수라 정적 분석으로는 해석되지 않고, 경로 문자열은 아예 이 파일에 없습니다. `handlers.js`에는 핸들러 함수만 이름으로 들어있고 경로가 없습니다.

실제 라우트 정의는 `deploy/runtime/shadow-routes.json`에만 있습니다. `.gitignore` 대상이라 커밋되지 않고, 필요한 머신마다 직접 만들어야 합니다. 커밋된 `deploy/shadow-routes.example.json`에는 무해한 플레이스홀더만 있습니다.

traffic-generator도 같은 파일(`SHADOW_ROUTES_FILE`)을 읽습니다. 제너레이터 소스에 Shadow 경로를 박아두면 그것도 스캐너에 잡히기 때문입니다.

런타임 파일이 없으면 두 서비스 모두 조용히 축소 동작합니다. API는 정상 기동해서 Common + Code-only만 서비스하고 Shadow 경로는 404, 제너레이터는 Common 트래픽만 보냅니다.

## `deploy/runtime/shadow-routes.json` 만들기

이 파일은 저장소에 없고, 실제 경로도 저장소 어디에도 적혀 있지 않습니다(이유는 `docs/ENDPOINT-MATRIX.md` C 섹션). 직접 만드세요.

1. `mkdir -p deploy/runtime`
2. `deploy/shadow-routes.example.json`의 형태를 그대로 복사
3. Shadow 라우트마다 항목을 채웁니다. `path`는 별도 보관 중인 정답지(원본 구현 계획서)를 보고 넣으세요. 쓸 수 있는 `handler` 이름은 `handlers.js`가 export하는 `adminUsersDump`, `debugConfig`, `metricsPiiExport`, `opsReconcile`, `accountBalanceV2`, `partnerKycCallback`입니다. `accountBalanceV2`만 `"auth": true`, 나머지는 `false`.
4. 만든 뒤에도 `git status`에 안 뜹니다. 정상입니다.

## 로컬 실행

```bash
cp .env.example .env
docker compose up api     # 호스트 :8123 -> 컨테이너 :8080
```

런타임 파일이 없으면 Shadow 경로 6개가 404입니다. 파일을 만들고 재시작하면 응답합니다.

제너레이터를 로컬 API에 직접 붙여 스모크 테스트만 할 때:

```bash
export TARGET_BASE_URL=http://localhost:8123
docker compose --profile traffic up traffic
```

실제 데모에서는 반드시 XC LB FQDN을 대상으로 해야 합니다. origin으로 직접 때리면 XC가 트래픽을 못 봅니다.

### Docker 없이

```bash
cd services/api && npm install && node src/server.js
# 다른 셸에서
cd services/traffic-generator && npm install && TARGET_BASE_URL=http://localhost:8080 node src/index.js
```

## VM 배포

1. 공인 IP VM에서 인바운드 `:8123`을 엽니다. compose가 호스트 `8123`을 컨테이너 `8080`에 매핑합니다. XC origin pool이 `:8123`에 닿기만 하면 되고, 리버스 프록시를 둬도 됩니다.
2. 저장소를 clone합니다.
3. VM에서 `deploy/runtime/shadow-routes.json`을 직접 만듭니다. 커밋하지 마세요.
4. `.env.example`을 `.env`로 복사합니다.
5. `docker compose up -d api`
6. XC HTTP Load Balancer + Origin Pool(VM 공인 IP:8123)을 만들고 API Discovery를 켭니다. `docs/XC-SETUP.md` 참고.
7. 이 GitHub 저장소로 Code Base Integration을 겁니다. 스캔에 최대 2시간 걸리니 미리 push해 두세요.
8. LB FQDN이 살아나면 제너레이터를 그쪽으로 돌립니다.
   `TARGET_BASE_URL=<xc-lb-fqdn> docker compose --profile traffic up -d traffic`
   결과 확인 전에 몇 시간 돌려둬야 합니다.

## 검증

전체 체크리스트는 `docs/ENDPOINT-MATRIX.md`에 있습니다. 요약:

```bash
# 1. 런타임 파일 없이 기동 -> Shadow 경로 전부 404
rm -f deploy/runtime/shadow-routes.json
docker compose up -d api
curl -i http://localhost:8123/<shadow-경로>

# 2. 런타임 파일과 함께 기동 -> 전부 응답
docker compose restart api
curl -i http://localhost:8123/<shadow-경로>

# 3. 제일 중요. 추적 파일에 Shadow 경로 조각이 0건이어야 함.
# <fragment>는 별도 보관 중인 정답지의 실제 경로 조각으로 채워서 실행하세요.
git grep -nE '<fragment-1>|<fragment-2>|<fragment-3>' -- . ':!deploy/runtime'

# 4. Code-only 경로가 traffic-generator에 없어야 함
grep -rnE '/api/v0/legacy|/api/v1/beneficiaries|/api/v1/statements|/api/v1/loans/apply' services/traffic-generator/

# 5. runtime 디렉터리가 실제로 ignore 되는지
git check-ignore -v deploy/runtime/shadow-routes.json
```
