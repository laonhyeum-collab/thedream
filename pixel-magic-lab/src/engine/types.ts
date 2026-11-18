// ─────────────────────────────────────────────
//  명령 블록 데이터 구조 (실행 엔진과 화면은 이 구조만 공유합니다)
// ─────────────────────────────────────────────

export type Dir = 'up' | 'down' | 'left' | 'right';

/** 팔레트 색 이름(키). null 은 빈 칸 */
export type ColorKey = string;
export type Cell = ColorKey | null;

export type Block =
  | { id: string; type: 'move'; dir: Dir }
  | { id: string; type: 'paint' }
  | { id: string; type: 'erase' }
  | { id: string; type: 'color'; color: ColorKey }
  | { id: string; type: 'goto'; x: number; y: number }
  | { id: string; type: 'repeat'; times: number; body: Block[] };

export type BlockType = Block['type'];

/** 한 줄로 펼친 그림. index = y * width + x */
export interface Grid {
  width: number;
  height: number;
  cells: Cell[];
}

export type ErrorCode =
  | 'out-of-bounds'
  | 'repeat-too-big'
  | 'repeat-too-small'
  | 'too-long'
  | 'empty'
  | 'bad-goto';

export interface RunError {
  code: ErrorCode;
  blockId: string | null;
  message: string;
  /** 도화지 밖으로 나가려던 좌표 (out-of-bounds 일 때) */
  target?: { x: number; y: number };
}

export interface LoopFrame {
  blockId: string;
  /** 1부터 시작하는 현재 반복 번째 */
  iter: number;
  times: number;
}

/** 실행 엔진이 내보내는 '한 걸음' 정보 */
export interface Step {
  index: number;
  blockId: string;
  blockType: BlockType;
  /** 이 명령 실행 후 펜 위치 */
  x: number;
  y: number;
  /** 이 명령 실행 후 선택된 색 */
  color: ColorKey;
  /** 픽셀이 바뀐 경우 */
  change?: { x: number; y: number; from: Cell; to: Cell };
  /** 이 명령을 감싼 반복 블록들 (바깥 → 안쪽) */
  loops: LoopFrame[];
  error?: RunError;
}

export interface RunResult {
  steps: Step[];
  /** 모든 걸음을 적용한 최종 그림 */
  final: Grid;
  error: RunError | null;
  startColor: ColorKey;
}
