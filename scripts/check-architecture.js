// Enforces src/'s layering (see src/README.md) so the structure can't quietly erode:
//
//   core/      app-agnostic building blocks       may import: core
//   ui/        shared look & frame                 may import: core, ui
//   features/  one folder per feature              may import: core, ui, assets, its own files,
//                                                  and OTHER features only via '@/features/<name>'
//                                                  (their index.ts), never a deep path
//   app/       assembly (navigation, preloading)   may import anything
//   assets/    images + their registries           type-only imports of features are allowed
//
// Type-only imports (`import type ...`) are exempt from the direction rules — they vanish at
// runtime, so they can't create a load-order cycle (screens type their props from
// app/navigation/types.ts this way).
//
//   node scripts/check-architecture.js     (also run first by `npm run verify`)
const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, '..', 'src');
const LAYER_RANK = { core: 0, ui: 1, features: 2, assets: 2, app: 3 };

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/\.tsx?$/.test(e.name)) out.push(p);
  }
  return out;
}

// '@/features/room/layout' or a relative path -> 'features/room/layout' (src-relative)
function target(fromRel, spec) {
  if (spec.startsWith('@/')) return spec.slice(2);
  if (spec.startsWith('.')) return path.posix.normalize(path.posix.join(path.posix.dirname(fromRel), spec));
  return null; // a package
}

const problems = [];
for (const file of walk(SRC)) {
  const rel = path.relative(SRC, file).split(path.sep).join('/');
  const [layer, feature] = rel.split('/');
  const text = fs.readFileSync(file, 'utf8');
  const re = /^\s*(import|export)\s+(type\s+)?[^'"]*?from\s+'([^']+)'|require\('([^']+)'\)/gm;
  let m;
  while ((m = re.exec(text))) {
    const typeOnly = !!m[2];
    const spec = m[3] ?? m[4];
    const to = target(rel, spec);
    if (!to) continue;
    const [toLayer, toFeature, ...rest] = to.split('/');
    if (!(toLayer in LAYER_RANK) || toLayer === 'assets') continue; // assets & non-code are fine
    const where = `${rel}: '${spec}'`;
    if (!typeOnly && LAYER_RANK[toLayer] > LAYER_RANK[layer] && layer !== 'app') {
      problems.push(`${where} — ${layer}/ must not import ${toLayer}/`);
    }
    if (layer === 'features' && toLayer === 'features' && toFeature !== feature && rest.length && !typeOnly) {
      problems.push(`${where} — import another feature through its index ('@/features/${toFeature}')`);
    }
    if (layer === 'features' && toLayer === 'features' && toFeature === feature && spec.startsWith('@/features/')) {
      problems.push(`${where} — inside its own feature, use a relative './' import`);
    }
  }
}

if (problems.length) {
  console.error(`✗ architecture: ${problems.length} problem(s)\n  ` + problems.join('\n  '));
  process.exit(1);
}
console.log('✓ architecture: layers and feature boundaries respected');
