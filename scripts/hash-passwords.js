#!/usr/bin/env node
/** Retrocompatibilità: delega a `npm run hash-passwords`. */
const { spawnSync } = require('node:child_process');
const { resolve } = require('node:path');

const root = resolve(__dirname, '..');
const r = spawnSync('npx', ['tsx', resolve(__dirname, 'hash-passwords.ts')], {
  cwd: root,
  stdio: 'inherit',
  env: process.env,
});
process.exit(r.status ?? 1);
