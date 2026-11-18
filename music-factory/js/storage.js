// 작품 저장 (브라우저 로컬 저장소). 나중에 계정 저장으로 바꿀 때 이 파일만 고치면 됩니다.
import { clampBpm, clampLevel } from './engine.js';
import { getTheme, normalizeVoices } from './themes.js';

const WORKS_KEY = 'musicPlayFactory.works.v1';
const DRAFT_KEY = 'musicPlayFactory.draft.v1';
const MISSION_KEY = 'musicPlayFactory.missions.v1';

function defaultStore() {
  try { return globalThis.localStorage || null; } catch { return null; }
}

function readJSON(store, key, fallback) {
  try {
    const raw = store?.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch { return fallback; }
}

function writeJSON(store, key, value) {
  try { store?.setItem(key, JSON.stringify(value)); return true; } catch { return false; }
}

// 저장된 값이 망가졌거나 예전 형식이어도 안전하게 복원합니다.
export function normalizeItems(items, theme) {
  if (!Array.isArray(items) || !theme) return [];
  const known = new Set(theme.ingredients.map((i) => i.id));
  const used = new Set();
  const out = [];
  for (const raw of items) {
    if (!raw || !known.has(raw.ing)) continue;
    const row = Math.round(Number(raw.row));
    const col = Math.round(Number(raw.col));
    if (!(row >= 0 && row < theme.rows && col >= 0 && col < theme.cols)) continue;
    const slot = `${row}:${col}`;
    if (used.has(slot)) continue;
    used.add(slot);
    out.push({
      id: typeof raw.id === 'string' && raw.id ? raw.id : `it${out.length}-${slot}`,
      ing: raw.ing,
      row,
      col,
      size: clampLevel(raw.size),
    });
  }
  return out;
}

export function normalizeWork(raw) {
  const theme = getTheme(raw?.theme);
  if (!theme || !theme.ready) return null;
  return {
    id: String(raw.id || newId()),
    title: String(raw.title || theme.defaultTitle).slice(0, 30),
    theme: theme.id,
    bpm: clampBpm(raw.bpm),
    loop: Boolean(raw.loop),
    items: normalizeItems(raw.items, theme),
    voices: normalizeVoices(raw.voices, theme), // 학생이 고른 재료별 악기
    createdAt: Number(raw.createdAt) || Date.now(),
    updatedAt: Number(raw.updatedAt) || Date.now(),
  };
}

export function newId() {
  return `w${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

export function loadWorks(store = defaultStore()) {
  const list = readJSON(store, WORKS_KEY, []);
  if (!Array.isArray(list)) return [];
  return list.map(normalizeWork).filter(Boolean).sort((a, b) => b.updatedAt - a.updatedAt);
}

export function getWork(id, store = defaultStore()) {
  return loadWorks(store).find((w) => w.id === id) || null;
}

// 같은 id 가 있으면 고쳐 쓰고, 없으면 새로 추가합니다. 저장된 작품을 돌려줍니다.
export function saveWork(work, store = defaultStore()) {
  const now = Date.now();
  const clean = normalizeWork({ ...work, updatedAt: now, createdAt: work.createdAt || now });
  if (!clean) return null;
  const list = loadWorks(store).filter((w) => w.id !== clean.id);
  list.unshift(clean);
  return writeJSON(store, WORKS_KEY, list) ? clean : null;
}

export function deleteWork(id, store = defaultStore()) {
  const list = loadWorks(store).filter((w) => w.id !== id);
  writeJSON(store, WORKS_KEY, list);
}

export function loadDraft(store = defaultStore()) {
  const d = readJSON(store, DRAFT_KEY, null);
  if (!d) return null;
  const work = normalizeWork({ ...d, id: d.id || 'draft' });
  if (!work) return null;
  return { ...work, id: d.id || null, title: d.title || '' };
}

export function saveDraft(draft, store = defaultStore()) {
  writeJSON(store, DRAFT_KEY, draft);
}

export function clearDraft(store = defaultStore()) {
  try { store?.removeItem(DRAFT_KEY); } catch { /* 무시 */ }
}

export function loadMissionDone(store = defaultStore()) {
  const v = readJSON(store, MISSION_KEY, []);
  return new Set(Array.isArray(v) ? v : []);
}

// 노래 따라 만들기 성공 기록: "노래id:단계" 모음
const SONG_KEY = 'musicPlayFactory.songs.v1';

export function loadSongDone(store = defaultStore()) {
  const v = readJSON(store, SONG_KEY, []);
  return new Set(Array.isArray(v) ? v : []);
}

export function markSongDone(songId, level, store = defaultStore()) {
  const done = loadSongDone(store);
  done.add(`${songId}:${level}`);
  writeJSON(store, SONG_KEY, [...done]);
  return done;
}

export function markMissionDone(id, store = defaultStore()) {
  const done = loadMissionDone(store);
  done.add(id);
  writeJSON(store, MISSION_KEY, [...done]);
  return done;
}
