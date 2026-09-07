// In-memory synthetic seed data for the banking demo. No database.
//
// All identifiers are fake:
// - Card numbers use reserved test PANs (4111 1111 1111 1111 etc.) that
//   networks reserve for testing and never issue to real cardholders.
// - "RRN" values are formatted like a Korean resident registration number
//   (YYMMDD-XSSSSSS) but are randomly generated digits with NO connection to
//   any real person -- purely to demonstrate XC's Sensitive Data Discovery
//   pattern matching via the runtime-only PII-export handler (see
//   ../dynamic/handlers.js: metricsPiiExport).
// - Emails use the reserved @example.com domain (RFC 2606).
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
    rrn: '900101-1234567', // synthetic, format-only -- see file header
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

// Reserved test PANs -- never real card numbers.
const cards = [
  { id: 'card_alice_1', userId: 'usr_alice', pan: '4111111111111111', brand: 'VISA', status: 'ACTIVE', expiry: '12/29' },
  { id: 'card_bob_1', userId: 'usr_bob', pan: '5555555555554444', brand: 'MASTERCARD', status: 'ACTIVE', expiry: '08/28' },
  { id: 'card_carol_1', userId: 'usr_carol', pan: '4012888888881881', brand: 'VISA', status: 'ACTIVE', expiry: '03/27' },
  { id: 'card_carol_2', userId: 'usr_carol', pan: '378282246310005', brand: 'AMEX', status: 'ACTIVE', expiry: '11/26' },
].map((c) => ({ ...c, maskedPan: maskPan(c.pan) }));

const transactions = [];
let txCounter = 1;
const descriptions = ['Grocery store', 'Coffee shop', 'Salary deposit', 'Utility bill', 'Online shopping', 'ATM withdrawal', 'Subscription'];
for (const account of accounts) {
  for (let i = 0; i < 5; i += 1) {
    const isCredit = i % 3 === 0;
    transactions.push({
      id: `txn_${String(txCounter).padStart(4, '0')}`,
      accountId: account.id,
      type: isCredit ? 'CREDIT' : 'DEBIT',
      amount: 1000 * (5 + ((txCounter * 37) % 95)),
      description: descriptions[txCounter % descriptions.length],
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
