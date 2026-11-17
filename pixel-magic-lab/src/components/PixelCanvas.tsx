// 픽셀 도화지 (SVG). 마법 펜 위치, 틀린 칸, 어니언 스킨, 좌표 눈금을 함께 그립니다.
import { memo, useRef } from 'react';
import type { ColorKey, Grid } from '../engine/types';
import { colorHex, colorName } from '../data/palette';

export interface PenView {
  x: number;
  y: number;
  color: ColorKey;
}

interface Props {
  grid: Grid;
  pen?: PenView | null;
  diff?: number[];
  onion?: Grid | null;
  ghost?: Grid | null;
  showCoords?: boolean;
  /** 도화지 밖으로 나가려던 좌표 */
  errorTarget?: { x: number; y: number } | null;
  lastChange?: number | null;
  onPaintCell?: (x: number, y: number, first: boolean) => void;
  label?: string;
  className?: string;
}

function PixelCanvasInner({ grid, pen, diff, onion, ghost, showCoords, errorTarget, lastChange, onPaintCell, label, className }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const drawing = useRef(false);
  const lastCell = useRef(-1);
  const { width: W, height: H } = grid;
  const m = showCoords ? 0.9 : 0.12;
  const vb = `${-m} ${-m} ${W + m + 0.12} ${H + m + 0.12}`;

  const cellAt = (e: React.PointerEvent) => {
    const svg = svgRef.current;
    if (!svg) return null;
    const ctm = svg.getScreenCTM();
    if (!ctm) return null;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const p = pt.matrixTransform(ctm.inverse());
    const x = Math.floor(p.x);
    const y = Math.floor(p.y);
    if (x < 0 || y < 0 || x >= W || y >= H) return null;
    return { x, y };
  };

  const onDown = (e: React.PointerEvent) => {
    if (!onPaintCell) return;
    const c = cellAt(e);
    if (!c) return;
    e.preventDefault();
    drawing.current = true;
    lastCell.current = c.y * W + c.x;
    (e.target as Element).setPointerCapture?.(e.pointerId);
    onPaintCell(c.x, c.y, true);
  };
  const onMove = (e: React.PointerEvent) => {
    if (!drawing.current || !onPaintCell) return;
    const c = cellAt(e);
    if (!c) return;
    const i = c.y * W + c.x;
    if (i === lastCell.current) return;
    lastCell.current = i;
    onPaintCell(c.x, c.y, false);
  };
  const onUp = () => {
    drawing.current = false;
    lastCell.current = -1;
  };

  const cells = [];
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const c = grid.cells[y * W + x];
      cells.push(
        <rect
          key={`c${x}-${y}`}
          x={x}
          y={y}
          width={1.01}
          height={1.01}
          fill={c ? colorHex(c) : (x + y) % 2 ? 'var(--paper-b)' : 'var(--paper-a)'}
        />,
      );
    }
  }

  const ghostCells = [];
  for (const [src, cls] of [
    [onion, 'onion'],
    [ghost, 'ghost'],
  ] as const) {
    if (!src) continue;
    for (let i = 0; i < src.cells.length; i++) {
      const c = src.cells[i];
      if (!c) continue;
      const x = i % src.width;
      const y = Math.floor(i / src.width);
      if (x >= W || y >= H) continue;
      ghostCells.push(<rect key={`${cls}${i}`} className={cls} x={x + 0.08} y={y + 0.08} width={0.84} height={0.84} rx={0.12} fill={colorHex(c)} />);
    }
  }

  const lines = [];
  for (let x = 1; x < W; x++) lines.push(<line key={`vx${x}`} x1={x} y1={0} x2={x} y2={H} />);
  for (let y = 1; y < H; y++) lines.push(<line key={`hy${y}`} x1={0} y1={y} x2={W} y2={y} />);

  const coords = [];
  if (showCoords) {
    for (let x = 0; x < W; x++)
      coords.push(
        <text key={`tx${x}`} x={x + 0.5} y={-0.3} fontSize={0.36} textAnchor="middle" className="coord">
          {x}
        </text>,
      );
    for (let y = 0; y < H; y++)
      coords.push(
        <text key={`ty${y}`} x={-0.42} y={y + 0.66} fontSize={0.36} textAnchor="middle" className="coord">
          {y}
        </text>,
      );
  }

  const diffMarks = (diff ?? []).map((i) => {
    const x = i % W;
    const y = Math.floor(i / W);
    return (
      <g key={`d${i}`} className="diff-mark">
        <rect x={x + 0.1} y={y + 0.1} width={0.8} height={0.8} rx={0.1} />
        <path d={`M${x + 0.28} ${y + 0.28}L${x + 0.72} ${y + 0.72}M${x + 0.72} ${y + 0.28}L${x + 0.28} ${y + 0.72}`} />
      </g>
    );
  });

  let sparkle = null;
  if (lastChange != null && lastChange >= 0) {
    const x = lastChange % W;
    const y = Math.floor(lastChange / W);
    sparkle = (
      <g key={`sp${lastChange}-${grid.cells[lastChange]}`} className="paint-pop" style={{ transformOrigin: `${x + 0.5}px ${y + 0.5}px` }}>
        <path d={`M${x + 0.5} ${y - 0.15}l.12.53.53.12-.53.12-.12.53-.12-.53-.53-.12.53-.12z`} />
      </g>
    );
  }

  let penEl = null;
  if (pen && pen.x >= 0 && pen.y >= 0 && pen.x < W && pen.y < H) {
    const { x, y } = pen;
    let arrow = null;
    if (errorTarget) {
      const dx = Math.sign(errorTarget.x - x);
      const dy = Math.sign(errorTarget.y - y);
      const cx = x + 0.5;
      const cy = y + 0.5;
      arrow = (
        <g className="err-arrow">
          <path d={`M${cx} ${cy}L${cx + dx * 0.95} ${cy + dy * 0.95}`} />
          <circle cx={cx + dx * 0.95} cy={cy + dy * 0.95} r={0.26} />
          <text x={cx + dx * 0.95} y={cy + dy * 0.95 + 0.12} fontSize={0.36} textAnchor="middle">
            !
          </text>
        </g>
      );
    }
    penEl = (
      <g className="pen" style={{ transform: `translate(${x}px, ${y}px)` }}>
        <rect className="pen-ring-outer" x={0.04} y={0.04} width={0.92} height={0.92} rx={0.16} />
        <rect className="pen-ring-inner" x={0.13} y={0.13} width={0.74} height={0.74} rx={0.1} />
        <g transform="translate(0.78 0.2)">
          <circle r={0.24} fill={colorHex(pen.color)} className="pen-badge" />
          <path className="pen-star" d="M0 -.13l.04.09.09.04-.09.04-.04.09-.04-.09-.09-.04.09-.04z" />
        </g>
        {arrow && <g style={{ transform: `translate(${-x}px, ${-y}px)` }}>{arrow}</g>}
      </g>
    );
  }

  const aria = label ?? `${W}×${H} 픽셀 도화지${pen ? `, 마법 펜 위치 (${pen.x}, ${pen.y}), ${colorName(pen.color)}` : ''}`;

  return (
    <svg
      ref={svgRef}
      className={`pixel-canvas ${onPaintCell ? 'paintable' : ''} ${className ?? ''}`}
      viewBox={vb}
      style={{ aspectRatio: `${W + m + 0.12} / ${H + m + 0.12}`, ['--ar' as string]: (W + m + 0.12) / (H + m + 0.12) }}
      shapeRendering="geometricPrecision"
      role="img"
      aria-label={aria}
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
      onPointerLeave={onUp}
    >
      <g shapeRendering="crispEdges">{cells}</g>
      {ghostCells}
      <g className="grid-lines">{lines}</g>
      <rect className="canvas-edge" x={0} y={0} width={W} height={H} />
      {coords}
      {diffMarks}
      {sparkle}
      {penEl}
    </svg>
  );
}

export const PixelCanvas = memo(PixelCanvasInner);

/** 작은 미리보기 (썸네일, 목표 그림) */
export const MiniGrid = memo(function MiniGrid({ grid, className, title }: { grid: Grid; className?: string; title?: string }) {
  const rects = [];
  for (let i = 0; i < grid.cells.length; i++) {
    const c = grid.cells[i];
    const x = i % grid.width;
    const y = Math.floor(i / grid.width);
    rects.push(<rect key={i} x={x} y={y} width={1.02} height={1.02} fill={c ? colorHex(c) : (x + y) % 2 ? 'var(--paper-b)' : 'var(--paper-a)'} />);
  }
  return (
    <svg className={`mini-grid ${className ?? ''}`} viewBox={`0 0 ${grid.width} ${grid.height}`} shapeRendering="crispEdges" role="img" aria-label={title ?? '픽셀 그림'}>
      {rects}
    </svg>
  );
});
