// 실행 엔진의 단계 기록을 받아 화면에 한 걸음씩 보여 주는 재생기
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Block, ColorKey, Grid, RunResult, Step } from '../engine/types';
import { cloneGrid, run } from '../engine/engine';
import { sfx } from './sound';

export type RunStatus = 'idle' | 'running' | 'paused' | 'done' | 'error';

export const SPEEDS = [
  { label: '느리게', ms: 650 },
  { label: '보통', ms: 330 },
  { label: '빠르게', ms: 140 },
  { label: '번개', ms: 40 },
];

export interface Runner {
  status: RunStatus;
  index: number;
  total: number;
  grid: Grid;
  step: Step | null;
  result: RunResult | null;
  pen: { x: number; y: number; color: ColorKey };
  speed: number;
  setSpeed: (s: number) => void;
  play: () => void;
  pause: () => void;
  stepOnce: () => void;
  restart: () => void;
  reset: () => void;
  lastChange: number | null;
}

interface Options {
  program: Block[];
  base: Grid;
  startColor: ColorKey;
  onFinish?: (r: RunResult, grid: Grid) => void;
}

export function useRunner({ program, base, startColor, onFinish }: Options): Runner {
  const [status, setStatus] = useState<RunStatus>('idle');
  const [index, setIndex] = useState(-1);
  const [grid, setGrid] = useState<Grid>(() => cloneGrid(base));
  const [speed, setSpeed] = useState(1);
  const [lastChange, setLastChange] = useState<number | null>(null);
  const resultRef = useRef<RunResult | null>(null);
  const [result, setResult] = useState<RunResult | null>(null);
  const gridRef = useRef<Grid>(grid);
  const indexRef = useRef(-1);
  const timer = useRef<number | null>(null);
  const finishRef = useRef(onFinish);
  finishRef.current = onFinish;

  const stopTimer = () => {
    if (timer.current != null) {
      window.clearTimeout(timer.current);
      timer.current = null;
    }
  };

  // 프로그램이나 밑그림이 바뀌면 처음 상태로
  const resetTo = useCallback((g: Grid) => {
    stopTimer();
    resultRef.current = null;
    setResult(null);
    indexRef.current = -1;
    setIndex(-1);
    gridRef.current = cloneGrid(g);
    setGrid(gridRef.current);
    setLastChange(null);
    setStatus('idle');
  }, []);

  useEffect(() => {
    resetTo(base);
  }, [program, base, startColor, resetTo]);

  useEffect(() => stopTimer, []);

  const compute = () => {
    const r = run(program, { base, startColor });
    resultRef.current = r;
    setResult(r);
    indexRef.current = -1;
    gridRef.current = cloneGrid(base);
    setGrid(gridRef.current);
    setIndex(-1);
    setLastChange(null);
    return r;
  };

  /** 한 걸음 진행. 끝났으면 false */
  const advance = (): boolean => {
    const r = resultRef.current;
    if (!r) return false;
    const next = indexRef.current + 1;
    if (next >= r.steps.length) {
      finish(r);
      return false;
    }
    const s = r.steps[next];
    indexRef.current = next;
    setIndex(next);
    if (s.change) {
      const g = cloneGrid(gridRef.current);
      g.cells[s.change.y * g.width + s.change.x] = s.change.to;
      gridRef.current = g;
      setGrid(g);
      setLastChange(s.change.y * g.width + s.change.x);
      sfx.paint();
    } else if (!s.error) {
      sfx.move();
    }
    if (s.error) {
      finish(r);
      return false;
    }
    if (next === r.steps.length - 1) {
      finish(r);
      return false;
    }
    return true;
  };

  const finish = (r: RunResult) => {
    stopTimer();
    setStatus(r.error ? 'error' : 'done');
    if (r.error) sfx.error();
    finishRef.current?.(r, gridRef.current);
  };

  const speedRef = useRef(speed);
  speedRef.current = speed;

  const loop = () => {
    stopTimer();
    timer.current = window.setTimeout(() => {
      if (advance()) loop();
    }, SPEEDS[speedRef.current].ms);
  };

  const play = () => {
    if (status === 'running') return;
    if (status === 'idle' || status === 'done' || status === 'error' || !resultRef.current) {
      const r = compute();
      if (r.error && r.steps.length === 0) {
        finish(r);
        return;
      }
    }
    setStatus('running');
    loop();
  };

  const pause = () => {
    if (status !== 'running') return;
    stopTimer();
    setStatus('paused');
  };

  const stepOnce = () => {
    stopTimer();
    if (status === 'idle' || status === 'done' || status === 'error' || !resultRef.current) {
      const r = compute();
      if (r.error && r.steps.length === 0) {
        finish(r);
        return;
      }
    }
    setStatus('paused');
    advance();
  };

  const restart = () => {
    const r = compute();
    if (r.error && r.steps.length === 0) {
      finish(r);
      return;
    }
    setStatus('running');
    loop();
  };

  const reset = () => resetTo(base);

  const step = result && index >= 0 ? result.steps[index] ?? null : null;
  const pen = useMemo(
    () => (step ? { x: step.x, y: step.y, color: step.color } : { x: 0, y: 0, color: startColor }),
    [step, startColor],
  );

  return {
    status,
    index,
    total: result?.steps.length ?? 0,
    grid,
    step,
    result,
    pen,
    speed,
    setSpeed,
    play,
    pause,
    stepOnce,
    restart,
    reset,
    lastChange,
  };
}
