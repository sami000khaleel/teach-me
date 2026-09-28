#!/usr/bin/env node
/**
 * project-snapshot.js
 *
 * Run this from the PARENT directory of your project(s):
 *
 *   npm install ignore
 *   node project-snapshot.js
 *
 * What it does:
 *  1. Walks every directory except node_modules (and .git).
 *  2. Finds every .gitignore in the tree and collects its patterns into
 *     one combined ignore list — EXCEPT it drops any line that refers to
 *     .env files, docker-compose.yml, or Dockerfile, so those are never
 *     added to the "skip" list even if your .gitignore hides them.
 *  3. Reads every remaining file and writes "./path/to/file.js" followed
 *     by its full contents into project-snapshot.txt, so you end up with
 *     one file you can paste/upload into a chat for project context.
 */

const fs = require('fs');
const path = require('path');
const ignoreLib = require('ignore');

const ROOT = process.cwd();
const OUTPUT_FILE = path.join(ROOT, 'project-snapshot.txt');
const ALWAYS_SKIP_DIRS = new Set(['node_modules', '.git']);

// Never let .gitignore hide these, even if it lists them.
const KEEP_EVEN_IF_IGNORED = [
  /(^|\/)\.env(\..*)?$/i,          // .env, .env.local, .env.production, ...
  /(^|\/)docker-compose\.ya?ml$/i,
  /(^|\/)dockerfile(\..*)?$/i,     // Dockerfile, Dockerfile.dev, ...
];

function isProtected(relPath) {
  return KEEP_EVEN_IF_IGNORED.some((re) => re.test(relPath));
}

// 1. Find every .gitignore file in the tree.
function findGitignoreFiles(dir, found = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (ALWAYS_SKIP_DIRS.has(entry.name)) continue;
      findGitignoreFiles(path.join(dir, entry.name), found);
    } else if (entry.name === '.gitignore') {
      found.push(path.join(dir, entry.name));
    }
  }
  return found;
}

// 2. Build one combined ignore list from every .gitignore found,
//    dropping any line that would hide .env / docker-compose.yml / Dockerfile.
function buildIgnorer() {
  const ig = ignoreLib();
  const gitignoreFiles = findGitignoreFiles(ROOT);
  const droppedLines = [];

  for (const file of gitignoreFiles) {
    const content = fs.readFileSync(file, 'utf8');
    for (const rawLine of content.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith('#')) continue;

      const bare = line.replace(/^!/, '').replace(/\/$/, '');
      if (isProtected(bare)) {
        droppedLines.push(`${line}  (from ${path.relative(ROOT, file)})`);
        continue; // not added to the ignore array
      }
      ig.add(line);
    }
  }

  return { ig, droppedLines };
}

// 3. Walk the tree, keeping files that survive node_modules/.git skip + ignore rules
//    (protected files are always kept, regardless of what .gitignore says).
function collectFiles(dir, ig, results = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    const rel = path.relative(ROOT, full).split(path.sep).join('/');

    if (entry.isDirectory()) {
      if (ALWAYS_SKIP_DIRS.has(entry.name)) continue;
      if (ig.ignores(rel) && !isProtected(rel)) continue;
      collectFiles(full, ig, results);
    } else {
      if (ig.ignores(rel) && !isProtected(rel)) continue;
      results.push(full);
    }
  }
  return results;
}

function isProbablyBinary(buffer) {
  const len = Math.min(buffer.length, 8000);
  for (let i = 0; i < len; i++) {
    if (buffer[i] === 0) return true;
  }
  return false;
}

function main() {
  const { ig, droppedLines } = buildIgnorer();
  const files = collectFiles(ROOT, ig).sort();

  const out = fs.createWriteStream(OUTPUT_FILE, { encoding: 'utf8' });
  out.write(`# Project snapshot generated ${new Date().toISOString()}\n`);
  out.write(`# Root: ${ROOT}\n`);
  out.write(`# Files included: ${files.length}\n`);

  for (const full of files) {
    const rel = './' + path.relative(ROOT, full).split(path.sep).join('/');
    out.write(`\n${'='.repeat(80)}\n${rel}\n${'='.repeat(80)}\n`);

    try {
      const buf = fs.readFileSync(full);
      if (isProbablyBinary(buf)) {
        out.write('[binary file, contents skipped]\n');
      } else {
        const text = buf.toString('utf8');
        out.write(text);
        if (!text.endsWith('\n')) out.write('\n');
      }
    } catch (err) {
      out.write(`[could not read file: ${err.message}]\n`);
    }
  }

  out.end(() => {
    console.log(`Wrote ${files.length} files to ${OUTPUT_FILE}`);
    if (droppedLines.length) {
      console.log('\nKept these even though .gitignore excludes them:');
      droppedLines.forEach((l) => console.log('  - ' + l));
    }
  });
}

main();
