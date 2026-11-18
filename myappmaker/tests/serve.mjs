// 로컬 개발 서버: 사이트 파일 + 가짜 우리 반 저장소(/gas)
// 실행: node tests/serve.mjs [포트]   → 학생 앱 http://localhost:8090/myappmaker/student/?api=http://localhost:8090/gas&class=TEST-CLASS
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createGas, gasHandler } from './gas-sim.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');   // 저장소 루트 (무궁화도 함께)
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json', '.ico': 'image/x-icon' };

export function startServer(port = 0, gasOpts) {
  const gas = createGas(gasOpts);
  const handleGas = gasHandler(gas);
  const server = http.createServer((req, res) => {
    const u = new URL(req.url, 'http://x');
    if (u.pathname === '/gas') return handleGas(req, res);
    let p = decodeURIComponent(u.pathname);
    if (p === '/') { res.writeHead(302, { location: '/myappmaker/' }); res.end(); return; }
    if (p.endsWith('/')) p += 'index.html';
    const file = path.join(ROOT, p);
    if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); res.end('not found'); return; }
    res.writeHead(200, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream', 'cache-control': 'no-store' });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise((resolve) => server.listen(port, '127.0.0.1', () => resolve({ server, gas, port: server.address().port })));
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const { port } = await startServer(Number(process.argv[2]) || 8090);
  const base = `http://localhost:${port}`;
  console.log(`학생:   ${base}/myappmaker/student/?api=${base}/gas&class=TEST-CLASS`);
  console.log(`교사:   ${base}/myappmaker/teacher/?api=${base}/gas&class=TEST-CLASS  (교사 열쇠 TEST-TEACHER)`);
  console.log(`메타버스: ${base}/myappmaker/world/?api=${base}/gas&class=TEST-CLASS`);
}
