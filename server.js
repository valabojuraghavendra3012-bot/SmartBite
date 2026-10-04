import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;
const HOST = '0.0.0.0';

const htmlPath = path.join(__dirname, 'smartbite-preview.html');
let cachedHtml = '';

try {
  cachedHtml = fs.readFileSync(htmlPath, 'utf-8');
} catch (err) {
  console.error('Could not read smartbite-preview.html:', err);
}

const server = http.createServer((req, res) => {
  const url = req.url ? req.url.split('?')[0] : '/';

  // Health check endpoint
  if (url === '/health' || url === '/_health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', app: 'SmartBite' }));
    return;
  }

  // SPA fallback for all routes: serve smartbite-preview.html
  res.writeHead(200, {
    'Content-Type': 'text/html; charset=utf-8',
    'Cache-Control': 'no-cache, no-store, must-revalidate',
  });
  res.end(cachedHtml);
});

server.listen(PORT, HOST, () => {
  console.log(`SmartBite production server listening on http://${HOST}:${PORT}`);
});
