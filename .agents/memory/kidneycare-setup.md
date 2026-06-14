---
name: KidneyCare BD setup quirks
description: Native dependency and blocked package issues specific to this project's Replit environment
---

## better-sqlite3 native binary not compiled on first install

**Rule:** After any fresh `npm install`, `better-sqlite3` may be missing its `.node` binary at `node_modules/better-sqlite3/build/Release/better_sqlite3.node`. The install script (`prebuild-install || node-gyp rebuild`) silently fails if Python is not yet installed.

**Why:** Python is required by node-gyp to compile the native binding. Replit's NixOS environment doesn't include Python by default; it must be explicitly installed first.

**How to apply:**
1. Install Python first: `installProgrammingLanguage({ language: "python-3.11" })`
2. Then reinstall the package: `npm install better-sqlite3 --build-from-source`
3. Verify: `ls node_modules/better-sqlite3/build/Release/*.node`

## `concurrently` is blocked by security firewall

**Rule:** `concurrently@^9.x` depends on `shell-quote@1.8.3` which is blocked by the Replit package firewall (Critical CVE).

**Why:** The firewall blocks `shell-quote-1.8.3.tgz` with HTTP 403.

**How to apply:** Replace `concurrently "cmd1" "cmd2"` in package.json dev script with the shell `&` operator: `npx tsx server.ts & npx vite`
