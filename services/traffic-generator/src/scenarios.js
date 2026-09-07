// Endpoint weights for the traffic-generator's request mix.
//
// !!! DO NOT ADD CODE-ONLY PATHS HERE !!!
// The 6 Code-only endpoints listed in docs/ENDPOINT-MATRIX.md section B
// (the legacy v0 account/wire-transfer routes, the retired beneficiaries
// listing, the call-center-only card delete, the unreleased statements
// endpoint, and the feature-flagged loan application) must NEVER receive
// traffic. Adding any of their paths to this file defeats the whole
// "Code-only = dead code" demo bucket. A CI/lint step should grep this
// directory against the path list in docs/ENDPOINT-MATRIX.md section B
// before merging changes -- deliberately not repeated verbatim here so this
// file itself can never accidentally match that grep.
//
// NOTE ON SHADOW ENDPOINTS: Shadow (traffic-only) endpoint paths are
// intentionally NOT written anywhere in this file, or anywhere else in this
// git-tracked repository. index.js loads them at runtime from the same
// untracked runtime routes file the API's dynamic loader reads
// (SHADOW_ROUTES_FILE / RUNTIME_ROUTES_FILE -> deploy/runtime/shadow-routes.json,
// which is .gitignore'd). If that file/env var is absent, this generator
// simply sends Common traffic only -- it never hardcodes a Shadow path.
const commonEndpoints = [
  { name: 'login', method: 'POST', path: '/api/v1/auth/login', weight: 10, auth: false },
  { name: 'refresh', method: 'POST', path: '/api/v1/auth/refresh', weight: 3, auth: false },
  { name: 'me', method: 'GET', path: '/api/v1/users/me', weight: 8, auth: true },
  { name: 'listAccounts', method: 'GET', path: '/api/v1/accounts', weight: 10, auth: true },
  { name: 'getAccount', method: 'GET', path: '/api/v1/accounts/:accountId', weight: 8, auth: true },
  // Occasional intentional cross-user probe: uses the current actor's token
  // against a DIFFERENT user's account id, to generate real BOLA/IDOR
  // traffic for the XC API security demo. Still just the same Common path.
  { name: 'getAccountBola', method: 'GET', path: '/api/v1/accounts/:otherAccountId', weight: 1, auth: true },
  { name: 'getTransactions', method: 'GET', path: '/api/v1/accounts/:accountId/transactions', weight: 8, auth: true },
  { name: 'createTransfer', method: 'POST', path: '/api/v1/transfers', weight: 4, auth: true },
  { name: 'getTransfer', method: 'GET', path: '/api/v1/transfers/:transferId', weight: 3, auth: true },
  { name: 'listCards', method: 'GET', path: '/api/v1/cards', weight: 5, auth: true },
  { name: 'blockCard', method: 'POST', path: '/api/v1/cards/:cardId/block', weight: 1, auth: true },
];

module.exports = { commonEndpoints };
