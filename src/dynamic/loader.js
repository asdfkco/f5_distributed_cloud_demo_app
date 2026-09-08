// Shadow 라우트를 런타임에 등록하는 로더.
// 목적은 하나다. Shadow 엔드포인트의 경로 문자열이 git에 올라가는 소스에
// 절대 남지 않게 하는 것.
//
// RUNTIME_ROUTES_FILE이 가리키는 JSON을 읽는다. `routes` 배열에
// { method, path, handler, auth } 형태로 들어있다. handler 이름을
// ./handlers.js에서 찾은 뒤 app[method](path, handler)로 등록한다.
// 메서드명이 변수라 정적 분석으로는 풀리지 않고, 경로 문자열은 애초에
// 이 파일에 없다. 실제 경로는 git에 추적되지 않는 런타임 파일에만 있다.
//
// 정적 라우트 전부 뒤, 404 핸들러 앞에 마운트해야 한다.
// 환경 변수가 없거나 파일이 없으면 아무것도 하지 않고 넘어간다.
// 이때 앱은 Common + Code-only만 서비스하면서 정상 기동한다.
const fs = require('fs');
const path = require('path');
const handlers = require('./handlers');
const { requireAuth } = require('../middleware/auth');

function loadDynamicRoutes(app) {
  const cfgPath = process.env.RUNTIME_ROUTES_FILE;
  if (!cfgPath) {
    console.log('[dynamic] RUNTIME_ROUTES_FILE not set -- skipping dynamic route registration');
    return 0;
  }

  const resolved = path.resolve(cfgPath);
  if (!fs.existsSync(resolved)) {
    console.log(`[dynamic] runtime routes file not found at ${resolved} -- skipping dynamic route registration`);
    return 0;
  }

  let parsed;
  try {
    parsed = JSON.parse(fs.readFileSync(resolved, 'utf8'));
  } catch (err) {
    console.error(`[dynamic] failed to parse runtime routes file: ${err.message}`);
    return 0;
  }

  const defs = Array.isArray(parsed.routes) ? parsed.routes : [];
  let registered = 0;

  for (const def of defs) {
    if (!def || !def.method || !def.path || !def.handler) continue;

    const handler = handlers[def.handler];
    if (typeof handler !== 'function') {
      console.warn(`[dynamic] unknown handler "${def.handler}" -- skipping route`);
      continue;
    }

    const method = String(def.method).toLowerCase();
    if (typeof app[method] !== 'function') {
      console.warn(`[dynamic] unsupported HTTP method "${def.method}" -- skipping route`);
      continue;
    }

    const chain = def.auth ? [requireAuth, handler] : [handler];
    app[method](def.path, ...chain);
    registered += 1;
  }

  console.log(`[dynamic] registered ${registered} runtime route(s) from ${resolved}`);
  return registered;
}

module.exports = { loadDynamicRoutes };
