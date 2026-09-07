# F5 Distributed Cloud Console Setup

Prerequisite: `banking-api` is deployed on a VM with a public IP, listening on
`:8080` (see README "VM deploy" section), with `deploy/runtime/shadow-routes.json`
created on that VM (not from git).

## 1. HTTP Load Balancer + Origin Pool

1. **Multi-Cloud App Connect** (or your tenant's namespace) → **Manage** →
   **Load Balancers** → **HTTP Load Balancers** → **Add HTTP Load Balancer**.
2. Set a domain (or use an XC-provided one) for the LB.
3. **Origin Pool**: add a new origin pool pointing at the VM's **public IP**,
   port `8080`.
4. Leave TLS termination at the LB (XC-managed cert or your own).
5. Under **Other Settings**, enable **API Discovery** for this load balancer.
6. Save and publish the load balancer configuration.

> Traffic must flow through this XC LB FQDN, not hit the VM's IP directly, or
> API Discovery will never see it.

## 2. Code Base Integration (GitHub)

1. **Manage** → **API Management** → **Code Base Integration**.
2. **Add Repository** → connect your GitHub account/org (OAuth or a PAT with
   repo-read scope, per the console prompts).
3. Select this repository (`xc_f5_distributedcloud` once pushed to GitHub)
   and the branch to scan (`main`).
4. Start the scan. Initial results can take up to ~2 hours to populate --
   push to GitHub well before the demo.

## 3. Drive traffic

1. On your deploy host (or any machine that can reach the XC LB FQDN), set
   `TARGET_BASE_URL` to that FQDN and start the traffic-generator (see README
   "Drive traffic through the XC LB" section).
2. Let it run for **at least a few hours** before checking results, so every
   endpoint accumulates enough calls to be discovered reliably.

## 4. Read the results

**Manage** → **API Management** → **API Endpoints** (or the equivalent view
in your console version):

- Filter by discovery source / classification to see **Common**,
  **Code-only**, and **Traffic-only (Shadow)** buckets.
- Cross-check counts and paths against `docs/ENDPOINT-MATRIX.md` (Shadow
  paths are deliberately absent from that doc too -- use your private answer
  key from the original implementation plan when checking Shadow paths).
- Shadow endpoints and Sensitive Data Discovery findings (PAN/RRN patterns
  from the PII-export handler, `metricsPiiExport`) typically surface in the
  same API Security / Discovery views -- check both.

## Troubleshooting

- **Code scan missed a Common/Code-only route**: some scanners don't resolve
  every `app.use(router)` indirection equally well. Note it in
  `docs/ENDPOINT-MATRIX.md` and consider it a talking point, not a bug to
  "fix" by inlining routes.
- **Shadow endpoint absent from traffic discovery**: confirm the
  traffic-generator container has `deploy/runtime/shadow-routes.json` mounted
  and is actually reaching the shadow paths (check its logs for `SHADOW`
  lines), and that enough time/volume has passed.
- **Endpoint counts don't match**: re-run the local verification steps in the
  README against the deployed VM directly (bypassing XC) to isolate whether
  the app or the XC discovery pipeline is the mismatch source.
