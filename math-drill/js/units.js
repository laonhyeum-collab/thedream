/* 연산 문제은행 — 단원 목록 (2022 개정 교육과정 기준)
 * school: 초/중, grade: 학년, sem: 학기, unit: 단원 이름, topic: 이 단원에서 나오는 문제,
 * inst: 문제지 위에 쓰는 안내 말, fig: 그림이 들어가는 단원
 * 교과서(출판사)마다 단원 이름·순서가 조금 다를 수 있어요. 연산 중심 단원만 골랐어요. */
(function (root) {
  'use strict';
  const UNITS = [
    // ---------- 초등 1학년 ----------
    { id: 'e11_addsub', school: '초', grade: 1, sem: 1, unit: '덧셈과 뺄셈', topic: '9까지의 수 모으기·가르기, 덧셈과 뺄셈', inst: '계산하세요. □ 안에는 알맞은 수를 쓰세요.' },
    { id: 'e12_addsub1', school: '초', grade: 1, sem: 2, unit: '덧셈과 뺄셈(1)', topic: '받아올림·받아내림이 없는 두 자리 수의 덧셈과 뺄셈', inst: '계산하세요.' },
    { id: 'e12_addsub2', school: '초', grade: 1, sem: 2, unit: '덧셈과 뺄셈(2)', topic: '10 만들기, 세 수의 계산, 받아올림·받아내림이 있는 계산', inst: '계산하세요.' },
    { id: 'e12_clock', school: '초', grade: 1, sem: 2, unit: '시계 보기', topic: '몇 시, 몇 시 30분 읽기', inst: '시계를 보고 몇 시인지 쓰세요.', fig: true },
    // ---------- 초등 2학년 ----------
    { id: 'e21_addsub', school: '초', grade: 2, sem: 1, unit: '덧셈과 뺄셈', topic: '받아올림·받아내림이 있는 두 자리 수 계산, 세 수의 계산', inst: '계산하세요.' },
    { id: 'e21_mul', school: '초', grade: 2, sem: 1, unit: '곱셈', topic: '묶어 세기, 몇의 몇 배, 곱셈식', inst: '물음에 답하세요.', fig: true },
    { id: 'e22_times', school: '초', grade: 2, sem: 2, unit: '곱셈구구', topic: '2단~9단, 1단과 0의 곱', inst: '계산하세요. □ 안에는 알맞은 수를 쓰세요.' },
    { id: 'e22_length', school: '초', grade: 2, sem: 2, unit: '길이 재기', topic: 'm와 cm, 길이의 덧셈과 뺄셈', inst: '계산하세요.' },
    { id: 'e22_time', school: '초', grade: 2, sem: 2, unit: '시각과 시간', topic: '몇 시 몇 분 읽기, 시간이 지난 뒤의 시각', inst: '시계를 보고 물음에 답하세요.', fig: true },
    // ---------- 초등 3학년 ----------
    { id: 'e31_addsub', school: '초', grade: 3, sem: 1, unit: '덧셈과 뺄셈', topic: '세 자리 수의 덧셈과 뺄셈', inst: '계산하세요.' },
    { id: 'e31_div', school: '초', grade: 3, sem: 1, unit: '나눗셈', topic: '곱셈구구로 나눗셈의 몫 구하기', inst: '계산하세요.' },
    { id: 'e31_mul', school: '초', grade: 3, sem: 1, unit: '곱셈', topic: '(두 자리 수) × (한 자리 수)', inst: '계산하세요.' },
    { id: 'e31_time', school: '초', grade: 3, sem: 1, unit: '길이와 시간', topic: '시간의 덧셈과 뺄셈 (시·분·초)', inst: '계산하세요.' },
    { id: 'e31_frac', school: '초', grade: 3, sem: 1, unit: '분수와 소수', topic: '색칠한 부분을 분수로, 수직선의 소수 읽기', inst: '그림을 보고 물음에 답하세요.', fig: true, unreduced: true },
    { id: 'e32_mul', school: '초', grade: 3, sem: 2, unit: '곱셈', topic: '(세 자리 수) × (한 자리 수), (두 자리 수) × (두 자리 수)', inst: '계산하세요.' },
    { id: 'e32_div', school: '초', grade: 3, sem: 2, unit: '나눗셈', topic: '나머지가 있는 나눗셈, (세 자리 수) ÷ (한 자리 수)', inst: '나눗셈의 몫과 나머지를 구하세요.' },
    { id: 'e32_circle', school: '초', grade: 3, sem: 2, unit: '원', topic: '원의 반지름과 지름', inst: '그림을 보고 물음에 답하세요.', fig: true },
    { id: 'e32_frac', school: '초', grade: 3, sem: 2, unit: '분수', topic: '전체의 분수만큼, 가분수와 대분수', inst: '물음에 답하세요.', unreduced: true },
    // ---------- 초등 4학년 ----------
    { id: 'e41_angle', school: '초', grade: 4, sem: 1, unit: '각도', topic: '각도의 합과 차, 삼각형의 세 각, 직선이 이루는 각', inst: '각도를 구하세요.', fig: true },
    { id: 'e41_muldiv', school: '초', grade: 4, sem: 1, unit: '곱셈과 나눗셈', topic: '(세 자리 수) × (두 자리 수), (세 자리 수) ÷ (두 자리 수)', inst: '계산하세요. 나눗셈은 몫과 나머지를 구하세요.' },
    { id: 'e42_frac', school: '초', grade: 4, sem: 2, unit: '분수의 덧셈과 뺄셈', topic: '분모가 같은 분수의 덧셈과 뺄셈', inst: '계산하세요. (4학년은 약분하지 않고 답을 써요. 가분수는 대분수로 나타내요.)', unreduced: true },
    { id: 'e42_dec', school: '초', grade: 4, sem: 2, unit: '소수의 덧셈과 뺄셈', topic: '소수 한·두 자리 수의 덧셈과 뺄셈', inst: '계산하세요.' },
    // ---------- 초등 5학년 ----------
    { id: 'e51_mixed', school: '초', grade: 5, sem: 1, unit: '자연수의 혼합 계산', topic: '덧셈·뺄셈·곱셈·나눗셈·괄호가 섞인 식', inst: '계산 순서를 생각하며 계산하세요.' },
    { id: 'e51_gcdlcm', school: '초', grade: 5, sem: 1, unit: '약수와 배수', topic: '약수, 최대공약수, 최소공배수', inst: '물음에 답하세요.' },
    { id: 'e51_reduce', school: '초', grade: 5, sem: 1, unit: '약분과 통분', topic: '기약분수, 통분, 분수의 크기 비교', inst: '물음에 답하세요.' },
    { id: 'e51_fracaddsub', school: '초', grade: 5, sem: 1, unit: '분수의 덧셈과 뺄셈', topic: '분모가 다른 분수의 덧셈과 뺄셈', inst: '계산하여 기약분수로 나타내세요. (가분수는 대분수로)' },
    { id: 'e51_area', school: '초', grade: 5, sem: 1, unit: '다각형의 둘레와 넓이', topic: '직사각형·정사각형·평행사변형·삼각형·사다리꼴·마름모', inst: '도형의 둘레나 넓이를 구하세요.', fig: true },
    { id: 'e52_fracmul', school: '초', grade: 5, sem: 2, unit: '분수의 곱셈', topic: '(분수) × (자연수), (분수) × (분수), 대분수의 곱셈', inst: '계산하여 기약분수로 나타내세요. (가분수는 대분수로)' },
    { id: 'e52_decmul', school: '초', grade: 5, sem: 2, unit: '소수의 곱셈', topic: '(소수) × (자연수), (소수) × (소수)', inst: '계산하세요.' },
    { id: 'e52_avg', school: '초', grade: 5, sem: 2, unit: '평균과 가능성', topic: '평균 구하기, 평균을 이용해 모르는 값 구하기', inst: '물음에 답하세요.' },
    // ---------- 초등 6학년 ----------
    { id: 'e61_fracdiv', school: '초', grade: 6, sem: 1, unit: '분수의 나눗셈', topic: '(자연수) ÷ (자연수), (분수) ÷ (자연수)', inst: '계산하여 기약분수로 나타내세요. (가분수는 대분수로)' },
    { id: 'e61_decdiv', school: '초', grade: 6, sem: 1, unit: '소수의 나눗셈', topic: '(소수) ÷ (자연수), (자연수) ÷ (자연수)의 몫을 소수로', inst: '계산하세요.' },
    { id: 'e61_ratio', school: '초', grade: 6, sem: 1, unit: '비와 비율', topic: '비율을 분수·소수·백분율로', inst: '물음에 답하세요.' },
    { id: 'e61_box', school: '초', grade: 6, sem: 1, unit: '직육면체의 부피와 겉넓이', topic: '직육면체·정육면체의 부피와 겉넓이', inst: '그림을 보고 물음에 답하세요.', fig: true },
    { id: 'e62_fracdiv', school: '초', grade: 6, sem: 2, unit: '분수의 나눗셈', topic: '(분수) ÷ (분수), (자연수) ÷ (분수), 대분수의 나눗셈', inst: '계산하여 기약분수로 나타내세요. (가분수는 대분수로)' },
    { id: 'e62_decdiv', school: '초', grade: 6, sem: 2, unit: '소수의 나눗셈', topic: '(소수) ÷ (소수), (자연수) ÷ (소수)', inst: '계산하세요.' },
    { id: 'e62_proportion', school: '초', grade: 6, sem: 2, unit: '비례식과 비례배분', topic: '비례식, 간단한 자연수의 비, 비례배분', inst: '물음에 답하세요.' },
    { id: 'e62_circle', school: '초', grade: 6, sem: 2, unit: '원의 넓이', topic: '원주와 원의 넓이 (원주율 3.14)', inst: '원주율은 3.14로 계산하세요.', fig: true },
    // ---------- 중학교 1학년 ----------
    { id: 'm11_prime', school: '중', grade: 1, sem: 1, unit: '소인수분해', topic: '소인수분해, 최대공약수와 최소공배수, 약수의 개수', inst: '물음에 답하세요.' },
    { id: 'm11_intaddsub', school: '중', grade: 1, sem: 1, unit: '정수와 유리수 (덧셈과 뺄셈)', topic: '정수와 유리수의 덧셈과 뺄셈', inst: '계산하세요.' },
    { id: 'm11_intmuldiv', school: '중', grade: 1, sem: 1, unit: '정수와 유리수 (곱셈과 나눗셈)', topic: '정수와 유리수의 곱셈·나눗셈·거듭제곱·혼합 계산', inst: '계산하세요.' },
    { id: 'm11_expr', school: '중', grade: 1, sem: 1, unit: '문자와 식', topic: '식의 값, 일차식의 덧셈과 뺄셈', inst: '물음에 답하세요.' },
    { id: 'm11_lineq', school: '중', grade: 1, sem: 1, unit: '일차방정식', topic: '일차방정식의 풀이 (괄호·분수·소수 포함)', inst: '방정식을 푸세요.' },
    { id: 'm12_angle', school: '중', grade: 1, sem: 2, unit: '기본 도형', topic: '맞꼭지각, 평행선의 동위각·엇각', inst: '∠x의 크기를 구하세요.', fig: true },
    { id: 'm12_polygon', school: '중', grade: 1, sem: 2, unit: '평면도형의 성질 (다각형)', topic: '대각선의 개수, 내각과 외각의 크기', inst: '물음에 답하세요.' },
    { id: 'm12_sector', school: '중', grade: 1, sem: 2, unit: '평면도형의 성질 (부채꼴)', topic: '부채꼴의 호의 길이·넓이·둘레 (π 사용)', inst: '원주율은 π로 계산하세요.', fig: true },
    // ---------- 중학교 2학년 ----------
    { id: 'm21_repeating', school: '중', grade: 2, sem: 1, unit: '유리수와 순환소수', topic: '순환마디, 순환소수를 분수로', inst: '물음에 답하세요.' },
    { id: 'm21_exp', school: '중', grade: 2, sem: 1, unit: '식의 계산 (지수법칙·단항식)', topic: '지수법칙, 단항식의 곱셈과 나눗셈', inst: '간단히 하세요.' },
    { id: 'm21_poly', school: '중', grade: 2, sem: 1, unit: '식의 계산 (다항식)', topic: '다항식의 덧셈과 뺄셈, (단항식) × (다항식), (다항식) ÷ (단항식)', inst: '간단히 하세요.' },
    { id: 'm21_ineq', school: '중', grade: 2, sem: 1, unit: '일차부등식', topic: '일차부등식의 풀이', inst: '부등식을 푸세요.' },
    { id: 'm21_system', school: '중', grade: 2, sem: 1, unit: '연립일차방정식', topic: '가감법·대입법으로 연립방정식 풀기', inst: '연립방정식을 푸세요.' },
    { id: 'm22_pyth', school: '중', grade: 2, sem: 2, unit: '피타고라스 정리', topic: '직각삼각형의 변의 길이, 직사각형의 대각선', inst: '그림에서 x의 값을 구하세요.', fig: true },
    // ---------- 중학교 3학년 ----------
    { id: 'm31_sqrt', school: '중', grade: 3, sem: 1, unit: '제곱근과 실수', topic: '근호를 포함한 식의 계산, 분모의 유리화', inst: '간단히 하세요.' },
    { id: 'm31_expand', school: '중', grade: 3, sem: 1, unit: '다항식의 곱셈', topic: '곱셈 공식으로 전개하기', inst: '전개하세요.' },
    { id: 'm31_factor', school: '중', grade: 3, sem: 1, unit: '인수분해', topic: '공통인수, 인수분해 공식', inst: '인수분해하세요.' },
    { id: 'm31_quad', school: '중', grade: 3, sem: 1, unit: '이차방정식', topic: '인수분해·제곱근·근의 공식으로 풀기', inst: '이차방정식을 푸세요.' },
    { id: 'm32_trig', school: '중', grade: 3, sem: 2, unit: '삼각비', topic: '직각삼각형의 삼각비, 특수각의 삼각비 계산', inst: '물음에 답하세요.', fig: true },
  ];
  const LEVELS = [
    { id: 1, name: '쉬움' },
    { id: 2, name: '보통' },
    { id: 3, name: '어려움' },
  ];
  const out = { UNITS, LEVELS };
  if (typeof module !== 'undefined' && module.exports) module.exports = out;
  else { root.MD_UNITS = UNITS; root.MD_LEVELS = LEVELS; }
})(typeof window !== 'undefined' ? window : this);
