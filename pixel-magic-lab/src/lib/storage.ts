// 브라우저 로컬 저장소(localStorage) 도우미. 서버 없이 작품과 진행 상황을 보관합니다.
// 저장 칸은 지금 하는 친구 것 (이름·별명으로 하면 그 이름 칸, 처음부터 하기면 이번 창에만) — lib/profile.ts
import type { Block, Cell, ColorKey, Grid } from '../engine/types';
import { sanitizeBlocks } from '../engine/tree';
import { COLOR_MAP } from '../data/palette';
import { playerStore } from './profile';

export function load<T>(key: string, fallback: T): T {
  try {
    const raw = playerStore()?.getItem(key);
    if (raw == null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

/** 저장 성공 여부를 돌려줍니다 (저장 공간이 꽉 찬 경우 false) */
export function save(key: string, value: unknown): boolean {
  try {
    const st = playerStore();
    if (!st) return false;
    st.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function remove(key: string) {
  try {
    playerStore()?.removeItem(key);
  } catch {
    /* 무시 */
  }
}

// ── 미션 진행 ──
export interface MissionRecord {
  stars: number; // 1~3
  blocks: number;
  bonus: boolean;
  doneAt: number;
}
export type Progress = Record<string, MissionRecord>;

export const loadProgress = () => load<Progress>('progress', {});
export const saveProgress = (p: Progress) => save('progress', p);

export function loadMissionCode(id: string): Block[] | null {
  const all = load<Record<string, unknown>>('missionCode', {});
  return all[id] ? sanitizeBlocks(all[id]) : null;
}
export function saveMissionCode(id: string, blocks: Block[]) {
  const all = load<Record<string, unknown>>('missionCode', {});
  all[id] = blocks;
  save('missionCode', all);
}
export function clearMissionData() {
  remove('progress');
  remove('missionCode');
}

// ── 설정 ──
export interface Settings {
  muted: boolean;
  unlockAll: boolean;
  seenGuide: boolean;
  lastMission: string;
}
export const loadSettings = (): Settings => ({ muted: false, unlockAll: false, seenGuide: false, lastMission: 'm1', ...load<Partial<Settings>>('settings', {}) });
export const saveSettings = (s: Settings) => save('settings', s);

// ── 그리드 직렬화 ──
export interface StoredGrid {
  width: number;
  height: number;
  cells: Cell[];
}
export function sanitizeGrid(raw: unknown, fallbackSize = 10): Grid {
  const o = (raw ?? {}) as Partial<StoredGrid>;
  const width = clampSize(o.width, fallbackSize);
  const height = clampSize(o.height, fallbackSize);
  const cells: Cell[] = [];
  for (let i = 0; i < width * height; i++) {
    const c = Array.isArray(o.cells) ? o.cells[i] : null;
    cells.push(typeof c === 'string' && COLOR_MAP[c] ? c : null);
  }
  return { width, height, cells };
}
function clampSize(v: unknown, fb: number) {
  const n = Number(v);
  return Number.isFinite(n) && n >= 2 && n <= 32 ? Math.floor(n) : fb;
}

// ── 자유 공방 작품 ──
export interface Artwork {
  id: string;
  name: string;
  size: number;
  base: Grid; // 손그림 밑바탕
  blocks: Block[];
  pixels: Grid; // 완성 그림 (밑바탕 + 코드 실행 결과)
  penColor: ColorKey;
  updatedAt: number;
}

export function loadArtworks(): Artwork[] {
  const raw = load<unknown[]>('artworks', []);
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((r) => r && typeof r === 'object')
    .map((r) => {
      const o = r as Record<string, unknown>;
      const base = sanitizeGrid(o.base, Number(o.size) || 10);
      return {
        id: String(o.id ?? Math.random()),
        name: String(o.name ?? '이름 없는 작품'),
        size: base.width,
        base,
        blocks: sanitizeBlocks(o.blocks),
        pixels: sanitizeGrid(o.pixels, base.width),
        penColor: typeof o.penColor === 'string' ? o.penColor : 'purple',
        updatedAt: Number(o.updatedAt) || 0,
      };
    })
    .sort((a, b) => b.updatedAt - a.updatedAt);
}
export const saveArtworks = (list: Artwork[]) => save('artworks', list);

// ── 애니메이션 ──
export interface Frame {
  id: string;
  base: Grid;
  blocks: Block[];
}
export interface Animation {
  id: string;
  name: string;
  size: number;
  fps: number;
  loop: boolean;
  penColor: ColorKey;
  frames: Frame[];
  updatedAt: number;
}

export function loadAnimations(): Animation[] {
  const raw = load<unknown[]>('animations', []);
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((r) => r && typeof r === 'object')
    .map((r) => {
      const o = r as Record<string, unknown>;
      const size = Number(o.size) || 10;
      const framesRaw = Array.isArray(o.frames) ? o.frames : [];
      const frames: Frame[] = framesRaw.map((f, i) => {
        const fo = (f ?? {}) as Record<string, unknown>;
        return { id: String(fo.id ?? `f${i}${Math.random()}`), base: sanitizeGrid(fo.base, size), blocks: sanitizeBlocks(fo.blocks) };
      });
      return {
        id: String(o.id ?? Math.random()),
        name: String(o.name ?? '이름 없는 애니메이션'),
        size,
        fps: Number(o.fps) || 4,
        loop: o.loop !== false,
        penColor: typeof o.penColor === 'string' ? o.penColor : 'purple',
        frames,
        updatedAt: Number(o.updatedAt) || 0,
      };
    })
    .filter((a) => a.frames.length > 0)
    .sort((a, b) => b.updatedAt - a.updatedAt);
}
export const saveAnimations = (list: Animation[]) => save('animations', list);

export function formatDate(t: number): string {
  if (!t) return '';
  const d = new Date(t);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}.${p(d.getMonth() + 1)}.${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}
