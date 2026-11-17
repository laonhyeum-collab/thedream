// 블록 트리 편집 도우미 (모두 불변 방식: 새 배열을 돌려줍니다)
import type { Block, BlockType, ColorKey, Dir, Grid } from './types';

let counter = 0;
export function newId(): string {
  counter += 1;
  return `b${Date.now().toString(36)}${counter.toString(36)}${Math.floor(Math.random() * 1296).toString(36)}`;
}

/** 짧게 블록을 만드는 함수들 (미션 정답·템플릿에서도 사용) */
export const B = {
  up: (): Block => ({ id: newId(), type: 'move', dir: 'up' }),
  down: (): Block => ({ id: newId(), type: 'move', dir: 'down' }),
  left: (): Block => ({ id: newId(), type: 'move', dir: 'left' }),
  right: (): Block => ({ id: newId(), type: 'move', dir: 'right' }),
  move: (dir: Dir): Block => ({ id: newId(), type: 'move', dir }),
  paint: (): Block => ({ id: newId(), type: 'paint' }),
  erase: (): Block => ({ id: newId(), type: 'erase' }),
  color: (color: ColorKey): Block => ({ id: newId(), type: 'color', color }),
  goto: (x: number, y: number): Block => ({ id: newId(), type: 'goto', x, y }),
  repeat: (times: number, body: Block[]): Block => ({ id: newId(), type: 'repeat', times, body }),
};

export type NewBlockKind = BlockType | `move-${Dir}`;

export function createBlock(kind: NewBlockKind, color: ColorKey): Block {
  switch (kind) {
    case 'move-up':
      return B.up();
    case 'move-down':
      return B.down();
    case 'move-left':
      return B.left();
    case 'move-right':
    case 'move':
      return B.right();
    case 'paint':
      return B.paint();
    case 'erase':
      return B.erase();
    case 'color':
      return B.color(color);
    case 'goto':
      return B.goto(0, 0);
    case 'repeat':
      return B.repeat(2, []);
  }
}

/** 새 id 로 깊은 복사 */
export function cloneBlocks(list: Block[]): Block[] {
  return list.map((b) => (b.type === 'repeat' ? { ...b, id: newId(), body: cloneBlocks(b.body) } : { ...b, id: newId() }));
}

/** 저장된 데이터를 읽을 때 안전하게 검사 */
export function sanitizeBlocks(raw: unknown, depth = 0): Block[] {
  if (!Array.isArray(raw) || depth > 6) return [];
  const out: Block[] = [];
  for (const r of raw) {
    if (!r || typeof r !== 'object') continue;
    const o = r as Record<string, unknown>;
    const id = typeof o.id === 'string' ? o.id : newId();
    switch (o.type) {
      case 'move':
        if (o.dir === 'up' || o.dir === 'down' || o.dir === 'left' || o.dir === 'right') out.push({ id, type: 'move', dir: o.dir });
        break;
      case 'paint':
        out.push({ id, type: 'paint' });
        break;
      case 'erase':
        out.push({ id, type: 'erase' });
        break;
      case 'color':
        if (typeof o.color === 'string') out.push({ id, type: 'color', color: o.color });
        break;
      case 'goto':
        out.push({ id, type: 'goto', x: Number(o.x) | 0, y: Number(o.y) | 0 });
        break;
      case 'repeat':
        out.push({ id, type: 'repeat', times: Math.max(1, Number(o.times) | 0), body: sanitizeBlocks(o.body, depth + 1) });
        break;
    }
  }
  return out;
}

export function findBlock(list: Block[], id: string): Block | null {
  for (const b of list) {
    if (b.id === id) return b;
    if (b.type === 'repeat') {
      const f = findBlock(b.body, id);
      if (f) return f;
    }
  }
  return null;
}

/** id 블록이 들어 있는 목록의 부모 id (최상위면 null) 과 위치 */
export function locate(list: Block[], id: string, parent: string | null = null): { parent: string | null; index: number } | null {
  for (let i = 0; i < list.length; i++) {
    const b = list[i];
    if (b.id === id) return { parent, index: i };
    if (b.type === 'repeat') {
      const f = locate(b.body, id, b.id);
      if (f) return f;
    }
  }
  return null;
}

export function containsId(block: Block, id: string): boolean {
  if (block.id === id) return true;
  return block.type === 'repeat' && block.body.some((c) => containsId(c, id));
}

export function depthOf(list: Block[], id: string, d = 0): number {
  for (const b of list) {
    if (b.id === id) return d;
    if (b.type === 'repeat') {
      const r = depthOf(b.body, id, d + 1);
      if (r >= 0) return r;
    }
  }
  return -1;
}

/** 블록 안쪽 반복 깊이 (반복 블록 자체 = 1) */
export function nestDepth(b: Block): number {
  if (b.type !== 'repeat') return 0;
  return 1 + Math.max(0, ...b.body.map(nestDepth));
}

export function updateBlock(list: Block[], id: string, fn: (b: Block) => Block): Block[] {
  return list.map((b) => {
    if (b.id === id) return fn(b);
    if (b.type === 'repeat') return { ...b, body: updateBlock(b.body, id, fn) };
    return b;
  });
}

export function removeBlock(list: Block[], id: string): Block[] {
  return list
    .filter((b) => b.id !== id)
    .map((b) => (b.type === 'repeat' ? { ...b, body: removeBlock(b.body, id) } : b));
}

/** parent(null=최상위) 목록의 index 위치에 끼워 넣기 */
export function insertBlock(list: Block[], parent: string | null, index: number, block: Block): Block[] {
  if (parent === null) {
    const copy = list.slice();
    copy.splice(Math.max(0, Math.min(index, copy.length)), 0, block);
    return copy;
  }
  return list.map((b) => {
    if (b.type !== 'repeat') return b;
    if (b.id === parent) {
      const body = b.body.slice();
      body.splice(Math.max(0, Math.min(index, body.length)), 0, block);
      return { ...b, body };
    }
    return { ...b, body: insertBlock(b.body, parent, index, block) };
  });
}

/** 블록을 다른 위치로 옮기기. 자기 안으로는 옮길 수 없음 */
export function moveBlock(list: Block[], id: string, parent: string | null, index: number): Block[] {
  const block = findBlock(list, id);
  if (!block) return list;
  if (parent !== null && containsId(block, parent)) return list;
  const from = locate(list, id)!;
  let target = index;
  if (from.parent === parent && from.index < index) target -= 1;
  return insertBlock(removeBlock(list, id), parent, target, block);
}

/** 같은 목록 안에서 위/아래로 한 칸 (클릭 방식 이동) */
export function nudgeBlock(list: Block[], id: string, delta: -1 | 1): Block[] {
  const loc = locate(list, id);
  if (!loc) return list;
  const siblings = loc.parent === null ? list : (findBlock(list, loc.parent) as Extract<Block, { type: 'repeat' }>).body;
  const ni = loc.index + delta;
  if (ni < 0 || ni >= siblings.length) {
    // 반복 블록 밖으로 꺼내기
    if (loc.parent !== null) {
      const pLoc = locate(list, loc.parent)!;
      return moveBlock(list, id, pLoc.parent, delta < 0 ? pLoc.index : pLoc.index + 1);
    }
    return list;
  }
  return moveBlock(list, id, loc.parent, delta < 0 ? ni : ni + 1);
}

export function duplicateBlock(list: Block[], id: string): Block[] {
  const b = findBlock(list, id);
  const loc = locate(list, id);
  if (!b || !loc) return list;
  return insertBlock(list, loc.parent, loc.index + 1, cloneBlocks([b])[0]);
}

/** 손그림을 명령 블록으로 바꾸기: 줄마다 같은 색 묶음을 찾아 반복 블록으로 만듭니다 */
export function gridToBlocks(g: Grid, startColor: ColorKey): Block[] {
  const out: Block[] = [];
  let color = startColor;
  for (let y = 0; y < g.height; y++) {
    let x = 0;
    while (x < g.width) {
      const c = g.cells[y * g.width + x];
      if (c === null) {
        x++;
        continue;
      }
      let len = 1;
      while (x + len < g.width && g.cells[y * g.width + x + len] === c) len++;
      out.push(B.goto(x, y));
      if (c !== color) {
        out.push(B.color(c));
        color = c;
      }
      out.push(B.paint());
      if (len === 2) out.push(B.right(), B.paint());
      else if (len > 2) out.push(B.repeat(len - 1, [B.right(), B.paint()]));
      x += len;
    }
  }
  return out;
}
