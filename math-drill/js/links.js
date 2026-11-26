/* 연산 문제은행 ↔ 수학 개념 설명 사이트 연결 주소
 * 개념 사이트(학년·학기·단원 → 개념 → 영상 → 문제)와 문제은행은 같은 단원 id(js/units.js)를 써요.
 * 개념 사이트의 '문제 풀기'·'문제지 출력' 단추는 아래 주소로 오면 그 단원이 바로 열려요.
 *   화면으로 풀기: math-drill/solve.html#u=<단원 id>&d=<1~3>&s=<문제 번호>
 *   문제지 출력:   math-drill/index.html#u=<단원 id>&d=<1~3>&n=<문제 수>&s=<문제 번호>
 * 개념 사이트가 배포되면 CONCEPT_PAGE 에 주소를 넣어요. 그러면 문제은행 화면에 '개념 보기' 단추가 보여요. */
(function (root) {
  'use strict';
  const CONCEPT_PAGE = ''; // 예: '../math-concept/index.html' (개념 사이트 컨펌·배포 뒤)
  const q = (o) => Object.keys(o).filter((k) => o[k] !== undefined && o[k] !== '').map((k) => k + '=' + encodeURIComponent(o[k])).join('&');
  const API = {
    CONCEPT_PAGE,
    solve: (u, d, s) => './solve.html#' + q({ u, d, s }),
    print: (u, d, n, s) => './index.html#' + q({ u, d, n, s }),
    concept: (u) => (CONCEPT_PAGE ? CONCEPT_PAGE + '#' + q({ u }) : ''),
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else root.MD_LINKS = API;
})(typeof window !== 'undefined' ? window : this);
