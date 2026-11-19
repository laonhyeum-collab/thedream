// 모드 A — 마법 따라 그리기
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Block, Grid, RunError, RunResult } from '../engine/types';
import { countBlocks, diffCells, makeGrid } from '../engine/engine';
import { cloneBlocks } from '../engine/tree';
import { BlockEditor, CodeView } from '../components/BlockEditor';
import { MiniGrid, PixelCanvas } from '../components/PixelCanvas';
import { Icon } from '../components/Icons';
import { Mascot } from '../components/Mascot';
import { Modal, RunBar, RunStatusLine, Sparkles, Stars } from '../components/ui';
import { useRunner } from '../lib/useRunner';
import { LEVEL_INFO, MISSIONS, missionTarget, type Mission } from '../data/missions';
import { loadMissionCode, saveMissionCode, type Progress } from '../lib/storage';
import { sfx } from '../lib/sound';

type Outcome =
  | { type: 'success'; stars: number; blocks: number; bonus: boolean; firstTime: boolean }
  | { type: 'mismatch'; diff: number[] }
  | { type: 'error'; error: RunError }
  | null;

const CHEERS = ['멋진 마법이에요!', '픽셀이 반짝반짝 빛나요!', '마법 주문 대성공!', '정말 훌륭한 마법사예요!'];

interface Props {
  active: boolean;
  missionId: string;
  setMissionId: (id: string) => void;
  progress: Progress;
  onComplete: (m: Mission, blocks: number, bonus: boolean) => boolean;
  unlockAll: boolean;
  teacherTools: boolean;
}

export function isUnlocked(i: number, progress: Progress, unlockAll: boolean) {
  return unlockAll || i === 0 || !!MISSIONS[i]?.open || !!progress[MISSIONS[i - 1].id];
}

function initialProgram(m: Mission): Block[] {
  return loadMissionCode(m.id) ?? (m.initialCode ? m.initialCode() : []);
}

export function MissionMode({ active, missionId, setMissionId, progress, onComplete, unlockAll, teacherTools }: Props) {
  const mission = MISSIONS.find((m) => m.id === missionId) ?? MISSIONS[0];
  const mIndex = MISSIONS.indexOf(mission);
  const target = useMemo(() => missionTarget(mission), [mission]);
  const base = useMemo<Grid>(() => makeGrid(target.width, target.height), [target]);
  const [program, setProgram] = useState<Block[]>(() => initialProgram(mission));
  const [outcome, setOutcome] = useState<Outcome>(null);
  const [hintLevel, setHintLevel] = useState(0);
  const [showList, setShowList] = useState(false);
  const [showSolution, setShowSolution] = useState(false);
  const [showCoords, setShowCoords] = useState(true);
  const [ghost, setGhost] = useState(false);
  const [successOpen, setSuccessOpen] = useState(false);
  const [cheer, setCheer] = useState(CHEERS[0]);

  // 미션이 바뀌면 그 미션의 코드 불러오기
  useEffect(() => {
    setProgram(initialProgram(mission));
    setOutcome(null);
    setHintLevel(0);
    setGhost(false);
    setSuccessOpen(false);
  }, [mission]);

  const changeProgram = useCallback(
    (p: Block[]) => {
      setProgram(p);
      setOutcome(null);
      saveMissionCode(mission.id, p);
    },
    [mission.id],
  );

  const onFinish = useCallback(
    (r: RunResult, g: Grid) => {
      if (r.error) {
        setOutcome({ type: 'error', error: r.error });
        return;
      }
      const diff = diffCells(g, target);
      if (diff.length === 0) {
        const blocks = countBlocks(program);
        const bonus = blocks <= mission.par;
        const firstTime = onComplete(mission, blocks, bonus);
        setOutcome({ type: 'success', stars: bonus ? 3 : 2, blocks, bonus, firstTime });
        setCheer(CHEERS[Math.floor(Math.random() * CHEERS.length)]);
        setSuccessOpen(true);
        sfx.success();
      } else {
        setOutcome({ type: 'mismatch', diff });
        sfx.oops();
      }
    },
    [target, program, mission, onComplete],
  );

  const runner = useRunner({ program, base, startColor: mission.startColor, onFinish });

  // 키보드: F5 대신 Ctrl+Enter 로 실행
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        runner.play();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [active, runner]);

  const errorId = runner.status === 'error' ? runner.result?.error?.blockId ?? null : null;
  const activeId = runner.status === 'running' || runner.status === 'paused' ? runner.step?.blockId ?? null : null;
  const next = MISSIONS[mIndex + 1];
  const best = progress[mission.id];

  const goMission = (id: string) => {
    setShowList(false);
    setMissionId(id);
  };

  return (
    <div className="mode-grid" hidden={!active}>
      <BlockEditor
        program={program}
        onChange={changeProgram}
        kinds={mission.blocks}
        colors={mission.colors}
        defaultColor={mission.colors[1] ?? mission.colors[0]}
        activeId={activeId}
        errorId={errorId}
        loops={runner.step?.loops}
        gridW={target.width}
        gridH={target.height}
        headerExtra={
          program.length > 0 && (
            <button
              type="button"
              className="mini-btn"
              onClick={() => changeProgram(mission.initialCode ? mission.initialCode() : [])}
              title={mission.initialCode ? '고장 난 처음 코드로 되돌려요' : '블록을 모두 지워요'}
            >
              <Icon name="trash" size={15} /> {mission.initialCode ? '처음 코드로' : '모두 지우기'}
            </button>
          )
        }
      />

      <section className="card stage-card" aria-label="픽셀 도화지">
        <header className="card-head">
          <span className="head-chip mint">
            <Icon name="grid" size={18} />
          </span>
          <h2>픽셀 도화지</h2>
          <span className="head-note">
            {target.width}×{target.height}칸 · 펜은 (0, 0)에서 출발
          </span>
          <div className="head-toggles">
            <button type="button" className={`toggle ${showCoords ? 'on' : ''}`} onClick={() => setShowCoords(!showCoords)} aria-pressed={showCoords}>
              <Icon name="map" size={16} /> 좌표
            </button>
            <button type="button" className={`toggle ${ghost ? 'on' : ''}`} onClick={() => setGhost(!ghost)} aria-pressed={ghost}>
              <Icon name="eye" size={16} /> 목표 겹쳐 보기
            </button>
          </div>
        </header>
        <div className="canvas-wrap">
          <div className="canvas-frame">
            <PixelCanvas
              grid={runner.grid}
              pen={runner.pen}
              showCoords={showCoords}
              ghost={ghost ? target : null}
              diff={outcome?.type === 'mismatch' ? outcome.diff : undefined}
              errorTarget={runner.status === 'error' ? runner.result?.error?.target ?? null : null}
              lastChange={runner.lastChange}
            />
          </div>
          {outcome?.type === 'mismatch' && (
            <div className="bubble warn" role="alert">
              <Mascot mood="think" size={46} />
              <div>
                <b>목표 그림과 다른 칸이 있어요. 다시 살펴볼까요?</b>
                <p>
                  <span className="x-mark">✕</span> 표시된 칸 {outcome.diff.length}개가 달라요.
                </p>
                <div className="bubble-actions">
                  <button type="button" className="btn small plain" onClick={() => setHintLevel(Math.min(mission.hints.length, hintLevel + 1))}>
                    <Icon name="bulb" size={16} /> 힌트 보기
                  </button>
                  <button type="button" className="btn small plain" onClick={() => setGhost(true)}>
                    <Icon name="eye" size={16} /> 목표 겹쳐 보기
                  </button>
                  <button type="button" className="btn small mint" onClick={() => { setOutcome(null); runner.reset(); }}>
                    <Icon name="restart" size={16} /> 다시 도전
                  </button>
                </div>
              </div>
            </div>
          )}
          {outcome?.type === 'error' && (
            <div className="bubble error" role="alert">
              <Mascot mood="wow" size={46} />
              <div>
                <b>{outcome.error.message}</b>
                <p>{outcome.error.blockId ? '빨간 느낌표(!)가 붙은 블록을 살펴보세요.' : '블록 상자에서 블록을 골라 보세요.'}</p>
                <div className="bubble-actions">
                  <button type="button" className="btn small plain" onClick={() => { setOutcome(null); runner.reset(); }}>
                    <Icon name="check" size={16} /> 알겠어요
                  </button>
                </div>
              </div>
            </div>
          )}
          {outcome?.type === 'success' && !successOpen && (
            <div className="bubble ok" role="status">
              <Mascot mood="happy" size={46} />
              <div>
                <b>미션 성공! 블록 {outcome.blocks}개를 사용했어요.</b>
                <div className="bubble-actions">
                  {next && (
                    <button type="button" className="btn small primary" onClick={() => goMission(next.id)}>
                      다음 미션 <Icon name="chevR" size={16} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
        <RunStatusLine runner={runner} />
        <RunBar runner={runner} />
      </section>

      <aside className="card info-card" aria-label="미션 안내">
        <header className="mission-head">
          <button type="button" className="mission-num" onClick={() => setShowList(true)} title="미션 고르기">
            <small>미션</small>
            {mission.num}
          </button>
          <div className="mission-title">
            <span className={`level-badge lv-${mission.level}`}>
              {LEVEL_INFO[mission.level].name} · {LEVEL_INFO[mission.level].grade}
            </span>
            <h2>{mission.title}</h2>
          </div>
          <button type="button" className="btn small lav list-btn" onClick={() => setShowList(true)}>
            <Icon name="map" size={16} /> 미션 지도
          </button>
        </header>
        <div className="info-scroll">
          <div className="target-box">
            <div className="target-pic">
              <MiniGrid grid={target} title="목표 그림" />
              {best && <span className="stamp">완료</span>}
            </div>
            <div className="target-side">
              <span className="tag">
                <Icon name="target" size={15} /> 목표 그림
              </span>
              <p className="goal">{mission.goal}</p>
              <span className="concept-pill">
                <Icon name="book" size={14} /> {mission.concept}
              </span>
              {best && (
                <span className="best">
                  <Stars n={best.stars} size={16} /> 최고 기록 {best.blocks}블록
                </span>
              )}
            </div>
          </div>

          <div className="concept-bubble">
            <Mascot mood="calm" size={44} />
            <p>{mission.intro}</p>
          </div>

          <div className="hint-area">
            {mission.hints.slice(0, hintLevel).map((h, i) => (
              <div key={i} className="hint">
                <span className="hint-num">힌트 {i + 1}</span>
                {h}
              </div>
            ))}
            {hintLevel < mission.hints.length ? (
              <button type="button" className="btn butter hint-btn" onClick={() => { setHintLevel(hintLevel + 1); sfx.click(); }}>
                <Icon name="bulb" size={18} /> 힌트 보기 ({hintLevel + 1}/{mission.hints.length})
              </button>
            ) : (
              <p className="hint-done">힌트를 모두 보았어요. 할 수 있어요!</p>
            )}
            {teacherTools && (
              <button type="button" className="btn plain teacher-btn" onClick={() => setShowSolution(true)}>
                <Icon name="hat" size={18} /> 선생님: 정답 코드 보기
              </button>
            )}
          </div>
        </div>
        <footer className="mission-nav">
          <button type="button" className="btn plain small" disabled={mIndex === 0} onClick={() => goMission(MISSIONS[mIndex - 1].id)}>
            <Icon name="chevL" size={16} /> 이전
          </button>
          <span className="par-note">
            <Icon name="star" size={14} className="star-on" /> {mission.par}블록 이하 보너스
          </span>
          <button
            type="button"
            className="btn plain small"
            disabled={!next || !isUnlocked(mIndex + 1, progress, unlockAll)}
            onClick={() => next && goMission(next.id)}
          >
            다음 <Icon name="chevR" size={16} />
          </button>
        </footer>
      </aside>

      {showList && (
        <Modal title="마법 미션 지도" icon="map" onClose={() => setShowList(false)} wide>
          <MissionMap current={mission.id} progress={progress} unlockAll={unlockAll} onPick={goMission} />
        </Modal>
      )}

      {showSolution && (
        <Modal title={`정답 예시 — ${mission.num}. ${mission.title}`} icon="hat" onClose={() => setShowSolution(false)} tone="mint">
          <p className="modal-note">
            결과 그림이 같다면 다른 순서의 코드도 모두 정답이에요. (예시 코드: 블록 {countBlocks(mission.solution())}개)
          </p>
          <div className="solution-scroll">
            <CodeView program={mission.solution()} />
          </div>
          <div className="confirm-actions">
            <button
              type="button"
              className="btn primary"
              onClick={() => {
                changeProgram(cloneBlocks(mission.solution()));
                setShowSolution(false);
              }}
            >
              <Icon name="code" size={18} /> 작업 공간에 불러오기
            </button>
          </div>
        </Modal>
      )}

      {successOpen && outcome?.type === 'success' && (
        <div className="modal-back" onPointerDown={(e) => e.target === e.currentTarget && setSuccessOpen(false)}>
          <div className="modal success-modal" role="dialog" aria-modal="true" aria-label="미션 성공">
            <Sparkles />
            <div className="success-top">
              <Mascot mood="happy" size={92} bounce />
              <div className="success-pic">
                <MiniGrid grid={target} />
                <span className="stamp big">완료</span>
              </div>
            </div>
            <h2>{cheer}</h2>
            <p className="success-sub">
              「{mission.title}」 미션을 해냈어요!
            </p>
            <Stars n={outcome.stars} size={40} />
            <div className="success-stats">
              <span>
                사용한 블록 <b>{outcome.blocks}개</b>
              </span>
              {outcome.bonus ? (
                <span className="bonus">
                  <Icon name="spark" size={16} /> 효율 보너스! ({mission.par}개 이하)
                </span>
              ) : (
                <span className="tip">
                  블록을 {mission.par}개 이하로 줄이면 보너스 별을 받아요. {mission.num >= 6 ? '반복하기를 써 볼까요?' : ''}
                </span>
              )}
            </div>
            <div className="confirm-actions">
              <button type="button" className="btn plain" onClick={() => setSuccessOpen(false)}>
                <Icon name="code" size={18} /> 내 코드 다시 보기
              </button>
              {next ? (
                <button type="button" className="btn primary" onClick={() => goMission(next.id)} autoFocus>
                  다음 미션 <Icon name="chevR" size={18} />
                </button>
              ) : (
                <button type="button" className="btn primary" onClick={() => { setSuccessOpen(false); setShowList(true); }}>
                  <Icon name="map" size={18} /> 미션 지도 보기
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function MissionMap({ current, progress, unlockAll, onPick }: { current: string; progress: Progress; unlockAll: boolean; onPick: (id: string) => void }) {
  const levels = ['easy', 'normal', 'challenge'] as const;
  return (
    <div className="mission-map">
      {levels.map((lv) => (
        <div key={lv} className="map-level">
          <h3>
            <span className={`level-badge lv-${lv}`}>{LEVEL_INFO[lv].name}</span>
            <small>{LEVEL_INFO[lv].grade}</small>
          </h3>
          <div className="map-cards">
            {MISSIONS.map((m, i) => {
              if (m.level !== lv) return null;
              const open = isUnlocked(i, progress, unlockAll);
              const rec = progress[m.id];
              return (
                <button
                  type="button"
                  key={m.id}
                  className={`map-card ${m.id === current ? 'current' : ''} ${open ? '' : 'locked'} ${rec ? 'done' : ''}`}
                  disabled={!open}
                  onClick={() => onPick(m.id)}
                  aria-label={`미션 ${m.num} ${m.title}${open ? '' : ' (잠김)'}${rec ? ' (완료)' : ''}`}
                >
                  <span className="map-num">{m.num}</span>
                  <div className="map-pic">
                    <MiniGrid grid={missionTarget(m)} />
                    {!open && (
                      <span className="lock-cover">
                        <Icon name="lock" size={26} />
                      </span>
                    )}
                    {rec && <span className="stamp">완료</span>}
                  </div>
                  <b>{m.title}</b>
                  <small>{m.concept}</small>
                  {rec ? <Stars n={rec.stars} size={15} /> : <span className="stars-empty">{open ? '도전해 봐요!' : '이전 미션을 해결하면 열려요'}</span>}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
