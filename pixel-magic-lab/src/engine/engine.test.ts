import { describe, it, expect } from 'vitest';
import { run, gridsEqual, countBlocks, diffCells, makeGrid, gridAtStep, MAX_REPEAT } from './engine';
import { B, moveBlock, nudgeBlock, insertBlock, removeBlock, gridToBlocks, findBlock, sanitizeBlocks } from './tree';
import { MISSIONS, missionTarget } from '../data/missions';
import { TEMPLATES } from '../data/templates';
import type { Block } from './types';

describe('실행 엔진: 기본 명령', () => {
  it('펜은 (0,0)에서 시작하고 자동으로 칠하지 않는다', () => {
    const r = run([B.right()], { width: 3, height: 3 });
    expect(r.error).toBeNull();
    expect(r.final.cells.every((c) => c === null)).toBe(true);
    expect(r.steps[0]).toMatchObject({ x: 1, y: 0 });
  });
  it('네 방향 이동과 칠하기', () => {
    const r = run([B.right(), B.down(), B.paint(), B.left(), B.paint(), B.up(), B.paint()], { width: 3, height: 3, startColor: 'red' });
    expect(r.error).toBeNull();
    expect(r.final.cells).toEqual(['red', null, null, 'red', 'red', null, null, null, null]);
    expect(r.steps).toHaveLength(7);
    expect(r.steps[2].change).toEqual({ x: 1, y: 1, from: null, to: 'red' });
  });
  it('색 고르기와 지우기', () => {
    const r = run([B.paint(), B.color('blue'), B.right(), B.paint(), B.left(), B.erase()], { width: 2, height: 1, startColor: 'red' });
    expect(r.final.cells).toEqual([null, 'blue']);
    expect(r.steps[1].color).toBe('blue');
  });
  it('좌표로 이동', () => {
    const r = run([B.goto(2, 1), B.paint()], { width: 3, height: 2, startColor: 'red' });
    expect(r.final.cells[1 * 3 + 2]).toBe('red');
  });
  it('밑그림(base) 위에서 실행하고 base 는 바꾸지 않는다', () => {
    const base = makeGrid(2, 1);
    base.cells[1] = 'green';
    const r = run([B.paint()], { base, startColor: 'red' });
    expect(r.final.cells).toEqual(['red', 'green']);
    expect(base.cells).toEqual([null, 'green']);
  });
});

describe('실행 엔진: 반복', () => {
  it('반복문은 내부 명령을 지정 횟수만큼 실행한다', () => {
    const r = run([B.repeat(3, [B.paint(), B.right()])], { width: 4, height: 1, startColor: 'red' });
    expect(r.final.cells).toEqual(['red', 'red', 'red', null]);
    expect(r.steps).toHaveLength(6);
    expect(r.steps[4].loops[0]).toMatchObject({ iter: 3, times: 3 });
  });
  it('중첩 반복', () => {
    const prog = [B.repeat(3, [B.repeat(4, [B.paint(), B.right()]), B.down(), B.repeat(4, [B.left()])])];
    const r = run(prog, { width: 5, height: 4, startColor: 'red' });
    expect(r.error).toBeNull();
    expect(r.final.cells.filter((c) => c === 'red')).toHaveLength(12);
    const inner = r.steps.find((s) => s.loops.length === 2)!;
    expect(inner.loops[0].times).toBe(3);
    expect(inner.loops[1].times).toBe(4);
  });
  it('반복 횟수가 너무 크면 실행 전에 알려준다', () => {
    const rep = B.repeat(MAX_REPEAT + 1, [B.paint()]);
    const r = run([rep], { width: 2, height: 2 });
    expect(r.error?.code).toBe('repeat-too-big');
    expect(r.error?.blockId).toBe(rep.id);
    expect(r.steps).toHaveLength(0);
  });
  it('너무 긴 실행은 안전하게 멈춘다', () => {
    const prog = [B.repeat(30, [B.repeat(30, [B.repeat(30, [B.paint()])])])];
    const r = run(prog, { width: 2, height: 2 });
    expect(r.error?.code).toBe('too-long');
    expect(r.steps.length).toBeLessThanOrEqual(4000);
  });
  it('빈 프로그램', () => {
    expect(run([], { width: 2, height: 2 }).error?.code).toBe('empty');
  });
});

describe('실행 엔진: 도화지 밖', () => {
  it('바깥 이동은 오류 블록과 목표 좌표를 알려준다', () => {
    const bad = B.left();
    const r = run([B.paint(), bad, B.paint()], { width: 2, height: 2, startColor: 'red' });
    expect(r.error?.code).toBe('out-of-bounds');
    expect(r.error?.blockId).toBe(bad.id);
    expect(r.error?.target).toEqual({ x: -1, y: 0 });
    expect(r.error?.message).toContain('도화지 밖');
    const last = r.steps[r.steps.length - 1];
    expect(last).toMatchObject({ x: 0, y: 0 });
    expect(r.final.cells[0]).toBe('red');
  });
  it('반복 안에서 바깥으로 나가도 멈춘다', () => {
    const r = run([B.repeat(5, [B.down()])], { width: 2, height: 3 });
    expect(r.error?.code).toBe('out-of-bounds');
    expect(r.steps[r.steps.length - 1].loops[0].iter).toBe(3);
  });
  it('잘못된 좌표', () => {
    expect(run([B.goto(5, 0)], { width: 2, height: 2 }).error?.code).toBe('bad-goto');
  });
});

describe('단계별 재생', () => {
  it('gridAtStep 은 중간 결과를 만든다', () => {
    const r = run([B.paint(), B.right(), B.paint()], { width: 2, height: 1, startColor: 'red' });
    const base = makeGrid(2, 1);
    expect(gridAtStep(base, r.steps, 0).cells).toEqual(['red', null]);
    expect(gridAtStep(base, r.steps, 2).cells).toEqual(['red', 'red']);
  });
});

describe('미션: 모든 정답 코드가 실제로 성공한다', () => {
  for (const m of MISSIONS) {
    it(`${m.num}. ${m.title}`, () => {
      const target = missionTarget(m);
      const prog = m.solution();
      const r = run(prog, { width: target.width, height: target.height, startColor: m.startColor });
      expect(r.error).toBeNull();
      expect(diffCells(r.final, target)).toEqual([]);
      expect(gridsEqual(r.final, target)).toBe(true);
      expect(countBlocks(prog)).toBeLessThanOrEqual(m.par);
      // 미션에 쓸 수 있는 색만 사용
      for (const c of target.cells) if (c) expect(m.colors).toContain(c);
    });
  }
  it('미션 번호와 id 가 고유하다', () => {
    expect(new Set(MISSIONS.map((m) => m.id)).size).toBe(MISSIONS.length);
    expect(MISSIONS.length).toBeGreaterThanOrEqual(10);
  });
  it('디버깅 미션의 시작 코드는 실제로 고장 나 있다', () => {
    const m = MISSIONS.find((x) => x.initialCode)!;
    const t = missionTarget(m);
    const r = run(m.initialCode!(), { width: t.width, height: t.height, startColor: m.startColor });
    expect(r.error?.code === 'out-of-bounds' || !gridsEqual(r.final, t)).toBe(true);
  });
  it('순서가 달라도 결과가 같으면 성공 (미션 1을 다른 순서로)', () => {
    const m = MISSIONS[0];
    const t = missionTarget(m);
    const r = run([B.down(), B.right(), B.paint()], { width: t.width, height: t.height, startColor: m.startColor });
    expect(gridsEqual(r.final, t)).toBe(true);
  });
});

describe('블록 트리 편집', () => {
  it('삽입, 이동, 삭제, 클릭 이동', () => {
    const a = B.paint(), b = B.right(), rep = B.repeat(2, []);
    let list: Block[] = [a, b, rep];
    list = moveBlock(list, a.id, rep.id, 0);
    expect(list.map((x) => x.id)).toEqual([b.id, rep.id]);
    expect((findBlock(list, rep.id) as any).body[0].id).toBe(a.id);
    list = nudgeBlock(list, a.id, -1); // 반복 밖으로 꺼냄
    expect(list.map((x) => x.id)).toEqual([b.id, a.id, rep.id]);
    list = nudgeBlock(list, a.id, -1);
    expect(list.map((x) => x.id)).toEqual([a.id, b.id, rep.id]);
    list = moveBlock(list, rep.id, rep.id, 0); // 자기 안으로는 불가
    expect(list).toHaveLength(3);
    list = insertBlock(list, rep.id, 0, B.down());
    list = removeBlock(list, b.id);
    expect(list).toHaveLength(2);
  });
  it('손그림 → 코드 변환 결과가 같은 그림을 그린다', () => {
    const g = makeGrid(6, 3);
    g.cells = ['red', 'red', 'red', 'blue', null, 'red', null, null, 'green', 'green', null, null, 'red', null, null, null, null, 'yellow'];
    const prog = gridToBlocks(g, 'purple');
    const r = run(prog, { width: 6, height: 3, startColor: 'purple' });
    expect(r.error).toBeNull();
    expect(diffCells(r.final, g)).toEqual([]);
  });
  it('저장 데이터 검사', () => {
    const raw = JSON.parse(JSON.stringify([B.repeat(2, [B.paint(), { type: 'evil' } as any]), 3, null, B.goto(1, 2)]));
    const s = sanitizeBlocks(raw);
    expect(s).toHaveLength(2);
    expect((s[0] as any).body).toHaveLength(1);
  });
});

describe('GIF 내보내기', () => {
  it('GIF89a 헤더, 반복 확장, 프레임 수', async () => {
    const { buildGif } = await import('../lib/exporters');
    const a = makeGrid(4, 4);
    const b = makeGrid(4, 4);
    b.cells[5] = 'red';
    const bytes = buildGif([a, b, a], 4, true, 64);
    expect(new TextDecoder().decode(bytes.slice(0, 6))).toBe('GIF89a');
    expect(new TextDecoder().decode(bytes)).toContain('NETSCAPE2.0');
    let frames = 0;
    for (let i = 0; i < bytes.length - 1; i++) if (bytes[i] === 0x21 && bytes[i + 1] === 0xf9) frames++;
    expect(frames).toBe(3);
    expect(bytes[bytes.length - 1]).toBe(0x3b);
  });
});

describe('겨울 예시 템플릿', () => {
  it('내리는 눈송이·손 흔드는 눈사람이 있고 모든 프레임이 10×10이에요', () => {
    for (const id of ['snow', 'snowman']) {
      const t = TEMPLATES.find((x) => x.id === id);
      expect(t, id).toBeTruthy();
      expect(t!.frames.length).toBeGreaterThanOrEqual(2);
      for (const f of t!.frames) {
        expect(f.width).toBe(10);
        expect(f.height).toBe(10);
        expect(f.cells.length).toBe(100);
      }
    }
  });
  it('눈송이는 프레임마다 아래로 한 칸씩 내려가요', () => {
    const t = TEMPLATES.find((x) => x.id === 'snow')!;
    const blueAt = (i: number) => t.frames[i].cells.map((c, k) => (c === 'blue' ? k : -1)).filter((k) => k >= 0);
    expect(blueAt(0).length).toBe(6);
    expect(blueAt(1).length).toBe(6);
    expect(blueAt(0)).not.toEqual(blueAt(1));
  });
});

describe('겨울 미션', () => {
  it('눈송이·눈사람 미션은 처음부터 열려 있고 정답이 par 이하예요', () => {
    for (const id of ['m13', 'm14']) {
      const m = MISSIONS.find((x) => x.id === id)!;
      expect(m.open).toBe(true);
      expect(countBlocks(m.solution())).toBeLessThanOrEqual(m.par);
    }
  });
});
