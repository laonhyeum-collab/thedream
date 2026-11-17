// ─────────────────────────────────────────────
//  마법 따라 그리기 미션 (모든 미션은 tests 에서 정답 코드로 실제 실행하여 검증합니다)
// ─────────────────────────────────────────────
import type { Block, ColorKey, Grid } from '../engine/types';
import type { NewBlockKind } from '../engine/tree';
import { B } from '../engine/tree';
import { parseArt } from './palette';

export type Level = 'easy' | 'normal' | 'challenge';

export const LEVEL_INFO: Record<Level, { name: string; grade: string }> = {
  easy: { name: '쉬움', grade: '1~2학년' },
  normal: { name: '보통', grade: '3~4학년' },
  challenge: { name: '도전', grade: '5~6학년' },
};

export interface Mission {
  id: string;
  num: number;
  title: string;
  concept: string;
  level: Level;
  art: string[];
  startColor: ColorKey;
  colors: ColorKey[];
  blocks: NewBlockKind[];
  /** 오늘 배울 마법 개념 (짧은 소개) */
  intro: string;
  goal: string;
  hints: string[];
  /** 정답 예시 (교사용 '완성 코드 보기' 와 자동 테스트에 사용) */
  solution: () => Block[];
  /** 고장 난 코드로 시작하는 디버깅 미션 */
  initialCode?: () => Block[];
  /** 이 블록 수 이하로 완성하면 효율 보너스 별 */
  par: number;
}

const MOVES: NewBlockKind[] = ['move-up', 'move-down', 'move-left', 'move-right'];
const BASIC: NewBlockKind[] = [...MOVES, 'paint'];
const WITH_COLOR: NewBlockKind[] = [...BASIC, 'color', 'erase'];
const WITH_GOTO: NewBlockKind[] = [...WITH_COLOR, 'goto'];
const ALL: NewBlockKind[] = [...WITH_GOTO, 'repeat'];

const { up, down, left, right, paint, color, goto, repeat } = B;
const P = () => paint();

export const MISSIONS: Mission[] = [
  {
    id: 'm1',
    num: 1,
    title: '첫 번째 마법 점',
    concept: '색칠 명령',
    level: 'easy',
    art: ['....', '.K..', '....', '....'],
    startColor: 'pink',
    colors: ['pink'],
    blocks: ['move-right', 'move-down', 'paint'],
    intro: '마법 펜은 왼쪽 위 칸에서 출발해요. 펜을 옮긴 다음 「칠하기」 블록을 쓰면 그 칸에 색이 칠해져요!',
    goal: '분홍 점 하나를 목표 그림과 같은 자리에 찍어 보세요.',
    hints: [
      '목표 점은 출발 칸에서 오른쪽으로 1칸, 아래로 1칸 떨어져 있어요.',
      '「오른쪽으로」 블록과 「아래로」 블록을 하나씩 넣어 보세요.',
      '오른쪽으로 → 아래로 → 칠하기 순서로 놓으면 완성!',
    ],
    solution: () => [right(), down(), P()],
    par: 3,
  },
  {
    id: 'm2',
    num: 2,
    title: '반짝이는 가로줄',
    concept: '이동과 순서',
    level: 'easy',
    art: ['......', '.YYYY.', '......', '......'],
    startColor: 'yellow',
    colors: ['yellow'],
    blocks: BASIC,
    intro: '명령 블록은 위에서부터 아래로 한 개씩 차례대로 실행돼요. 이것을 「순차 실행」이라고 해요.',
    goal: '노란 가로줄 4칸을 그려 보세요.',
    hints: [
      '먼저 가로줄이 시작되는 칸까지 펜을 옮겨요.',
      '「칠하기」와 「오른쪽으로」를 번갈아 놓으면 줄이 그려져요.',
      '아래로 → 오른쪽으로 → 칠하기 → (오른쪽으로 → 칠하기) 3번 더!',
    ],
    solution: () => [down(), right(), P(), right(), P(), right(), P(), right(), P()],
    par: 9,
  },
  {
    id: 'm3',
    num: 3,
    title: '알록달록 계단',
    concept: '방향 명령 · 색 바꾸기',
    level: 'easy',
    art: ['....S', '...GS', '..YG.', '.OY..', 'RO...'],
    startColor: 'red',
    colors: ['red', 'orange', 'yellow', 'green', 'sky'],
    blocks: WITH_COLOR,
    intro: '「색 고르기」 블록을 쓰면 마법 펜의 잉크 색이 바뀌어요. 위·아래·왼쪽·오른쪽, 네 방향을 모두 써 봐요!',
    goal: '왼쪽 아래에서 오른쪽 위로 올라가는 무지개 계단을 그려 보세요.',
    hints: [
      '계단은 맨 아래 줄에서 시작해요. 먼저 아래로 4칸 내려가요.',
      '한 계단은 「오른쪽으로 → 색 고르기 → 칠하기 → 위로 → 칠하기」 모양이에요.',
      '빨강 칸을 칠한 뒤, 같은 모양을 주황·노랑·초록·하늘 순서로 4번 쌓아요.',
    ],
    solution: () => [
      down(), down(), down(), down(), P(),
      right(), color('orange'), P(), up(), P(),
      right(), color('yellow'), P(), up(), P(),
      right(), color('green'), P(), up(), P(),
      right(), color('sky'), P(), up(), P(),
    ],
    par: 25,
  },
  {
    id: 'm4',
    num: 4,
    title: '네모난 마법 창문',
    concept: '이동과 패턴',
    level: 'easy',
    art: ['SSSS', 'S..S', 'S..S', 'SSSS'],
    startColor: 'sky',
    colors: ['sky', 'blue'],
    blocks: WITH_COLOR,
    intro: '똑같은 움직임이 여러 번 나오는 것을 「패턴」이라고 해요. 네모의 네 변을 그릴 때 어떤 패턴이 있는지 찾아봐요.',
    goal: '도화지 테두리를 따라 하늘색 창문 틀을 그려 보세요.',
    hints: [
      '오른쪽 → 아래 → 왼쪽 → 위, 시계 방향으로 한 바퀴 돌아요.',
      '한 변마다 「이동 → 칠하기」가 3번씩 나와요.',
      '마지막 위쪽 변은 2번만 하면 돼요. 출발 칸은 처음에 칠해 두었으니까요!',
    ],
    solution: () => [
      P(),
      right(), P(), right(), P(), right(), P(),
      down(), P(), down(), P(), down(), P(),
      left(), P(), left(), P(), left(), P(),
      up(), P(), up(), P(),
    ],
    par: 23,
  },
  {
    id: 'm5',
    num: 5,
    title: '하트 만들기',
    concept: '좌표와 색칠',
    level: 'normal',
    art: ['.R.R.', 'R.R.R', 'R...R', '.R.R.', '..R..'],
    startColor: 'red',
    colors: ['red', 'pink'],
    blocks: WITH_GOTO,
    intro: '칸마다 주소가 있어요! (가로, 세로) 두 숫자로 나타내고 「좌표」라고 해요. 왼쪽 위 칸이 (0, 0)이에요. 「좌표로 이동」 블록은 펜을 그 칸으로 순간이동 시켜요.',
    goal: '점 10개로 된 하트 별자리를 그려 보세요.',
    hints: [
      '도화지 위쪽과 왼쪽에 적힌 숫자를 보면 칸의 좌표를 알 수 있어요.',
      '맨 위 두 점은 (1, 0) 과 (3, 0) 이에요.',
      '「좌표로 이동 → 칠하기」 한 쌍이 점 하나예요. 10쌍을 만들어요.',
    ],
    solution: () => [
      goto(1, 0), P(), goto(3, 0), P(),
      goto(0, 1), P(), goto(2, 1), P(), goto(4, 1), P(),
      goto(0, 2), P(), goto(4, 2), P(),
      goto(1, 3), P(), goto(3, 3), P(),
      goto(2, 4), P(),
    ],
    par: 20,
  },
  {
    id: 'm6',
    num: 6,
    title: '반복되는 무지개',
    concept: '반복문',
    level: 'normal',
    art: ['RRRRRR', 'OOOOOO', 'YYYYYY', 'GGGGGG'],
    startColor: 'red',
    colors: ['red', 'orange', 'yellow', 'green', 'sky'],
    blocks: ALL,
    intro: '「반복하기」 블록 안에 명령을 넣으면 그 명령들을 여러 번 되풀이해요. 같은 일을 여러 번 할 때 블록 수가 확 줄어들어요!',
    goal: '반복하기 블록을 사용해서 4줄 무지개를 그려 보세요.',
    hints: [
      '한 줄은 「칠하기」 1번 + 「옆으로 이동 → 칠하기」 5번이에요.',
      '「반복하기 5번」 안에 「오른쪽으로」와 「칠하기」를 넣어 보세요.',
      '한 줄을 다 그리면 아래로 내려가 색을 바꾸고, 이번엔 왼쪽으로 반복해요.',
    ],
    solution: () => [
      P(), repeat(5, [right(), P()]),
      down(), color('orange'), P(), repeat(5, [left(), P()]),
      down(), color('yellow'), P(), repeat(5, [right(), P()]),
      down(), color('green'), P(), repeat(5, [left(), P()]),
    ],
    par: 22,
  },
  {
    id: 'm7',
    num: 7,
    title: '마법사의 꽃',
    concept: '반복과 패턴',
    level: 'normal',
    art: ['..K..K..K..', '.KYKKYKKYK.', '..K..K..K..', '..G..G..G..'],
    startColor: 'pink',
    colors: ['pink', 'yellow', 'green', 'purple'],
    blocks: ALL,
    intro: '똑같은 꽃이 3송이 있어요. 꽃 한 송이를 그리는 마법을 만든 다음, 반복하기로 3번 되풀이하면 꽃밭이 돼요!',
    goal: '꽃 3송이를 그려 보세요. 꽃 한 송이 코드를 반복하기 안에 넣어 봐요.',
    hints: [
      '꽃 한 송이를 그린 뒤에는 펜이 꽃의 맨 위 칸으로 돌아와야 다음 꽃을 똑같이 그릴 수 있어요.',
      '꽃과 꽃 사이는 3칸 떨어져 있어요. 반복 안에서 오른쪽으로 2칸 가서 꽃을 그리고, 1칸 더 가요.',
      '꽃 한 송이: 분홍 칠하기 → 아래 → 왼쪽 칠하기 → 오른쪽 2칸 칠하기 → 왼쪽·아래 칠하기 → 위·노랑 칠하기 → 아래 2칸·초록 칠하기 → 위로 3칸',
    ],
    solution: () => [
      repeat(3, [
        right(), right(),
        color('pink'), P(), down(), left(), P(), right(), right(), P(), left(), down(), P(),
        up(), color('yellow'), P(), down(), down(), color('green'), P(), up(), up(), up(),
        right(),
      ]),
    ],
    par: 25,
  },
  {
    id: 'm8',
    num: 8,
    title: '귀여운 버섯',
    concept: '색 바꾸기와 반복',
    level: 'normal',
    art: ['..RRR..', '.RRWRR.', 'RWRRRWR', 'RRRRRRR', '..CCC..', '..CCC..'],
    startColor: 'red',
    colors: ['red', 'white', 'cream', 'brown', 'pink'],
    blocks: ALL,
    intro: '큰 부분을 먼저 칠하고, 작은 무늬는 나중에 덧칠해도 돼요. 이미 칠한 칸에 다른 색을 칠하면 새 색으로 바뀌어요.',
    goal: '빨간 갓에 하얀 점무늬가 있는 버섯을 그려 보세요.',
    hints: [
      '빨간 갓 4줄을 먼저 칠해요. 줄마다 반복하기를 쓰면 짧아져요.',
      '하얀 점 3개는 「색 고르기: 하양」 뒤에 덧칠해요. 좌표로 이동을 써도 좋아요.',
      '버섯 기둥은 크림색 3칸짜리 줄 2개예요.',
    ],
    solution: () => [
      right(), right(), P(), repeat(2, [right(), P()]),
      down(), right(), P(), repeat(4, [left(), P()]),
      down(), left(), P(), repeat(6, [right(), P()]),
      down(), P(), repeat(6, [left(), P()]),
      color('white'), goto(3, 1), P(), goto(1, 2), P(), goto(5, 2), P(),
      color('cream'), goto(2, 4), P(), repeat(2, [right(), P()]),
      down(), P(), repeat(2, [left(), P()]),
    ],
    par: 41,
  },
  {
    id: 'm9',
    num: 9,
    title: '별빛 장식',
    concept: '중첩 반복 · 효율',
    level: 'challenge',
    art: ['Y.Y.Y.Y', '.......', 'Y.Y.Y.Y', '.......', 'Y.Y.Y.Y', '.......', 'Y.Y.Y.Y'],
    startColor: 'yellow',
    colors: ['yellow', 'sky', 'white'],
    blocks: ALL,
    intro: '반복하기 안에 또 반복하기를 넣을 수 있어요! 이것을 「중첩 반복」이라고 해요. 한 줄 그리기를 반복하고, 그 줄을 또 반복해요.',
    goal: '별빛 16개를 가장 적은 블록으로 그려 보세요. (15개 이하면 효율 보너스!)',
    hints: [
      '한 줄: 「칠하기 → 오른쪽 → 오른쪽」을 3번 반복하고, 마지막에 칠하기 1번.',
      '다음 줄로 가려면 아래로 2칸, 왼쪽으로 6칸 가야 해요. 왼쪽 6칸도 반복으로!',
      '「한 줄 + 다음 줄로 이동」을 3번 반복한 뒤, 마지막 줄은 한 번 더 그려요. (마지막에 아래로 가면 도화지 밖이에요!)',
    ],
    solution: () => [
      repeat(3, [repeat(3, [P(), right(), right()]), P(), down(), down(), repeat(6, [left()])]),
      repeat(3, [P(), right(), right()]),
      P(),
    ],
    par: 15,
  },
  {
    id: 'm10',
    num: 10,
    title: '마법사의 시험',
    concept: '종합 미션',
    level: 'challenge',
    art: ['PPPPPPP', 'P.....P', 'P.KKK.P', 'P.KYK.P', 'P.KKK.P', 'P.....P', 'PPPPPPP'],
    startColor: 'purple',
    colors: ['purple', 'pink', 'yellow', 'mint'],
    blocks: ALL,
    intro: '지금까지 배운 마법을 모두 써 봐요! 이동, 색 바꾸기, 좌표, 반복을 함께 쓰면 복잡한 그림도 짧은 코드로 그릴 수 있어요.',
    goal: '보라 테두리 안에 분홍 네모, 가운데 노란 보석을 그려 보세요.',
    hints: [
      '바깥 테두리: 「칠하기 → 이동」을 6번 반복하는 것을 오른쪽·아래·왼쪽·위로 4번 해요.',
      '안쪽 분홍 네모는 (2, 2)에서 시작해요. 같은 방법으로 2번씩 반복해요.',
      '마지막으로 가운데 (3, 3)에 노랑을 칠해요.',
    ],
    solution: () => [
      repeat(6, [P(), right()]), repeat(6, [P(), down()]), repeat(6, [P(), left()]), repeat(6, [P(), up()]),
      goto(2, 2), color('pink'),
      repeat(2, [P(), right()]), repeat(2, [P(), down()]), repeat(2, [P(), left()]), repeat(2, [P(), up()]),
      goto(3, 3), color('yellow'), P(),
    ],
    par: 29,
  },
  {
    id: 'm11',
    num: 11,
    title: '고장 난 마법 고치기',
    concept: '디버깅',
    level: 'challenge',
    art: ['.....', '.D.D.', '.....', 'D...D', '.DDD.'],
    startColor: 'black',
    colors: ['black', 'pink', 'red'],
    blocks: ALL,
    intro: '코드 속 실수를 찾아 고치는 것을 「디버깅」이라고 해요. 「한 단계」 버튼으로 천천히 실행하면서 어디서 달라지는지 살펴봐요!',
    goal: '웃는 얼굴 마법이 고장 났어요. 잘못된 블록을 찾아 고쳐 주세요.',
    hints: [
      '「한 단계」 버튼을 눌러 펜이 어디로 가는지 하나씩 확인해 보세요.',
      '첫 번째 눈의 위치가 이상해요. 오른쪽으로 너무 많이 가지 않았나요?',
      '입을 그리는 반복 횟수가 너무 많아서 펜이 도화지 밖으로 나가요. 2번이면 충분해요.',
    ],
    initialCode: () => [
      right(), right(), down(), P(), right(), right(), P(),
      down(), down(), right(), P(),
      down(), left(), P(), repeat(4, [left(), P()]),
      left(), up(), P(),
    ],
    solution: () => [
      right(), down(), P(), right(), right(), P(),
      down(), down(), right(), P(),
      down(), left(), P(), repeat(2, [left(), P()]),
      left(), up(), P(),
    ],
    par: 19,
  },
  {
    id: 'm12',
    num: 12,
    title: '체크무늬 마법 융단',
    concept: '중첩 반복 알고리즘',
    level: 'challenge',
    art: ['P.P.P.P', '.P.P.P.', 'P.P.P.P', '.P.P.P.', 'P.P.P.P', '.P.P.P.', 'P.P.P.P'],
    startColor: 'purple',
    colors: ['purple', 'mint', 'pink'],
    blocks: ALL,
    intro: '두 줄씩 짝을 지어 보면 같은 모양이 되풀이돼요. 「두 줄 그리기」를 반복하는 알고리즘을 설계해 봐요!',
    goal: '보라색 체크무늬 융단을 20개 이하의 블록으로 그려 보세요.',
    hints: [
      '첫 줄(4칸)은 「칠하기 → 오른쪽 → 오른쪽」 3번 반복 + 칠하기로 그려요.',
      '둘째 줄은 오른쪽 끝에서 시작해 왼쪽으로 2칸씩 가며 칠해요.',
      '「아래·왼쪽으로 가서 둘째 줄 그리기 → 아래·왼쪽으로 가서 첫째 줄 그리기」를 3번 반복해요.',
    ],
    solution: () => [
      repeat(3, [P(), right(), right()]), P(),
      repeat(3, [
        down(), left(), P(), repeat(2, [left(), left(), P()]),
        down(), left(),
        repeat(3, [P(), right(), right()]), P(),
      ]),
    ],
    par: 20,
  },
];

export function missionTarget(m: Mission): Grid {
  return parseArt(m.art);
}
