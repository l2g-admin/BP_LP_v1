// Builds the public site into dist/. Source files keep their design-note
// comments; dist/ is what Cloudflare serves, with every comment stripped
// and only the assets the page actually references.
//
// Two variants ship for the A/B test (see functions/_middleware.js):
//   dist/      — guided deck, built from the repo root (variant B, control)
//   dist/s/    — natural scroll, built from scroll/ (variant A)
// Both are served at "/" — the middleware picks one per visitor — so the
// scroll build's references are rewritten to absolute /s/ paths; relative
// ones would resolve against the guided files at the root.
const fs = require('fs');
const path = require('path');
const esbuild = require('esbuild');

const dist = path.join(__dirname, 'dist');
fs.rmSync(dist, { recursive: true, force: true });

const stamp = `<meta name="build" content="${new Date().toISOString().slice(0, 16)}Z">`;

function buildVariant(srcDir, outDir, prefix) {
  fs.mkdirSync(path.join(outDir, 'assets'), { recursive: true });

  // HTML: strip comments, then collapse the blank lines they leave behind.
  let html = fs.readFileSync(path.join(srcDir, 'index.html'), 'utf8');
  html = html
    .replace(/[ \t]*<!--[\s\S]*?-->\n?/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .replace('</head>', `  ${stamp}\n</head>`);
  if (prefix) {
    html = html
      .replace(/(["'])assets\//g, `$1${prefix}assets/`)
      .replace('href="styles.css"', `href="${prefix}styles.css"`)
      .replace('src="app.js"', `src="${prefix}app.js"`);
  }
  fs.writeFileSync(path.join(outDir, 'index.html'), html);

  // JS + CSS: esbuild re-prints the code, dropping all comments. Not minified,
  // so the shipped files stay debuggable in devtools.
  esbuild.buildSync({
    entryPoints: [path.join(srcDir, 'app.js'), path.join(srcDir, 'styles.css')],
    outdir: outDir,
    charset: 'utf8',
    legalComments: 'none',
    minifyWhitespace: true,
  });

  // Copy only the assets the shipped files reference; unpublished drafts in
  // assets/ never leave the repo. Both variants pull from the shared
  // repo-root assets/ directory.
  const shipped = ['index.html', 'app.js', 'styles.css']
    .map((f) => fs.readFileSync(path.join(srcDir, f), 'utf8'))
    .join('\n');
  const refs = new Set(
    [...shipped.matchAll(/assets\/[A-Za-z0-9 _.\-]+\.[A-Za-z0-9]+/g)].map((m) => m[0])
  );
  let copied = 0;
  for (const ref of refs) {
    if (fs.existsSync(ref)) {
      fs.copyFileSync(ref, path.join(outDir, ref));
      copied++;
    } else {
      console.warn(`WARNING: referenced asset missing on disk: ${ref}`);
    }
  }
  console.log(`${path.relative(__dirname, outDir)}/ built: index.html, app.js, styles.css, ${copied} assets`);
}

buildVariant(__dirname, dist, '');
buildVariant(path.join(__dirname, 'scroll'), path.join(dist, 's'), '/s/');
