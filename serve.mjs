// Serves the static site in _build/html over http://localhost.
//
// The built pages reference their assets with root-absolute paths
// (/build/_assets/..., /myst-theme.css), and each index.html redirects
// itself to its clean directory URL. Both of those need a web server to
// resolve, so opening _build/html/index.html straight off disk shows a
// blank page or a folder listing. This serves the same files properly.

import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { join, extname, normalize } from 'node:path';

const ROOT = join(import.meta.dirname, '_build', 'html');
const PORT = Number(process.env.PORT) || 3000;

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.xml': 'application/xml; charset=utf-8',
  '.xsl': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.inv': 'application/octet-stream',
};

async function resolve(urlPath) {
  // Block traversal above the build directory.
  const rel = normalize(decodeURIComponent(urlPath)).replace(/^(\.\.[/\\])+/, '');
  const target = join(ROOT, rel);
  if (!target.startsWith(ROOT)) return null;

  for (const candidate of [target, join(target, 'index.html')]) {
    try {
      const info = await stat(candidate);
      if (info.isFile()) return candidate;
    } catch {
      // try the next candidate
    }
  }
  return null;
}

const server = createServer(async (req, res) => {
  const urlPath = new URL(req.url, 'http://localhost').pathname;
  const file = await resolve(urlPath);

  if (!file) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end(`404 Not Found: ${urlPath}`);
    return;
  }

  res.writeHead(200, {
    'Content-Type': TYPES[extname(file).toLowerCase()] ?? 'application/octet-stream',
    'Cache-Control': 'no-cache',
  });
  createReadStream(file).pipe(res);
});

try {
  await stat(ROOT);
} catch {
  console.error('No _build/html yet — run "npm run build" first.');
  process.exit(1);
}

server.listen(PORT, () => {
  console.log(`\n  Portfolio running at  http://localhost:${PORT}\n  Press Ctrl+C to stop.\n`);
});
