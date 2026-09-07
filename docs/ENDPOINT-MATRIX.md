# 엔드포인트 매트릭스 (정답지)

이 문서는 F5 Distributed Cloud의 **Code Base Integration**(코드 기반
엔드포인트)을 이 저장소 + 실제 배포된 트래픽에 대한 **API Discovery**
(트래픽 기반 엔드포인트)와 비교했을 때 예상되는 분류 결과입니다.

| 버킷 | 의미 | 개수 |
|---|---|---|
| **Common** | 코드에도 있고 트래픽에도 있음 | 11 |
| **Code-only** | 코드에는 있지만 트래픽은 전혀 없음 | 6 |
| **Traffic-only (Shadow)** | 트래픽에는 있지만 코드에는 없음 | 6 |

코드 기반 스캔은 **17**개 엔드포인트(Common + Code-only)를 찾아야 합니다.
트래픽 기반 discovery는 **17**개 엔드포인트(Common + Shadow)를 찾아야
합니다. Shadow 엔드포인트는 코드 기반 목록에 절대 나타나면 안 됩니다.

---

## A. Common -- 코드에도 있고 트래픽도 발생함 (11개)

정적 라우트 파일에 정의되어 있으며, `services/traffic-generator`가 반복
호출합니다.

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
| GET | `/healthz` |

## B. Code-only -- 코드에는 있지만 트래픽은 전혀 없음 (6개)

정적 라우트 파일에 정의되어 있으며, **traffic-generator는 의도적으로 이
엔드포인트들을 절대 호출하지 않습니다.** 시나리오: "사용되지 않지만 여전히
살아있는 공격 표면(attack surface)".

| Method | Path | 시나리오 |
|---|---|---|
| GET | `/api/v0/legacy/accounts/{id}` | 약 2년 전에 폐기되었다고 알려져 있었지만 여전히 살아있음 |
| POST | `/api/v0/legacy/wire-transfer` | Deprecated 상태지만 라우트가 제거된 적 없음 |
| GET | `/api/v1/beneficiaries` | 새 UI에서 빠짐 |
| DELETE | `/api/v1/cards/{cardId}` | 콜센터 전용 도구, 데모 중에는 사용되지 않음 |
| GET | `/api/v1/statements/{year}/{month}` | 아직 출시되지 않음 |
| POST | `/api/v1/loans/apply` | 기능 플래그(feature flag)로 꺼져 있음(503 반환), 라우트는 여전히 등록되어 있음 |

## C. Traffic-only (Shadow API) -- 트래픽에는 있지만 코드에는 없음 (6개)

`services/api/src/dynamic/loader.js`가 `deploy/runtime/shadow-routes.json`을
읽어 **오직 런타임에만** 등록합니다 -- 이 파일은 `.gitignore` 처리되어
있고 **절대 커밋되지 않습니다.** 대부분 의도적으로 인증이 없습니다 --
그것이 바로 이 데모의 핵심입니다.

**설계상, 이 섹션의 정확한 URL 경로는 이 git 저장소 어디에도 -- 심지어
여기에도 -- 의도적으로 적어두지 않습니다.** 커밋된 문서에 경로를 적는
순간 "Shadow 라우트는 소스코드에서 찾을 수 없어야 한다"는 이 데모 전체의
전제가 무너지기 때문입니다. 대신 아래에서는 각 항목을
`services/api/src/dynamic/handlers.js`의 핸들러 함수 이름으로만
식별합니다. 실제 경로는 오직 여러분이 직접 만든
`deploy/runtime/shadow-routes.json`(README의 "`deploy/runtime/shadow-routes.json`
수동으로 만들기" 참고)과, 발표자가 `docs/DEMO-SCRIPT.md`용 비공개
정답지로 보관해야 할 이 프로젝트의 원본 구현 계획서에만 존재합니다.

| Method | Handler | Auth | 시나리오 / 위험 |
|---|---|---|---|
| GET | `adminUsersDump` | 없음 | 전체 고객 PII 덤프 |
| GET | `debugConfig` | 없음 | 환경 변수 / 내부용으로 보이는 DB 연결 문자열 유출 |
| GET | `metricsPiiExport` | 없음 | 카드 PAN + 주민등록번호를 유출하는 CSV -- XC Sensitive Data Discovery와 짝을 이룸 |
| POST | `opsReconcile` | 없음 | 운영팀의 임시(ad-hoc) 배치 트리거 |
| GET | `accountBalanceV2` | JWT | 문서화되지 않은 차세대 버전 스타일의 베타 잔액 엔드포인트 |
| POST | `partnerKycCallback` | 없음 | 파트너 연동용 임시 콜백 |

> **BOLA 보너스:** `GET /api/v1/accounts/{accountId}`(Common 엔드포인트)는
> 의도적으로 소유권 검사를 하지 않습니다. 트래픽 생성기는 이따금 사용자
> 간 교차 호출(A 사용자의 토큰으로 B 사용자의 계좌를 조회)을 섞어 넣어,
> Shadow 세트뿐 아니라 Common 엔드포인트에서도 XC API security / BOLA
> 탐지가 발생하도록 합니다.

---

## 검증 체크리스트

- [ ] `docker compose up api`(runtime 볼륨 없이)가 부팅되고 Common +
      Code-only가 응답하며, 6개의 Shadow 경로는 모두 404를 반환한다.
- [ ] `deploy/runtime/shadow-routes.json`이 있으면 6개의 Shadow 경로가
      모두 정상 응답한다(핸들러에 따라 200/204).
- [ ] 추적되는(tracked) 파일 전체(`deploy/runtime/` 제외)를 대상으로 Shadow
      라우트 경로 조각을 grep 했을 때 0건이어야 한다. 이 데모 전체에서
      가장 중요한(make-or-break) 검사이다.
- [ ] `services/traffic-generator/`를 대상으로 6개의 Code-only 경로를
      grep 했을 때 0건이어야 한다.
- [ ] `deploy/runtime/`이 실제로 git-ignore 되어 있는지 확인한다.

정확한 명령어는 저장소 README를, 발표자용 시연 스크립트는
`docs/DEMO-SCRIPT.md`를 참고하세요.

## 실제 XC 스캔 결과가 이 표와 다를 경우

원인과 함께 여기에 차이를 기록하세요(예: "스캐너가 `app.use(router)`의
하위 경로 X를 해석하지 못함" 또는 "트래픽 볼륨이 너무 낮아 엔드포인트
Y가 discovery 되지 않음") 그리고 발표 전에 실제 결과에 맞춰 위 개수를
업데이트하세요.
