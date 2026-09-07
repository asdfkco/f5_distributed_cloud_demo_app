// 뱅킹 데모용 인메모리 가상 시드 데이터. 데이터베이스는 사용하지 않는다.
//
// 식별자는 전부 가짜다.
// - 카드번호는 카드사가 테스트 용도로 예약해 놓고 실제 카드소지자에게는
//   절대 발급하지 않는 예약된 테스트용 PAN(4111 1111 1111 1111 등)을
//   사용한다.
// - rrn은 주민등록번호 형식(YYMMDD-XSSSSSS)만 흉내낸 무작위 숫자로,
//   실존 인물과 아무 관련이 없다. metricsPiiExport 핸들러로 흘려보내서
//   XC Sensitive Data Discovery의 패턴 매칭을 시연하는 용도다.
// - 이메일은 예약된 @example.com 도메인(RFC 2606)을 사용한다.
const crypto = require('crypto');

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

function verifyPassword(password, stored) {
  if (!stored || typeof stored !== 'string' || !stored.includes(':')) return false;
  const [salt, hash] = stored.split(':');
  const check = crypto.scryptSync(password || '', salt, 64).toString('hex');
  const a = Buffer.from(hash, 'hex');
  const b = Buffer.from(check, 'hex');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function maskPan(pan) {
  return `${pan.slice(0, 4)} ${pan.slice(4, 6)}** **** ${pan.slice(-4)}`;
}

const users = [
  {
    id: 'usr_alice',
    username: 'alice',
    email: 'alice@example.com',
    displayName: 'Alice Kim',
    rrn: '900101-1234567', // 가상 데이터, 형식만 흉내낸 값 -- 파일 상단 주석 참고
    passwordHash: hashPassword(process.env.DEMO_ALICE_PASSWORD || 'Demo!Passw0rd-Alice1'),
  },
  {
    id: 'usr_bob',
    username: 'bob',
    email: 'bob@example.com',
    displayName: 'Bob Park',
    rrn: '880614-2345678',
    passwordHash: hashPassword(process.env.DEMO_BOB_PASSWORD || 'Demo!Passw0rd-Bob2'),
  },
  {
    id: 'usr_carol',
    username: 'carol',
    email: 'carol@example.com',
    displayName: 'Carol Lee',
    rrn: '950322-2456789',
    passwordHash: hashPassword(process.env.DEMO_CAROL_PASSWORD || 'Demo!Passw0rd-Carol3'),
  },
];

const accounts = [
  { id: 'acc_alice_chk', userId: 'usr_alice', accountNumber: '110-234-567890', type: 'CHECKING', balance: 1523000, currency: 'KRW' },
  { id: 'acc_alice_sav', userId: 'usr_alice', accountNumber: '110-234-567891', type: 'SAVINGS', balance: 8500000, currency: 'KRW' },
  { id: 'acc_bob_chk', userId: 'usr_bob', accountNumber: '110-345-678901', type: 'CHECKING', balance: 642000, currency: 'KRW' },
  { id: 'acc_bob_sav', userId: 'usr_bob', accountNumber: '110-345-678902', type: 'SAVINGS', balance: 12300000, currency: 'KRW' },
  { id: 'acc_carol_chk', userId: 'usr_carol', accountNumber: '110-456-789012', type: 'CHECKING', balance: 2110000, currency: 'KRW' },
  { id: 'acc_carol_sav', userId: 'usr_carol', accountNumber: '110-456-789013', type: 'SAVINGS', balance: 450000, currency: 'KRW' },
];

// 예약된 테스트용 PAN, 실제 카드번호가 아니다.
const cards = [
  { id: 'card_alice_1', userId: 'usr_alice', pan: '4111111111111111', brand: 'VISA', status: 'ACTIVE', expiry: '12/29' },
  { id: 'card_bob_1', userId: 'usr_bob', pan: '5555555555554444', brand: 'MASTERCARD', status: 'ACTIVE', expiry: '08/28' },
  { id: 'card_carol_1', userId: 'usr_carol', pan: '4012888888881881', brand: 'VISA', status: 'ACTIVE', expiry: '03/27' },
  { id: 'card_carol_2', userId: 'usr_carol', pan: '378282246310005', brand: 'AMEX', status: 'ACTIVE', expiry: '11/26' },
].map((c) => ({ ...c, maskedPan: maskPan(c.pan) }));

const transactions = [];
let txCounter = 1;
// 입금(CREDIT)과 출금(DEBIT)에 각각 어울리는 적요를 쓴다.
// 뒤섞으면 UI 거래내역에 "커피값 입금" 같은 항목이 뜬다.
const creditDescriptions = ['급여 입금', '이자 지급', '계좌 이체 입금'];
const debitDescriptions = ['편의점', '카페', '공과금 자동이체', '온라인 쇼핑', 'ATM 출금', '구독 결제'];
for (const account of accounts) {
  for (let i = 0; i < 5; i += 1) {
    const isCredit = i % 3 === 0;
    const pool = isCredit ? creditDescriptions : debitDescriptions;
    transactions.push({
      id: `txn_${String(txCounter).padStart(4, '0')}`,
      accountId: account.id,
      type: isCredit ? 'CREDIT' : 'DEBIT',
      amount: 1000 * (5 + ((txCounter * 37) % 95)),
      description: pool[txCounter % pool.length],
      createdAt: new Date(Date.now() - txCounter * 6 * 3600 * 1000).toISOString(),
    });
    txCounter += 1;
  }
}

const transfers = [];

module.exports = {
  users,
  accounts,
  cards,
  transactions,
  transfers,
  hashPassword,
  verifyPassword,
  maskPan,
};
