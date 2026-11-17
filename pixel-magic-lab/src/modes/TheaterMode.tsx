// 모드 C — 움직이는 픽셀 극장
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Block, ColorKey, Grid } from '../engine/types';
import { B, cloneBlocks, gridToBlocks, newId } from '../engine/tree';
import { cloneGrid, makeGrid, renderProgram } from '../engine/engine';
import { BlockEditor } from '../components/BlockEditor';
import { MiniGrid, PixelCanvas } from '../components/PixelCanvas';
import { Icon } from '../components/Icons';
import { ConfirmModal, Modal, Palette, RunBar, RunStatusLine } from '../components/ui';
import { useRunner } from '../lib/useRunner';
import { TEMPLATES, type AnimTemplate } from '../data/templates';
import { exportGif, exportSpriteSheet } from '../lib/exporters';
import { formatDate, loadAnimations, saveAnimations, type Animation, type Frame } from '../lib/storage';
import { sfx } from '../lib/sound';
import { ALL_COLORS, ALL_KINDS, HandTools, SIZES, resizeGrid, type HandTool } from './StudioMode';

const FPS_OPTIONS = [
  { fps: 2, label: '느리게' },
  { fps: 4, label: '보통' },
  { fps: 8, label: '빠르게' },
];
const MAX_FRAMES = 24;

const blankFrame = (size: number): Frame => ({ id: newId(), base: makeGrid(size, size), blocks: [] });

/** 극장 무대: 프레임을 순서대로 재생 */
function Stage({ frames, fps, loop, playing, onEnd, big }: { frames: Grid[]; fps: number; loop: boolean; playing: boolean; onEnd: () => void; big?: boolean }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (!playing) return;
    setI(0);
    let k = 0;
    const t = window.setInterval(() => {
      k += 1;
      if (k >= frames.length) {
        if (!loop) {
          window.clearInterval(t);
          onEnd();
          return;
        }
        k = 0;
      }
      setI(k);
    }, 1000 / fps);
    return () => window.clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, fps, loop, frames.length]);
  const g = frames[Math.min(i, frames.length - 1)];
  return (
    <div className={`stage ${big ? 'big' : ''}`}>
      <div className="curtain left" />
      <div className="curtain right" />
      <div className="stage-screen">
        <MiniGrid grid={g} title="애니메이션 무대" />
      </div>
      <div className="stage-floor">
        {playing ? `${Math.min(i, frames.length - 1) + 1} / ${frames.length}` : '멈춤'}
      </div>
    </div>
  );
}

interface Props {
  active: boolean;
  onDirty: (d: boolean) => void;
  registerSave: (fn: () => boolean) => void;
  toast: (t: string, kind?: 'info' | 'ok' | 'warn') => void;
}

export function TheaterMode({ active, onDirty, registerSave, toast }: Props) {
  const [size, setSize] = useState(10);
  const [name, setName] = useState('');
  const [penColor, setPenColor] = useState<ColorKey>('purple');
  const [fps, setFps] = useState(4);
  const [loop, setLoop] = useState(true);
  const [frames, setFrames] = useState<Frame[]>(() => [blankFrame(10)]);
  const [cur, setCur] = useState(0);
  const [onion, setOnion] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [animId, setAnimId] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [tool, setTool] = useState<HandTool>('brush');
  const [showCoords, setShowCoords] = useState(false);
  const [modal, setModal] = useState<null | 'templates' | 'gallery' | 'show'>(null);
  const [anims, setAnims] = useState<Animation[]>([]);
  const [confirm, setConfirm] = useState<null | { kind: 'template'; t: AnimTemplate } | { kind: 'open'; a: Animation } | { kind: 'new' } | { kind: 'delete'; a: Animation } | { kind: 'delFrame' }>(null);

  useEffect(() => {
    onDirty(dirty);
  }, [dirty, onDirty]);

  const frame = frames[Math.min(cur, frames.length - 1)];
  const framesRef = useRef(frames);
  framesRef.current = frames;
  const curRef = useRef(cur);
  curRef.current = cur;

  const rendered = useMemo(() => frames.map((f) => renderProgram(f.blocks, f.base, penColor)), [frames, penColor]);

  const updateFrame = useCallback((fn: (f: Frame) => Frame) => {
    const list = framesRef.current.slice();
    const i = Math.min(curRef.current, list.length - 1);
    list[i] = fn(list[i]);
    framesRef.current = list;
    setFrames(list);
    setDirty(true);
  }, []);

  const setBlocks = useCallback((blocks: Block[]) => updateFrame((f) => ({ ...f, blocks })), [updateFrame]);

  const runner = useRunner({ program: frame.blocks, base: frame.base, startColor: penColor });

  const paintCell = useCallback(
    (x: number, y: number, first: boolean) => {
      if (tool === 'code') {
        if (first) toast('손 그리기를 쓰려면 아래의 「붓」을 눌러요.', 'info');
        return;
      }
      const value = tool === 'brush' ? penColor : null;
      updateFrame((f) => {
        const i = y * f.base.width + x;
        if (f.base.cells[i] === value) return f;
        const base = cloneGrid(f.base);
        base.cells[i] = value;
        return { ...f, base };
      });
    },
    [tool, penColor, updateFrame, toast],
  );

  // ── 프레임 관리 ──
  const addFrame = () => {
    if (frames.length >= MAX_FRAMES) return toast(`프레임은 ${MAX_FRAMES}장까지 만들 수 있어요.`, 'info');
    const list = frames.slice();
    list.splice(cur + 1, 0, blankFrame(size));
    setFrames(list);
    setCur(cur + 1);
    setDirty(true);
    sfx.add();
  };
  const copyFrame = () => {
    if (frames.length >= MAX_FRAMES) return toast(`프레임은 ${MAX_FRAMES}장까지 만들 수 있어요.`, 'info');
    const list = frames.slice();
    list.splice(cur + 1, 0, { id: newId(), base: cloneGrid(frame.base), blocks: cloneBlocks(frame.blocks) });
    setFrames(list);
    setCur(cur + 1);
    setDirty(true);
    sfx.add();
    toast('프레임을 복사했어요. 조금만 바꾸면 움직임이 생겨요!', 'ok');
  };
  const deleteFrame = () => {
    if (frames.length <= 1) {
      setFrames([blankFrame(size)]);
      setCur(0);
    } else {
      const list = frames.filter((_, i) => i !== cur);
      setFrames(list);
      setCur(Math.max(0, cur - 1));
    }
    setDirty(true);
  };
  const shiftFrame = (d: -1 | 1) => {
    const j = cur + d;
    if (j < 0 || j >= frames.length) return;
    const list = frames.slice();
    [list[cur], list[j]] = [list[j], list[cur]];
    setFrames(list);
    setCur(j);
    setDirty(true);
  };

  const changeSize = (s: number) => {
    if (s === size) return;
    setSize(s);
    setFrames(frames.map((f) => ({ ...f, base: resizeGrid(f.base, s) })));
    setDirty(true);
    if (s < size) toast('도화지가 작아져서 바깥쪽 손그림이 잘렸어요.', 'info');
  };

  const toCode = () => {
    const converted = gridToBlocks(frame.base, penColor);
    const tail = frame.blocks.length ? [B.goto(0, 0), B.color(penColor), ...frame.blocks] : [];
    updateFrame(() => ({ ...frame, base: makeGrid(size, size), blocks: [...converted, ...tail] }));
    setTool('code');
    toast('이 프레임의 손그림이 마법 주문으로 바뀌었어요!', 'ok');
  };

  const loadTemplate = (t: AnimTemplate) => {
    const s = t.frames[0].width;
    setSize(s);
    setFrames(t.frames.map((g) => ({ id: newId(), base: cloneGrid(g), blocks: [] })));
    setCur(0);
    setFps(t.fps);
    setLoop(true);
    setName(t.name);
    setAnimId(null);
    setDirty(true);
    setModal(null);
    setPlaying(true);
    toast(`「${t.name}」 예시를 불러왔어요. 프레임을 바꿔 나만의 애니메이션으로!`, 'ok');
  };

  const doSave = useCallback((): boolean => {
    const id = animId ?? newId();
    const a: Animation = {
      id,
      name: name.trim() || '이름 없는 애니메이션',
      size,
      fps,
      loop,
      penColor,
      frames,
      updatedAt: Date.now(),
    };
    const list = [a, ...loadAnimations().filter((x) => x.id !== id)];
    if (!saveAnimations(list)) {
      toast('저장 공간이 부족해요. 오래된 애니메이션을 지워 주세요.', 'warn');
      return false;
    }
    setAnims(list);
    setAnimId(id);
    if (!name.trim()) setName(a.name);
    setDirty(false);
    sfx.save();
    toast(`「${a.name}」을(를) 저장했어요!`, 'ok');
    return true;
  }, [animId, name, size, fps, loop, penColor, frames, toast]);

  useEffect(() => {
    registerSave(doSave);
  }, [registerSave, doSave]);

  const openAnim = (a: Animation) => {
    setSize(a.size);
    setName(a.name);
    setFps(a.fps);
    setLoop(a.loop);
    setPenColor(a.penColor);
    setFrames(a.frames);
    setCur(0);
    setAnimId(a.id);
    setDirty(false);
    setModal(null);
    toast(`「${a.name}」을(를) 열었어요.`, 'ok');
  };
  const newAnim = () => {
    setFrames([blankFrame(size)]);
    setCur(0);
    setName('');
    setAnimId(null);
    setDirty(false);
    setPlaying(false);
  };

  const errorId = runner.status === 'error' ? runner.result?.error?.blockId ?? null : null;
  const activeId = runner.status === 'running' || runner.status === 'paused' ? runner.step?.blockId ?? null : null;
  const onionGrid = onion && cur > 0 ? rendered[cur - 1] : null;

  return (
    <div className="mode-grid theater" hidden={!active}>
      <BlockEditor
        program={frame.blocks}
        onChange={setBlocks}
        kinds={ALL_KINDS}
        colors={ALL_COLORS}
        defaultColor={penColor}
        activeId={activeId}
        errorId={errorId}
        loops={runner.step?.loops}
        gridW={size}
        gridH={size}
        scriptTitle={`${cur + 1}번 프레임의 주문`}
        headerExtra={
          frame.blocks.length > 0 && (
            <button type="button" className="mini-btn" onClick={() => setBlocks([])}>
              <Icon name="trash" size={15} /> 모두 지우기
            </button>
          )
        }
      />

      <section className="card stage-card" aria-label="프레임 편집">
        <header className="card-head">
          <span className="head-chip mint">
            <Icon name="film" size={18} />
          </span>
          <h2>{cur + 1}번 프레임 그리기</h2>
          <span className="head-note">
            {size}×{size}칸
          </span>
          <div className="head-toggles">
            <button type="button" className={`toggle ${onion ? 'on' : ''}`} onClick={() => setOnion(!onion)} aria-pressed={onion} title="이전 프레임을 흐리게 보여줘요">
              <Icon name="eye" size={16} /> 이전 프레임 비추기
            </button>
            <button type="button" className={`toggle ${showCoords ? 'on' : ''}`} onClick={() => setShowCoords(!showCoords)} aria-pressed={showCoords}>
              <Icon name="map" size={16} /> 좌표
            </button>
          </div>
        </header>
        <div className="canvas-wrap">
          <div className={`canvas-frame ${tool !== 'code' ? 'brushing' : ''}`}>
            <PixelCanvas
              grid={runner.grid}
              pen={tool === 'code' ? runner.pen : null}
              onion={onionGrid}
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
        <HandTools tool={tool} setTool={setTool} onToCode={toCode} canToCode={frame.base.cells.some((c) => c !== null)} />
        <RunBar runner={runner} compact />
        <RunStatusLine runner={runner} />

        <div className="filmstrip" aria-label="프레임 목록">
          <div className="film-frames">
            {rendered.map((g, i) => (
              <button
                type="button"
                key={frames[i].id}
                className={`film-cell ${i === cur ? 'on' : ''}`}
                onClick={() => setCur(i)}
                aria-label={`${i + 1}번 프레임${frames[i].blocks.length ? `, 블록 ${frames[i].blocks.length}개` : ''}`}
              >
                <MiniGrid grid={g} />
                <span className="film-num">{i + 1}</span>
                {frames[i].blocks.length > 0 && (
                  <span className="film-code" title="코드가 있는 프레임">
                    <Icon name="code" size={11} />
                  </span>
                )}
              </button>
            ))}
            <button type="button" className="film-add" onClick={addFrame} aria-label="새 프레임 추가">
              <Icon name="plus" size={22} />
            </button>
          </div>
          <div className="film-tools">
            <button type="button" className="btn small plain" onClick={() => shiftFrame(-1)} disabled={cur === 0} title="앞으로 옮기기">
              <Icon name="chevL" size={16} />
            </button>
            <button type="button" className="btn small plain" onClick={() => shiftFrame(1)} disabled={cur === frames.length - 1} title="뒤로 옮기기">
              <Icon name="chevR" size={16} />
            </button>
            <button type="button" className="btn small mint" onClick={addFrame}>
              <Icon name="plus" size={16} /> 추가
            </button>
            <button type="button" className="btn small lav" onClick={copyFrame}>
              <Icon name="copy" size={16} /> 복사
            </button>
            <button type="button" className="btn small danger" onClick={() => setConfirm({ kind: 'delFrame' })}>
              <Icon name="trash" size={16} /> 삭제
            </button>
          </div>
        </div>
      </section>

      <aside className="card info-card theater-side" aria-label="극장">
        <header className="card-head">
          <span className="head-chip pink">
            <Icon name="film" size={18} />
          </span>
          <h2>픽셀 극장</h2>
          {dirty && <span className="dirty-dot">저장 안 됨</span>}
        </header>
        <div className="info-scroll">
          <Stage frames={rendered} fps={fps} loop={loop} playing={playing} onEnd={() => setPlaying(false)} />
          <div className="play-row">
            <button type="button" className={`btn ${playing ? 'pause' : 'primary'}`} onClick={() => setPlaying(!playing)} data-testid="anim-play">
              <Icon name={playing ? 'stop' : 'play'} size={18} /> {playing ? '정지' : '재생'}
            </button>
            <button type="button" className={`toggle ${loop ? 'on' : ''}`} onClick={() => { setLoop(!loop); setDirty(true); }} aria-pressed={loop}>
              <Icon name="loop" size={16} /> 반복 재생
            </button>
            <button type="button" className="toggle" onClick={() => { setModal('show'); setPlaying(true); }} title="크게 보며 발표해요">
              <Icon name="expand" size={16} /> 크게
            </button>
          </div>
          <div className="field">
            <span>재생 속도</span>
            <div className="seg">
              {FPS_OPTIONS.map((o) => (
                <button type="button" key={o.fps} className={fps === o.fps ? 'on' : ''} onClick={() => { setFps(o.fps); setDirty(true); }}>
                  {o.label}
                </button>
              ))}
            </div>
          </div>
          <label className="field">
            <span>애니메이션 이름</span>
            <input value={name} maxLength={30} placeholder="예) 춤추는 로봇" onChange={(e) => { setName(e.target.value); setDirty(true); }} />
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
              펜 색 <small>(붓 색 · 코드 시작 색)</small>
            </span>
            <Palette colors={ALL_COLORS} value={penColor} onChange={setPenColor} />
          </div>
        </div>
        <footer className="side-actions">
          <button type="button" className="btn butter" onClick={() => setModal('templates')}>
            <Icon name="spark" size={18} /> 예시 템플릿
          </button>
          <button type="button" className="btn primary" onClick={doSave}>
            <Icon name="save" size={18} /> 저장하기
          </button>
          <button type="button" className="btn lav" onClick={() => { setAnims(loadAnimations()); setModal('gallery'); }}>
            <Icon name="folder" size={18} /> 불러오기
          </button>
          <button type="button" className="btn plain" onClick={() => (dirty ? setConfirm({ kind: 'new' }) : newAnim())}>
            <Icon name="plus" size={18} /> 새로 만들기
          </button>
          <button
            type="button"
            className="btn mint"
            onClick={() => {
              try {
                exportGif(rendered, fps, loop, name || '픽셀애니메이션');
              } catch {
                toast('GIF 만들기에 실패했어요.', 'warn');
              }
            }}
          >
            <Icon name="download" size={18} /> GIF 받기
          </button>
          <button type="button" className="btn mint" onClick={() => {
              try {
                exportSpriteSheet(rendered, name || '픽셀애니메이션');
              } catch {
                toast('다운로드에 실패했어요.', 'warn');
              }
            }}>
            <Icon name="image" size={18} /> 프레임 PNG
          </button>
        </footer>
      </aside>

      {modal === 'templates' && (
        <Modal title="예시 애니메이션 템플릿" icon="spark" onClose={() => setModal(null)} wide tone="butter">
          <p className="modal-note">템플릿은 손그림 프레임으로 불러와져요. 「손그림 → 코드」 버튼을 누르면 각 프레임을 마법 주문으로 바꿀 수도 있어요.</p>
          <div className="gallery">
            {TEMPLATES.map((t) => (
              <TemplateCard key={t.id} t={t} onPick={() => (dirty ? setConfirm({ kind: 'template', t }) : loadTemplate(t))} />
            ))}
          </div>
        </Modal>
      )}

      {modal === 'gallery' && (
        <Modal title="나의 애니메이션 보관함" icon="folder" onClose={() => setModal(null)} wide>
          {anims.length === 0 ? (
            <p className="empty-note">아직 저장한 애니메이션이 없어요. 프레임을 만들고 「저장하기」를 눌러 보세요!</p>
          ) : (
            <div className="gallery">
              {anims.map((a) => (
                <div key={a.id} className={`gal-card ${a.id === animId ? 'current' : ''}`}>
                  <div className="gal-pic">
                    <MiniGrid grid={renderProgram(a.frames[0].blocks, a.frames[0].base, a.penColor)} />
                  </div>
                  <b title={a.name}>{a.name}</b>
                  <small>
                    프레임 {a.frames.length}장 · {a.size}×{a.size}
                    <br />
                    {formatDate(a.updatedAt)}
                  </small>
                  <div className="gal-actions">
                    <button type="button" className="btn small primary" onClick={() => (dirty && a.id !== animId ? setConfirm({ kind: 'open', a }) : openAnim(a))}>
                      열기
                    </button>
                    <button type="button" className="btn small danger" onClick={() => setConfirm({ kind: 'delete', a })} aria-label={`${a.name} 지우기`}>
                      <Icon name="trash" size={15} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Modal>
      )}

      {modal === 'show' && (
        <Modal title={name || '나의 픽셀 애니메이션'} icon="film" onClose={() => setModal(null)} wide tone="pink" className="show-modal">
          <Stage frames={rendered} fps={fps} loop={loop} playing={playing} onEnd={() => setPlaying(false)} big />
          <div className="confirm-actions">
            <button type="button" className={`btn ${playing ? 'pause' : 'primary'}`} onClick={() => setPlaying(!playing)}>
              <Icon name={playing ? 'stop' : 'play'} size={18} /> {playing ? '정지' : '재생'}
            </button>
          </div>
        </Modal>
      )}

      {confirm?.kind === 'delFrame' && (
        <ConfirmModal
          title={`${cur + 1}번 프레임을 지울까요?`}
          message="이 프레임의 그림과 코드가 함께 지워져요."
          onClose={() => setConfirm(null)}
          actions={[
            { label: '그만두기', onClick: () => setConfirm(null) },
            { label: '지우기', kind: 'danger', icon: 'trash', onClick: () => { deleteFrame(); setConfirm(null); } },
          ]}
        />
      )}
      {confirm?.kind === 'delete' && (
        <ConfirmModal
          title="애니메이션을 지울까요?"
          message={
            <>
              「<b>{confirm.a.name}</b>」을(를) 지우면 다시 되돌릴 수 없어요.
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
                const list = loadAnimations().filter((x) => x.id !== confirm.a.id);
                saveAnimations(list);
                setAnims(list);
                if (animId === confirm.a.id) setAnimId(null);
                setConfirm(null);
                toast('애니메이션을 지웠어요.', 'info');
              },
            },
          ]}
        />
      )}
      {(confirm?.kind === 'template' || confirm?.kind === 'open' || confirm?.kind === 'new') && (
        <ConfirmModal
          title="저장하지 않은 애니메이션이 있어요"
          message="지금 애니메이션을 저장하지 않으면 바뀐 내용이 사라져요. 어떻게 할까요?"
          onClose={() => setConfirm(null)}
          actions={[
            { label: '그만두기', onClick: () => setConfirm(null) },
            {
              label: '저장 안 함',
              kind: 'danger',
              onClick: () => {
                if (confirm.kind === 'template') loadTemplate(confirm.t);
                else if (confirm.kind === 'open') openAnim(confirm.a);
                else newAnim();
                setConfirm(null);
              },
            },
            {
              label: '저장하고 계속',
              kind: 'primary',
              icon: 'save',
              onClick: () => {
                if (!doSave()) return;
                if (confirm.kind === 'template') loadTemplate(confirm.t);
                else if (confirm.kind === 'open') openAnim(confirm.a);
                else newAnim();
                setConfirm(null);
              },
            },
          ]}
        />
      )}
    </div>
  );
}

function TemplateCard({ t, onPick }: { t: AnimTemplate; onPick: () => void }) {
  return (
    <button type="button" className="gal-card tpl" onClick={onPick}>
      <div className="gal-pic">
        <Stage frames={t.frames} fps={t.fps} loop playing onEnd={() => {}} />
      </div>
      <b>{t.name}</b>
      <small>
        {t.desc} · 프레임 {t.frames.length}장
      </small>
    </button>
  );
}
