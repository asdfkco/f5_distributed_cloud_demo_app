// traffic-generator가 보낼 요청 비율(가중치).
//
// !!! 여기에 CODE-ONLY 경로를 절대 추가하지 말 것 !!!
// docs/ENDPOINT-MATRIX.md B 섹션의 Code-only 엔드포인트 6개는 트래픽을
// 받으면 안 된다. 하나라도 여기 들어가면 "Code-only = 죽은 코드" 버킷이
// 통째로 무너진다. merge 전에 이 디렉터리를 B 섹션 경로 목록과 대조해
// grep하는 게 안전하다. 이 파일이 그 grep에 스스로 걸리면 곤란하므로
// 여기에 경로를 다시 적어두지는 않았다.
//
// Shadow 경로도 이 파일은 물론 저장소 어느 파일에도 적지 않는다.
// index.js가 API 쪽 로더와 같은 런타임 파일에서 읽어온다
// (SHADOW_ROUTES_FILE / RUNTIME_ROUTES_FILE -> deploy/runtime/shadow-routes.json,
// .gitignore 대상). 그 파일이 없으면 Common 트래픽만 보내고 끝이다.
const commonEndpoints = [
  { name: 'login', method: 'POST', path: '/api/v1/auth/login', weight: 10, auth: false },
  { name: 'refresh', method: 'POST', path: '/api/v1/auth/refresh', weight: 3, auth: false },
  { name: 'me', method: 'GET', path: '/api/v1/users/me', weight: 8, auth: true },
  { name: 'listAccounts', method: 'GET', path: '/api/v1/accounts', weight: 10, auth: true },
  { name: 'getAccount', method: 'GET', path: '/api/v1/accounts/:accountId', weight: 8, auth: true },
  // 의도적으로 이따금 섞어 넣는 cross-user probe: 현재 actor의 토큰을
  // 다른(DIFFERENT) 사용자의 계좌 id에 대해 사용하여, XC API security
  // 데모를 위한 실제 BOLA/IDOR 트래픽을 발생시킨다. 경로 자체는 여전히
  // 동일한 Common 경로이다.
  { name: 'getAccountBola', method: 'GET', path: '/api/v1/accounts/:otherAccountId', weight: 1, auth: true },
  { name: 'getTransactions', method: 'GET', path: '/api/v1/accounts/:accountId/transactions', weight: 8, auth: true },
  { name: 'createTransfer', method: 'POST', path: '/api/v1/transfers', weight: 4, auth: true },
  { name: 'getTransfer', method: 'GET', path: '/api/v1/transfers/:transferId', weight: 3, auth: true },
  { name: 'listCards', method: 'GET', path: '/api/v1/cards', weight: 5, auth: true },
  { name: 'blockCard', method: 'POST', path: '/api/v1/cards/:cardId/block', weight: 1, auth: true },
  // blockCard와 짝을 맞춘다. 없으면 시간이 지날수록 카드가 전부 정지 상태로
  // 남아 UI 화면이 죽는다.
  { name: 'reissueCard', method: 'POST', path: '/api/v1/cards/:cardId/reissue', weight: 1, auth: true },
];

module.exports = { commonEndpoints };
