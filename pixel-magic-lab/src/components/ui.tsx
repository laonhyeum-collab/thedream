// 공용 UI 조각: 모달, 실행 도구 막대, 팔레트, 토스트
import { useEffect, type ReactNode } from 'react';
import { Icon, type IconName } from './Icons';
import { SPEEDS, type Runner } from '../lib/useRunner';
import type { ColorKey } from '../engine/types';
import { colorHex, colorName } from '../data/palette';

export function Modal({
  title,
  icon = 'spark',
  onClose,
  children,
  wide,
  className,
  tone = 'lav',
}: {
  title: string;
  icon?: IconName;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
  className?: string;
  tone?: 'lav' | 'mint' | 'pink' | 'butter';
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="modal-back" onPointerDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`modal ${wide ? 'wide' : ''} ${className ?? ''}`} role="dialog" aria-modal="true" aria-label={title}>
        <header className="modal-head">
          <span className={`head-chip ${tone}`}>
            <Icon name={icon} size={20} />
          </span>
          <h2>{title}</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="닫기">
            <Icon name="close" />
          </button>
        </header>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}

export function ConfirmModal({
  title,
  message,
  actions,
  onClose,
}: {
  title: string;
  message: ReactNode;
  actions: { label: string; onClick: () => void; kind?: 'primary' | 'danger' | 'plain'; icon?: IconName }[];
  onClose: () => void;
}) {
  return (
    <Modal title={title} icon="help" onClose={onClose} tone="butter" className="confirm">
      <div className="confirm-msg">{message}</div>
      <div className="confirm-actions">
        {actions.map((a) => (
          <button key={a.label} type="button" className={`btn ${a.kind ?? 'plain'}`} onClick={a.onClick}>
            {a.icon && <Icon name={a.icon} size={18} />}
            {a.label}
          </button>
        ))}
      </div>
    </Modal>
  );
}

const STATUS_TEXT: Record<Runner['status'], string> = {
  idle: '준비 완료',
  running: '마법 실행 중',
  paused: '잠깐 멈춤',
  done: '실행 끝',
  error: '확인이 필요해요',
};

/** 실행 · 일시정지 · 한 단계 · 처음부터 · 초기화 · 속도 */
export function RunBar({ runner, compact }: { runner: Runner; compact?: boolean }) {
  const { status } = runner;
  const running = status === 'running';
  return (
    <div className={`run-bar ${compact ? 'compact' : ''}`}>
      {running ? (
        <button type="button" className="btn run pause" onClick={runner.pause}>
          <Icon name="pause" /> 멈춤
        </button>
      ) : (
        <button type="button" className="btn run" onClick={runner.play} data-testid="run">
          <Icon name="play" /> {status === 'paused' ? '계속' : '실행'}
        </button>
      )}
      <button type="button" className="btn tool" onClick={runner.stepOnce} title="한 블록씩 실행해요" data-testid="step">
        <Icon name="step" /> 한 단계
      </button>
      <button type="button" className="btn tool" onClick={runner.restart} title="그림을 지우고 처음부터 다시 실행해요">
        <Icon name="restart" /> 처음부터
      </button>
      <button type="button" className="btn tool" onClick={runner.reset} title="실행 결과를 지워요">
        <Icon name="clear" /> 지우기
      </button>
      <div className="speed" role="radiogroup" aria-label="실행 속도">
        {SPEEDS.map((s, i) => (
          <button
            type="button"
            key={s.label}
            role="radio"
            aria-checked={runner.speed === i}
            className={runner.speed === i ? 'on' : ''}
            onClick={() => runner.setSpeed(i)}
            title={`속도: ${s.label}`}
          >
            <span className="speed-dots">{'•'.repeat(i + 1)}</span>
            <span className="speed-label">{s.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export function RunStatusLine({ runner }: { runner: Runner }) {
  const { status, index, total, pen } = runner;
  return (
    <div className={`status-line st-${status}`} aria-live="polite">
      <span className="st-dot" />
      <b>{STATUS_TEXT[status]}</b>
      {total > 0 && (
        <span className="st-count">
          {Math.max(0, index + 1)} / {total} 단계
        </span>
      )}
      <span className="st-pen">
        펜 위치 <b>({pen.x}, {pen.y})</b>
      </span>
      <span className="st-color">
        <span className="swatch sm" style={{ background: colorHex(pen.color) }} />
        {colorName(pen.color)}
      </span>
    </div>
  );
}

export function Palette({ colors, value, onChange, label = '색 고르기' }: { colors: ColorKey[]; value: ColorKey; onChange: (c: ColorKey) => void; label?: string }) {
  return (
    <div className="palette" role="radiogroup" aria-label={label}>
      {colors.map((c) => (
        <button
          type="button"
          key={c}
          role="radio"
          aria-checked={value === c}
          aria-label={colorName(c)}
          title={colorName(c)}
          className={`pal-swatch ${value === c ? 'on' : ''}`}
          style={{ background: colorHex(c) }}
          onClick={() => onChange(c)}
        >
          {value === c && <Icon name="check" size={16} />}
        </button>
      ))}
    </div>
  );
}

export function Toast({ text, kind = 'info' }: { text: string; kind?: 'info' | 'ok' | 'warn' }) {
  return (
    <div className={`toast ${kind}`} role="status">
      <Icon name={kind === 'ok' ? 'check' : kind === 'warn' ? 'help' : 'spark'} size={18} />
      {text}
    </div>
  );
}

export function Stars({ n, max = 3, size = 22 }: { n: number; max?: number; size?: number }) {
  return (
    <span className="stars" aria-label={`별 ${n}개`}>
      {Array.from({ length: max }, (_, i) => (
        <Icon key={i} name="star" size={size} className={i < n ? 'star-on' : 'star-off'} />
      ))}
    </span>
  );
}

/** 성공 시 반짝이는 별가루 */
export function Sparkles({ count = 14 }: { count?: number }) {
  return (
    <div className="sparkles" aria-hidden="true">
      {Array.from({ length: count }, (_, i) => {
        const a = (i / count) * Math.PI * 2;
        const r = 90 + (i % 3) * 30;
        return (
          <span
            key={i}
            className="spk"
            style={
              {
                '--tx': `${Math.cos(a) * r}px`,
                '--ty': `${Math.sin(a) * r}px`,
                '--d': `${(i % 5) * 0.05}s`,
                '--c': ['#F6D25E', '#F4A3C4', '#A88BE0', '#86D9C6'][i % 4],
              } as React.CSSProperties
            }
          >
            <Icon name="spark" size={14 + (i % 3) * 4} />
          </span>
        );
      })}
    </div>
  );
}
