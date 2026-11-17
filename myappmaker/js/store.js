// 이 기기·이 브라우저에 기획서를 저장합니다 (localStorage).
// 저장이 막힌 경우(사생활 보호 모드 등)에도 앱은 계속 동작하고, 상태로 알려 줍니다.
import { normalizePlan } from './plan.js';

const KEY = 'myappmaker.plan.current';
const HISTORY = 'myappmaker.plan.history';   // 이전에 쓰던 기획서 (최대 5개)

export function createStore(storage = safeStorage()) {
  const listeners = new Set();
  let status = 'idle';
  const set = (s, detail) => { status = s; for (const fn of listeners) fn(s, detail); };

  return {
    get status() { return status; },
    onStatus(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    available: !!storage,

    load() {
      if (!storage) return null;
      try {
        const raw = storage.getItem(KEY);
        return raw ? normalizePlan(JSON.parse(raw)) : null;
      } catch { return null; }
    },

    save(plan) {
      if (!storage) { set('fail', '이 브라우저는 저장이 막혀 있어요. JSON 백업을 꼭 내려받아 두세요.'); return false; }
      set('saving');
      try {
        plan.updatedAt = new Date().toISOString();
        storage.setItem(KEY, JSON.stringify(plan));
        set('saved', plan.updatedAt);
        return true;
      } catch (e) {
        set('fail', e && e.name === 'QuotaExceededError' ? '저장 공간이 꽉 찼어요. JSON 백업을 내려받아 두세요.' : '저장하지 못했어요.');
        return false;
      }
    },

    // 새로 쓰기 전에 지금 기획서를 기록에 남겨 둡니다 (공간이 모자라면 기록은 건너뜀).
    archiveAndClear(plan) {
      if (!storage) return;
      try {
        if (plan) {
          const list = this.history().filter((p) => p.id !== plan.id);
          list.unshift(plan);
          storage.setItem(HISTORY, JSON.stringify(list.slice(0, 3)));
        }
      } catch { /* 저장 공간 부족 */ }
      try { storage.removeItem(KEY); } catch { /* 무시 */ }
    },

    history() {
      if (!storage) return [];
      try {
        const list = JSON.parse(storage.getItem(HISTORY) || '[]');
        return list.map((p) => { try { return normalizePlan(p); } catch { return null; } }).filter(Boolean);
      } catch { return []; }
    },
  };
}

export function safeStorage() {
  try {
    const s = globalThis.localStorage;
    const t = '__myapp_test__';
    s.setItem(t, '1'); s.removeItem(t);
    return s;
  } catch { return null; }
}

// 파일로 내려받기 (JSON 백업, 제출 파일, HTML 등)
export function download(filename, text, type = 'application/json') {
  const blob = new Blob([text], { type: `${type};charset=utf-8` });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
}

export function readFileText(file, maxBytes = 2_000_000) {
  return new Promise((resolve, reject) => {
    if (file.size > maxBytes) { reject(new Error(`파일이 너무 커요 (${Math.round(maxBytes / 1000)}KB 까지)`)); return; }
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(new Error('파일을 읽지 못했어요'));
    r.readAsText(file, 'utf-8');
  });
}

export const safeName = (s) => String(s || '').replace(/[\\/:*?"<>|\s]+/g, '_').slice(0, 40) || '이름없음';
