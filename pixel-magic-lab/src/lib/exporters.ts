// PNG / GIF / 스프라이트 시트 내보내기 (모두 브라우저 안에서 처리)
import type { Grid } from '../engine/types';
import { PALETTE, PAPER, colorHex } from '../data/palette';
import { encodeGif } from './gif';

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

/** 파일 이름에 쓸 수 없는 글자 정리 */
export function safeFileName(name: string, fallback = '픽셀작품'): string {
  const n = name.trim().replace(/[\\/:*?"<>|]+/g, '').slice(0, 40);
  return n || fallback;
}

export function pixelScale(grid: Grid, target = 480): number {
  return Math.max(4, Math.floor(target / Math.max(grid.width, grid.height)));
}

/** 그리드 → 캔버스 그리기 */
export function drawGrid(ctx: CanvasRenderingContext2D, grid: Grid, ox: number, oy: number, scale: number, paper = true) {
  for (let y = 0; y < grid.height; y++) {
    for (let x = 0; x < grid.width; x++) {
      const c = grid.cells[y * grid.width + x];
      if (!c && !paper) continue;
      ctx.fillStyle = c ? colorHex(c) : PAPER;
      ctx.fillRect(ox + x * scale, oy + y * scale, scale, scale);
    }
  }
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

/** 버튼을 누른 바로 그 순간에 내려받도록 동기 방식으로 PNG 만들기 (파일 이름 유지) */
function canvasToBlob(canvas: HTMLCanvasElement): Blob {
  const url = canvas.toDataURL('image/png');
  const bin = atob(url.slice(url.indexOf(',') + 1));
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: 'image/png' });
}

export function exportPng(grid: Grid, name: string, transparent = false) {
  const scale = pixelScale(grid);
  const canvas = document.createElement('canvas');
  canvas.width = grid.width * scale;
  canvas.height = grid.height * scale;
  const ctx = canvas.getContext('2d')!;
  drawGrid(ctx, grid, 0, 0, scale, !transparent);
  downloadBlob(canvasToBlob(canvas), `${safeFileName(name)}.png`);
}

export function exportSpriteSheet(frames: Grid[], name: string) {
  const g = frames[0];
  const scale = pixelScale(g, 240);
  const gap = Math.max(2, Math.round(scale / 2));
  const canvas = document.createElement('canvas');
  canvas.width = frames.length * g.width * scale + (frames.length - 1) * gap;
  canvas.height = g.height * scale;
  const ctx = canvas.getContext('2d')!;
  frames.forEach((f, i) => drawGrid(ctx, f, i * (g.width * scale + gap), 0, scale, true));
  downloadBlob(canvasToBlob(canvas), `${safeFileName(name, '픽셀애니메이션')}_프레임${frames.length}장.png`);
}

/** GIF 바이트 만들기 (테스트 가능하도록 DOM 없이) */
export function buildGif(frames: Grid[], fps: number, loop: boolean, targetSize = 320): Uint8Array {
  const g = frames[0];
  const scale = pixelScale(g, targetSize);
  const W = g.width * scale;
  const H = g.height * scale;
  const palette: [number, number, number][] = [hexToRgb(PAPER), ...PALETTE.map((c) => hexToRgb(c.hex))];
  const indexOf: Record<string, number> = {};
  PALETTE.forEach((c, i) => (indexOf[c.key] = i + 1));
  const delay = Math.round(100 / Math.max(1, fps));
  const gifFrames = frames.map((f) => {
    const idx = new Uint8Array(W * H);
    for (let py = 0; py < H; py++) {
      const y = Math.floor(py / scale);
      for (let px = 0; px < W; px++) {
        const c = f.cells[y * f.width + Math.floor(px / scale)];
        idx[py * W + px] = c ? indexOf[c] ?? 0 : 0;
      }
    }
    return { indices: idx, delay };
  });
  return encodeGif(W, H, palette, gifFrames, loop);
}

export function exportGif(frames: Grid[], fps: number, loop: boolean, name: string) {
  const bytes = buildGif(frames, fps, loop);
  downloadBlob(new Blob([bytes], { type: 'image/gif' }), `${safeFileName(name, '픽셀애니메이션')}.gif`);
}

/** 작은 썸네일 data URL (갤러리용) */
export function thumbnailDataUrl(grid: Grid, size = 96): string {
  try {
    const scale = Math.max(1, Math.floor(size / Math.max(grid.width, grid.height)));
    const canvas = document.createElement('canvas');
    canvas.width = grid.width * scale;
    canvas.height = grid.height * scale;
    const ctx = canvas.getContext('2d')!;
    drawGrid(ctx, grid, 0, 0, scale, true);
    return canvas.toDataURL('image/png');
  } catch {
    return '';
  }
}
