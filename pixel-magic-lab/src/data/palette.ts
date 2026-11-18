import type { ColorKey } from '../engine/types';

export interface PaletteColor {
  key: ColorKey;
  name: string;
  hex: string;
  /** 아스키 그림 문자 */
  char: string;
}

export const PALETTE: PaletteColor[] = [
  { key: 'red', name: '빨강', hex: '#EE6F72', char: 'R' },
  { key: 'orange', name: '주황', hex: '#F4A261', char: 'O' },
  { key: 'yellow', name: '노랑', hex: '#F6D25E', char: 'Y' },
  { key: 'green', name: '초록', hex: '#7DC383', char: 'G' },
  { key: 'mint', name: '민트', hex: '#86D9C6', char: 'M' },
  { key: 'sky', name: '하늘', hex: '#86C5EE', char: 'S' },
  { key: 'blue', name: '파랑', hex: '#6B8CDB', char: 'B' },
  { key: 'purple', name: '보라', hex: '#A88BE0', char: 'P' },
  { key: 'pink', name: '분홍', hex: '#F4A3C4', char: 'K' },
  { key: 'brown', name: '갈색', hex: '#A8735A', char: 'N' },
  { key: 'cream', name: '크림', hex: '#F7E2B5', char: 'C' },
  { key: 'white', name: '하양', hex: '#FFFFFF', char: 'W' },
  { key: 'gray', name: '회색', hex: '#B9B0AA', char: 'A' },
  { key: 'black', name: '먹색', hex: '#4B3A35', char: 'D' },
];

export const COLOR_MAP: Record<string, PaletteColor> = Object.fromEntries(PALETTE.map((c) => [c.key, c]));
const CHAR_MAP: Record<string, ColorKey> = Object.fromEntries(PALETTE.map((c) => [c.char, c.key]));

export function colorHex(key: ColorKey | null | undefined): string {
  if (!key) return 'transparent';
  return COLOR_MAP[key]?.hex ?? '#cccccc';
}

export function colorName(key: ColorKey | null | undefined): string {
  if (!key) return '빈 칸';
  return COLOR_MAP[key]?.name ?? key;
}

/** 아스키 그림 → 셀 배열 ('.' = 빈 칸) */
export function parseArt(rows: string[]): { width: number; height: number; cells: (ColorKey | null)[] } {
  const height = rows.length;
  const width = Math.max(...rows.map((r) => r.length));
  const cells: (ColorKey | null)[] = [];
  for (const r of rows) {
    for (let x = 0; x < width; x++) {
      const ch = r[x] ?? '.';
      cells.push(ch === '.' || ch === ' ' ? null : CHAR_MAP[ch] ?? null);
    }
  }
  return { width, height, cells };
}

/** 빈 칸 배경색 (내보내기용) */
export const PAPER = '#FFFDF7';
