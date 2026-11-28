// 시작할 때 '누가 할까요?' — 같은 노트북을 여러 친구가 함께 써요.
// 처음부터 하기(저장 안 함) 또는 이름·별명으로 저장하며 하기(다음에 이어서). 로그인 없음.
import { useState, type FormEvent } from 'react';
import { Mascot } from './Mascot';
import { ConfirmModal } from './ui';
import { cleanName, forgetPlayer, hasPlayer, listPlayers, NAME_MAX, startGuest, startNamed } from '../lib/profile';

export function PlayerGate({ onReady }: { onReady: () => void }) {
  const [players, setPlayers] = useState(() => listPlayers());
  const [name, setName] = useState('');
  const [ask, setAsk] = useState<string | null>(null); // 같은 이름이 있을 때 이어서/처음부터
  const [confirm, setConfirm] = useState<null | { kind: 'fresh' | 'forget'; name: string }>(null);

  const go = (n: string, fresh: boolean) => {
    if (startNamed(n, { fresh })) onReady();
  };
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const n = cleanName(name);
    if (!n) return;
    if (hasPlayer(n)) setAsk(n);
    else go(n, false);
  };

  return (
    <div className="modal-back player-back">
      <div className="modal player-gate" role="dialog" aria-modal="true" aria-labelledby="player-title">
        <div className="player-head">
          <Mascot size={64} mood="happy" />
          <h2 id="player-title">누가 할까요?</h2>
          <p>같은 노트북을 함께 써요. 저장하고 싶을 때만 이름이나 별명을 넣어요.</p>
        </div>
        <button
          type="button"
          className="btn primary player-guest"
          onClick={() => {
            startGuest();
            onReady();
          }}
        >
          🌱 처음부터 하기 <small>(저장 안 함)</small>
        </button>
        <p className="player-or">또는 이름·별명으로 저장하며 하기</p>
        <form className="player-form" onSubmit={submit} autoComplete="off">
          <input
            value={name}
            maxLength={NAME_MAX}
            placeholder="예: 별빛토끼"
            aria-label="이름 또는 별명"
            onChange={(e) => {
              setName(e.target.value);
              setAsk(null);
            }}
          />
          <button type="submit" className="btn mint">
            시작
          </button>
        </form>
        {ask && (
          <div className="player-ask" role="status">
            <p>「{ask}」 기록이 있어요. 어떻게 할까요?</p>
            <div className="player-ask-btns">
              <button type="button" className="btn primary" onClick={() => go(ask, false)}>
                ▶ 이어서 하기
              </button>
              <button type="button" className="btn" onClick={() => setConfirm({ kind: 'fresh', name: ask })}>
                처음부터 다시
              </button>
            </div>
          </div>
        )}
        {players.length > 0 && (
          <>
            <p className="player-or">저장한 친구 (눌러서 이어서 하기)</p>
            <div className="player-list">
              {players.slice(0, 30).map((p) => (
                <span className="player-chip" key={p.name}>
                  <button type="button" onClick={() => go(p.name, false)}>
                    ▶ {p.name}
                  </button>
                  <button
                    type="button"
                    className="del"
                    aria-label={`${p.name} 기록 지우기`}
                    title={`${p.name} 기록 지우기`}
                    onClick={() => setConfirm({ kind: 'forget', name: p.name })}
                  >
                    ✕
                  </button>
                </span>
              ))}
            </div>
          </>
        )}
        <p className="player-hint">진짜 이름 대신 별명도 좋아요. 이름과 기록은 이 노트북 안에만 남아요.</p>
      </div>
      {confirm && (
        <ConfirmModal
          title={confirm.kind === 'fresh' ? '처음부터 다시 할까요?' : '기록을 지울까요?'}
          message={
            confirm.kind === 'fresh'
              ? `「${confirm.name}」의 예전 기록을 지우고 처음부터 시작해요.`
              : `「${confirm.name}」의 저장 기록(미션·작품)을 이 노트북에서 모두 지워요.`
          }
          onClose={() => setConfirm(null)}
          actions={[
            { label: '그만두기', onClick: () => setConfirm(null) },
            {
              label: confirm.kind === 'fresh' ? '처음부터 다시' : '지우기',
              kind: 'danger',
              onClick: () => {
                if (confirm.kind === 'fresh') go(confirm.name, true);
                else {
                  forgetPlayer(confirm.name);
                  setPlayers(listPlayers());
                  setAsk(null);
                  setConfirm(null);
                }
              },
            },
          ]}
        />
      )}
    </div>
  );
}
