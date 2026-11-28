// 누가 하는지 (같은 노트북을 여러 친구가 함께 써요)
// - 처음부터 하기: 이번에만 하고 저장하지 않아요 (창을 닫으면 사라져요)
// - 이름·별명으로 하기: 그 이름으로만 저장하고, 다음에 같은 이름으로 이어서 해요
// 로그인·계정은 없어요. 이름은 이 기기 안에만 남아요.

const PLAYERS_KEY = 'musicPlayFactory.players.v1';
export const NAME_MAX = 12;

let current = null; // null(아직 안 고름) | { guest: true } | { name }
const guestMap = new Map();

function device() {
  try { return globalThis.localStorage || null; } catch { return null; }
}

// 이름 다듬기: 앞뒤 빈칸·이상한 글자를 빼고 12자까지
export function cleanName(raw) {
  return String(raw ?? '')
    .replace(/[\u0000-\u001f<>"'`\\]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, NAME_MAX);
}

const nameKey = (name) => `musicPlayFactory.p.${encodeURIComponent(name)}.`;

export function listPlayers(store = device()) {
  try {
    const v = JSON.parse(store?.getItem(PLAYERS_KEY) || '[]');
    return Array.isArray(v)
      ? v.filter((p) => p && typeof p.name === 'string' && cleanName(p.name)).sort((a, b) => (b.lastAt || 0) - (a.lastAt || 0))
      : [];
  } catch { return []; }
}

function writePlayers(list, store) {
  try { store?.setItem(PLAYERS_KEY, JSON.stringify(list)); } catch { /* 저장 공간 없음 */ }
}

export function hasPlayer(name, store = device()) {
  const n = cleanName(name);
  return listPlayers(store).some((p) => p.name === n);
}

// 그 이름의 기록을 모두 지워요 (이 기기 안에서만)
export function forgetPlayer(name, store = device()) {
  const n = cleanName(name);
  if (!store) return;
  const prefix = nameKey(n);
  try {
    const keys = [];
    for (let i = 0; i < (store.length ?? 0); i++) {
      const k = store.key(i);
      if (k && k.startsWith(prefix)) keys.push(k);
    }
    keys.forEach((k) => store.removeItem(k));
  } catch { /* 무시 */ }
  writePlayers(listPlayers(store).filter((p) => p.name !== n), store);
}

export function startGuest() {
  guestMap.clear();
  current = { guest: true };
  return current;
}

// fresh: true 면 같은 이름의 예전 기록을 지우고 처음부터
export function startNamed(name, { fresh = false } = {}, store = device()) {
  const n = cleanName(name);
  if (!n) return null;
  if (fresh) forgetPlayer(n, store);
  const list = listPlayers(store).filter((p) => p.name !== n);
  list.unshift({ name: n, lastAt: Date.now() });
  writePlayers(list.slice(0, 60), store);
  current = { name: n };
  return current;
}

export const currentPlayer = () => current;

// 작품·기록 저장소: 이름이 있으면 그 이름 칸에, 처음부터 하기면 이번 창에만
export function playerStore() {
  if (current?.name) {
    const base = device();
    if (!base) return null;
    const pre = nameKey(current.name);
    return {
      getItem: (k) => base.getItem(pre + k),
      setItem: (k, v) => base.setItem(pre + k, v),
      removeItem: (k) => base.removeItem(pre + k),
    };
  }
  return {
    getItem: (k) => (guestMap.has(k) ? guestMap.get(k) : null),
    setItem: (k, v) => { guestMap.set(k, String(v)); },
    removeItem: (k) => { guestMap.delete(k); },
  };
}

// 시험용: 처음 상태로
export function _reset() { current = null; guestMap.clear(); }
