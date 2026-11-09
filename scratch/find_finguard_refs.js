const fs = require('fs');
const path = require('path');

const rootDir = path.resolve('.');
const excludeDirs = ['.git', 'node_modules', 'target', '.system_generated', '.gemini', 'scratch', 'dist'];

const results = [];

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (excludeDirs.includes(entry.name)) continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath);
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase();
      if (['.png', '.jpg', '.jpeg', '.ico', '.pdf', '.class', '.jar'].includes(ext)) continue;
      try {
        const content = fs.readFileSync(fullPath, 'utf8');
        const lines = content.split('\n');
        lines.forEach((line, idx) => {
          if (/finguard/i.test(line)) {
            const relPath = path.relative(rootDir, fullPath);
            results.push({ file: relPath, line: idx + 1, text: line.trim() });
          }
        });
      } catch (e) {
        // ignore binary
      }
    }
  }
}

walk(rootDir);

console.log(`Total occurrences found: ${results.length}`);

// Group by category:
const frontend = results.filter(r => r.file.startsWith('frontend'));
const backend = results.filter(r => r.file.startsWith('backend'));
const docs = results.filter(r => !r.file.startsWith('frontend') && !r.file.startsWith('backend'));

console.log(`Frontend occurrences: ${frontend.length}`);
frontend.forEach(r => console.log(`  [FE] ${r.file}:${r.line} -> ${r.text.slice(0, 100)}`));

console.log(`\nDocs occurrences: ${docs.length}`);
docs.forEach(r => console.log(`  [DOC] ${r.file}:${r.line} -> ${r.text.slice(0, 100)}`));

console.log(`\nBackend occurrences: ${backend.length}`);
const backendNonPackage = backend.filter(r => !r.text.includes('package com.finguard') && !r.text.includes('import com.finguard'));
console.log(`Backend non-import/package occurrences: ${backendNonPackage.length}`);
backendNonPackage.slice(0, 30).forEach(r => console.log(`  [BE] ${r.file}:${r.line} -> ${r.text.slice(0, 100)}`));

