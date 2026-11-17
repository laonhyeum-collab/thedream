// 움직이는 픽셀 극장 예시 템플릿 (10×10)
import type { Grid } from '../engine/types';
import { parseArt } from './palette';

export interface AnimTemplate {
  id: string;
  name: string;
  desc: string;
  fps: number;
  frames: Grid[];
}

const SIZE = 10;
const blank = (): string[] => Array.from({ length: SIZE }, () => '.'.repeat(SIZE));

/** 작은 스프라이트를 (ox, oy) 위치에 찍기 */
function stamp(rows: string[], sprite: string[], ox: number, oy: number): string[] {
  const out = rows.map((r) => r.split(''));
  sprite.forEach((line, y) => {
    for (let x = 0; x < line.length; x++) {
      const ch = line[x];
      const ty = oy + y;
      const tx = ox + x;
      if (ch !== '.' && ty >= 0 && ty < SIZE && tx >= 0 && tx < SIZE) out[ty][tx] = ch;
    }
  });
  return out.map((r) => r.join(''));
}

const g = (rows: string[]): Grid => parseArt(rows);

// 1. 눈 깜빡이는 고양이
const catOpen = [
  '.O......O.',
  '.OO....OO.',
  '.OOOOOOOO.',
  'OOOOOOOOOO',
  'OODOOOODOO',
  'OODOOOODOO',
  'OOOOKKOOOO',
  'OKOODDOOKO',
  '.OOOOOOOO.',
  '..OOOOOO..',
];
const catHalf = catOpen.slice();
catHalf[4] = 'OOOOOOOOOO';
const catClosed = catHalf.slice();
catClosed[5] = 'ODDOOOODDO';

// 2. 통통 뛰는 토끼
const bunny = ['.AA.AA.', '.AK.KA.', '.AA.AA.', 'AAAAAAA', 'ADAAADA', 'AAAKAAA', '.AAAAA.'];
const ground = (rows: string[]) => stamp(rows, ['GGGGGGGGGG'], 0, 9);
const bunnyAt = (oy: number) => g(stamp(ground(blank()), bunny, 1, oy));

// 3. 반짝이는 별
function star(r: number, diag: number, core: string): Grid {
  let rows = blank();
  const c = 4;
  const pts: [number, number, string][] = [[c, c, core]];
  for (let i = 1; i <= r; i++) pts.push([c + i, c, 'Y'], [c - i, c, 'Y'], [c, c + i, 'Y'], [c, c - i, 'Y']);
  for (let i = 1; i <= diag; i++) pts.push([c + i, c + i, 'Y'], [c - i, c - i, 'Y'], [c + i, c - i, 'Y'], [c - i, c + i, 'Y']);
  rows = rows.map((row, y) => row.split('').map((ch, x) => pts.find((p) => p[0] === x && p[1] === y)?.[2] ?? ch).join(''));
  return g(rows);
}

// 4. 피어나는 꽃
const soil = 'NNNNNNNNNN';
const flowerFrames = [
  ['..........', '..........', '..........', '..........', '..........', '..........', '..........', '....G.....', '....G.....', soil],
  ['..........', '..........', '..........', '..........', '....G.....', '....G.....', '...GG.....', '....GG....', '....G.....', soil],
  ['..........', '..........', '....K.....', '...KKK....', '....G.....', '....G.....', '...GG.....', '....GG....', '....G.....', soil],
  ['....K.....', '...KKK....', '..KKYKK...', '...KKK....', '....K.....', '....G.....', '...GG.....', '....GG....', '....G.....', soil],
];

// 5. 걷는 공룡
const dinoTop = [
  '.....GGGG.',
  '.....GDGGG',
  '.....GGGGG',
  '.....GGG..',
  'G...GGGGGG',
  'GG.GGGGG..',
  '.GGGGGGG..',
  '..GGGGG...',
];
const dinoA = [...dinoTop, '..G...G...', '..GG..GG..'];
const dinoB = [...dinoTop, '...G.G....', '...GG.GG..'];

export const TEMPLATES: AnimTemplate[] = [
  { id: 'cat', name: '눈 깜빡이는 고양이', desc: '눈을 떴다 감았다', fps: 4, frames: [g(catOpen), g(catOpen), g(catHalf), g(catClosed), g(catHalf)] },
  { id: 'bunny', name: '통통 뛰는 토끼', desc: '위아래로 깡총', fps: 6, frames: [bunnyAt(2), bunnyAt(1), bunnyAt(0), bunnyAt(1)] },
  { id: 'star', name: '반짝이는 별', desc: '커졌다 작아졌다', fps: 5, frames: [star(1, 0, 'Y'), star(2, 1, 'W'), star(4, 2, 'W'), star(2, 1, 'W')] },
  { id: 'flower', name: '피어나는 꽃', desc: '새싹에서 꽃까지', fps: 2, frames: flowerFrames.map(g) },
  { id: 'dino', name: '걷는 공룡', desc: '뚜벅뚜벅 발걸음', fps: 4, frames: [g(dinoA), g(dinoB)] },
];
