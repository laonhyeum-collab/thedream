import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkLyrics, safeLyrics, tidyLyrics, LYRICS_MAX, LYRICS_MAX_LINES } from '../js/lyrics.js';
import { normalizeWork } from '../js/storage.js';

const pass = (t) => assert.equal(checkLyrics(t).ok, true, `통과해야 해요: ${t} (${checkLyrics(t).reason})`);
const fail = (t, reason) => {
  const r = checkLyrics(t);
  assert.equal(r.ok, false, `막아야 해요: ${t}`);
  if (reason) assert.equal(r.reason, reason, t);
  assert.ok(r.message.length > 5, '친절한 안내 문구');
};

test('어린이가 쓰는 고운 가사는 통과', () => {
  for (const t of [
    '시원한 빙수 한 그릇\n친구랑 나눠 먹자',
    '반짝반짝 작은 별',
    '무지개색 사탕이 좋아',
    '새끼손가락 걸고 약속해',
    '불이 꺼져도 무섭지 않아',
    '둥둥 북을 때려요 신나게',
    '아기 돼지야 꿀꿀',
    '하루에 운동 3번 튼튼해',
    '우리 학교 운동장에서 뛰어놀자',
    '1, 2, 3, 4 박자를 세어 봐',
    'Twinkle twinkle little star',
    'We love music class',
    '강아지 이름은 뽀삐',
    '로켓 1호 우주로 출발',
  ]) pass(t);
});

test('욕설·놀리는 말·무서운 말은 막아요 (띄어쓰기·기호로 숨겨도)', () => {
  for (const t of ['씨발', '시 발 놈', '씨.발', 'ㅅㅂ', '병신아', '개새끼', '존나 좋아', '지랄하네', '멍청이 바보야',
    '너 죽여 버릴 거야', '죽어라', '자살', 'fuck', 'F*CK you', 'f u c k', 'shit', 'you are stupid', 'I will kill you', 'shut up', '🖕']) {
    fail(t, 'badWord');
  }
});

test('개인 정보는 막아요', () => {
  for (const t of [
    '내 번호는 010-1234-5678',
    '01012345678',
    '전화번호 알려줄게',
    'abc@school.kr 로 연락해',
    '우리 집 주소는 비밀',
    '행복로 12-3 놀러 와',
    '해님아파트 101동 202호',
    '제 이름은 김하늘',
    'my name is Tom',
    '해맑초등학교 다녀요',
    '3학년 2반 친구들',
  ]) fail(t, 'personal');
  fail('www.example.com 에 와', 'link');
  fail('https://a.b', 'link');
});

test('길이·줄 수 제한, 빈 가사', () => {
  fail('', 'empty');
  fail('   \n  ', 'empty');
  pass('가'.repeat(LYRICS_MAX));
  fail('가'.repeat(LYRICS_MAX + 1), 'tooLong');
  fail(Array.from({ length: LYRICS_MAX_LINES + 1 }, () => '랄라').join('\n'), 'tooManyLines');
  pass(Array.from({ length: LYRICS_MAX_LINES }, () => '랄라').join('\n'));
});

test('정리: 공백·보이지 않는 글자·빈 줄', () => {
  assert.equal(tidyLyrics('  안녕   하세요 \r\n\n\n\n 반가워​요 '), '안녕 하세요\n\n반가워요');
  assert.equal(checkLyrics('  랄라  ').text, '랄라');
});

test('저장된 가사는 다시 검사해서 통과한 것만 살려요', () => {
  assert.equal(safeLyrics('반짝반짝'), '반짝반짝');
  assert.equal(safeLyrics('씨발'), '');
  assert.equal(safeLyrics(123), '');
  assert.equal(normalizeWork({ theme: 'bingsu', items: [], lyrics: '010-1234-5678' }).lyrics, '');
  assert.equal(normalizeWork({ theme: 'bingsu', items: [], lyrics: '랄라 노래해' }).lyrics, '랄라 노래해');
  assert.equal(normalizeWork({ theme: 'bingsu', items: [] }).lyrics, '');
});
