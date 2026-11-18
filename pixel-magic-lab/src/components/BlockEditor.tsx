// 명령 블록 편집기: 블록 상자(선반) + 내 마법 주문(작업 공간)
// 클릭으로 추가/이동, 마우스·터치 드래그로 순서 변경 모두 지원합니다.
import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { Block, ColorKey, LoopFrame } from '../engine/types';
import {
  type NewBlockKind,
  createBlock,
  duplicateBlock,
  findBlock,
  insertBlock,
  locate,
  moveBlock,
  nudgeBlock,
  removeBlock,
  updateBlock,
} from '../engine/tree';
import { countBlocks, MAX_REPEAT } from '../engine/engine';
import { Icon, type IconName } from './Icons';
import { colorHex, colorName } from '../data/palette';
import { sfx } from '../lib/sound';

export const KIND_META: Record<NewBlockKind, { label: string; icon: IconName; cls: string; tip: string }> = {
  'move-up': { label: '위로 1칸', icon: 'up', cls: 'move', tip: '마법 펜을 위로 한 칸 옮겨요' },
  'move-down': { label: '아래로 1칸', icon: 'down', cls: 'move', tip: '마법 펜을 아래로 한 칸 옮겨요' },
  'move-left': { label: '왼쪽으로 1칸', icon: 'left', cls: 'move', tip: '마법 펜을 왼쪽으로 한 칸 옮겨요' },
  'move-right': { label: '오른쪽으로 1칸', icon: 'right', cls: 'move', tip: '마법 펜을 오른쪽으로 한 칸 옮겨요' },
  move: { label: '이동', icon: 'right', cls: 'move', tip: '' },
  paint: { label: '칠하기', icon: 'brush', cls: 'paint', tip: '지금 칸을 펜 색으로 칠해요' },
  erase: { label: '지우기', icon: 'eraser', cls: 'erase', tip: '지금 칸을 깨끗하게 지워요' },
  color: { label: '색 고르기', icon: 'drop', cls: 'color', tip: '펜의 잉크 색을 바꿔요' },
  goto: { label: '좌표로 이동', icon: 'pin', cls: 'goto', tip: '(가로, 세로) 칸으로 순간이동' },
  repeat: { label: '번 반복하기', icon: 'loop', cls: 'repeat', tip: '안에 넣은 블록을 여러 번 되풀이해요' },
};

export function kindOf(b: Block): NewBlockKind {
  return b.type === 'move' ? (`move-${b.dir}` as NewBlockKind) : b.type;
}

type DropTarget = { parent: string | null; index: number } | 'trash' | null;
type DragSource = { kind: 'new'; blockKind: NewBlockKind } | { kind: 'move'; id: string };

interface Props {
  program: Block[];
  onChange: (p: Block[]) => void;
  kinds: NewBlockKind[];
  colors: ColorKey[];
  defaultColor: ColorKey;
  activeId?: string | null;
  errorId?: string | null;
  loops?: LoopFrame[];
  gridW: number;
  gridH: number;
  /** 작업 공간 머리글 오른쪽에 붙일 요소 */
  headerExtra?: ReactNode;
  scriptTitle?: string;
}

interface DragState {
  source: DragSource;
  x: number;
  y: number;
  label: string;
  cls: string;
  icon: IconName;
}

function Stepper({ value, min, max, onChange, label, warn }: { value: number; min: number; max: number; onChange: (v: number) => void; label: string; warn?: boolean }) {
  const set = (v: number) => onChange(Math.max(min, Math.min(max, Number.isFinite(v) ? Math.round(v) : min)));
  return (
    <span className={`stepper ${warn ? 'warn' : ''}`} data-nodrag>
      <button type="button" className="step-btn" aria-label={`${label} 줄이기`} onClick={() => set(value - 1)} disabled={value <= min}>
        −
      </button>
      <input
        aria-label={label}
        inputMode="numeric"
        value={value}
        onChange={(e) => {
          const n = parseInt(e.target.value.replace(/[^0-9]/g, ''), 10);
          set(Number.isNaN(n) ? min : n);
        }}
        onFocus={(e) => e.target.select()}
      />
      <button type="button" className="step-btn" aria-label={`${label} 늘리기`} onClick={() => set(value + 1)} disabled={value >= max}>
        +
      </button>
    </span>
  );
}

export function BlockEditor({
  program,
  onChange,
  kinds,
  colors,
  defaultColor,
  activeId,
  errorId,
  loops,
  gridW,
  gridH,
  headerExtra,
  scriptTitle = '내 마법 주문',
}: Props) {
  const [selected, setSelected] = useState<string | null>(null);
  const [picker, setPicker] = useState<string | null>(null);
  const [drag, setDrag] = useState<DragState | null>(null);
  const [drop, setDrop] = useState<DropTarget>(null);
  const scriptRef = useRef<HTMLDivElement>(null);
  const progRef = useRef(program);
  progRef.current = program;
  const selRef = useRef(selected);
  selRef.current = selected;

  // 선택한 블록이 사라졌으면 선택 해제
  useEffect(() => {
    if (selected && !findBlock(program, selected)) setSelected(null);
  }, [program, selected]);

  // 실행 중인 블록이 보이도록 스크롤
  useEffect(() => {
    const id = errorId ?? activeId;
    if (!id || !scriptRef.current) return;
    const el = scriptRef.current.querySelector(`[data-block-id="${id}"]`);
    (el as HTMLElement | null)?.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' });
  }, [activeId, errorId]);

  const insertionPoint = (): { parent: string | null; index: number } => {
    const sel = selRef.current ? findBlock(progRef.current, selRef.current) : null;
    if (sel) {
      if (sel.type === 'repeat') return { parent: sel.id, index: sel.body.length };
      const loc = locate(progRef.current, sel.id);
      if (loc) return { parent: loc.parent, index: loc.index + 1 };
    }
    return { parent: null, index: progRef.current.length };
  };

  const addBlock = (k: NewBlockKind, at?: { parent: string | null; index: number }) => {
    const b = createBlock(k, defaultColor);
    const p = at ?? insertionPoint();
    onChange(insertBlock(progRef.current, p.parent, p.index, b));
    setSelected(b.id);
    sfx.add();
  };

  const del = (id: string) => {
    const loc = locate(progRef.current, id);
    const next = removeBlock(progRef.current, id);
    onChange(next);
    // 지운 자리 바로 앞 블록을 선택해서 이어서 편집하기 쉽게
    if (loc) {
      const siblings = loc.parent ? (findBlock(next, loc.parent) as Extract<Block, { type: 'repeat' }> | null)?.body ?? [] : next;
      const prev = siblings[loc.index - 1];
      setSelected(prev ? prev.id : loc.parent);
    }
    sfx.click();
  };

  // ── 드래그 ──
  const computeDrop = (x: number, y: number): DropTarget => {
    const el = document.elementFromPoint(x, y) as HTMLElement | null;
    if (!el) return null;
    if (el.closest('[data-trash]')) return 'trash';
    const footer = el.closest<HTMLElement>('[data-after-of]');
    if (footer) {
      return { parent: footer.dataset.parent || null, index: Number(footer.dataset.index) + 1 };
    }
    const row = el.closest<HTMLElement>('[data-block-id]');
    if (row) {
      const r = row.getBoundingClientRect();
      const idx = Number(row.dataset.index);
      const parent = row.dataset.parent || null;
      return { parent, index: y < r.top + r.height / 2 ? idx : idx + 1 };
    }
    const body = el.closest<HTMLElement>('[data-body-of]');
    if (body) {
      const id = body.dataset.bodyOf!;
      const b = findBlock(progRef.current, id);
      return { parent: id, index: b && b.type === 'repeat' ? b.body.length : 0 };
    }
    if (el.closest('[data-script]')) return { parent: null, index: progRef.current.length };
    return null;
  };

  const startPointer = (e: React.PointerEvent, source: DragSource, meta: { label: string; cls: string; icon: IconName }, onClick: () => void) => {
    if (e.button !== 0) return;
    const ctl = (e.target as HTMLElement).closest('[data-nodrag], button, input');
    if (ctl && ctl !== e.currentTarget) return;
    const sx = e.clientX;
    const sy = e.clientY;
    // 터치: 손가락을 0.3초 누르고 있으면 드래그 시작 (그냥 쓸면 목록이 스크롤됨)
    const isTouch = e.pointerType === 'touch';
    let armed = !isTouch;
    let dragging = false;
    let scrolled = false;
    let lastDrop: DropTarget = null;
    const begin = (x: number, y: number) => {
      dragging = true;
      document.body.classList.add('dragging-block');
      setDrag({ source, x, y, ...meta });
    };
    const holdTimer = isTouch
      ? window.setTimeout(() => {
          armed = true;
          navigator.vibrate?.(12);
          begin(sx, sy);
        }, 300)
      : 0;
    const blockScroll = (ev: TouchEvent) => {
      if (dragging) ev.preventDefault();
    };
    const cleanup = () => {
      window.clearTimeout(holdTimer);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', cancel);
      window.removeEventListener('touchmove', blockScroll);
      document.body.classList.remove('dragging-block');
    };
    const move = (ev: PointerEvent) => {
      const far = Math.hypot(ev.clientX - sx, ev.clientY - sy) > 9;
      if (!armed) {
        if (far) {
          scrolled = true;
          window.clearTimeout(holdTimer);
        }
        return;
      }
      if (!dragging && far) begin(ev.clientX, ev.clientY);
      if (dragging) {
        ev.preventDefault();
        lastDrop = computeDrop(ev.clientX, ev.clientY);
        setDrag({ source, x: ev.clientX, y: ev.clientY, ...meta });
        setDrop(lastDrop);
      }
    };
    const up = () => {
      cleanup();
      if (!dragging) {
        if (!scrolled) onClick();
        return;
      }
      setDrag(null);
      setDrop(null);
      if (!lastDrop) return;
      if (lastDrop === 'trash') {
        if (source.kind === 'move') del(source.id);
        return;
      }
      if (source.kind === 'new') addBlock(source.blockKind, lastDrop);
      else {
        onChange(moveBlock(progRef.current, source.id, lastDrop.parent, lastDrop.index));
        setSelected(source.id);
        sfx.click();
      }
    };
    const cancel = () => {
      dragging = false;
      setDrag(null);
      setDrop(null);
      cleanup();
    };
    window.addEventListener('pointermove', move, { passive: false });
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', cancel);
    window.addEventListener('touchmove', blockScroll, { passive: false });
  };

  const ins = drag ? null : insertionPoint();
  const marker = (parent: string | null, index: number) => {
    if (drag && drop && drop !== 'trash' && drop.parent === parent && drop.index === index) return <div className="drop-line" key={`dl${index}`} />;
    if (!drag && ins && ins.parent === parent && ins.index === index && program.length > 0)
      return (
        <div className="insert-cursor" key={`ic${index}`}>
          <Icon name="spark" size={12} /> 새 블록은 여기에
        </div>
      );
    return null;
  };

  const loopMap = new Map((loops ?? []).map((l) => [l.blockId, l]));

  const renderList = (list: Block[], parent: string | null): ReactNode => (
    <>
      {list.map((b, i) => (
        <div key={b.id} className="blk-wrap">
          {marker(parent, i)}
          {renderBlock(b, i, parent)}
        </div>
      ))}
      {marker(parent, list.length)}
    </>
  );

  const renderBlock = (b: Block, index: number, parent: string | null): ReactNode => {
    const k = kindOf(b);
    const meta = KIND_META[k];
    const isSel = selected === b.id;
    const isActive = activeId === b.id;
    const isErr = errorId === b.id;
    const loop = loopMap.get(b.id);
    const actions = isSel && (
      <span className="blk-actions" data-nodrag>
        <button type="button" title="위로 옮기기" aria-label="블록 위로 옮기기" onClick={() => onChange(nudgeBlock(program, b.id, -1))}>
          <Icon name="up" size={16} />
        </button>
        <button type="button" title="아래로 옮기기" aria-label="블록 아래로 옮기기" onClick={() => onChange(nudgeBlock(program, b.id, 1))}>
          <Icon name="down" size={16} />
        </button>
        <button type="button" title="복사하기" aria-label="블록 복사하기" onClick={() => onChange(duplicateBlock(program, b.id))}>
          <Icon name="copy" size={16} />
        </button>
        <button type="button" className="danger" title="지우기" aria-label="블록 지우기" onClick={() => del(b.id)}>
          <Icon name="trash" size={16} />
        </button>
      </span>
    );

    let controls: ReactNode = null;
    if (b.type === 'color') {
      controls = (
        <span className="color-pick" data-nodrag>
          <button
            type="button"
            className="swatch-btn"
            aria-label={`색: ${colorName(b.color)}. 눌러서 바꾸기`}
            onClick={() => setPicker(picker === b.id ? null : b.id)}
          >
            <span className="swatch" style={{ background: colorHex(b.color) }} />
            {colorName(b.color)}
          </button>
          {picker === b.id && (
            <span className="color-pop" role="listbox">
              {colors.map((c) => (
                <button
                  type="button"
                  key={c}
                  className={`pop-swatch ${c === b.color ? 'on' : ''}`}
                  style={{ background: colorHex(c) }}
                  title={colorName(c)}
                  aria-label={colorName(c)}
                  onClick={() => {
                    onChange(updateBlock(program, b.id, (x) => ({ ...x, color: c }) as Block));
                    setPicker(null);
                  }}
                />
              ))}
            </span>
          )}
        </span>
      );
    } else if (b.type === 'goto') {
      controls = (
        <span className="goto-ctl" data-nodrag>
          (
          <Stepper label="가로 좌표" value={b.x} min={0} max={gridW - 1} onChange={(v) => onChange(updateBlock(program, b.id, (x) => ({ ...x, x: v }) as Block))} />
          ,
          <Stepper label="세로 좌표" value={b.y} min={0} max={gridH - 1} onChange={(v) => onChange(updateBlock(program, b.id, (x) => ({ ...x, y: v }) as Block))} />)
        </span>
      );
    }

    const header = (
      <div
        className={`blk blk-${meta.cls} ${isSel ? 'sel' : ''} ${isActive ? 'active' : ''} ${isErr ? 'err' : ''} ${drag?.source.kind === 'move' && drag.source.id === b.id ? 'ghosted' : ''}`}
        data-block-id={b.id}
        data-index={index}
        data-parent={parent ?? ''}
        tabIndex={0}
        role="listitem"
        aria-label={`${b.type === 'repeat' ? `${b.times}번 반복하기` : meta.label}${isActive ? ', 실행 중' : ''}${isErr ? ', 오류' : ''}`}
        onPointerDown={(e) =>
          startPointer(e, { kind: 'move', id: b.id }, { label: b.type === 'repeat' ? `${b.times}번 반복하기` : meta.label, cls: meta.cls, icon: meta.icon }, () => {
            setSelected(isSel && b.type !== 'repeat' ? null : b.id);
            setPicker(null);
          })
        }
        onKeyDown={(e) => {
          if (e.target !== e.currentTarget) return;
          if (e.key === 'Delete' || e.key === 'Backspace') {
            e.preventDefault();
            del(b.id);
          } else if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setSelected(b.id);
          }
        }}
      >
        <span className="grip" aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
        <span className="blk-icon">
          <Icon name={meta.icon} size={20} />
        </span>
        {b.type === 'repeat' ? (
          <span className="blk-label">
            <Stepper
              label="반복 횟수"
              value={b.times}
              min={1}
              max={99}
              warn={b.times > MAX_REPEAT}
              onChange={(v) => onChange(updateBlock(program, b.id, (x) => ({ ...x, times: v }) as Block))}
            />
            번 반복하기
          </span>
        ) : (
          <span className="blk-label">{meta.label}</span>
        )}
        {controls}
        {loop && (
          <span className="loop-badge" aria-label={`${loop.iter}번째 반복 중`}>
            {loop.iter}/{loop.times}
          </span>
        )}
        {isErr && (
          <span className="err-badge" aria-hidden="true">
            !
          </span>
        )}
        {actions}
      </div>
    );

    if (b.type !== 'repeat') return header;
    return (
      <div className={`repeat-shell ${isSel ? 'sel' : ''} ${loop ? 'looping' : ''}`}>
        {header}
        <div className="repeat-body" data-body-of={b.id}>
          {b.body.length === 0 && !(drag && drop && drop !== 'trash' && drop.parent === b.id) && (
            <div className="repeat-empty">
              {isSel ? '블록 상자에서 블록을 누르면 여기에 들어가요' : '이 반복 블록을 누르고 블록을 넣어 보세요'}
            </div>
          )}
          {renderList(b.body, b.id)}
        </div>
        <div className="repeat-foot" data-after-of={b.id} data-index={index} data-parent={parent ?? ''} />
      </div>
    );
  };

  const total = countBlocks(program);

  return (
    <div className="code-panel">
      <section className="card shelf-card" aria-label="블록 상자">
        <header className="card-head">
          <span className="head-chip lav">
            <Icon name="wand" size={18} />
          </span>
          <h2>마법 블록 상자</h2>
          <span className="head-note">누르면 추가 · 끌어서 놓기</span>
        </header>
        <div className="shelf">
          {kinds.map((k) => {
            const meta = KIND_META[k];
            return (
              <button
                type="button"
                key={k}
                className={`shelf-blk blk-${meta.cls}`}
                title={meta.tip}
                onPointerDown={(e) => startPointer(e, { kind: 'new', blockKind: k }, meta, () => addBlock(k))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    addBlock(k);
                  }
                }}
              >
                <span className="blk-icon">
                  <Icon name={meta.icon} size={19} />
                </span>
                {k === 'repeat' ? 'N번 반복' : meta.label}
              </button>
            );
          })}
        </div>
      </section>

      <section className="card script-card" aria-label={scriptTitle}>
        <header className="card-head">
          <span className="head-chip pink">
            <Icon name="code" size={18} />
          </span>
          <h2>{scriptTitle}</h2>
          <span className="count-pill">블록 {total}개</span>
          {headerExtra}
        </header>
        <div
          className={`script ${program.length === 0 ? 'empty' : ''}`}
          ref={scriptRef}
          data-script
          role="list"
          onPointerDown={(e) => {
            if (e.target === e.currentTarget) {
              setSelected(null);
              setPicker(null);
            }
          }}
        >
          {program.length === 0 ? (
            <div className="script-empty" data-script>
              <Icon name="wand" size={30} />
              <p>
                위의 <b>블록 상자</b>에서 블록을 누르면
                <br />
                여기에 차례대로 쌓여요!
              </p>
              {drag && <div className="drop-line" />}
            </div>
          ) : (
            renderList(program, null)
          )}
        </div>
        <div className={`trash-zone ${drag?.source.kind === 'move' ? 'show' : ''} ${drop === 'trash' ? 'hot' : ''}`} data-trash>
          <Icon name="trash" size={18} /> 여기로 끌어 놓으면 지워져요
        </div>
      </section>

      {drag && (
        <div className={`drag-ghost blk blk-${drag.cls}`} style={{ left: drag.x, top: drag.y }}>
          <span className="blk-icon">
            <Icon name={drag.icon} size={19} />
          </span>
          {drag.label}
        </div>
      )}
    </div>
  );
}

/** 읽기 전용 코드 보기 (교사용 정답 보기 등) */
export function CodeView({ program }: { program: Block[] }) {
  const render = (list: Block[]): ReactNode =>
    list.map((b) => {
      const meta = KIND_META[kindOf(b)];
      let text = meta.label;
      if (b.type === 'color') text = `색 고르기: ${colorName(b.color)}`;
      if (b.type === 'goto') text = `좌표로 이동 (${b.x}, ${b.y})`;
      if (b.type === 'repeat') text = `${b.times}번 반복하기`;
      const row = (
        <div className={`blk blk-${meta.cls} ro`}>
          <span className="blk-icon">
            <Icon name={meta.icon} size={18} />
          </span>
          <span className="blk-label">{text}</span>
          {b.type === 'color' && <span className="swatch" style={{ background: colorHex(b.color) }} />}
        </div>
      );
      if (b.type !== 'repeat') return <div key={b.id}>{row}</div>;
      return (
        <div key={b.id} className="repeat-shell ro">
          {row}
          <div className="repeat-body">{render(b.body)}</div>
          <div className="repeat-foot" />
        </div>
      );
    });
  return <div className="code-view">{render(program)}</div>;
}
