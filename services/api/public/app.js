// Meridian Bank 데모 UI.
//
// 여기서 호출하는 엔드포인트는 docs/ENDPOINT-MATRIX.md A 섹션의 Common 11개
// 뿐이다. 두 가지를 지켜야 한다.
//
// 1. Code-only 경로를 여기에 추가하지 말 것. 화면에서 호출하는 순간 트래픽이
//    생겨 Common으로 넘어가고 "코드에는 있는데 트래픽이 없는" 버킷이 무너진다.
// 2. Shadow 경로를 여기에 적지 말 것. 이 파일은 git에 올라가므로 경로가
//    스캐너에 잡히고, 그러면 Shadow가 더 이상 Shadow가 아니게 된다.
//
// 데모 중 Shadow 엔드포인트를 보여줄 때는 브라우저 주소창이나 curl을 쓴다.

const state = { token: null, user: null, accounts: [], selected: null };

const $ = (id) => document.getElementById(id);
const won = (n) => new Intl.NumberFormat('ko-KR').format(n) + '원';

const PASSWORDS = {
  alice: 'Demo!Passw0rd-Alice1',
  bob: 'Demo!Passw0rd-Bob2',
  carol: 'Demo!Passw0rd-Carol3',
};

// ---- API 호출 + 화면 로그 ----
function log(method, path, status) {
  const box = $('api-log');
  const cls = status >= 500 ? 's5' : status >= 400 ? 's4' : 's2';
  const row = document.createElement('div');
  const t = new Date().toLocaleTimeString('ko-KR', { hour12: false });
  row.innerHTML =
    `<span class="st ${cls}">${status}</span>` +
    `<span class="mth">${method}</span>` +
    `${path} <span style="color:#5b6b80">${t}</span>`;
  box.prepend(row);
  while (box.children.length > 60) box.lastChild.remove();
}

async function api(method, path, body) {
  const headers = {};
  if (body) headers['content-type'] = 'application/json';
  if (state.token) headers.authorization = `Bearer ${state.token}`;

  let res;
  try {
    res = await fetch(path, { method, headers, body: body ? JSON.stringify(body) : undefined });
  } catch (e) {
    log(method, path, 0);
    throw new Error('네트워크 오류');
  }
  log(method, path, res.status);

  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.message || data.error || `HTTP ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return data;
}

function toast(msg, isErr) {
  const el = document.createElement('div');
  el.className = 'toast' + (isErr ? ' err' : '');
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2600);
}

// ---- 로그인 ----
$('username').addEventListener('change', (e) => {
  $('password').value = PASSWORDS[e.target.value] || '';
});

$('btn-login').addEventListener('click', async () => {
  $('login-err').textContent = '';
  $('btn-login').disabled = true;
  try {
    const d = await api('POST', '/api/v1/auth/login', {
      username: $('username').value,
      password: $('password').value,
    });
    state.token = d.accessToken;
    const me = await api('GET', '/api/v1/users/me');
    state.user = me;
    $('whoami').textContent = `${me.displayName} (${me.username})`;
    $('login-view').classList.add('hidden');
    $('app-view').classList.remove('hidden');
    await refresh();
  } catch (e) {
    $('login-err').textContent = e.message;
  } finally {
    $('btn-login').disabled = false;
  }
});

$('btn-logout').addEventListener('click', () => {
  state.token = null;
  state.user = null;
  state.selected = null;
  $('app-view').classList.add('hidden');
  $('login-view').classList.remove('hidden');
  $('api-log').innerHTML = '';
});

// ---- 조회 ----
async function refresh() {
  const d = await api('GET', '/api/v1/accounts');
  state.accounts = d.accounts || [];
  renderAccounts();
  fillTransferSelects();
  if (state.accounts.length) {
    await selectAccount(state.selected || state.accounts[0].id);
  }
  await loadCards();
}

function renderAccounts() {
  const box = $('accounts');
  box.innerHTML = '';
  if (!state.accounts.length) {
    box.innerHTML = '<div class="empty">계좌가 없습니다.</div>';
    return;
  }
  state.accounts.forEach((a) => {
    const el = document.createElement('div');
    el.className = 'acct' + (a.id === state.selected ? ' active' : '');
    el.innerHTML =
      `<div><div class="no">${a.accountNumber}</div>` +
      `<div class="type">${a.type === 'CHECKING' ? '입출금' : '예금'}</div></div>` +
      `<div class="bal">${won(a.balance)}</div>`;
    el.addEventListener('click', () => selectAccount(a.id));
    box.appendChild(el);
  });
}

async function selectAccount(id) {
  state.selected = id;
  renderAccounts();
  const acct = state.accounts.find((a) => a.id === id);
  $('tx-acct').textContent = acct ? `· ${acct.accountNumber}` : '';

  // 상세 조회 (Common) — 화면에는 잔액만 쓰지만 엔드포인트 트래픽을 만든다
  await api('GET', `/api/v1/accounts/${id}`).catch(() => {});

  const d = await api('GET', `/api/v1/accounts/${id}/transactions`).catch(() => ({ transactions: [] }));
  renderTransactions(d.transactions || []);
}

function renderTransactions(list) {
  const box = $('transactions');
  if (!list.length) {
    box.innerHTML = '<div class="empty">거래 내역이 없습니다.</div>';
    return;
  }
  const rows = list
    .slice()
    .reverse()
    .map((t) => {
      // amount는 항상 양수이고 입출금 방향은 type에 들어있다.
      const out = t.type === 'DEBIT';
      return (
        `<tr><td>${(t.createdAt || '').slice(0, 10)}</td>` +
        `<td>${t.description || t.memo || '-'}</td>` +
        `<td class="num ${out ? 'minus' : 'plus'}">${out ? '-' : '+'}${won(t.amount)}</td></tr>`
      );
    })
    .join('');
  box.innerHTML =
    `<table><thead><tr><th>일자</th><th>내용</th><th style="text-align:right">금액</th></tr></thead>` +
    `<tbody>${rows}</tbody></table>`;
}

// ---- 카드 ----
async function loadCards() {
  const d = await api('GET', '/api/v1/cards').catch(() => ({ cards: [] }));
  const box = $('cards');
  const list = d.cards || [];
  if (!list.length) {
    box.innerHTML = '<div class="empty">보유한 카드가 없습니다.</div>';
    return;
  }
  box.innerHTML = '';
  list.forEach((c) => {
    const el = document.createElement('div');
    el.className = 'pay-card';
    el.innerHTML =
      `<div><div class="pan">${c.maskedPan}</div>` +
      `<div class="type" style="color:#8fa3ba;font-size:11px">${c.brand} · ${c.expiry}</div></div>` +
      `<div style="display:flex;align-items:center;gap:10px">` +
      `<span class="badge ${c.status}">${c.status === 'ACTIVE' ? '정상' : '정지'}</span></div>`;
    if (c.status === 'ACTIVE') {
      const btn = document.createElement('button');
      btn.className = 'ghost sm';
      btn.textContent = '분실신고';
      btn.addEventListener('click', async () => {
        btn.disabled = true;
        try {
          await api('POST', `/api/v1/cards/${c.id}/block`);
          toast('카드를 정지했습니다.');
          await loadCards();
        } catch (e) {
          toast(e.message, true);
          btn.disabled = false;
        }
      });
      el.lastChild.appendChild(btn);
    }
    box.appendChild(el);
  });
}

// ---- 이체 ----
function fillTransferSelects() {
  const from = $('tr-from');
  const to = $('tr-to');
  from.innerHTML = '';
  to.innerHTML = '';
  state.accounts.forEach((a) => {
    const label = `${a.accountNumber} (${won(a.balance)})`;
    from.appendChild(new Option(label, a.id));
    to.appendChild(new Option(label, a.id));
  });
  if (state.accounts.length > 1) to.selectedIndex = 1;
}

$('btn-transfer').addEventListener('click', async () => {
  $('tr-err').textContent = '';
  const fromAccountId = $('tr-from').value;
  const toAccountId = $('tr-to').value;
  if (fromAccountId === toAccountId) {
    $('tr-err').textContent = '출금 계좌와 입금 계좌가 같습니다.';
    return;
  }
  $('btn-transfer').disabled = true;
  try {
    const d = await api('POST', '/api/v1/transfers', {
      fromAccountId,
      toAccountId,
      amount: Number($('tr-amt').value),
      memo: $('tr-memo').value,
    });
    // 이체 상세 조회 (Common)
    if (d && d.transfer) await api('GET', `/api/v1/transfers/${d.transfer.id}`).catch(() => {});
    toast('이체가 완료되었습니다.');
    $('tr-memo').value = '';
    await refresh();
  } catch (e) {
    $('tr-err').textContent = e.message;
  } finally {
    $('btn-transfer').disabled = false;
  }
});
