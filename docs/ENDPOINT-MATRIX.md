# 엔드포인트 매트릭스 

Code Base Integration(코드 기반)과 API Discovery(트래픽 기반)를 대조했을 때 나와야 하는 분류입니다.

| 버킷 | 의미 | 개수 |
|---|---|---|
| Common | 코드에도 있고 트래픽도 있음 | 12 |
| Code-only | 코드에만 있고 트래픽 없음 | 6 |
| Traffic-only (Shadow) | 트래픽만 있고 코드에 없음 | 6 |

코드 스캔은 18개(Common + Code-only), 트래픽 discovery는 18개(Common + Shadow)를 잡아야 합니다. Shadow는 코드 쪽 목록에 절대 나오면 안 됩니다.

## A. Common (12)

정적 라우트 파일에 정의되어 있고 traffic-generator가 반복 호출합니다.

| Method | Path |
|---|---|
| POST | `/api/v1/auth/login` |
| POST | `/api/v1/auth/refresh` |
| GET | `/api/v1/users/me` |
| GET | `/api/v1/accounts` |
| GET | `/api/v1/accounts/{accountId}` |
| GET | `/api/v1/accounts/{accountId}/transactions` |
| POST | `/api/v1/transfers` |
| GET | `/api/v1/transfers/{transferId}` |
| GET | `/api/v1/cards` |
| POST | `/api/v1/cards/{cardId}/block` |
| POST | `/api/v1/cards/{cardId}/reissue` |
| GET | `/healthz` |

## B. Code-only (6)

정적 라우트 파일에 정의되어 있지만 traffic-generator가 의도적으로 호출하지 않습니다. "안 쓰는데 살아있는 공격면" 서사에 씁니다.

| Method | Path | 서사 |
|---|---|---|
| GET | `/api/v0/legacy/accounts/{id}` | 2년 전 폐기한 줄 알았던 v0 |
| POST | `/api/v0/legacy/wire-transfer` | deprecated인데 라우트를 안 지움 |
| GET | `/api/v1/beneficiaries` | 새 UI에서 빠짐 |
| DELETE | `/api/v1/cards/{cardId}` | 콜센터 전용, 데모 기간엔 미사용 |
| GET | `/api/v1/statements/{year}/{month}` | 미출시 |
| POST | `/api/v1/loans/apply` | 피처 플래그 off라 503, 라우트는 등록됨 |

## C. Traffic-only / Shadow (6)

`services/api/src/dynamic/loader.js`가 `deploy/runtime/shadow-routes.json`을 읽어 런타임에만 등록합니다. 이 파일은 `.gitignore` 대상이라 커밋되지 않습니다. 대부분 인증이 없는데, 그게 이 데모의 포인트입니다.

**이 섹션의 실제 URL 경로는 저장소 어디에도, 이 문서에도 적지 않습니다.** 커밋된 문서에 경로를 적는 순간 "Shadow 라우트는 소스에서 찾을 수 없다"는 전제가 무너지고 스캐너가 그대로 집어갑니다. 그래서 핸들러 이름으로만 식별합니다. 실제 경로는 각자 만든 `deploy/runtime/shadow-routes.json`과, 발표자가 따로 들고 있어야 할 원본 구현 계획서에만 있습니다.

| Method | Handler | Auth | 서사 / 위험 |
|---|---|---|---|
| GET | `adminUsersDump` | 없음 | 전체 고객 PII 덤프 |
| GET | `debugConfig` | 없음 | 환경변수, 내부 DB 접속 문자열 노출 |
| GET | `metricsPiiExport` | 없음 | 카드번호 + 주민번호 CSV 유출. Sensitive Data Discovery와 물림 |
| POST | `opsReconcile` | 없음 | 운영팀 임시 정산 배치 트리거 |
| GET | `accountBalanceV2` | JWT | 문서화 안 된 차기 버전 베타 잔액 조회 |
| POST | `partnerKycCallback` | 없음 | 파트너 연동 임시 콜백 |

> BOLA 보너스: Common인 `GET /api/v1/accounts/{accountId}`는 소유권 검사를 일부러 안 합니다. 제너레이터가 A 사용자 토큰으로 B 계좌를 조회하는 호출을 소량 섞어 보내서, Shadow뿐 아니라 정상 엔드포인트에서도 XC API security 탐지가 뜨게 합니다.

## 검증 체크리스트

- [ ] runtime 볼륨 없이 기동 → Common + Code-only 응답, Shadow 6개 전부 404
- [ ] `deploy/runtime/shadow-routes.json` 있을 때 → Shadow 6개 정상 응답
- [ ] 추적 파일 전체(`deploy/runtime/` 제외)에 Shadow 경로 조각 grep → 0건. **이게 제일 중요합니다.**
- [ ] `services/traffic-generator/`에 Code-only 경로 grep → 0건
- [ ] `deploy/runtime/`이 실제로 ignore 되는지 확인

명령어는 README, 발표 대본은 `docs/DEMO-SCRIPT.md`.

## 실제 스캔 결과가 다르면

원인과 함께 여기에 적어두세요. 예를 들어 스캐너가 `app.use(router)` 하위 경로를 해석 못 하거나, 트래픽이 모자라서 discovery가 안 되는 경우가 있습니다. 발표 전에 위 개수를 실측에 맞춰 고치면 됩니다.
