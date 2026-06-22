---
name: KidneyCare BD setup quirks
description: Native dependency and blocked package issues specific to this project's Replit environment
---

## better-sqlite3 native binary not compiled on first install

**Rule:** `better-sqlite3 v12.11.1` has NO prebuilt binary for Node 20 (ABI 115). Compiling from source via `node-gyp rebuild` also fails — the `sqlite3.c` compile step gets OOM-killed (the process is Terminated by the OS before it finishes).

**Why:** better-sqlite3 v12.11.1 only ships prebuilt binaries for Node 22+ (ABI 127+). Node 20 has no prebuilt and the environment can't compile it from source.

**How to apply (the working fix):**
1. Upgrade Node: `installProgrammingLanguage({ language: "nodejs-22" })` — this switches to Node 22 (ABI 127)
2. Download the prebuilt binary: `curl -L "https://github.com/WiseLibs/better-sqlite3/releases/download/v12.11.1/better-sqlite3-v12.11.1-node-v127-linux-x64.tar.gz" -o /tmp/bsql3.tar.gz`
3. Extract and copy: `cd /tmp && tar -xzf bsql3.tar.gz && cp build/Release/better_sqlite3.node node_modules/better-sqlite3/build/Release/`
4. Restart the workflow.

## `concurrently` is blocked by security firewall

**Rule:** `concurrently@^9.x` depends on `shell-quote@1.8.3` which is blocked by the Replit package firewall (Critical CVE).

**Why:** The firewall blocks `shell-quote-1.8.3.tgz` with HTTP 403.

**How to apply:** Replace `concurrently "cmd1" "cmd2"` in package.json dev script with the shell `&` operator: `npx tsx server.ts & npx vite`
