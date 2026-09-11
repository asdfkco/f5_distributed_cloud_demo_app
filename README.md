# Meridian Bank — 데모 뱅킹 API

F5 Distributed Cloud의 Code Base Integration과 API Discovery를 대조해 Shadow API를 드러내는 데모용 Express 서버다. 합성 데이터만 사용하는 가상 은행 API로, 로그인·계좌·이체·카드 기능과 간단한 웹 UI를 제공한다.

트래픽 생성기와 배포용 compose, 문서는 [f5_distributed_cloud_demo_harness](https://github.com/nginx-store/f5_distributed_cloud_demo_harness)에 있다. 이 저장소에는 **서버 코드만** 둔다. XC 코드 스캐너가 저장소 루트의 매니페스트로 언어와 프레임워크를 판별하기 때문이다.
실행 진입점은 저장소 루트의 `package.json`과 `src/server.js`다.

모든 데이터는 가짜다. 카드사가 테스트용으로 예약한 PAN, 형식만 맞춘 주민번호, `@example.com` 이메일만 쓴다. 실제 개인정보나 자격증명은 없다.

## 구조

```
src/
  server.js          부트스트랩. 정적 라우트 마운트 후 동적 로더 호출
  routes/            Common + Code-only 라우트
  dynamic/           Shadow 라우트 로더와 핸들러
  middleware/        JWT 인증, 요청 로깅
  data/seed.js       인메모리 합성 데이터
public/              데모 웹 UI
```

## 엔드포인트 세 갈래

이 서버는 세 종류의 엔드포인트를 의도적으로 섞어 놓았다.

**Common** — 소스에 있고 트래픽도 받는다. 정상 운영 중인 API.

**Code-only** — 소스에 있으나 트래픽이 없다. `routes/legacy.routes.js`와 `routes/unreleased.routes.js`. 폐기했다고 믿었던 v0, 미출시 기능, 피처 플래그로 꺼둔 라우트 등. 쓰지 않는데 살아 있는 공격면을 보여준다.

**Shadow** — 트래픽은 있는데 소스에 없다. `src/dynamic/loader.js`가 `RUNTIME_ROUTES_FILE`이 가리키는 JSON을 읽어 런타임에만 등록한다.

## Shadow 라우트가 소스에 없는 이유

데모가 성립하려면 코드 스캐너가 Shadow 엔드포인트를 **소스에서 찾지 못해야** 한다. 그래서 경로 문자열을 저장소 밖으로 완전히 빼냈다.

`loader.js`는 설정 파일을 읽어 `app[method](path, handler)` 형태로 등록한다. 메서드명이 변수라 정적 분석으로 풀리지 않고, 경로 문자열은 애초에 이 파일에 없다. `handlers.js`에는 핸들러 함수만 이름으로 들어 있다.

실제 라우트 정의는 하네스 저장소의 `deploy/runtime/shadow-routes.json`에만 있으며 그쪽에서도 git 추적 대상이 아니다.

설정 파일이 없으면 서버는 정상 기동해 Common + Code-only만 서비스하고 Shadow 경로는 404를 반환한다.

## 로컬 실행

```bash
npm install
node src/server.js          # 기본 :8080
```

주요 환경변수:

| 변수 | 설명 |
|---|---|
| `PORT` | 리스닝 포트 (기본 8080) |
| `JWT_SECRET` | HS256 서명 키 |
| `RUNTIME_ROUTES_FILE` | Shadow 라우트 정의 JSON 경로. 없으면 Shadow 미등록 |
| `FEATURE_LOANS_ENABLED` | 대출 신청 피처 플래그. 꺼두면 503, 라우트는 등록됨 |
| `DEMO_ALICE_PASSWORD` 등 | 데모 계정 비밀번호 |

컨테이너로 띄우거나 트래픽을 발생시키려면 하네스 저장소를 쓴다.

## 의도적으로 남겨둔 취약점

`GET /api/v1/accounts/:accountId`는 소유권 검사를 하지 않는다. 인증만 통과하면 누구의 계좌든 조회된다. XC의 BOLA 탐지를 시연하기 위한 것이므로 **고치지 말 것.** 해당 라우트에 주석으로도 적어 두었다.

Shadow 핸들러 중 일부는 인증이 없고 민감 데이터를 그대로 반환한다. 이것도 의도된 것이다.
