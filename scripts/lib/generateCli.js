// The command-line loop every generate-*.js script shares:
//   node scripts/assets/generate-<x>.js name1 name2   -> just those
//   node scripts/assets/generate-<x>.js --all         -> everything not yet generated
// Writes <outDir>/<name>-raw.png. An existing raw file is always skipped — never regenerated
// implicitly — because every call is billed: redoing one means deleting its file on purpose.
// No automatic retries for the same reason. Run only when the user has explicitly asked.
const fs = require('fs');
const path = require('path');
const { generateImage } = require('./gemini');

/**
 * @param {object} o
 * @param {string} o.outDir
 * @param {string[]} o.names     every name this script knows
 * @param {(name: string) => string} o.promptFor
 * @param {(name: string) => string | undefined} [o.refFor]  reference image per name (default: the character sheet)
 * @param {(name: string, buf: Buffer) => Promise<Buffer> | Buffer} [o.postProcess]
 */
async function runGenerateCli({ outDir, names: known, promptFor, refFor = () => undefined, postProcess }) {
  const args = process.argv.slice(2);
  const names = args.includes('--all') ? known : args;
  const unknown = names.filter((n) => !known.includes(n));
  if (!names.length || unknown.length) {
    console.error(unknown.length ? `Unknown: ${unknown.join(', ')}` : 'Name items or pass --all.', '\nKnown:', known.join(', '));
    process.exit(1);
  }
  fs.mkdirSync(outDir, { recursive: true });
  let failed = 0;
  for (const name of names) {
    const out = path.join(outDir, `${name}-raw.png`);
    if (fs.existsSync(out)) {
      console.log('skip (exists):', name);
      continue;
    }
    try {
      let buf = await generateImage(promptFor(name), refFor(name));
      if (postProcess) buf = await postProcess(name, buf);
      fs.writeFileSync(out, buf);
      console.log('wrote', name, `(${buf.length} bytes)`);
    } catch (e) {
      failed++;
      console.error('FAILED', name, '-', e.message);
    }
  }
  if (failed) process.exit(1);
}

module.exports = { runGenerateCli };
