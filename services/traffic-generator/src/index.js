require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { commonEndpoints } = require('./scenarios');

const BASE_URL = process.env.TARGET_BASE_URL;
const RPM = Number(process.env.REQUESTS_PER_MINUTE || 6);
const DURATION_HOURS = Number(process.env.DURATION_HOURS || 4);
// API의 dynamic loader가 읽는 것과 동일한 파일이다; 두 env 이름 중
// 어느 쪽을 써도 동작하므로, docker-compose가 두 서비스에 대해 하나의
// 마운트를 재사용할 수 있다.
const SHADOW_ROUTES_FILE = process.env.SHADOW_ROUTES_FILE || process.env.RUNTIME_ROUTES_FILE;

if (!BASE_URL) {
  console.error('TARGET_BASE_URL is required -- point this at the F5 XC HTTP LB FQDN, never at the origin VM directly.');
  process.exit(1);
}

// 데모용 사용자(가상). 비밀번호는 API의 시드 데이터와 동일한 환경 변수를
// 통해 공유되므로, API가 어떤 DEMO_*_PASSWORD로 시작되었든 로그인이
// 성공한다.
const demoUsers = [
  { username: 'alice', password: process.env.DEMO_ALICE_PASSWORD || '' },
  { username: 'bob', password: process.env.DEMO_BOB_PASSWORD || '' },
  { username: 'carol', password: process.env.DEMO_CAROL_PASSWORD || '' },
];

// sessions[username] = { accessToken, refreshToken, accountIds, cardIds, transferId } 형태의 세션 저장소
const sessions = {};

function loadShadowEndpoints() {
  if (!SHADOW_ROUTES_FILE) {
    console.log('[traffic] no SHADOW_ROUTES_FILE/RUNTIME_ROUTES_FILE set -- shadow traffic disabled, sending Common traffic only');
    return [];
  }
  const resolved = path.resolve(SHADOW_ROUTES_FILE);
  if (!fs.existsSync(resolved)) {
    console.log(`[traffic] runtime routes file not found at ${resolved} -- shadow traffic disabled, sending Common traffic only`);
    return [];
  }
  try {
    const parsed = JSON.parse(fs.readFileSync(resolved, 'utf8'));
    const routes = Array.isArray(parsed.routes) ? parsed.routes : [];
    const mapped = routes.map((r) => ({
      name: `shadow_${r.handler || r.path}`,
      method: r.method,
      path: r.path,
      auth: !!r.auth,
      weight: 1,
      shadow: true,
    }));
    console.log(`[traffic] loaded ${mapped.length} shadow endpoint(s) from ${resolved}`);
    return mapped;
  } catch (err) {
    console.error(`[traffic] failed to parse runtime routes file: ${err.message}`);
    return [];
  }
}

async function loginUser(demoUser) {
  const res = await fetch(`${BASE_URL}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: demoUser.username, password: demoUser.password }),
  });
  if (!res.ok) {
    console.error(`[traffic] login failed for ${demoUser.username}: ${res.status}`);
    return null;
  }
  const body = await res.json();
  const session = { accessToken: body.accessToken, refreshToken: body.refreshToken, accountIds: [], cardIds: [], transferId: null };
  const acctRes = await fetch(`${BASE_URL}/api/v1/accounts`, {
    headers: { Authorization: `Bearer ${session.accessToken}` },
  });
  if (acctRes.ok) {
    const acctBody = await acctRes.json();
    session.accountIds = (acctBody.accounts || []).map((a) => a.id);
  }
  const cardRes = await fetch(`${BASE_URL}/api/v1/cards`, {
    headers: { Authorization: `Bearer ${session.accessToken}` },
  });
  if (cardRes.ok) {
    const cardBody = await cardRes.json();
    session.cardIds = (cardBody.cards || []).map((c) => c.id);
  }
  sessions[demoUser.username] = session;
  return session;
}

async function ensureSession(demoUser) {
  const existing = sessions[demoUser.username];
  if (existing && existing.accessToken) return existing;
  return loginUser(demoUser);
}

function otherUsersAccountId(currentUsername) {
  for (const [username, session] of Object.entries(sessions)) {
    if (username !== currentUsername && session.accountIds.length) {
      return session.accountIds[Math.floor(Math.random() * session.accountIds.length)];
    }
  }
  return null;
}

// 경로 파라미터에는 매번 다른 값이 흘러야 한다. 같은 값만 반복하면 XC가
// 그 값을 파라미터로 추론하지 못하고 고정 경로로 학습한다.
function pickRandom(list) {
  if (!list || !list.length) return null;
  return list[Math.floor(Math.random() * list.length)];
}

function fillTemplate(templatePath, actorUsername, session) {
  return templatePath.replace(/:([A-Za-z0-9_]+)/g, (_, name) => {
    if (name === 'accountId') return pickRandom(session.accountIds) || 'sample-account';
    if (name === 'otherAccountId') return otherUsersAccountId(actorUsername) || pickRandom(session.accountIds) || 'sample-account';
    if (name === 'cardId') return pickRandom(session.cardIds) || 'sample-card';
    if (name === 'transferId') return session.transferId || 'sample-transfer';
    return 'sample';
  });
}

function weightedPick(list) {
  const total = list.reduce((sum, e) => sum + e.weight, 0);
  let r = Math.random() * total;
  for (const e of list) {
    if (r < e.weight) return e;
    r -= e.weight;
  }
  return list[list.length - 1];
}

async function callEndpoint(ep, actorUsername, session) {
  const url = `${BASE_URL}${fillTemplate(ep.path, actorUsername, session)}`;
  const headers = { 'Content-Type': 'application/json' };
  if (ep.auth && session.accessToken) headers.Authorization = `Bearer ${session.accessToken}`;

  let body;
  if (ep.name === 'login') {
    const demoUser = demoUsers.find((u) => u.username === actorUsername);
    body = JSON.stringify({ username: actorUsername, password: (demoUser && demoUser.password) || '' });
  } else if (ep.name === 'refresh') {
    body = JSON.stringify({ refreshToken: session.refreshToken });
  } else if (ep.name === 'createTransfer') {
    const otherId = otherUsersAccountId(actorUsername);
    body = JSON.stringify({
      fromAccountId: session.accountIds[0],
      toAccountId: session.accountIds[1] || otherId || session.accountIds[0],
      amount: 1000 + Math.floor(Math.random() * 5000),
      currency: 'KRW',
      memo: 'demo transfer',
    });
  } else if (ep.method === 'POST' && !ep.shadow) {
    body = JSON.stringify({});
  }

  try {
    const res = await fetch(url, { method: ep.method, headers, body });
    console.log(`${new Date().toISOString()} actor=${actorUsername} ${ep.shadow ? 'SHADOW' : 'common'} ${ep.method} ${ep.path} -> ${res.status}`);

    if (res.status === 401 && ep.auth) {
      // 토큰이 만료되었을 가능성이 높음, 다음 tick에서 강제로 다시 로그인.
      delete sessions[actorUsername];
      return;
    }

    if ((ep.name === 'login' || ep.name === 'refresh') && res.ok) {
      const respBody = await res.json().catch(() => null);
      if (respBody && respBody.accessToken) {
        session.accessToken = respBody.accessToken;
        session.refreshToken = respBody.refreshToken || session.refreshToken;
      }
    }

    if (ep.name === 'createTransfer' && res.ok) {
      const respBody = await res.json().catch(() => null);
      if (respBody && respBody.transfer) session.transferId = respBody.transfer.id;
    }
  } catch (err) {
    console.error(`[traffic] request error for ${ep.method} ${ep.path}: ${err.message}`);
  }
}

async function main() {
  console.log(`[traffic] target=${BASE_URL} rpm=${RPM} durationHours=${DURATION_HOURS}`);
  const shadowEndpoints = loadShadowEndpoints();
  const allEndpoints = [...commonEndpoints, ...shadowEndpoints];

  // 모든 데모 사용자에 대해 세션을 미리 준비해 두어, cross-user BOLA
  // probe와 shadow 호출이 처음부터 실제 계좌 id를 갖고 동작할 수 있도록
  // 한다.
  for (const demoUser of demoUsers) {
    if (demoUser.password) await ensureSession(demoUser);
  }

  const intervalMs = Math.max(1000, Math.round(60000 / RPM));
  const endAt = Date.now() + DURATION_HOURS * 3600 * 1000;

  async function tick() {
    const actorPool = demoUsers.filter((u) => u.password);
    const actor = actorPool[Math.floor(Math.random() * actorPool.length)] || demoUsers[0];
    const session = await ensureSession(actor);
    if (session) {
      const ep = weightedPick(allEndpoints);
      await callEndpoint(ep, actor.username, session);
    }

    if (Date.now() < endAt) {
      setTimeout(tick, intervalMs);
    } else {
      console.log('[traffic] duration elapsed, stopping');
    }
  }

  tick();
}

main();
