// 학생·교사·앱 월드가 서로의 파일을 가져다 쓰지 않는지, 저장 공간이 섞이지 않는지 확인
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const APPS = ['student', 'teacher', 'world'];

function refs(file) {
  const s = fs.readFileSync(file, 'utf8');
  const out = [];
  for (const re of [/from\s+'([^']+)'/g, /import\(\s*'([^']+)'\s*\)/g, /(?:src|href)="([^"#?:]+)"/g, /new URL\('([^']+)'/g]) for (let m; (m = re.exec(s));) out.push(m[1]);
  return out.filter((r) => r.startsWith('.') || (!r.includes('/') && /\.(js|css|html)$/.test(r)) || /^[a-z]+\//.test(r));
}

test('각 앱은 자기 폴더와 shared/ 만 씀 (다른 앱 파일 참조 금지)', () => {
  for (const app of APPS) {
    const dir = path.join(ROOT, app);
    for (const f of fs.readdirSync(dir).filter((x) => /\.(js|html)$/.test(x))) {
      for (const r of refs(path.join(dir, f))) {
        const target = path.relative(ROOT, path.resolve(dir, r));
        const top = target.split(path.sep)[0];
        // 다른 앱으로 가는 "링크"(../world/ 같은 이동)는 괜찮고, 다른 앱의 코드·스타일을 가져오면 안 됨
        const isNavigation = /\/$/.test(r);
        if (isNavigation) continue;
        if (top === 'docs' && /\.docx$/.test(r)) continue;   // 내려받는 안내 문서(docs/)는 어느 앱에서나 링크 가능
        assert.ok(top === app || top === 'shared' || top === '..' || target.startsWith(`world${path.sep}samples`) && app === 'world',
          `${app}/${f} → ${r} 는 다른 앱(${top})의 파일을 씀`);
      }
    }
  }
});

test('shared/ 는 어떤 앱 폴더도 참조하지 않음', () => {
  for (const f of fs.readdirSync(path.join(ROOT, 'shared')).filter((x) => x.endsWith('.js'))) {
    for (const r of refs(path.join(ROOT, 'shared', f))) {
      const top = path.relative(ROOT, path.resolve(ROOT, 'shared', r)).split(path.sep)[0];
      assert.ok(!APPS.includes(top), `shared/${f} → ${r}`);
    }
  }
});

test('저장 이름(localStorage)은 앱마다 다른 접두어', () => {
  for (const app of APPS) {
    const keys = [];
    for (const f of fs.readdirSync(path.join(ROOT, app)).filter((x) => x.endsWith('.js'))) {
      const s = fs.readFileSync(path.join(ROOT, app, f), 'utf8');
      for (const m of s.matchAll(/'(myappmaker\.[a-z]+\.[a-z.]+)'/g)) keys.push(m[1]);
    }
    assert.ok(keys.length > 0, `${app}: 저장 이름 있음`);
    for (const k of keys) assert.ok(k.startsWith(`myappmaker.${app}.`), `${app} 가 ${k} 를 씀`);
  }
});

test('연결 설정은 앱마다 따로 저장 (교사 설정이 학생 설정을 덮지 않음)', async () => {
  const mem = new Map();
  globalThis.localStorage = { getItem: (k) => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, String(v)), removeItem: (k) => mem.delete(k) };
  globalThis.window = { MYAPP_CONFIG: { endpoint: '', classCode: '' } };
  const { loadConfig, saveConfig } = await import('../shared/api.js');
  saveConfig('student', { endpoint: 'https://a.example/exec', classCode: 'A' });
  saveConfig('teacher', { endpoint: 'https://b.example/exec', classCode: 'B' });
  assert.equal(loadConfig('student', '').classCode, 'A');
  assert.equal(loadConfig('teacher', '').classCode, 'B');
  assert.equal(loadConfig('world', '').classCode, '');
  assert.deepEqual([...mem.keys()].sort(), ['myappmaker.student.config', 'myappmaker.teacher.config']);
  delete globalThis.localStorage; delete globalThis.window;
});
