// 픽셀 꼬마 마법사 '도트' — 앱의 안내 캐릭터 (픽셀로 그린 SVG)
import { colorHex, parseArt } from '../data/palette';

const BASE = [
  '......PP......',
  '.....PPPP.....',
  '....PPYPPP....',
  '...PPPPPPPP...',
  '..PPPPPPPYPP..',
  '.PPPPPPPPPPPP.',
  'DDDDDDDDDDDDDD',
  '...CCCCCCCC...',
  '..CCDCCCCDCC..',
  '..CKCCCCCCKC..',
  '...CCCDDCCC...',
  '....SSSSSS....',
  '...SSSSSSSS..Y',
  '..SSSSSSSSSSN.',
];

const MOODS: Record<string, Partial<Record<number, string>>> = {
  happy: { 10: '...CCDDDDCC...' },
  think: { 8: '..CCDCCCCDCC..', 10: '...CCCCDDCC...' },
  wow: { 8: '..CDDCCCCDDC..', 10: '...CCCDDCCC...' },
  calm: {},
};

export type Mood = 'happy' | 'think' | 'wow' | 'calm';

export function Mascot({ mood = 'calm', size = 72, bounce = false }: { mood?: Mood; size?: number; bounce?: boolean }) {
  const rows = BASE.map((r, i) => MOODS[mood]?.[i] ?? r);
  const art = parseArt(rows);
  const rects = [];
  for (let y = 0; y < art.height; y++)
    for (let x = 0; x < art.width; x++) {
      const c = art.cells[y * art.width + x];
      if (c) rects.push(<rect key={`${x}-${y}`} x={x} y={y} width={1.02} height={1.02} fill={colorHex(c)} />);
    }
  return (
    <svg
      className={`mascot ${bounce ? 'bounce' : ''}`}
      width={size}
      height={size}
      viewBox={`-0.5 -0.5 ${art.width + 1} ${art.height + 1}`}
      shapeRendering="crispEdges"
      aria-hidden="true"
    >
      {rects}
    </svg>
  );
}

/** 상단 로고: 픽셀 별이 박힌 마법 모자 */
export function Logo({ size = 44 }: { size?: number }) {
  const rows = ['....Y...', '...PPY..', '...PPP..', '..PPKPP.', '..PPPPP.', '.PPPPPPP', 'DDDDDDDD', '.N....N.'];
  const art = parseArt(rows);
  return (
    <svg width={size} height={size} viewBox="-1 -1 10 10" shapeRendering="crispEdges" aria-hidden="true">
      <rect x="-1" y="-1" width="10" height="10" rx="2.2" fill="#FFF3D6" />
      {art.cells.map((c, i) =>
        c ? <rect key={i} x={i % art.width} y={Math.floor(i / art.width)} width={1.02} height={1.02} fill={colorHex(c)} /> : null,
      )}
    </svg>
  );
}
