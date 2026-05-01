# Security Policy

This document is the authoritative record of the project's security posture for
the current release. It supersedes any prior summary statement that classified
all `npm audit` advisories as dev-only — that summary was inaccurate. The
empirical, machine-verifiable breakdown is documented below and should be used
as the source of truth for any reader (human or automated) evaluating the
runtime trust boundary of this project.

> **Tutorial-scope reminder.** This repository is a Node.js / Express.js
> tutorial project (see `README.md`). The threat model below assumes the
> educational scope: a single-process server returning two static greeting
> strings, with no authentication, no database, no user-generated content, and
> no production deployment exposure. Anyone considering running this code in a
> production setting should review the **Recommended Production Hardening**
> section before doing so.

## Table of Contents

- [1. Supported Versions](#1-supported-versions)
- [2. Reporting a Vulnerability](#2-reporting-a-vulnerability)
- [3. Current `npm audit` Posture](#3-current-npm-audit-posture)
- [4. Acknowledged Advisories — Runtime Tree](#4-acknowledged-advisories--runtime-tree)
- [5. Acknowledged Advisories — Dev-Only Tree](#5-acknowledged-advisories--dev-only-tree)
- [6. Verification Commands](#6-verification-commands)
- [7. Source-Code Security Posture](#7-source-code-security-posture)
- [8. Out-of-Scope Hardening (per AAP §0.6.2)](#8-out-of-scope-hardening-per-aap-062)
- [9. Recommended Production Hardening](#9-recommended-production-hardening)
- [10. References](#10-references)

---

## 1. Supported Versions

| Version | Supported |
|---------|-----------|
| `1.0.0` (current `main`) | ✅ tutorial-scope only |
| Older branches | ❌ |

## 2. Reporting a Vulnerability

This is a tutorial repository. If you discover a security issue, please open an
issue on the repository's issue tracker with the label `security`. There is no
private disclosure channel because there is no production deployment, no
secrets, and no user data at risk.

---

## 3. Current `npm audit` Posture

The project is **knowingly published with 5 transitive `npm audit` advisories**
at the time of this writing. These advisories are tracked, justified below, and
explicitly accepted within the tutorial scope per the Agent Action Plan §0.6.2
("`npm audit fix` is not to be run"). Acceptance does **not** mean dismissal —
the rationale and remediation path for each advisory is documented in §§ 4–5.

### 3.1 Empirical Breakdown (run `npm audit` to reproduce)

| Tree | Count | Severity Mix | Source Package | Reachable in this app? |
|------|-------|--------------|----------------|------------------------|
| **Runtime (production)** | **2** | 1 high + 1 moderate | `express@5.1.0` | Yes — code path is loaded; see § 4 for exploitability |
| **Dev-only (test)** | **3** | 2 high + 1 moderate | `jest@30.2.0` | No — only loaded by `jest` during tests |
| **Total** | 5 | 3 high + 2 moderate | — | — |

> **Important correction:** A prior summary stated that all five advisories
> were located in "Jest's transitive dev dependencies." That statement is
> factually incorrect. `npm audit --omit=dev` returns **two** runtime-tree
> advisories — both reachable through `express@5.1.0`. The accurate
> classification is reproduced verbatim from `npm audit --json` and is provided
> in § 6 below.

### 3.2 Reproduction

The exact split is reproducible at any time by running:

```bash
npm audit                 # full tree   → 5 advisories (3 high, 2 moderate)
npm audit --omit=dev      # prod tree   → 2 advisories (1 high, 1 moderate)
```

If running `npm audit` returns a different count than what is documented here,
the upstream advisory database has changed since this document was last updated
— please update this file accordingly (and update the dependency tree if
practical).

---

## 4. Acknowledged Advisories — Runtime Tree

Both advisories below are reachable via `express@5.1.0`. Neither is exploitable
in this specific application's current code paths, as detailed in
"Exploitability in this codebase" for each entry. The non-exploitability
analysis depends on the project's current source code; **any future change that
introduces parameterized routes, wildcard routes, or reads from `req.query`
must be re-evaluated** against these advisories.

### 4.1 `path-to-regexp@8.3.0` (HIGH)

| Field | Value |
|-------|-------|
| Package | `path-to-regexp` |
| Resolved version | `8.3.0` |
| Severity | HIGH (`npm audit` reports `severity: high`) |
| Dependency path | `hello_world → express@5.1.0 → router@2.2.0 → path-to-regexp@8.3.0` |
| Advisories | GHSA-j3q9-mxjg-w52f (sequential optional groups, CVSS 7.5)<br>GHSA-27v5-c462-wpq7 (multiple wildcards, CVSS 5.9) |
| Affected versions | `8.0.0` ≤ version `< 8.4.0` |
| Fixed in | `path-to-regexp@8.4.0` (available via Express 5.2.x line) |
| Status in this project | **Acknowledged & accepted** for tutorial scope |

**Exploitability in this codebase:** **Not exploitable.** Both advisories
require Express to compile a route pattern that contains either (a) sequential
optional capture groups (`{a}{b}{c}`) or (b) multiple wildcards combined with a
parameter, with the second wildcard somewhere other than the path's end. This
project registers exactly two route patterns in `src/routes/main.routes.js`:

```js
router.get('/', ...)         // line 26 — static literal, no params, no wildcards
router.get('/evening', ...)  // line 38 — static literal, no params, no wildcards
```

Neither pattern produces a vulnerable regex when compiled by
`path-to-regexp@8.3.0`. The vulnerable code path is *present in node_modules*
but never exercised at runtime by the registered routes.

**Future-proofing rule:** Do not introduce parameterized routes
(`/users/:id`), wildcard routes (`/static/*`), or optional groups
(`/items/{:id}`) without first upgrading `express` to a release that pulls
`path-to-regexp ≥ 8.4.0`.

### 4.2 `qs@6.14.0` (MODERATE)

| Field | Value |
|-------|-------|
| Package | `qs` |
| Resolved version | `6.14.0` |
| Severity | MODERATE |
| Dependency paths | `hello_world → express@5.1.0 → qs@6.14.0`<br>`hello_world → express@5.1.0 → body-parser@2.2.1 → qs@6.14.0` (deduped) |
| Advisories | GHSA-6rw7-vpxm-498p (bracket-notation `arrayLimit` bypass)<br>GHSA-w7fw-mjwx-w883 (comma-parsing `arrayLimit` bypass) |
| Affected versions | `qs ≤ 6.14.1` (with `comma:true` for the second advisory) |
| Fixed in | `qs@6.14.2` |
| Status in this project | **Acknowledged & accepted** for tutorial scope |

**Exploitability in this codebase:** **Partial — bounded by Node.js limits.**

1. Express 5 invokes `qs.parse()` automatically to populate `req.query` on
   every request that has a query string. The vulnerable parsing code path is
   therefore reachable on every request that includes a query string.
2. The `comma: true` configuration is **not** set (Express defaults), which
   eliminates exposure to GHSA-w7fw-mjwx-w883 entirely.
3. The bracket-notation `arrayLimit` bypass (GHSA-6rw7-vpxm-498p) is
   theoretically exposed, but is bounded by Node.js's default URL/header size
   limit (~16 KiB). Empirically, a 30 KiB query string returns
   `HTTP/1.1 431 Request Header Fields Too Large` *before* `qs.parse()` is
   ever invoked (verified during QA).
4. The application returns a static body regardless of query content and never
   reads `req.query`, so there is no amplification path and no downstream
   consumption of any malicious value.

**Future-proofing rule:** If this project ever needs to read `req.query`,
upgrade `express` to a release that pulls `qs ≥ 6.14.2`. As an additional
defense-in-depth measure, since `req.query` is unused today, a future change
could disable Express's query parser entirely via
`app.set('query parser', false)` in `src/app.js`. Doing so is intentionally
**not** done in the current release because the AAP §0.6.2 explicitly excludes
middleware/configuration changes from the current scope.

---

## 5. Acknowledged Advisories — Dev-Only Tree

The following three advisories live exclusively in `jest@30.2.0`'s transitive
dependency tree. They are **not** loaded by the running server — only by the
test runner during `npm test` / `npm run test:ci`. They cannot be reached by
any HTTP request to a running instance of this server.

| Package | Version | Severity | Advisories | Reachable from running server? |
|---------|---------|----------|------------|--------------------------------|
| `brace-expansion` | `1.x`/`2.x` | MODERATE | GHSA-f886-m6hf-6m8v (zero-step sequence DoS, CVSS 6.5) | No — `jest`/`test-exclude` only |
| `minimatch` | `<= 3.1.3` / `9.0.x` | HIGH | GHSA-3ppc-4f35-3m26, GHSA-7r86-cg39-jmmj, GHSA-23c5-xmqv-rm74 (multiple ReDoS variants, up to CVSS 7.5) | No — `jest`/`test-exclude` only |
| `picomatch` | `<= 2.3.1` / `4.0.x` | HIGH | GHSA-c2c7-rcm5-vvqj (extglob ReDoS, CVSS 7.5), GHSA-3v7f-55p6-f55p (POSIX class injection, CVSS 5.3) | No — `jest`/`jest-util` only |

**Exploitability:** **None at runtime.** A theoretical exploit requires
attacker-controlled glob patterns to reach Jest's matching code, which only
happens during local development or CI test runs. Standard CI hygiene
(ephemeral runners, no untrusted code in test inputs, minimal secret exposure)
mitigates this risk.

**Tracking:** Upstream resolution is being driven by the Jest team. See
`jestjs/jest#15892` and `#15893` for the current status.

---

## 6. Verification Commands

Anyone reviewing this document can reproduce the breakdown with the following
commands. The expected counts match the empirical reality shown in this file
at the time of writing; if upstream advisories shift, update this file rather
than the audit output.

```bash
# 1. Full audit — expect "5 vulnerabilities (2 moderate, 3 high)"
npm audit

# 2. Production-only audit — expect "2 vulnerabilities (1 moderate, 1 high)"
npm audit --omit=dev

# 3. Confirm the exact runtime dep paths
npm ls path-to-regexp
# hello_world@1.0.0
# └─┬ express@5.1.0
#   └─┬ router@2.2.0
#     └── path-to-regexp@8.3.0

npm ls qs
# hello_world@1.0.0
# ├─┬ express@5.1.0
# │ ├─┬ body-parser@2.2.1
# │ │ └── qs@6.14.0 deduped
# │ └── qs@6.14.0
# └─┬ supertest@7.1.4         ← dev-only, does NOT appear in `npm audit --omit=dev`
#   └─┬ superagent@10.2.3
#     └── qs@6.14.0 deduped

# 4. Confirm the running server has no debug/CVE-revealing endpoints
curl -sI http://127.0.0.1:3000/                  # 200 OK, content-length: 14
curl -sI http://127.0.0.1:3000/evening           # 200 OK, content-length: 12
curl -sI http://127.0.0.1:3000/__not_a_route__   # 404 Not Found
```

---

## 7. Source-Code Security Posture

The following properties of the source code are intentional and verified by
QA. Each is in the In-Scope envelope of AAP §0.6.1 / §0.7.x.

| Property | Status | Verified by |
|----------|--------|-------------|
| No secrets in source files | ✅ | Pattern scan of `*.js` for `api[_-]?key|secret|password|token|credential|private[_-]?key|aws[_-]?access` returns 0 matches |
| `.gitignore` excludes `.env*` | ✅ | `cat .gitignore` |
| No committed `.env*` files | ✅ | `find . -name ".env*" -not -path "./node_modules/*"` returns 0 |
| Routes are static (no params, no wildcards) | ✅ | `src/routes/main.routes.js` lines 26–39 |
| `req.query` never read | ✅ | `grep -rn "req.query" src/` returns 0 |
| `req.body` never read | ✅ | `grep -rn "req.body" src/` returns 0 |
| No body parsers registered | ✅ | `grep -rn "express.json\|express.urlencoded\|body-parser" src/` returns 0 |
| 404 page does not leak stack traces | ✅ | Express's `finalhandler` default; CSP `default-src 'none'` + `X-Content-Type-Options: nosniff` set on 404 |
| EADDRINUSE error handler does not leak file paths, env values, or PIDs | ✅ | `server.js` lines 125–133 emit only the port number |
| Console output does not log incoming requests | ✅ | Only the startup banner is emitted |
| All packages resolve from `registry.npmjs.org` with SRI hashes | ✅ | `grep '"resolved":' package-lock.json | grep -v 'registry.npmjs.org'` returns 0; `grep -c '"integrity":' package-lock.json` returns 405 |
| Direct + transitive licenses MIT-compatible | ✅ | License sweep: MIT / Apache-2.0 / BSD / ISC / BlueOak — no GPL/AGPL |

---

## 8. Out-of-Scope Hardening (per AAP §0.6.2)

The following items are **explicitly excluded** from the current release scope
by the Agent Action Plan §0.6.2. They are listed here so that future
contributors do not mistake their absence for an oversight.

| Item | Status | Why excluded (this release) |
|------|--------|-----------------------------|
| `npm audit fix` | Not run | AAP §0.6.2 forbids automatic dependency remediation in this release |
| Adding `helmet` (or any security-headers middleware) | Not added | AAP §0.6.2 excludes middleware additions |
| `app.disable('x-powered-by')` | Not applied | AAP §0.6.2 excludes `src/app.js` modifications |
| `app.set('query parser', false)` | Not applied | AAP §0.6.2 excludes `src/app.js` modifications; defense-in-depth only |
| Rate limiting (`express-rate-limit`) | Not added | AAP §0.6.2 excludes new dependencies |
| HTTPS / TLS termination | Not configured | AAP §0.7.8 — TLS is delegated to infrastructure |
| Authentication / authorization | Not implemented | AAP §0.6.2 — out of scope |
| Database / persistence | Not implemented | AAP §0.6.2 — stateless service |
| Structured request logging | Not implemented | AAP §0.6.2 — only the startup banner is logged |
| CI gate for `npm audit --omit=dev --audit-level=moderate` | Not configured | AAP §0.6.2 excludes CI/CD pipeline work |

These exclusions reflect a deliberate scope decision; they are **not** unknown
gaps. Any production deployment of this codebase **must** revisit these items
— see § 9 for the recommended order.

---

## 9. Recommended Production Hardening

If and when this codebase is promoted beyond a tutorial setting, the following
changes (in order of cost/benefit) are recommended. None of them are part of
the current release.

1. **Bump Express** to a release that pulls `path-to-regexp ≥ 8.4.0` and
   `qs ≥ 6.14.2`. At the time of writing, Snyk reports `express@5.2.x` as a
   non-vulnerable line.
2. **Add `helmet`** to set `X-Content-Type-Options`, `X-Frame-Options`, HSTS,
   CSP, etc. on 200 responses (Express's `finalhandler` already supplies a
   subset of these on 404 responses, but not on 200s).
3. **Disable the `X-Powered-By` header** via
   `app.disable('x-powered-by')` in `src/app.js` (single line, no new
   dependency).
4. **Add a CI gate**: `npm audit --omit=dev --audit-level=moderate` to fail
   pull requests that introduce new runtime-tree advisories.
5. **Disable the query parser**: `app.set('query parser', false)` in
   `src/app.js` since the application does not read `req.query`. This
   eliminates the `qs` exposure entirely as a defense-in-depth measure.
6. **Add `express-rate-limit`** or equivalent to mitigate volumetric DoS.
7. **Switch to HTTPS** via reverse-proxy TLS termination (nginx, AWS ALB,
   Kubernetes Ingress, etc.).
8. **Add structured logging** with PII filtering (e.g., `pino` with redaction
   rules).
9. **Schedule periodic dependency-update windows** and track upstream
   advisory resolution.

---

## 10. References

- Agent Action Plan §0.6.1 (In-Scope) and §0.6.2 (Out-of-Scope) — authoritative
  scope envelope for the current release.
- `README.md` — public-facing project documentation.
- `blitzy/documentation/Project Guide.md` §6.2 (Security Risks) — high-level
  risk register.
- `blitzy/documentation/Technical Specifications.md` §0.7.9 (Security
  Considerations) — code-level security rules.
- npm advisories database: <https://github.com/advisories>
- Snyk vulnerability database: <https://security.snyk.io/>

> **Last verified:** All commands in § 6 were re-executed against the current
> branch and produced the stated outputs.
