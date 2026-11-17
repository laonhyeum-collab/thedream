// 앱 전체에서 같은 선 굵기·둥근 끝으로 그린 SVG 아이콘 모음
import type { CSSProperties, ReactNode } from 'react';

export type IconName =
  | 'up' | 'down' | 'left' | 'right' | 'brush' | 'eraser' | 'drop' | 'pin' | 'loop'
  | 'play' | 'pause' | 'step' | 'restart' | 'clear' | 'star' | 'lock' | 'bulb' | 'save'
  | 'folder' | 'download' | 'film' | 'plus' | 'copy' | 'trash' | 'sound' | 'mute'
  | 'expand' | 'hat' | 'help' | 'wand' | 'check' | 'undo' | 'redo' | 'eye' | 'grid'
  | 'book' | 'close' | 'chevL' | 'chevR' | 'code' | 'target' | 'image' | 'stop' | 'map' | 'spark';

const P: Record<IconName, ReactNode> = {
  up: <path d="M12 19V5M5.5 11.5 12 5l6.5 6.5" />,
  down: <path d="M12 5v14M5.5 12.5 12 19l6.5-6.5" />,
  left: <path d="M19 12H5M11.5 5.5 5 12l6.5 6.5" />,
  right: <path d="M5 12h14M12.5 5.5 19 12l-6.5 6.5" />,
  brush: (
    <>
      <path d="M14.5 4.5 19.5 9.5 11 18l-5-5z" />
      <path d="M6 13c-2 .5-2.5 3-3 6 3-.5 5.5-1 6-3" />
    </>
  ),
  eraser: (
    <>
      <path d="m4 15 8.5-8.5a2 2 0 0 1 2.8 0l3.2 3.2a2 2 0 0 1 0 2.8L12 19H8z" />
      <path d="M9 10.5 14.5 16M12 19h8" />
    </>
  ),
  drop: <path d="M12 3.5c3.5 4.2 6 7.4 6 10.5a6 6 0 0 1-12 0c0-3.1 2.5-6.3 6-10.5z" />,
  pin: (
    <>
      <path d="M12 21s-6.5-6-6.5-11a6.5 6.5 0 0 1 13 0c0 5-6.5 11-6.5 11z" />
      <circle cx="12" cy="10" r="2.3" />
    </>
  ),
  loop: (
    <>
      <path d="M17 7.5A7 7 0 0 0 5.3 9.5M7 16.5a7 7 0 0 0 11.7-2" />
      <path d="M17.5 3.5v4.5H13M6.5 20.5V16H11" />
    </>
  ),
  play: <path d="M7.5 5v14l11-7z" />,
  pause: <path d="M8 5.5v13M16 5.5v13" />,
  stop: <rect x="6.5" y="6.5" width="11" height="11" rx="2" />,
  step: (
    <>
      <path d="M5 5.5v13l8-6.5z" />
      <path d="M17.5 5.5v13" />
    </>
  ),
  restart: (
    <>
      <path d="M4.5 12a7.5 7.5 0 1 0 2.4-5.5" />
      <path d="M4.5 4v4.5H9" />
    </>
  ),
  clear: (
    <>
      <rect x="4" y="4" width="16" height="16" rx="3" />
      <path d="m9 9 6 6M15 9l-6 6" />
    </>
  ),
  star: <path d="m12 3.5 2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8L3.5 9.7l5.9-.9z" />,
  spark: <path d="M12 3c.6 4.6 2.4 6.4 7 7-4.6.6-6.4 2.4-7 7-.6-4.6-2.4-6.4-7-7 4.6-.6 6.4-2.4 7-7z" />,
  lock: (
    <>
      <rect x="5" y="10.5" width="14" height="10" rx="2.5" />
      <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" />
    </>
  ),
  bulb: (
    <>
      <path d="M9 17h6M10 20.5h4" />
      <path d="M12 3.5a6 6 0 0 0-3.6 10.8c.6.5.9 1.1.9 1.9V17h5.4v-.8c0-.8.3-1.4.9-1.9A6 6 0 0 0 12 3.5z" />
    </>
  ),
  save: (
    <>
      <path d="M5 4h11l3 3v13H5z" />
      <path d="M8 4v5h7V4M8 20v-6h8v6" />
    </>
  ),
  folder: <path d="M3.5 7.5a2 2 0 0 1 2-2h4l2 2h7a2 2 0 0 1 2 2v8.5a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2z" />,
  download: (
    <>
      <path d="M12 4v11M7 10.5l5 5 5-5" />
      <path d="M5 19.5h14" />
    </>
  ),
  film: (
    <>
      <rect x="3.5" y="4.5" width="17" height="15" rx="2.5" />
      <path d="M7.5 4.5v15M16.5 4.5v15M3.5 9.5h4M3.5 14.5h4M16.5 9.5h4M16.5 14.5h4" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  copy: (
    <>
      <rect x="8.5" y="8.5" width="11" height="11" rx="2.5" />
      <path d="M15.5 8.5V6a1.5 1.5 0 0 0-1.5-1.5H6A1.5 1.5 0 0 0 4.5 6v8A1.5 1.5 0 0 0 6 15.5h2.5" />
    </>
  ),
  trash: (
    <>
      <path d="M4.5 7h15M9.5 7V4.5h5V7M6.5 7l1 13h9l1-13" />
      <path d="M10.5 11v5.5M13.5 11v5.5" />
    </>
  ),
  sound: (
    <>
      <path d="M4.5 9.5h3l4.5-4v13l-4.5-4h-3z" />
      <path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11" />
    </>
  ),
  mute: (
    <>
      <path d="M4.5 9.5h3l4.5-4v13l-4.5-4h-3z" />
      <path d="m16 9.5 5 5M21 9.5l-5 5" />
    </>
  ),
  expand: <path d="M4.5 9V4.5H9M15 4.5h4.5V9M19.5 15v4.5H15M9 19.5H4.5V15" />,
  hat: (
    <>
      <path d="M3.5 19.5h17" />
      <path d="M6 19.5 11 4l7 15.5" />
      <path d="M8.5 13.5c2 .8 5 .8 7 0" />
    </>
  ),
  help: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M9.6 9.5a2.5 2.5 0 1 1 3.4 2.3c-.7.3-1 .8-1 1.5v.5M12 16.8v.2" />
    </>
  ),
  wand: (
    <>
      <path d="m4 20 11-11M13 7l2 2" />
      <path d="M18 3v3M16.5 4.5h3M20 9v2M19 10h2M10 3v2M9 4h2" />
    </>
  ),
  check: <path d="m5 12.5 4.5 4.5L19 7.5" />,
  undo: (
    <>
      <path d="M8 6.5 4 10.5l4 4" />
      <path d="M4 10.5h10a5.5 5.5 0 0 1 0 11h-2" />
    </>
  ),
  redo: (
    <>
      <path d="m16 6.5 4 4-4 4" />
      <path d="M20 10.5H10a5.5 5.5 0 0 0 0 11h2" />
    </>
  ),
  eye: (
    <>
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" />
      <circle cx="12" cy="12" r="2.8" />
    </>
  ),
  grid: <path d="M4 4h16v16H4zM9.3 4v16M14.7 4v16M4 9.3h16M4 14.7h16" />,
  book: (
    <>
      <path d="M12 6.5c-2-1.5-5-2-8-1.5v13c3-.5 6 0 8 1.5 2-1.5 5-2 8-1.5V5c-3-.5-6 0-8 1.5z" />
      <path d="M12 6.5v13" />
    </>
  ),
  close: <path d="m6 6 12 12M18 6 6 18" />,
  chevL: <path d="M14.5 5.5 8 12l6.5 6.5" />,
  chevR: <path d="M9.5 5.5 16 12l-6.5 6.5" />,
  code: <path d="m8.5 7-5 5 5 5M15.5 7l5 5-5 5M13.5 4.5l-3 15" />,
  target: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="4.5" />
      <circle cx="12" cy="12" r="1" />
    </>
  ),
  image: (
    <>
      <rect x="3.5" y="4.5" width="17" height="15" rx="2.5" />
      <circle cx="9" cy="9.5" r="1.8" />
      <path d="m20.5 15.5-5-5-9 9" />
    </>
  ),
  map: <path d="M3.5 6.5 9 4.5l6 2 5.5-2v13l-5.5 2-6-2-5.5 2zM9 4.5v13M15 6.5v13" />,
};

const FILLED: Partial<Record<IconName, boolean>> = { play: true, star: true, spark: true, stop: true };

export function Icon({ name, size = 22, style, className }: { name: IconName; size?: number; style?: CSSProperties; className?: string }) {
  const filled = FILLED[name];
  return (
    <svg
      className={`icon ${className ?? ''}`}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={style}
      aria-hidden="true"
    >
      {P[name]}
    </svg>
  );
}
