#!/usr/bin/env node
/**
 * bundler.js
 * Maps a whole project (Node.js or React) into ONE text file that you can
 * hand to an AI/reviewer: a directory tree, a list of every file with its
 * location, and the content of every readable source file.
 *
 * Usage:
 *   node bundler.js                 -> scans current folder, writes project-bundle.txt
 *   node bundler.js ./my-app        -> scans ./my-app
 *   node bundler.js . out.txt       -> custom output file
 *
 * No dependencies. CommonJS (if your package.json has "type": "module",
 * rename this file to bundler.cjs).
 */

const fs = require('fs');
const path = require('path');

// ---------- config ----------
const ROOT = path.resolve(process.argv[2] || process.cwd());
const OUTPUT_NAME = process.argv[3] || 'project-bundle.txt';
const OUTPUT_PATH = path.resolve(OUTPUT_NAME);
const MAX_FILE_SIZE = 200 * 1024; // files bigger than 200 KB are listed, not read

// Folders: acknowledged as existing, but never entered.
const IGNORED_DIRS = new Set([
  'node_modules', '.git', '.svn', '.hg', 'dist', 'build', 'out', '.next',
  '.nuxt', '.cache', '.parcel-cache', '.turbo', '.vercel', '.netlify',
  'coverage', '.nyc_output', '.idea', '.vscode', '__pycache__', '.expo',
  'bower_components', 'tmp', 'temp', 'logs',
]);

// Files: acknowledged as existing, but content is not read.
const BINARY_EXTENSIONS = new Set([
  // images
  '.png', '.jpg', '.jpeg', '.gif', '.bmp', '.ico', '.webp', '.avif', '.tiff', '.psd',
  // fonts
  '.woff', '.woff2', '.ttf', '.otf', '.eot',
  // media
  '.mp3', '.mp4', '.wav', '.ogg', '.webm', '.mov', '.avi', '.flac',
  // archives / binaries / docs
  '.zip', '.tar', '.gz', '.tgz', '.rar', '.7z', '.pdf', '.exe', '.dll', '.so',
  '.dylib', '.bin', '.wasm', '.class', '.jar', '.sqlite', '.db', '.map',
]);
// SVG is text, but usually noisy; listed only.
const LIST_ONLY_EXTENSIONS = new Set(['.svg']);

// Files never read for content (huge/generated or secrets).
const LIST_ONLY_NAMES = new Set([
  'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml', 'bun.lockb', '.DS_Store',
]);
const isSecretFile = (name) =>
  name === '.env' || (name.startsWith('.env.') && !/\.(example|sample|template)$/.test(name)) ||
  /\.(pem|key|p12|pfx)$/i.test(name);

// ---------- helpers ----------
const rel = (p) => path.relative(ROOT, p).split(path.sep).join('/') || '.';

function looksBinary(buffer) {
  const len = Math.min(buffer.length, 8000);
  for (let i = 0; i < len; i++) if (buffer[i] === 0) return true;
  return false;
}

function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1024 / 1024).toFixed(1) + ' MB';
}

// ---------- scan ----------
const dirs = [];        // { path, ignored }
const files = [];       // { path, size, status, note }
const treeLines = [];

function classify(fullPath, name, size) {
  const ext = path.extname(name).toLowerCase();
  if (fullPath === OUTPUT_PATH) return { status: 'skipped', note: 'bundle output file' };
  if (path.basename(__filename) === name && fullPath === __filename)
    return { status: 'skipped', note: 'this script' };
  if (isSecretFile(name)) return { status: 'listed', note: 'secrets file - exists, content not read' };
  if (LIST_ONLY_NAMES.has(name)) return { status: 'listed', note: 'generated/lock file - exists, content not read' };
  if (BINARY_EXTENSIONS.has(ext)) return { status: 'listed', note: 'binary/media file - exists, content not read' };
  if (LIST_ONLY_EXTENSIONS.has(ext)) return { status: 'listed', note: 'svg - exists, content not read' };
  if (size > MAX_FILE_SIZE) return { status: 'listed', note: `too large (${formatSize(size)}) - content not read` };
  return { status: 'read', note: '' };
}

function walk(dir, prefix) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch (err) {
    treeLines.push(`${prefix}[cannot read directory: ${err.code}]`);
    return;
  }
  // folders first, then files, alphabetical
  entries.sort((a, b) => {
    if (a.isDirectory() !== b.isDirectory()) return a.isDirectory() ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  entries.forEach((entry, i) => {
    const last = i === entries.length - 1;
    const branch = last ? '└── ' : '├── ';
    const nextPrefix = prefix + (last ? '    ' : '│   ');
    const full = path.join(dir, entry.name);

    if (entry.isSymbolicLink()) {
      treeLines.push(`${prefix}${branch}${entry.name} (symlink, skipped)`);
      return;
    }

    if (entry.isDirectory()) {
      if (IGNORED_DIRS.has(entry.name)) {
        dirs.push({ path: rel(full), ignored: true });
        treeLines.push(`${prefix}${branch}${entry.name}/  (exists, not scanned)`);
        return;
      }
      dirs.push({ path: rel(full), ignored: false });
      treeLines.push(`${prefix}${branch}${entry.name}/`);
      walk(full, nextPrefix);
      return;
    }

    if (entry.isFile()) {
      let size = 0;
      try { size = fs.statSync(full).size; } catch (_) {}
      const info = classify(full, entry.name, size);
      files.push({ path: rel(full), full, size, ...info });
      const tag = info.status === 'read' ? '' : `  (${info.note})`;
      treeLines.push(`${prefix}${branch}${entry.name}${tag}`);
    }
  });
}

// ---------- main ----------
if (!fs.existsSync(ROOT) || !fs.statSync(ROOT).isDirectory()) {
  console.error(`Not a directory: ${ROOT}`);
  process.exit(1);
}

treeLines.push(path.basename(ROOT) + '/');
walk(ROOT, '');

// detect project type
let projectType = 'Unknown';
let pkgName = '';
try {
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
  pkgName = pkg.name || '';
  const deps = { ...pkg.dependencies, ...pkg.devDependencies };
  const kinds = [];
  if (deps.react || deps['react-dom']) kinds.push('React');
  if (deps.next) kinds.push('Next.js');
  if (deps.vite) kinds.push('Vite');
  if (deps['react-scripts']) kinds.push('Create React App');
  if (deps.express || deps.fastify || deps.koa || deps['@nestjs/core']) kinds.push('Node server');
  projectType = kinds.length ? kinds.join(' + ') : 'Node.js';
} catch (_) {}

const out = [];
const line = '='.repeat(80);

out.push(line);
out.push('PROJECT BUNDLE');
out.push(line);
out.push(`Root:        ${ROOT}`);
if (pkgName) out.push(`Package:     ${pkgName}`);
out.push(`Type:        ${projectType}`);
out.push(`Generated:   ${new Date().toISOString()}`);
const readFiles = files.filter((f) => f.status === 'read');
out.push(`Directories: ${dirs.length} (${dirs.filter((d) => d.ignored).length} not scanned)`);
out.push(`Files:       ${files.length} (${readFiles.length} read, ${files.length - readFiles.length} listed only)`);
out.push('');

out.push(line);
out.push('1. DIRECTORY TREE');
out.push(line);
out.push(...treeLines);
out.push('');

out.push(line);
out.push('2. ALL DIRECTORIES');
out.push(line);
dirs.forEach((d) => out.push(`${d.path}/${d.ignored ? '   (exists, not scanned)' : ''}`));
out.push('');

out.push(line);
out.push('3. ALL FILES (location, size, status)');
out.push(line);
files.forEach((f) => {
  out.push(`${f.path}  [${formatSize(f.size)}]  ${f.status === 'read' ? 'READ' : f.status.toUpperCase() + ' - ' + f.note}`);
});
out.push('');

out.push(line);
out.push('4. FILE CONTENTS');
out.push(line);

let unreadable = 0;
for (const f of files) {
  if (f.status !== 'read') continue;
  let buf;
  try {
    buf = fs.readFileSync(f.full);
  } catch (err) {
    unreadable++;
    out.push(`\n--- FILE: ${f.path} --- [could not read: ${err.code}]\n`);
    continue;
  }
  if (looksBinary(buf)) {
    out.push(`\n--- FILE: ${f.path} --- [binary content detected, not included]\n`);
    continue;
  }
  const text = buf.toString('utf8');
  out.push('');
  out.push(`--- FILE: ${f.path} ---`);
  out.push(text.endsWith('\n') ? text.slice(0, -1) : text);
  out.push(`--- END: ${f.path} ---`);
}

fs.writeFileSync(OUTPUT_PATH, out.join('\n') + '\n', 'utf8');

console.log(`Done. Project type: ${projectType}`);
console.log(`Directories: ${dirs.length} | Files: ${files.length} | Read: ${readFiles.length - unreadable}`);
console.log(`Output: ${OUTPUT_PATH} (${formatSize(fs.statSync(OUTPUT_PATH).size)})`);
