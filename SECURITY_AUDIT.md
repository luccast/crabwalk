# Security Audit: crabwalk

Date: 2026-01-27

## Scope and Method

- Static review of server and client code under `src/`
- Targeted secret scanning via ripgrep patterns
- Dependency review from `package.json` / `package-lock.json`
- Note: `npm audit` could not run in this environment due to lack of network access

## Findings Summary

- Critical: 0
- High: 1
- Medium: 2
- Low: 3

## Findings

### HIGH: Missing Authentication/Authorization on Privileged tRPC Endpoints

Evidence:
- `src/routes/api/trpc.$.ts:10` creates an empty context with no auth
- `src/integrations/trpc/router.ts:26` defines all procedures as `publicProcedure`
- Privileged procedures include:
- `connect` / `disconnect`: `src/integrations/trpc/router.ts:30`, `src/integrations/trpc/router.ts:51`
- Session and event access: `src/integrations/trpc/router.ts:106`, `src/integrations/trpc/router.ts:138`
- Log and persistence controls/downloads: `src/integrations/trpc/router.ts:75`, `src/integrations/trpc/router.ts:91`, `src/integrations/trpc/router.ts:189`, `src/integrations/trpc/router.ts:199`
- The server uses a gateway token from the environment: `src/integrations/clawdbot/client.ts:245`

Impact:
- Any user who can reach `/api/trpc` can operate the server as an authenticated proxy to the clawdbot gateway and retrieve sensitive session/action data.
- This includes enabling log collection, downloading raw events, and clearing persisted data.

Recommendations:
- Add authentication to the tRPC context and protect all clawdbot procedures.
- Add authorization tiers (e.g., read-only vs. admin for log download, persistence start/stop/clear, connect/disconnect).
- If this is intended to be local-only, explicitly bind the server to localhost and enforce network-layer restrictions.

### MEDIUM: Sensitive Data Exposure via Public Log Download and Persistence Hydration

Evidence:
- Raw event download is public: `src/integrations/trpc/router.ts:91`
- Persistence hydration is public: `src/integrations/trpc/router.ts:199`
- Persistence auto-starts on first run: `src/integrations/clawdbot/persistence.ts:27`
- Persistence writes agent/session content to disk under `data/`: `src/integrations/clawdbot/persistence.ts:5`

Impact:
- Sensitive agent outputs and tool results can be exfiltrated by any caller.
- Persistent storage increases the blast radius of accidental exposure or local compromise.

Recommendations:
- Require authentication and restrict access to log download and persistence hydration.
- Consider disabling auto-start persistence by default, or gate it behind explicit operator consent.
- Implement retention limits, redaction, and (if appropriate) encryption-at-rest for persisted data.

### MEDIUM: Vite Dev Server Exposure + Vulnerable Version Range

Evidence:
- Dev server is explicitly exposed to the network: `package.json:7` (`vite dev --host`)
- Vite version is in a known affected range: `package.json:42` (`vite@^7.0.0`)

Impact:
- When running the dev server on a reachable interface, multiple Vite advisories describe ways to bypass file deny rules and expose sensitive local files (including `.env*`) under certain conditions.

Recommendations:
- Upgrade Vite to a patched version (at least `7.0.8`).
- Remove `--host` unless remote access is required; prefer localhost binding in development.
- Treat dev servers as sensitive and restrict with firewall rules or a VPN when remote access is needed.

### LOW: Unbounded In-Memory Log Collection Can Cause Resource Exhaustion

Evidence:
- Unbounded log buffer: `src/integrations/trpc/router.ts:19`
- Log collection appends without a cap: `src/integrations/trpc/router.ts:149`

Impact:
- If log collection is enabled and the gateway produces high event volume, memory growth may lead to process instability or denial of service.

Recommendations:
- Replace the array with a bounded ring buffer.
- Enforce maximum event counts or byte-size caps.
- Consider streaming logs directly to a file with size limits.

### LOW: Debug Logging May Leak Sensitive Content to Server Logs

Evidence:
- Debug mode is a public procedure: `src/integrations/trpc/router.ts:62`
- Debug mode logs full raw events: `src/integrations/trpc/router.ts:157`

Impact:
- Raw event payloads may contain sensitive content and end up in server logs, log aggregators, or terminal history.

Recommendations:
- Protect debug mode behind authentication and admin-only authorization.
- Redact message content and tool results in debug logs, or log only structured metadata.

### LOW: GitHub Actions Supply Chain Risk from Unpinned Third-Party Actions

Evidence:
- Third-party actions are referenced by mutable tags:
- `softprops/action-gh-release@v1`: `.github/workflows/release.yml:39`
- `docker/login-action@v3`: `.github/workflows/release.yml:44`
- `docker/metadata-action@v5`: `.github/workflows/release.yml:52`
- `docker/build-push-action@v5`: `.github/workflows/release.yml:61`

Impact:
- Tag-based actions can change over time and increase supply chain risk.

Recommendations:
- Pin third-party actions to full-length commit SHAs.
- Use Dependabot (or similar) to manage updates to pinned SHAs.

## Secrets Scan Notes

- No hard-coded tokens or secrets were found in tracked source files.
- Environment files appear to be ignored appropriately: `.gitignore:13`
- The application depends on `CLAWDBOT_API_TOKEN` via environment variables: `src/integrations/clawdbot/client.ts:245`
