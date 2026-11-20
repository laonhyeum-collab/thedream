// 작품 저장 (브라우저 로컬 저장소). 나중에 계정 저장으로 바꿀 때 이 파일만 고치면 됩니다.
import { clampBpm, clampLevel } from './engine.js';
import { getTheme, normalizeVoices } from './themes.js';
import { normalizeCleared } from './levels.js';
import { safeLyrics } from './lyrics.js';
import './combos.js'; // 랜덤 조합 무대도 저장·복원할 수 있게 등록

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
    lyrics: safeLyrics(raw.lyrics), // 교육용 체크를 통과한 가사만 (이 기기 안에만 저장)
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

// 만들던 작품은 테마마다 따로 기억해요 (피자를 만들어도 빙수가 지워지지 않게)
const draftKey = (themeId) => `${DRAFT_KEY}.${themeId}`;

export function loadDraft(themeId = 'bingsu', store = defaultStore()) {
  let d = readJSON(store, draftKey(themeId), null);
  if (!d && themeId === 'bingsu') d = readJSON(store, DRAFT_KEY, null); // 예전 저장 방식
  if (!d || d.theme !== themeId) return null;
  const work = normalizeWork({ ...d, id: d.id || 'draft' });
  if (!work) return null;
  return { ...work, id: d.id || null, title: d.title || '' };
}

export function saveDraft(draft, store = defaultStore()) {
  writeJSON(store, draftKey(draft.theme), draft);
}

export function clearDraft(themeId = 'bingsu', store = defaultStore()) {
  try { store?.removeItem(draftKey(themeId)); } catch { /* 무시 */ }
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

// 단계별 도전 기록: 통과한 단계 번호 [1, 2, …]
const LEVEL_KEY = 'musicPlayFactory.levels.v1';

export function loadLevelCleared(store = defaultStore()) {
  return normalizeCleared(readJSON(store, LEVEL_KEY, []));
}

export function markLevelCleared(level, store = defaultStore()) {
  const raw = readJSON(store, LEVEL_KEY, []);
  const next = normalizeCleared([...(Array.isArray(raw) ? raw : []), Number(level)]);
  writeJSON(store, LEVEL_KEY, [...next]);
  return next;
}

// 랜덤 조합 도전 성공 기록: 조합 id 모음
const COMBO_KEY = 'musicPlayFactory.combos.v1';

export function loadComboDone(store = defaultStore()) {
  const v = readJSON(store, COMBO_KEY, []);
  return new Set(Array.isArray(v) ? v.filter((x) => typeof x === 'string') : []);
}

export function markComboDone(id, store = defaultStore()) {
  const done = loadComboDone(store);
  done.add(String(id));
  writeJSON(store, COMBO_KEY, [...done]);
  return done;
}
