// 모드 B — 자유 픽셀 공방
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Block, ColorKey, Grid } from '../engine/types';
import { B, gridToBlocks, newId, type NewBlockKind } from '../engine/tree';
import { cloneGrid, makeGrid, renderProgram } from '../engine/engine';
import { BlockEditor } from '../components/BlockEditor';
import { MiniGrid, PixelCanvas } from '../components/PixelCanvas';
import { Icon } from '../components/Icons';
import { ConfirmModal, Modal, Palette, RunBar, RunStatusLine } from '../components/ui';
import { useRunner } from '../lib/useRunner';
import { PALETTE } from '../data/palette';
import { exportPng } from '../lib/exporters';
import { formatDate, loadArtworks, saveArtworks, type Artwork } from '../lib/storage';
import { sfx } from '../lib/sound';

export const ALL_KINDS: NewBlockKind[] = ['move-up', 'move-down', 'move-left', 'move-right', 'paint', 'erase', 'color', 'goto', 'repeat'];
export const ALL_COLORS: ColorKey[] = PALETTE.map((c) => c.key);
export const SIZES = [8, 10, 16];

export type HandTool = 'code' | 'brush' | 'eraser';

interface Doc {
  base: Grid;
  blocks: Block[];
}

/** 크기를 바꿀 때 손그림을 잘라내거나 늘리기 */
export function resizeGrid(g: Grid, size: number): Grid {
  const out = makeGrid(size, size);
  for (let y = 0; y < Math.min(size, g.height); y++) for (let x = 0; x < Math.min(size, g.width); x++) out.cells[y * size + x] = g.cells[y * g.width + x];
  return out;
}

export function HandTools({ tool, setTool, onToCode, canToCode }: { tool: HandTool; setTool: (t: HandTool) => void; onToCode: () => void; canToCode: boolean }) {
  return (
    <div className="hand-tools" role="group" aria-label="손으로 그리기 도구">
      <span className="ht-label">손 그리기</span>
      <button type="button" className={`toggle ${tool === 'code' ? 'on' : ''}`} onClick={() => setTool('code')} aria-pressed={tool === 'code'}>
        <Icon name="code" size={16} /> 끄기
      </button>
      <button type="button" className={`toggle ${tool === 'brush' ? 'on' : ''}`} onClick={() => setTool('brush')} aria-pressed={tool === 'brush'}>
        <Icon name="brush" size={16} /> 붓
      </button>
      <button type="button" className={`toggle ${tool === 'eraser' ? 'on' : ''}`} onClick={() => setTool('eraser')} aria-pressed={tool === 'eraser'}>
        <Icon name="eraser" size={16} /> 지우개
      </button>
      <button type="button" className="toggle code-convert" disabled={!canToCode} onClick={onToCode} title="손으로 그린 밑그림을 명령 블록으로 바꿔요">
        <Icon name="wand" size={16} /> 손그림 → 코드
      </button>
    </div>
  );
}

interface Props {
  active: boolean;
  onDirty: (d: boolean) => void;
  registerSave: (fn: () => boolean) => void;
  toast: (t: string, kind?: 'info' | 'ok' | 'warn') => void;
}

export function StudioMode({ active, onDirty, registerSave, toast }: Props) {
  const [size, setSize] = useState(10);
  const [name, setName] = useState('');
  const [penColor, setPenColor] = useState<ColorKey>('purple');
  const [doc, setDoc] = useState<Doc>({ base: makeGrid(10, 10), blocks: [] });
  const [past, setPast] = useState<Doc[]>([]);
  const [future, setFuture] = useState<Doc[]>([]);
  const [workId, setWorkId] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [tool, setTool] = useState<HandTool>('code');
  const [showCoords, setShowCoords] = useState(true);
  const [gallery, setGallery] = useState(false);
  const [works, setWorks] = useState<Artwork[]>(() => loadArtworks());
  const [confirm, setConfirm] = useState<null | { kind: 'new' } | { kind: 'open'; work: Artwork } | { kind: 'delete'; work: Artwork }>(null);

  useEffect(() => {
    onDirty(dirty);
  }, [dirty, onDirty]);

  const docRef = useRef(doc);
  docRef.current = doc;
  const histRef = useRef({ past, future });
  histRef.current = { past, future };

  /** 되돌리기 기록을 남기며 문서 바꾸기 */
  const commit = useCallback((next: Doc, record = true) => {
    if (record) {
      setPast([...histRef.current.past.slice(-60), docRef.current]);
      setFuture([]);
    }
    docRef.current = next;
    setDoc(next);
    setDirty(true);
  }, []);

  const undo = useCallback(() => {
    const { past: p, future: f } = histRef.current;
    if (!p.length) return;
    setFuture([docRef.current, ...f]);
    setPast(p.slice(0, -1));
    setDoc(p[p.length - 1]);
    setDirty(true);
  }, []);
  const redo = useCallback(() => {
    const { past: p, future: f } = histRef.current;
    if (!f.length) return;
    setPast([...p, docRef.current]);
    setFuture(f.slice(1));
    setDoc(f[0]);
    setDirty(true);
  }, []);

  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA') return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [active, undo, redo]);

  const setBlocks = useCallback((blocks: Block[]) => commit({ ...docRef.current, blocks }), [commit]);

  const runner = useRunner({ program: doc.blocks, base: doc.base, startColor: penColor });

  const paintCell = useCallback(
    (x: number, y: number, first: boolean) => {
      if (tool === 'code') {
        if (first) toast('손 그리기를 쓰려면 아래의 「붓」을 눌러요. 코드로 그리려면 블록을 쌓고 「실행」!', 'info');
        return;
      }
      const cur = docRef.current;
      const i = y * cur.base.width + x;
      const value = tool === 'brush' ? penColor : null;
      if (cur.base.cells[i] === value) return;
      const base = cloneGrid(cur.base);
      base.cells[i] = value;
      commit({ ...cur, base }, first);
    },
    [tool, penColor, commit, toast],
  );

  const finalGrid = useMemo(() => renderProgram(doc.blocks, doc.base, penColor), [doc, penColor]);

  const doSave = useCallback((): boolean => {
    const id = workId ?? newId();
    const art: Artwork = {
      id,
      name: name.trim() || '이름 없는 작품',
      size,
      base: doc.base,
      blocks: doc.blocks,
      pixels: renderProgram(doc.blocks, doc.base, penColor),
      penColor,
      updatedAt: Date.now(),
    };
    const list = [art, ...loadArtworks().filter((w) => w.id !== id)];
    if (!saveArtworks(list)) {
      toast('저장 공간이 부족해요. 오래된 작품을 지워 주세요.', 'warn');
      return false;
    }
    setWorks(list);
    setWorkId(id);
    if (!name.trim()) setName(art.name);
    setDirty(false);
    sfx.save();
    toast(`「${art.name}」을(를) 저장했어요!`, 'ok');
    return true;
  }, [workId, name, size, doc, penColor, toast]);

  useEffect(() => {
    registerSave(doSave);
  }, [registerSave, doSave]);

  const reset = (s = size) => {
    setDoc({ base: makeGrid(s, s), blocks: [] });
    setPast([]);
    setFuture([]);
    setWorkId(null);
    setName('');
    setDirty(false);
  };

  const open = (w: Artwork) => {
    setSize(w.size);
    setName(w.name);
    setPenColor(w.penColor);
    setDoc({ base: w.base, blocks: w.blocks });
    setPast([]);
    setFuture([]);
    setWorkId(w.id);
    setDirty(false);
    setGallery(false);
    toast(`「${w.name}」을(를) 열었어요.`, 'ok');
  };

  const changeSize = (s: number) => {
    if (s === size) return;
    setSize(s);
    commit({ ...doc, base: resizeGrid(doc.base, s) });
    if (s < size) toast('도화지가 작아져서 바깥쪽 손그림이 잘렸어요. (되돌리기 가능)', 'info');
  };

  const toCode = () => {
    const converted = gridToBlocks(doc.base, penColor);
    const tail = doc.blocks.length ? [B.goto(0, 0), B.color(penColor), ...doc.blocks] : [];
    commit({ base: makeGrid(size, size), blocks: [...converted, ...tail] });
    setTool('code');
    toast('손그림이 마법 주문으로 바뀌었어요! 「실행」을 눌러 보세요.', 'ok');
  };

  const baseEmpty = doc.base.cells.every((c) => c === null);
  const errorId = runner.status === 'error' ? runner.result?.error?.blockId ?? null : null;
  const activeId = runner.status === 'running' || runner.status === 'paused' ? runner.step?.blockId ?? null : null;

  return (
    <div className="mode-grid" hidden={!active}>
      <BlockEditor
        program={doc.blocks}
        onChange={setBlocks}
        kinds={ALL_KINDS}
        colors={ALL_COLORS}
        defaultColor={penColor}
        activeId={activeId}
        errorId={errorId}
        loops={runner.step?.loops}
        gridW={size}
        gridH={size}
        headerExtra={
          doc.blocks.length > 0 && (
            <button type="button" className="mini-btn" onClick={() => setBlocks([])}>
              <Icon name="trash" size={15} /> 모두 지우기
            </button>
          )
        }
      />

      <section className="card stage-card" aria-label="작품 도화지">
        <header className="card-head">
          <span className="head-chip mint">
            <Icon name="grid" size={18} />
          </span>
          <h2>나의 픽셀 도화지</h2>
          <span className="head-note">
            {size}×{size}칸
          </span>
          <div className="head-toggles">
            <button type="button" className={`toggle ${showCoords ? 'on' : ''}`} onClick={() => setShowCoords(!showCoords)} aria-pressed={showCoords}>
              <Icon name="map" size={16} /> 좌표
            </button>
            <button type="button" className="toggle" onClick={undo} disabled={!past.length} title="되돌리기 (Ctrl+Z)">
              <Icon name="undo" size={16} /> 되돌리기
            </button>
            <button type="button" className="toggle" onClick={redo} disabled={!future.length} title="다시 하기 (Ctrl+Y)">
              <Icon name="redo" size={16} /> 다시
            </button>
          </div>
        </header>
        <div className="canvas-wrap">
          <div className={`canvas-frame ${tool !== 'code' ? 'brushing' : ''}`}>
            <PixelCanvas
              grid={runner.grid}
              pen={tool === 'code' ? runner.pen : null}
              showCoords={showCoords}
              errorTarget={runner.status === 'error' ? runner.result?.error?.target ?? null : null}
              lastChange={runner.lastChange}
              onPaintCell={paintCell}
            />
          </div>
          {runner.status === 'error' && runner.result?.error && (
            <div className="bubble error" role="alert">
              <div>
                <b>{runner.result.error.message}</b>
                <div className="bubble-actions">
                  <button type="button" className="btn small plain" onClick={runner.reset}>
                    <Icon name="check" size={16} /> 알겠어요
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
        <HandTools tool={tool} setTool={setTool} onToCode={toCode} canToCode={!baseEmpty} />
        <RunStatusLine runner={runner} />
        <RunBar runner={runner} />
      </section>

      <aside className="card info-card studio-side" aria-label="작품 정보">
        <header className="card-head">
          <span className="head-chip butter">
            <Icon name="image" size={18} />
          </span>
          <h2>작품 공방</h2>
          {dirty && <span className="dirty-dot">저장 안 됨</span>}
        </header>
        <div className="info-scroll">
          <label className="field">
            <span>작품 이름</span>
            <input value={name} maxLength={30} placeholder="예) 우리 집 고양이" onChange={(e) => { setName(e.target.value); setDirty(true); }} />
          </label>
          <div className="field">
            <span>도화지 크기</span>
            <div className="seg">
              {SIZES.map((s) => (
                <button type="button" key={s} className={s === size ? 'on' : ''} onClick={() => changeSize(s)}>
                  {s}×{s}
                </button>
              ))}
            </div>
          </div>
          <div className="field">
            <span>
              펜 색 <small>(코드 시작 색 · 붓 색)</small>
            </span>
            <Palette colors={ALL_COLORS} value={penColor} onChange={(c) => { setPenColor(c); setDirty(true); }} />
          </div>
          <div className="preview-row">
            <div className="final-preview">
              <MiniGrid grid={finalGrid} title="완성 미리보기" />
            </div>
            <p>
              <b>완성 미리보기</b>
              <br />
              손그림 + 코드를 모두 실행한 모습이에요. 저장·다운로드는 이 그림으로 돼요.
            </p>
          </div>
        </div>
        <footer className="side-actions">
          <button type="button" className="btn primary" onClick={doSave}>
            <Icon name="save" size={18} /> 저장하기
          </button>
          <button type="button" className="btn lav" onClick={() => { setWorks(loadArtworks()); setGallery(true); }}>
            <Icon name="folder" size={18} /> 불러오기
          </button>
          <button type="button" className="btn mint" onClick={() => {
              try {
                exportPng(finalGrid, name || '픽셀작품');
              } catch {
                toast('다운로드에 실패했어요.', 'warn');
              }
            }}>
            <Icon name="download" size={18} /> PNG 받기
          </button>
          <button type="button" className="btn plain" onClick={() => (dirty ? setConfirm({ kind: 'new' }) : reset())}>
            <Icon name="plus" size={18} /> 새 도화지
          </button>
        </footer>
      </aside>

      {gallery && (
        <Modal title="나의 작품 보관함" icon="folder" onClose={() => setGallery(false)} wide>
          {works.length === 0 ? (
            <p className="empty-note">아직 저장한 작품이 없어요. 작품을 만들고 「저장하기」를 눌러 보세요!</p>
          ) : (
            <div className="gallery">
              {works.map((w) => (
                <div key={w.id} className={`gal-card ${w.id === workId ? 'current' : ''}`}>
                  <div className="gal-pic">
                    <MiniGrid grid={w.pixels} />
                  </div>
                  <b title={w.name}>{w.name}</b>
                  <small>
                    {w.size}×{w.size} · 블록 {w.blocks.length}개
                    <br />
                    {formatDate(w.updatedAt)}
                  </small>
                  <div className="gal-actions">
                    <button type="button" className="btn small primary" onClick={() => (dirty && w.id !== workId ? setConfirm({ kind: 'open', work: w }) : open(w))}>
                      열기
                    </button>
                    <button type="button" className="btn small mint" onClick={() => exportPng(w.pixels, w.name)} aria-label={`${w.name} PNG 받기`}>
                      <Icon name="download" size={15} />
                    </button>
                    <button type="button" className="btn small danger" onClick={() => setConfirm({ kind: 'delete', work: w })} aria-label={`${w.name} 지우기`}>
                      <Icon name="trash" size={15} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Modal>
      )}

      {confirm?.kind === 'delete' && (
        <ConfirmModal
          title="작품을 지울까요?"
          message={
            <>
              「<b>{confirm.work.name}</b>」 작품을 지우면 다시 되돌릴 수 없어요.
            </>
          }
          onClose={() => setConfirm(null)}
          actions={[
            { label: '그만두기', onClick: () => setConfirm(null) },
            {
              label: '지우기',
              kind: 'danger',
              icon: 'trash',
              onClick: () => {
                const list = loadArtworks().filter((x) => x.id !== confirm.work.id);
                saveArtworks(list);
                setWorks(list);
                if (workId === confirm.work.id) setWorkId(null);
                setConfirm(null);
                toast('작품을 지웠어요.', 'info');
              },
            },
          ]}
        />
      )}
      {(confirm?.kind === 'new' || confirm?.kind === 'open') && (
        <ConfirmModal
          title="저장하지 않은 작품이 있어요"
          message="지금 작품을 저장하지 않으면 바뀐 내용이 사라져요. 어떻게 할까요?"
          onClose={() => setConfirm(null)}
          actions={[
            { label: '그만두기', onClick: () => setConfirm(null) },
            {
              label: '저장 안 함',
              kind: 'danger',
              onClick: () => {
                if (confirm.kind === 'open') open(confirm.work);
                else reset();
                setConfirm(null);
              },
            },
            {
              label: '저장하고 계속',
              kind: 'primary',
              icon: 'save',
              onClick: () => {
                if (!doSave()) return;
                if (confirm.kind === 'open') open(confirm.work);
                else reset();
                setConfirm(null);
              },
            },
          ]}
        />
      )}
    </div>
  );
}
