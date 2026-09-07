# Demo Script (Presenter Walkthrough)

Audience: security / platform stakeholders evaluating F5 XC API Discovery,
Code Base Integration, Sensitive Data Discovery, and API security (BOLA).

## 0. Setup (before the room fills up)

- Confirm the VM is up, `docker compose up -d api` running, XC LB origin pool
  healthy.
- Confirm `docker compose --profile traffic up -d` has been running for
  **at least a few hours** against the XC LB FQDN.
- Confirm the GitHub repo (Common + Code-only routes only -- no Shadow
  strings) was pushed and scanned by Code Base Integration well in advance.
- Have `docs/ENDPOINT-MATRIX.md` open as your answer key.

## 1. Set the scene (2 min)

"This is a small digital-banking API: login, accounts, transfers, cards. It's
a normal-looking Express service. Two things are true about it that aren't
obvious from the outside: some of its code paths are dead, and some of its
live traffic doesn't come from its code at all."

## 2. Show the code-derived inventory (3 min)

Open XC Console → API Management → Code Base Integration results.

- Point out the endpoint count matches Common + Code-only (~17).
- Point out the Code-only subset (legacy v0 routes, unused beneficiaries
  endpoint, call-center-only card delete, unreleased statements, the
  feature-flagged loan application) -- "these are registered, reachable, and
  scanned straight out of source, but nobody is calling them. That's exactly
  the kind of dead code that quietly becomes an attack surface."

## 3. Show the traffic-derived inventory (3 min)

Open XC Console → API Discovery / API Endpoints view (traffic-derived).

- Point out the same Common set shows up here too.
- Point out a **new** set of six endpoints that never appeared in the code
  scan (their exact paths are intentionally not written in this repo's docs
  either -- see `docs/ENDPOINT-MATRIX.md` section C for why; use your private
  answer key / the original plan doc to call them out live): an
  admin-style user dump, a debug/config leak, a PII-export CSV, an
  ops-reconciliation trigger, an undocumented next-version-style balance
  endpoint, and a partner callback.
- "These are Shadow APIs. Real traffic is hitting them. They are not in the
  reviewed, version-controlled codebase for this application. In this repo,
  they were added by an operational config file dropped on the VM outside the
  normal release process -- which is exactly how shadow APIs happen in real
  environments: a hot-patch, a debug endpoint someone forgot, a partner
  integration nobody documented."

## 4. Cross the buckets (2 min)

Show the XC console's classification view side by side (or the matrix table)
highlighting **Common / Code-only / Traffic-only**. Tie back to
`docs/ENDPOINT-MATRIX.md` counts (11 / 6 / 6).

## 5. Sensitive Data Discovery (2 min)

Hit (or show captured traffic to) the PII-export handler (`metricsPiiExport`
in `docs/ENDPOINT-MATRIX.md` section C -- use your private answer key for the
exact path) -- returns a CSV of card PAN + RRN-format values per user. Show XC's Sensitive
Data Discovery flagging this response as containing card-number and
national-ID-like patterns. "This shadow endpoint isn't just undocumented --
it's actively leaking sensitive data, and XC caught the pattern without
anyone telling it what this endpoint was."

## 6. BOLA / IDOR (2 min)

Show `GET /api/v1/accounts/{accountId}` traffic where one user's token was
used against another user's account id (the traffic-generator mixes a small
number of these in). "This one's not a shadow API -- it's fully documented,
fully in code, fully expected. But it has an authorization bug: it never
checks that the caller owns the account. XC's API security analysis flags
the anomalous access pattern even on a 'known' endpoint."

## 7. Wrap-up (1 min)

"Three independent findings from one small app: dead code creating
unnecessary attack surface, an undocumented shadow API leaking PII, and a
BOLA vulnerability on a documented endpoint. Code Base Integration plus API
Discovery is what makes all three visible in one place."

## Fallback if live results aren't ready

Walk through `docs/ENDPOINT-MATRIX.md` as the "expected" answer key and the
local `curl` verification transcript from the README as evidence the app
behaves as designed, while narrating what the XC console would show.
