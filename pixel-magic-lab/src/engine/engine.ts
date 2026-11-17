// ─────────────────────────────────────────────
//  실행 엔진: 블록 프로그램 → 단계별 실행 기록(Step[])
//  화면(UI)은 이 기록을 받아 한 걸음씩 보여 주기만 합니다.
// ─────────────────────────────────────────────
import type { Block, Cell, ColorKey, Grid, RunError, RunResult, Step, LoopFrame } from './types';

export const MAX_REPEAT = 30;
export const MAX_STEPS = 4000;
export const DEFAULT_COLOR: ColorKey = 'purple';

export function makeGrid(width: number, height: number, fill: Cell = null): Grid {
  return { width, height, cells: new Array(width * height).fill(fill) };
}

export function cloneGrid(g: Grid): Grid {
  return { width: g.width, height: g.height, cells: g.cells.slice() };
}

export function getCell(g: Grid, x: number, y: number): Cell {
  return g.cells[y * g.width + x] ?? null;
}

export function inBounds(g: { width: number; height: number }, x: number, y: number): boolean {
  return x >= 0 && y >= 0 && x < g.width && y < g.height;
}

const DIR_DELTA = {
  up: [0, -1],
  down: [0, 1],
  left: [-1, 0],
  right: [1, 0],
} as const;

export const MESSAGES = {
  outOfBounds: '앗! 마법 펜이 도화지 밖으로 나가려고 해요!',
  repeatTooBig: `반복 횟수가 너무 커요. ${MAX_REPEAT}번 이하로 줄여볼까요?`,
  repeatTooSmall: '반복 횟수는 1번 이상이어야 해요.',
  tooLong: '마법이 너무 오래 걸려요! 반복 횟수나 블록 수를 줄여볼까요?',
  empty: '명령 블록이 하나도 없어요. 왼쪽에서 블록을 골라 넣어 볼까요?',
  badGoto: '그 좌표는 도화지 밖이에요. 숫자를 확인해 볼까요?',
};

/** 실행 전에 프로그램을 살펴서 고칠 점을 찾습니다. */
export function validate(program: Block[]): RunError | null {
  if (program.length === 0) return { code: 'empty', blockId: null, message: MESSAGES.empty };
  let found: RunError | null = null;
  const walk = (list: Block[]) => {
    for (const b of list) {
      if (found) return;
      if (b.type === 'repeat') {
        if (!Number.isFinite(b.times) || b.times > MAX_REPEAT) {
          found = { code: 'repeat-too-big', blockId: b.id, message: MESSAGES.repeatTooBig };
          return;
        }
        if (b.times < 1) {
          found = { code: 'repeat-too-small', blockId: b.id, message: MESSAGES.repeatTooSmall };
          return;
        }
        walk(b.body);
      }
    }
  };
  walk(program);
  return found;
}

export interface RunOptions {
  /** 시작 그림(손그림 밑바탕 등). 없으면 빈 도화지 */
  base?: Grid;
  width?: number;
  height?: number;
  startColor?: ColorKey;
  maxSteps?: number;
}

class StopRun extends Error {}

/** 프로그램 전체를 실행하여 모든 걸음을 기록합니다. 절대 예외를 밖으로 던지지 않습니다. */
export function run(program: Block[], opts: RunOptions = {}): RunResult {
  const base = opts.base ?? makeGrid(opts.width ?? 8, opts.height ?? 8);
  const grid = cloneGrid(base);
  const startColor = opts.startColor ?? DEFAULT_COLOR;
  const maxSteps = opts.maxSteps ?? MAX_STEPS;
  const steps: Step[] = [];
  let x = 0;
  let y = 0;
  let color = startColor;
  let error: RunError | null = validate(program);
  if (error) return { steps, final: grid, error, startColor };

  const loops: LoopFrame[] = [];

  const push = (b: Block, extra: Partial<Step> = {}) => {
    const step: Step = {
      index: steps.length,
      blockId: b.id,
      blockType: b.type,
      x,
      y,
      color,
      loops: loops.map((l) => ({ ...l })),
      ...extra,
    };
    steps.push(step);
    if (step.error) {
      error = step.error;
      throw new StopRun();
    }
    if (steps.length >= maxSteps) {
      error = { code: 'too-long', blockId: b.id, message: MESSAGES.tooLong };
      step.error = error;
      throw new StopRun();
    }
  };

  const setCell = (b: Block, value: Cell) => {
    const i = y * grid.width + x;
    const from = grid.cells[i];
    grid.cells[i] = value;
    push(b, { change: { x, y, from, to: value } });
  };

  const exec = (list: Block[]) => {
    for (const b of list) {
      switch (b.type) {
        case 'move': {
          const [dx, dy] = DIR_DELTA[b.dir];
          const nx = x + dx;
          const ny = y + dy;
          if (!inBounds(grid, nx, ny)) {
            push(b, {
              error: { code: 'out-of-bounds', blockId: b.id, message: MESSAGES.outOfBounds, target: { x: nx, y: ny } },
            });
          }
          x = nx;
          y = ny;
          push(b);
          break;
        }
        case 'goto': {
          if (!inBounds(grid, b.x, b.y)) {
            push(b, {
              error: { code: 'bad-goto', blockId: b.id, message: MESSAGES.badGoto, target: { x: b.x, y: b.y } },
            });
          }
          x = b.x;
          y = b.y;
          push(b);
          break;
        }
        case 'paint':
          setCell(b, color);
          break;
        case 'erase':
          setCell(b, null);
          break;
        case 'color':
          color = b.color;
          push(b);
          break;
        case 'repeat': {
          const frame: LoopFrame = { blockId: b.id, iter: 0, times: b.times };
          loops.push(frame);
          for (let i = 1; i <= b.times; i++) {
            frame.iter = i;
            exec(b.body);
          }
          loops.pop();
          break;
        }
      }
    }
  };

  try {
    exec(program);
  } catch (e) {
    if (!(e instanceof StopRun)) {
      error = { code: 'too-long', blockId: null, message: MESSAGES.tooLong };
    }
  }
  return { steps, final: grid, error, startColor };
}

/** 단계 기록을 index 번째(포함)까지 적용한 그림 */
export function gridAtStep(base: Grid, steps: Step[], upto: number): Grid {
  const g = cloneGrid(base);
  for (let i = 0; i <= upto && i < steps.length; i++) {
    const c = steps[i].change;
    if (c) g.cells[c.y * g.width + c.x] = c.to;
  }
  return g;
}

/** 두 그림이 다른 칸 목록 */
export function diffCells(a: Grid, b: Grid): number[] {
  const out: number[] = [];
  const n = Math.max(a.cells.length, b.cells.length);
  for (let i = 0; i < n; i++) if ((a.cells[i] ?? null) !== (b.cells[i] ?? null)) out.push(i);
  return out;
}

export function gridsEqual(a: Grid, b: Grid): boolean {
  return a.width === b.width && a.height === b.height && diffCells(a, b).length === 0;
}

/** 반복 블록까지 모두 합친 블록 개수 */
export function countBlocks(program: Block[]): number {
  let n = 0;
  for (const b of program) {
    n += 1;
    if (b.type === 'repeat') n += countBlocks(b.body);
  }
  return n;
}

/** 손그림 위에 프로그램을 한 번에 실행한 결과 (썸네일, 저장용) */
export function renderProgram(program: Block[], base: Grid, startColor?: ColorKey): Grid {
  if (program.length === 0) return cloneGrid(base);
  return run(program, { base, startColor }).final;
}
