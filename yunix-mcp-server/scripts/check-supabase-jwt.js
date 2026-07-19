#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const stagedFiles = process.argv.slice(2);
if (!stagedFiles.length) {
  process.exit(0);
}

const patterns = [
  /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/,
  /(?:SUPABASE_SERVICE_ROLE_KEY|service_role)[\s:=]+[A-Za-z0-9_-]{20,}/i,
];

const cwd = process.cwd();
const foundMatches = [];

for (const file of stagedFiles) {
  const resolved = path.resolve(cwd, file);
  if (!fs.existsSync(resolved) || !fs.statSync(resolved).isFile()) {
    continue;
  }

  const contents = fs.readFileSync(resolved, 'utf8');
  for (const pattern of patterns) {
    if (pattern.test(contents)) {
      foundMatches.push({ file, pattern: pattern.toString() });
      break;
    }
  }
}

if (foundMatches.length) {
  console.error('Potential Supabase secret detected in staged files:');
  for (const match of foundMatches) {
    console.error(`- ${match.file}`);
  }
  console.error('\nRemove the secret before committing or rotate it immediately.');
  process.exit(1);
}

process.exit(0);
