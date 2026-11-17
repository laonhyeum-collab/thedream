import { useCallback, useEffect, useRef, useState } from 'react';
import { Icon, type IconName } from './components/Icons';
import { Logo, Mascot } from './components/Mascot';
import { ConfirmModal, Modal, Stars, Toast } from './components/ui';
import { MissionMode } from './modes/MissionMode';
import { StudioMode } from './modes/StudioMode';
import { TheaterMode } from './modes/TheaterMode';
import { MISSIONS, type Mission } from './data/missions';
import { clearMissionData, loadProgress, loadSettings, saveProgress, saveSettings, type Progress, type Settings } from './lib/storage';
import { setMuted, sfx } from './lib/sound';

type Mode = 'mission' | 'studio' | 'theater';

const MODES: { id: Mode; label: string; sub: string; icon: IconName; tone: string }[] = [
  { id: 'mission', label: '마법 따라 그리기', sub: '미션', icon: 'target', tone: 'lav' },
  { id: 'studio', label: '자유 픽셀 공방', sub: '창작', icon: 'brush', tone: 'mint' },
  { id: 'theater', label: '움직이는 픽셀 극장', sub: '애니메이션', icon: 'film', tone: 'pink' },
];

export function wizardTitle(stars: number): string {
  if (stars >= 36) return '전설의 픽셀 대마법사';
  if (stars >= 24) return '대마법사';
  if (stars >= 14) return '반복의 마법사';
  if (stars >= 6) return '픽셀 마법사';
  if (stars >= 1) return '꼬마 마법사';
  return '견습 마법사';
}

export default function App() {
  const [mode, setMode] = useState<Mode>('mission');
  const [settings, setSettings] = useState<Settings>(() => loadSettings());
  const [progress, setProgress] = useState<Progress>(() => loadProgress());
  const [teacherTools, setTeacherTools] = useState(false);
  const [modal, setModal] = useState<null | 'teacher' | 'guide' | 'resetConfirm'>(() => (loadSettings().seenGuide ? null : 'guide'));
  const [pendingMode, setPendingMode] = useState<Mode | null>(null);
  const [toastMsg, setToastMsg] = useState<{ text: string; kind: 'info' | 'ok' | 'warn'; key: number } | null>(null);
  const dirty = useRef<Record<Mode, boolean>>({ mission: false, studio: false, theater: false });
  const savers = useRef<Record<Mode, (() => boolean) | null>>({ mission: null, studio: null, theater: null });

  useEffect(() => {
    setMuted(settings.muted);
    saveSettings(settings);
  }, [settings]);

  // 저장하지 않은 작품이 있으면 창을 닫기 전에 확인
  useEffect(() => {
    const onBefore = (e: BeforeUnloadEvent) => {
      if (dirty.current.studio || dirty.current.theater) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', onBefore);
    return () => window.removeEventListener('beforeunload', onBefore);
  }, []);

  const toast = useCallback((text: string, kind: 'info' | 'ok' | 'warn' = 'info') => {
    setToastMsg({ text, kind, key: Date.now() });
  }, []);
  useEffect(() => {
    if (!toastMsg) return;
    const t = window.setTimeout(() => setToastMsg(null), 2800);
    return () => window.clearTimeout(t);
  }, [toastMsg]);

  const onComplete = useCallback((m: Mission, blocks: number, bonus: boolean): boolean => {
    let first = false;
    setProgress((p) => {
      const prev = p[m.id];
      first = !prev;
      const stars = bonus ? 3 : 2;
      const rec = {
        stars: Math.max(stars, prev?.stars ?? 0),
        blocks: Math.min(blocks, prev?.blocks ?? Infinity),
        bonus: bonus || !!prev?.bonus,
        doneAt: Date.now(),
      };
      const next = { ...p, [m.id]: rec };
      saveProgress(next);
      return next;
    });
    return first;
  }, []);

  const setMissionId = useCallback((id: string) => setSettings((s) => ({ ...s, lastMission: id })), []);

  const switchMode = (m: Mode) => {
    if (m === mode) return;
    if (dirty.current[mode]) {
      setPendingMode(m);
      return;
    }
    setMode(m);
    sfx.click();
  };

  const totalStars = Object.values(progress).reduce((a, r) => a + r.stars, 0);
  const doneCount = Object.keys(progress).length;

  const toggleFullscreen = () => {
    try {
      if (document.fullscreenElement) void document.exitFullscreen();
      else void document.documentElement.requestFullscreen();
    } catch {
      toast('이 브라우저에서는 전체 화면을 쓸 수 없어요.', 'warn');
    }
  };

  const onDirtyStudio = useCallback((d: boolean) => {
    dirty.current.studio = d;
  }, []);
  const onDirtyTheater = useCallback((d: boolean) => {
    dirty.current.theater = d;
  }, []);
  const regStudio = useCallback((fn: () => boolean) => {
    savers.current.studio = fn;
  }, []);
  const regTheater = useCallback((fn: () => boolean) => {
    savers.current.theater = fn;
  }, []);

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <Logo size={46} />
          <div>
            <h1>픽셀 마법사 연구소</h1>
            <p>작은 픽셀에 마법을 걸어봐!</p>
          </div>
        </div>
        <nav className="mode-tabs" aria-label="모드 선택">
          {MODES.map((m) => (
            <button
              type="button"
              key={m.id}
              className={`mode-tab tone-${m.tone} ${mode === m.id ? 'on' : ''}`}
              onClick={() => switchMode(m.id)}
              aria-current={mode === m.id ? 'page' : undefined}
            >
              <span className="tab-icon">
                <Icon name={m.icon} size={20} />
              </span>
              <span className="tab-text">
                <small>{m.sub}</small>
                {m.label}
              </span>
            </button>
          ))}
        </nav>
        <div className="top-right">
          <div className="wizard-badge" title={`모은 별 ${totalStars}개 · 완료한 미션 ${doneCount}개`}>
            <Icon name="star" size={20} className="star-on" />
            <b>{totalStars}</b>
            <span>{wizardTitle(totalStars)}</span>
          </div>
          <button type="button" className="icon-btn" onClick={() => setSettings((s) => ({ ...s, muted: !s.muted }))} aria-label={settings.muted ? '소리 켜기' : '소리 끄기'} title={settings.muted ? '소리 켜기' : '소리 끄기'}>
            <Icon name={settings.muted ? 'mute' : 'sound'} />
          </button>
          <button type="button" className="icon-btn" onClick={toggleFullscreen} aria-label="전체 화면" title="전체 화면">
            <Icon name="expand" />
          </button>
          <button type="button" className="icon-btn" onClick={() => setModal('guide')} aria-label="사용 방법" title="사용 방법">
            <Icon name="help" />
          </button>
          <button type="button" className={`icon-btn ${teacherTools ? 'on' : ''}`} onClick={() => setModal('teacher')} aria-label="선생님 메뉴" title="선생님 메뉴">
            <Icon name="hat" />
          </button>
        </div>
      </header>

      <main className="workspace">
        <MissionMode
          active={mode === 'mission'}
          missionId={settings.lastMission}
          setMissionId={setMissionId}
          progress={progress}
          onComplete={onComplete}
          unlockAll={settings.unlockAll}
          teacherTools={teacherTools}
        />
        <StudioMode active={mode === 'studio'} onDirty={onDirtyStudio} registerSave={regStudio} toast={toast} />
        <TheaterMode active={mode === 'theater'} onDirty={onDirtyTheater} registerSave={regTheater} toast={toast} />
      </main>

      {toastMsg && <Toast key={toastMsg.key} text={toastMsg.text} kind={toastMsg.kind} />}

      {pendingMode && (
        <ConfirmModal
          title="저장하지 않은 작업이 있어요"
          message={
            <>
              <b>{MODES.find((m) => m.id === mode)?.label}</b>에서 만든 작품을 아직 저장하지 않았어요.
              <br />
              다른 곳으로 가도 작품은 이 창에 남아 있지만, 새로고침하면 사라져요.
            </>
          }
          onClose={() => setPendingMode(null)}
          actions={[
            { label: '그만두기', onClick: () => setPendingMode(null) },
            {
              label: '저장 안 하고 이동',
              onClick: () => {
                setMode(pendingMode);
                setPendingMode(null);
              },
            },
            {
              label: '저장하고 이동',
              kind: 'primary',
              icon: 'save',
              onClick: () => {
                const ok = savers.current[mode]?.() ?? true;
                if (ok) setMode(pendingMode);
                setPendingMode(null);
              },
            },
          ]}
        />
      )}

      {modal === 'guide' && (
        <Modal
          title="픽셀 마법사 연구소에 온 걸 환영해요!"
          icon="wand"
          wide
          onClose={() => {
            setModal(null);
            setSettings((s) => ({ ...s, seenGuide: true }));
          }}
        >
          <div className="guide">
            <div className="guide-hero">
              <Mascot mood="happy" size={96} bounce />
              <p>
                나는 꼬마 마법사 <b>도트</b>야! <br />
                명령 블록으로 마법 주문을 만들면, 마법 펜이 픽셀을 칠해 줘.
              </p>
            </div>
            <ol className="guide-steps">
              <li>
                <span className="g-num">1</span>
                <b>블록 고르기</b>
                <p>왼쪽 <em>마법 블록 상자</em>에서 블록을 누르면 <em>내 마법 주문</em>에 차례대로 쌓여요. 끌어서 순서를 바꿀 수도 있어요.</p>
              </li>
              <li>
                <span className="g-num">2</span>
                <b>실행하기</b>
                <p>
                  <em>실행</em>을 누르면 마법 펜이 (0, 0)에서 출발해 블록 순서대로 움직여요. <em>한 단계</em>로 하나씩 볼 수도 있어요.
                </p>
              </li>
              <li>
                <span className="g-num">3</span>
                <b>비교하고 고치기</b>
                <p>목표 그림과 다른 칸에는 ✕ 표시가 나타나요. 블록을 고치고 다시 실행해요!</p>
              </li>
              <li>
                <span className="g-num">4</span>
                <b>나만의 작품</b>
                <p>
                  <em>자유 픽셀 공방</em>에서 그림을, <em>움직이는 픽셀 극장</em>에서 애니메이션을 만들고 저장해요.
                </p>
              </li>
            </ol>
            <div className="confirm-actions">
              <button
                type="button"
                className="btn primary"
                autoFocus
                onClick={() => {
                  setModal(null);
                  setSettings((s) => ({ ...s, seenGuide: true }));
                }}
              >
                <Icon name="wand" size={18} /> 마법 시작하기!
              </button>
            </div>
          </div>
        </Modal>
      )}

      {modal === 'teacher' && (
        <Modal title="선생님 메뉴" icon="hat" onClose={() => setModal(null)} wide tone="mint">
          <div className="teacher">
            <div className="teacher-opts">
              <label className="switch-row">
                <input type="checkbox" checked={settings.unlockAll} onChange={(e) => setSettings((s) => ({ ...s, unlockAll: e.target.checked }))} />
                <span className="switch" />
                <span>
                  <b>모든 미션 열기</b>
                  <small>수업 진도에 맞춰 원하는 미션을 바로 고를 수 있어요.</small>
                </span>
              </label>
              <label className="switch-row">
                <input type="checkbox" checked={teacherTools} onChange={(e) => setTeacherTools(e.target.checked)} />
                <span className="switch" />
                <span>
                  <b>정답 코드 보기 버튼 표시</b>
                  <small>미션 화면 오른쪽에 「정답 코드 보기」가 나타나요. (새로고침하면 꺼져요)</small>
                </span>
              </label>
              <div className="teacher-btns">
                <button type="button" className="btn lav" onClick={toggleFullscreen}>
                  <Icon name="expand" size={18} /> 전체 화면
                </button>
                <button type="button" className="btn danger" onClick={() => setModal('resetConfirm')}>
                  <Icon name="trash" size={18} /> 미션 기록 초기화
                </button>
              </div>
              <p className="modal-note">
                모든 기록과 작품은 이 컴퓨터의 브라우저에만 저장돼요. 학생 작품은 공방·극장에서 PNG·GIF로 내려받아 모을 수 있어요.
              </p>
            </div>
            <div className="teacher-table-wrap">
              <table className="teacher-table">
                <thead>
                  <tr>
                    <th>미션</th>
                    <th>학습 개념</th>
                    <th>결과</th>
                    <th>블록 수</th>
                  </tr>
                </thead>
                <tbody>
                  {MISSIONS.map((m) => {
                    const r = progress[m.id];
                    return (
                      <tr key={m.id}>
                        <td>
                          {m.num}. {m.title}
                        </td>
                        <td>{m.concept}</td>
                        <td>{r ? <Stars n={r.stars} size={15} /> : <span className="muted">아직</span>}</td>
                        <td>{r ? `${r.blocks}개 (기준 ${m.par})` : '-'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </Modal>
      )}

      {modal === 'resetConfirm' && (
        <ConfirmModal
          title="미션 기록을 지울까요?"
          message="모든 미션의 별과 작성 중인 코드가 지워져요. 공방·극장 작품은 그대로 남아요."
          onClose={() => setModal('teacher')}
          actions={[
            { label: '그만두기', onClick: () => setModal('teacher') },
            {
              label: '기록 지우기',
              kind: 'danger',
              icon: 'trash',
              onClick: () => {
                clearMissionData();
                setProgress({});
                setSettings((s) => ({ ...s, lastMission: 'm1' }));
                setModal(null);
                toast('미션 기록을 초기화했어요.', 'info');
              },
            },
          ]}
        />
      )}
    </div>
  );
}
