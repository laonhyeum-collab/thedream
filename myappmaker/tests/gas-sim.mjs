// Code.gs 를 "가짜 구글 Apps Script" 위에서 그대로 실행합니다 (시험·로컬 개발용).
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const CODE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../backend/Code.gs');

export function createGas({ classCode = 'TEST-CLASS', teacherKey = 'TEST-TEACHER' } = {}) {
  const sheets = new Map();
  const files = new Map();
  const folders = [];
  const props = new Map();

  function makeSheet(name) {
    const data = [];
    const sh = {
      name,
      data,
      getLastRow: () => data.length,
      setFrozenRows() {},
      appendRow: (row) => { data.push(row.slice()); },
      deleteRow: (r) => { data.splice(r - 1, 1); },
      getRange: (r, c, nr = 1, nc = 1) => ({
        getValues: () => Array.from({ length: nr }, (_, i) => Array.from({ length: nc }, (_, j) => {
          const v = (data[r - 1 + i] || [])[c - 1 + j];
          return v === undefined ? '' : v;
        })),
        setNumberFormat() {},
        setValues: (vals) => {
          vals.forEach((row, i) => {
            if (!data[r - 1 + i]) data[r - 1 + i] = [];
            row.forEach((v, j) => {
              // 실제 시트처럼 50,000자 넘는 칸은 거절
              if (typeof v === 'string' && v.length > 50000) throw new Error('셀 한도 초과');
              data[r - 1 + i][c - 1 + j] = v;
            });
          });
        },
      }),
    };
    sheets.set(name, sh);
    return sh;
  }

  const ctx = {
    console,
    JSON, Math, Date, String, Number, Object, Array, Error,
    SpreadsheetApp: { getActiveSpreadsheet: () => ({ getSheetByName: (n) => sheets.get(n) || null, insertSheet: (n) => makeSheet(n) }) },
    DriveApp: {
      getFoldersByName: (n) => { const f = folders.filter((x) => x.name === n); let i = 0; return { hasNext: () => i < f.length, next: () => f[i++] }; },
      createFolder: (n) => {
        const folder = { name: n, createFile: (fname, content) => { const id = crypto.randomUUID(); files.set(id, { name: fname, content, trashed: false }); return { getId: () => id }; } };
        folders.push(folder); return folder;
      },
      getFileById: (id) => {
        const f = files.get(id); if (!f) throw new Error('파일 없음');
        return { setTrashed: (t) => { f.trashed = t; }, setContent: (c) => { if (f.trashed) throw new Error('휴지통 파일'); f.content = c; }, getBlob: () => ({ getDataAsString: () => f.content }) };
      },
    },
    MimeType: { HTML: 'text/html', PLAIN_TEXT: 'text/plain' },
    PropertiesService: { getScriptProperties: () => ({ getProperty: (k) => (props.has(k) ? props.get(k) : null), setProperty: (k, v) => { props.set(k, String(v)); }, deleteProperty: (k) => { props.delete(k); } }) },
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
    ContentService: {
      MimeType: { JSON: 'application/json' },
      createTextOutput: (s) => { const o = { content: s, setMimeType: () => o, getContent: () => s }; return o; },
    },
    Utilities: {
      getUuid: () => crypto.randomUUID(),
      DigestAlgorithm: { SHA_256: 'sha256' }, Charset: { UTF_8: 'utf8' },
      // 실제 Apps Script 처럼 -128~127 바이트 배열
      computeDigest: (alg, text) => [...crypto.createHash(alg).update(String(text), 'utf8').digest()].map((b) => (b > 127 ? b - 256 : b)),
      computeHmacSha256Signature: (text, key) => [...crypto.createHmac('sha256', String(key)).update(String(text), 'utf8').digest()].map((b) => (b > 127 ? b - 256 : b)),
    },
    encodeURIComponent, decodeURIComponent,
  };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(CODE, 'utf8'), ctx, { filename: 'Code.gs' });
  ctx.CLASS_CODE = classCode;
  ctx.TEACHER_KEY = teacherKey;

  return {
    ctx, sheets, files, props,
    get: (params) => JSON.parse(ctx.doGet({ parameter: params }).getContent()),
    post: (body) => JSON.parse(ctx.doPost({ postData: { contents: typeof body === 'string' ? body : JSON.stringify(body) } }).getContent()),
  };
}

// http 요청을 Apps Script 처럼 처리 (GET 쿼리 / POST text/plain 본문)
export function gasHandler(gas) {
  return (req, res) => {
    const u = new URL(req.url, 'http://x');
    const send = (obj) => {
      res.writeHead(200, { 'content-type': 'application/json; charset=utf-8', 'access-control-allow-origin': '*' });
      res.end(JSON.stringify(obj));
    };
    if (req.method === 'GET') return send(gas.get(Object.fromEntries(u.searchParams)));
    let body = '';
    req.on('data', (c) => { body += c; });
    req.on('end', () => send(gas.post(body)));
  };
}
