# F5 Distributed Cloud 콘솔 설정

전제: `banking-api`가 공인 IP VM에서 `:8123`으로 떠 있고, 그 VM에 `deploy/runtime/shadow-routes.json`을 직접 만들어 둔 상태여야 합니다. README의 VM 배포 섹션을 먼저 보세요.

## 1. HTTP Load Balancer + Origin Pool

1. Manage → Load Balancers → HTTP Load Balancers → Add HTTP Load Balancer
2. LB에 쓸 도메인을 지정합니다. 직접 준비한 도메인이나 XC가 주는 도메인 둘 다 됩니다.
3. Origin Pool에 VM 공인 IP, 포트 `8123`을 추가합니다.
4. TLS는 LB에서 종료시킵니다. XC 관리 인증서를 쓰면 편합니다.
5. Other Settings에서 **API Discovery를 켭니다.** 이걸 빼먹으면 트래픽 쪽 인벤토리가 아예 안 생깁니다.
6. 저장하고 publish.

트래픽은 반드시 이 LB FQDN을 거쳐야 합니다. VM IP로 직접 때리면 XC가 아무것도 못 봅니다.

## 2. Code Base Integration (GitHub)

1. Manage → API Management → Code Base Integration
2. Add Repository → GitHub 계정/조직 연결. username과 PAT를 넣습니다.
3. 저장소와 스캔할 브랜치(`main`)를 고릅니다.
4. 스캔 시작. 첫 결과까지 최대 2시간쯤 걸립니다. **데모 하루 전에는 push와 스캔을 끝내두세요.**

### 토큰 권한 (org 저장소를 쓸 때 주의)

저장소가 org 소속이면 저장소 읽기 권한만으로는 부족하다. 콘솔이 org 목록을
먼저 조회하는데, 토큰이 org를 못 보면 저장소 목록이 통째로 비어서 나온다.
증상이 "저장소가 하나도 안 뜬다"로 나타나기 때문에 저장소 권한 문제로
오해하기 쉽다.

Fine-grained token:

    Resource owner            org 이름 (개인 계정으로 두면 org 저장소가 안 보인다)
    Repository permissions    Contents: Read-only, Metadata: Read-only
    Organization permissions  Members: Read-only          <- 이게 빠지면 안 된다

Classic token이면 `repo` + `read:org`.

토큰이 제대로 되었는지는 아래로 확인한다. org 이름이 나와야 한다.
빈 배열이면 Members 권한이 없는 것이다.

```bash
curl -s -H "Authorization: Bearer $TOKEN" https://api.github.com/user/orgs
```

권한을 고쳤는데도 목록이 비어 있으면 **연동을 지우고 새로 만든다.** 콘솔은
연동 생성 시점의 org 목록을 들고 있어서, 토큰 권한만 나중에 고치면 반영되지
않는다.

## 3. 트래픽 발생

1. LB FQDN에 닿는 아무 호스트에서 `TARGET_BASE_URL`을 그 FQDN으로 두고 제너레이터를 돌립니다.
2. 엔드포인트마다 충분히 쌓여야 discovery가 안정적으로 잡습니다. 결과 확인 전에 **최소 몇 시간**은 돌려두세요.

## 4. 결과 확인

Manage → API Management → API Endpoints (콘솔 버전에 따라 이름이 조금 다를 수 있습니다)

- discovery source나 classification으로 필터를 걸어 Common / Code-only / Traffic-only 버킷을 봅니다.
- 개수와 경로를 `docs/ENDPOINT-MATRIX.md`와 대조합니다. Shadow 경로는 그 문서에도 일부러 빼놨으니, 확인할 때는 따로 보관 중인 정답지를 쓰세요.
- Shadow 탐지와 Sensitive Data Discovery 결과(`metricsPiiExport`가 흘리는 카드번호/주민번호 패턴)는 보통 같은 API Security 화면 계열에 뜹니다. 양쪽 다 확인하세요.

## 잘 안 될 때

**코드 스캔이 Common/Code-only를 일부 놓친 경우.** 스캐너가 `app.use(router)` 간접 참조를 다 풀어내지는 못합니다. 라우트를 인라인으로 바꿔서 억지로 맞추지 말고, `docs/ENDPOINT-MATRIX.md`에 기록해두고 오히려 발표 소재로 쓰세요. "정적 분석만으로는 이런 한계가 있다"가 이 데모의 논지와 맞습니다.

**Shadow가 트래픽 discovery에 안 뜨는 경우.** 제너레이터 컨테이너에 `deploy/runtime/shadow-routes.json`이 마운트됐는지, 로그에 `SHADOW` 라인이 실제로 찍히는지, 트래픽을 충분히 오래 돌렸는지 순서대로 확인합니다.

**경로 파라미터가 `{DYN}`으로 안 잡히고 실제 값이 박혀 있는 경우.**
`/api/v1/cards/card_alice_1/block` 처럼 나온다면, 그 자리에 흐른 값이 한
종류뿐이라 XC가 파라미터로 추론하지 못한 것이다. 값이 여러 개 흘러야
추론한다. 시드 데이터에서 해당 리소스를 사용자마다 여러 개 만들고,
traffic-generator가 매번 다른 값을 고르게 한다. 이걸 방치하면 코드 스캔이
잡은 `/api/v1/cards/{cardId}/block` 과 매칭되지 않아 같은 엔드포인트가
Code-only 하나, 가짜 Traffic-only 하나로 갈린다.

**개수가 안 맞는 경우.** README의 로컬 검증을 배포된 VM에서 XC를 거치지 않고 직접 돌려보세요. 앱 문제인지 XC discovery 문제인지 바로 갈립니다.
