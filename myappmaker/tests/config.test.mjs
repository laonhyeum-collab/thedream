// 우리 반 공용 설정(shared/config.js) 점검: 주소 형식·반 코드가 맞고, 비밀 값은 들어 있지 않아요.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const file = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../shared/config.js');
const src = fs.readFileSync(file, 'utf8');
const box = { window: {} };
vm.runInNewContext(src, box);
const cfg = box.window.MYAPP_CONFIG;

test('공용 설정: Apps Script 웹 앱 주소와 반 코드가 들어 있음', () => {
  assert.match(cfg.endpoint, /^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/);
  assert.match(cfg.classCode, /^[A-Z0-9-]{3,30}$/);
});

test('공용 설정: 설치 열쇠·비밀번호 같은 비밀 값이 없음', () => {
  assert.deepEqual(Object.keys(cfg).sort(), ['classCode', 'endpoint']);
  const code = src.split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');
  assert.ok(!/TEACHER_KEY|password|setupKey/i.test(code));
});
