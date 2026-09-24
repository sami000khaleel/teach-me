#!/usr/bin/env node
/**
 * bundle-project.js
 *
 * Bundles a project's JS source files into one output file for AI chatbots.
 * - .js files (outside library folders): full content included.
 * - Everything else: listed as path only (existence only), no content.
 *
 * Usage:
 *   node bundle-project.js [projectPath] [outputFile]
 */

const fs = require('fs');
const path = require('path');

// ---------- CONFIG ----------
const DEFAULT_PROJECT_PATH = process.cwd();
const DEFAULT_OUTPUT = 'project-bundle.txt';

// Directories to skip ENTIRELY (libraries, deps, build output, VCS)
const IGNORE_DIRS = new Set([
  // Dependency / library folders
  'node_modules', 'vendor', 'vendors', 'lib', 'libs',
  'libraries', 'bower_components', 'jspm_packages',
  '.yarn', '.pnpm-store',
  // VCS
  '.git', '.svn', '.hg',
  // Build / dist
  'dist', 'build', 'out', '.next', '.nuxt',
  'coverage', '.cache', '.parcel-cache',
  // Python / other envs
  '__pycache__', 'venv', '.venv', 'env',
  // Editor / OS
  '.idea', '.vscode', 'target', 'bin', 'obj',
]);

// Files to skip entirely
const IGNORE_FILES = new Set([
  '.DS_Store', 'Thumbs.db',
  'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml',
]);

// ONLY these extensions get their full content included
const CONTENT_EXTENSIONS = new Set(['.js']);

// Max size for a single content file (2 MB)
const MAX_CONTENT_SIZE = 2 * 1024 * 1024;

// ---------- HELPERS ----------
function getLanguageTag(ext) {
  const map = {
    '.js': 'javascript',
  };
  return map[ext] || '';
}

// ---------- WALKER ----------
function walk(dir, rootDir, results = []) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return results;
  }

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relPath = path.relative(rootDir, fullPath);

    if (entry.isDirectory()) {
      if (IGNORE_DIRS.has(entry.name)) continue;
      walk(fullPath, rootDir, results);
    } else if (entry.isFile()) {
      if (IGNORE_FILES.has(entry.name)) continue;
      results.push(relPath);
    }
  }
  return results;
}

// ---------- MAIN ----------
function main() {
  const projectPath = path.resolve(process.argv[2] || DEFAULT_PROJECT_PATH);
  const outputFile = path.resolve(process.argv[3] || DEFAULT_OUTPUT);

  if (!fs.existsSync(projectPath) || !fs.statSync(projectPath).isDirectory()) {
    console.error(`❌ Project path not found: ${projectPath}`);
    process.exit(1);
  }

  console.log(`📂 Scanning: ${projectPath}`);
  const files = walk(projectPath, projectPath).sort();
  console.log(`📄 Found ${files.length} files`);

  const contentFiles = [];  // .js files → full content
  const otherFiles = [];    // everything else → path only

  for (const rel of files) {
    const abs = path.join(projectPath, rel);
    const ext = path.extname(rel).toLowerCase();
    const stat = fs.statSync(abs);

    if (CONTENT_EXTENSIONS.has(ext)) {
      if (stat.size > MAX_CONTENT_SIZE) {
        // Too large to embed → treat as other
        otherFiles.push({ rel });
        continue;
      }
      contentFiles.push({ rel, abs, ext });
    } else {
      otherFiles.push({ rel });
    }
  }

  const out = [];
  const push = (s = '') => out.push(s);

  // ---------- HEADER ----------
  push(`# Project Bundle: ${path.basename(projectPath)}`);
  push('');
  push(`Generated: ${new Date().toISOString()}`);
  push(`Root: \`${projectPath}\``);
  push('');

  // ---------- FILE TREE ----------
  push('## 🌲 File Tree');
  push('');
  push('```');
  for (const rel of files) push(rel);
  push('```');
  push('');

  // ---------- OTHER FILES (existence only) ----------
  if (otherFiles.length) {
    push('## 📎 Other Files (existence only)');
    push('');
    for (const f of otherFiles) {
      push(`- \`${f.rel}\``);
    }
    push('');
  }

  // ---------- JS FILE CONTENTS ----------
  push('## 📁 JavaScript File Contents');
  push('');
  for (const f of contentFiles) {
    const content = fs.readFileSync(f.abs, 'utf8');
    const lang = getLanguageTag(f.ext);
    push(`### 📄 \`${f.rel}\``);
    push('');
    push(`\`\`\`${lang}`);
    push(content.replace(/\s+$/, ''));
    push('```');
    push('');
  }

  fs.writeFileSync(outputFile, out.join('\n'), 'utf8');

  const outputSize = fs.statSync(outputFile).size;
  console.log(`✅ Wrote ${outputFile}`);
  console.log(`   JS files (content):  ${contentFiles.length}`);
  console.log(`   Other files (path):  ${otherFiles.length}`);
  console.log(`   Output size:         ${(outputSize / 1024).toFixed(1)} KB`);
}

main();