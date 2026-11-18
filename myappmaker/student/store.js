// [학생 앱 전용] 이 기기·이 브라우저에 기획서를 저장합니다 (localStorage).
// 저장이 막힌 경우(사생활 보호 모드 등)에도 앱은 계속 동작하고, 상태로 알려 줍니다.
import { normalizePlan } from '../shared/plan.js';

const BASE_KEY = 'myappmaker.student.plan';
const BASE_HISTORY = 'myappmaker.student.history';   // 이전에 쓰던 기획서 (최대 3개)

export function createStore(storage = safeStorage()) {
  const listeners = new Set();
  let status = 'idle';
  // 아이디로 로그인하면 아이디마다 따로 저장 (한 노트북을 여러 학생이 써도 섞이지 않게)
  let KEY = BASE_KEY, HISTORY = BASE_HISTORY;
  const set = (s, detail) => { status = s; for (const fn of listeners) fn(s, detail); };

  return {
    get status() { return status; },
    onStatus(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    available: !!storage,
    useUser(id) {
      const tail = id ? `.u.${encodeURIComponent(id)}` : '';
      KEY = BASE_KEY + tail; HISTORY = BASE_HISTORY + tail;
    },

    load() {
      if (!storage) return null;
      try {
        const raw = storage.getItem(KEY);
        return raw ? normalizePlan(JSON.parse(raw)) : null;
      } catch { return null; }
    },

    save(plan, { keepTime = false } = {}) {
      if (!storage) { set('fail', '이 브라우저는 저장이 막혀 있어요. JSON 백업을 꼭 내려받아 두세요.'); return false; }
      set('saving');
      try {
        if (!keepTime || !plan.updatedAt) plan.updatedAt = new Date().toISOString();
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
