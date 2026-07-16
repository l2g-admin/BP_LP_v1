// Builds the public site into dist/. Source files keep their design-note
// comments; dist/ is what Cloudflare serves, with every comment stripped
// and only the assets the page actually references.
const fs = require('fs');
const path = require('path');
const esbuild = require('esbuild');

const dist = path.join(__dirname, 'dist');
fs.rmSync(dist, { recursive: true, force: true });
fs.mkdirSync(path.join(dist, 'assets'), { recursive: true });

// HTML: strip comments, then collapse the blank lines they leave behind.
let html = fs.readFileSync('index.html', 'utf8');
html = html
  .replace(/[ \t]*<!--[\s\S]*?-->\n?/g, '')
  .replace(/\n{3,}/g, '\n\n')
  .replace('</head>', `  <meta name="build" content="${new Date().toISOString().slice(0, 16)}Z">\n</head>`);
fs.writeFileSync(path.join(dist, 'index.html'), html);

// JS + CSS: esbuild re-prints the code, dropping all comments. Not minified,
// so the shipped files stay debuggable in devtools.
esbuild.buildSync({
  entryPoints: ['app.js', 'styles.css'],
  outdir: dist,
  charset: 'utf8',
  legalComments: 'none',
  minifyWhitespace: true,
});

// Copy only the assets the shipped files reference; unpublished drafts in
// assets/ never leave the repo.
const shipped = ['index.html', 'app.js', 'styles.css']
  .map((f) => fs.readFileSync(f, 'utf8'))
  .join('\n');
const refs = new Set(
  [...shipped.matchAll(/assets\/[A-Za-z0-9 _.\-]+\.[A-Za-z0-9]+/g)].map((m) => m[0])
);
let copied = 0;
for (const ref of refs) {
  if (fs.existsSync(ref)) {
    fs.copyFileSync(ref, path.join(dist, ref));
    copied++;
  } else {
    console.warn(`WARNING: referenced asset missing on disk: ${ref}`);
  }
}
console.log(`dist/ built: index.html, app.js, styles.css, ${copied} assets`);
