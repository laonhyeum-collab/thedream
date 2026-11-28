// 누가 하는지 (같은 노트북을 여러 친구가 함께 써요)
// - 처음부터 하기: 이번에만 하고 저장하지 않아요 (창을 닫으면 사라져요)
// - 이름·별명으로 하기: 그 이름으로만 저장하고, 다음에 같은 이름으로 이어서 해요
// 로그인·계정은 없어요. 이름은 이 기기 안에만 남아요.

export interface KeyStore {
  getItem(k: string): string | null;
  setItem(k: string, v: string): void;
  removeItem(k: string): void;
  key?(i: number): string | null;
  readonly length?: number;
}
export type Player = { guest: true; name?: undefined } | { guest?: false; name: string };
export interface SavedPlayer {
  name: string;
  lastAt: number;
}

const PLAYERS_KEY = 'pixel-magic-lab:players';
export const NAME_MAX = 12;

let current: Player | null = null;
const guestMap = new Map<string, string>();

function device(): KeyStore | null {
  try {
    return globalThis.localStorage || null;
  } catch {
    return null;
  }
}

/** 이름 다듬기: 앞뒤 빈칸·이상한 글자를 빼고 12자까지 */
export function cleanName(raw: unknown): string {
  return String(raw ?? '')
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001f<>"'`\\]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, NAME_MAX);
}

const nameKey = (name: string) => `pixel-magic-lab:p:${encodeURIComponent(name)}:`;

export function listPlayers(store: KeyStore | null = device()): SavedPlayer[] {
  try {
    const v = JSON.parse(store?.getItem(PLAYERS_KEY) || '[]');
    return Array.isArray(v)
      ? v
          .filter((p) => p && typeof p.name === 'string' && cleanName(p.name))
          .map((p) => ({ name: cleanName(p.name), lastAt: Number(p.lastAt) || 0 }))
          .sort((a, b) => b.lastAt - a.lastAt)
      : [];
  } catch {
    return [];
  }
}

function writePlayers(list: SavedPlayer[], store: KeyStore | null) {
  try {
    store?.setItem(PLAYERS_KEY, JSON.stringify(list));
  } catch {
    /* 저장 공간 없음 */
  }
}

export function hasPlayer(name: string, store: KeyStore | null = device()) {
  const n = cleanName(name);
  return listPlayers(store).some((p) => p.name === n);
}

/** 그 이름의 기록을 모두 지워요 (이 기기 안에서만) */
export function forgetPlayer(name: string, store: KeyStore | null = device()) {
  const n = cleanName(name);
  if (!store) return;
  const prefix = nameKey(n);
  try {
    const keys: string[] = [];
    for (let i = 0; i < (store.length ?? 0); i++) {
      const k = store.key?.(i);
      if (k && k.startsWith(prefix)) keys.push(k);
    }
    keys.forEach((k) => store.removeItem(k));
  } catch {
    /* 무시 */
  }
  writePlayers(listPlayers(store).filter((p) => p.name !== n), store);
}

export function startGuest(): Player {
  guestMap.clear();
  current = { guest: true };
  return current;
}

/** fresh: true 면 같은 이름의 예전 기록을 지우고 처음부터 */
export function startNamed(name: string, { fresh = false } = {}, store: KeyStore | null = device()): Player | null {
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

/** 작품·기록 저장소: 이름이 있으면 그 이름 칸에, 처음부터 하기면 이번 창에만 */
export function playerStore(): KeyStore | null {
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
    getItem: (k) => (guestMap.has(k) ? guestMap.get(k)! : null),
    setItem: (k, v) => {
      guestMap.set(k, String(v));
    },
    removeItem: (k) => {
      guestMap.delete(k);
    },
  };
}

/** 시험용: 처음 상태로 */
export function _reset() {
  current = null;
  guestMap.clear();
}
