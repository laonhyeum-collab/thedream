import { test } from 'node:test';
import assert from 'node:assert/strict';
import { suggestLyrics, musicShape, countSyllables, cleanTopic, cleanKeywords, moodOf, MIN_SYLLABLES, MAX_SYLLABLES } from '../js/lyric-ideas.js';
import { checkLyrics, LYRICS_MAX_LINES } from '../js/lyrics.js';
import { SONGS, songItems } from '../js/songs.js';
import { getTheme } from '../js/themes.js';

const item = (row, size, col = 0) => ({ id: `t${row}-${col}`, ing: 'ice', row, col, size });

test('음절 세기: 한글은 한 글자 = 한 음절, 띄어쓰기는 안 세요', () => {
  assert.equal(countSyllables('우리 강아지'), 5);
  assert.equal(countSyllables('랄라 노래해요!'), 6);
  assert.equal(countSyllables(''), 0);
  assert.equal(countSyllables('로켓 1호'), 4);
  assert.equal(countSyllables('star'), 1);
});

test('음악 모양: 박자 수 → 줄 수, 빠르기 → 한 줄 글자 수, 악단 → 느낌', () => {
  // 컵이 비면 4마디(4줄)
  assert.equal(musicShape({ items: [], bpm: 100 }).lines, 4);
  // 4박 × 4줄 = 16박
  const four = [1, 2, 3, 4].map((r) => item(r, 4));
  assert.equal(musicShape({ items: four, bpm: 100 }).lines, 4);
  // 8박 → 2줄
  assert.equal(musicShape({ items: [item(0, 4), item(1, 4)], bpm: 100 }).lines, 2);
  // 아주 짧아도 2줄, 아무리 길어도 4줄
  assert.equal(musicShape({ items: [item(0, 1)], bpm: 100 }).lines, 2);
  assert.equal(musicShape({ items: Array.from({ length: 10 }, (_, r) => item(r, 4)), bpm: 100 }).lines, LYRICS_MAX_LINES);
  // 느린 노래는 한 줄에 글자가 더 많고, 빠른 노래는 적어요
  const slow = musicShape({ items: four, bpm: 60 }).syllables;
  const mid = musicShape({ items: four, bpm: 100 }).syllables;
  const fast = musicShape({ items: four, bpm: 160 }).syllables;
  assert.ok(slow > mid && mid > fast, `${slow} > ${mid} > ${fast}`);
  for (const s of [slow, mid, fast]) assert.ok(s >= MIN_SYLLABLES && s <= MAX_SYLLABLES);
  // 느낌
  assert.equal(moodOf('gugak', 100), 'gugak');
  assert.equal(moodOf('jazz', 100), 'jazz');
  assert.equal(moodOf('space', 100), 'space');
  assert.equal(moodOf('pop', 140), 'excited');
  assert.equal(moodOf('pop', 80), 'calm');
  assert.equal(moodOf('pop', 100), 'happy');
});

test('제안 가사는 줄 수와 줄마다 글자 수가 음악에 꼭 맞아요', () => {
  const topics = ['우리 강아지', '겨울 눈사람', '아이스크림', '커다란 겨울 눈사람 노래', '우주 여행', '생일 파티', '고양이', 'my cat'];
  const shapes = [];
  for (const bpm of [60, 80, 100, 120, 160]) {
    for (const progression of ['pop', 'gugak', 'jazz', 'space', 'classical']) {
      for (const n of [0, 1, 2, 3, 4, 6, 8]) {
        shapes.push(musicShape({ items: Array.from({ length: n }, (_, r) => item(r, 1 + (r % 4))), bpm, progression }));
      }
    }
  }
  let total = 0;
  for (const topic of topics) {
    for (const shape of shapes) {
      const r = suggestLyrics({ topic, content: '산책, 공놀이', shape, seed: 3, themeId: 'bingsu' });
      assert.equal(r.ok, true, topic);
      assert.ok(r.suggestions.length >= 2, `2개 이상 제안 (${topic}, ${JSON.stringify(shape)})`);
      const texts = new Set();
      for (const sg of r.suggestions) {
        assert.equal(sg.lines.length, shape.lines);
        for (const line of sg.lines) assert.equal(countSyllables(line), shape.syllables, `${line} → ${shape.syllables}글자`);
        assert.equal(checkLyrics(sg.text).ok, true, `교육용 체크 통과: ${sg.text}`);
        assert.equal(sg.text, sg.lines.join('\n'));
        texts.add(sg.text);
        total++;
      }
      assert.equal(texts.size, r.suggestions.length, '제안끼리 서로 달라요');
    }
  }
  assert.ok(total > 500);
});

test('첫 줄에는 주제가 들어가요 (주제가 길면 마지막 낱말)', () => {
  const shape = musicShape({ bpm: 100 });
  for (let seed = 1; seed <= 20; seed++) {
    const r = suggestLyrics({ topic: '우리 강아지', shape, seed });
    for (const sg of r.suggestions) assert.match(sg.lines[0], /강아지/);
  }
  const short = musicShape({ items: [item(0, 4), item(1, 4)], bpm: 160 }); // 2줄 · 5글자
  const r = suggestLyrics({ topic: '커다란 겨울 눈사람', shape: short, seed: 1 });
  for (const sg of r.suggestions) assert.match(sg.lines[0], /눈사람/);
});

test('끝소리 맞추기(라임)와 내용 낱말이 들어가요', () => {
  const shape = musicShape({ bpm: 100 }); // 4줄
  const r = suggestLyrics({ topic: '겨울 눈사람', content: '당근 코', shape, seed: 7 });
  for (const sg of r.suggestions) {
    const ends = sg.lines.map((l) => l.slice(-1));
    assert.ok(ends.some((e, i) => ends.indexOf(e) !== i), `끝소리가 맞는 줄이 있어요: ${sg.rhyme}`);
    assert.match(sg.lines[0], /눈사람/);
    assert.equal(sg.rhyme, ends.join('-'));
  }
  assert.deepEqual(r.keywords, ['당근', '코']);
  for (const sg of r.suggestions) assert.match(sg.text, /당근|코/, `내용 낱말이 들어가요: ${sg.text}`);
});

test('아이가 쓴 내용 낱말은 (자리가 되면) 제안마다 들어가요', () => {
  for (const progression of ['pop', 'gugak', 'jazz', 'space']) {
    for (const bpm of [70, 100, 150]) {
      const shape = musicShape({ bpm, progression });
      for (let seed = 1; seed <= 5; seed++) {
        const r = suggestLyrics({ topic: '겨울 눈사람', content: '당근 코, 목도리', shape, seed });
        for (const sg of r.suggestions) assert.match(sg.text, /당근|코|목도리/, `${progression} ${bpm}: ${sg.text}`);
      }
    }
  }
});

test('같은 주제 + 같은 씨앗이면 언제나 같은 가사, 씨앗을 바꾸면 다른 가사', () => {
  const shape = musicShape({ items: [item(0, 3), item(1, 3), item(2, 3), item(3, 3)], bpm: 110 });
  const a = suggestLyrics({ topic: '우리 강아지', content: '산책', shape, seed: 5, themeId: 'bingsu' });
  const b = suggestLyrics({ topic: '우리 강아지', content: '산책', shape, seed: 5, themeId: 'bingsu' });
  assert.deepEqual(a, b);
  const texts = (r) => r.suggestions.map((s) => s.text).join('|');
  const others = [6, 7, 8].map((seed) => texts(suggestLyrics({ topic: '우리 강아지', content: '산책', shape, seed, themeId: 'bingsu' })));
  assert.ok(others.some((t) => t !== texts(a)), '다른 가사 보기를 누르면 바뀌어요');
});

test('빈 주제는 친절하게 주제를 물어봐요', () => {
  for (const topic of ['', '   ', '!!!', '\n', undefined, null, 'ㅋㅋ']) {
    const r = suggestLyrics({ topic, shape: musicShape() });
    assert.equal(r.ok, false);
    assert.equal(r.reason, 'emptyTopic');
    assert.match(r.message, /주제/);
    assert.deepEqual(r.suggestions, []);
  }
  assert.equal(suggestLyrics().ok, false);
});

test('나쁜 말 · 개인 정보 · 링크는 주제나 내용에 있어도 막아요', () => {
  const shape = musicShape();
  const cases = [
    ['바보 멍청이', '', 'badWord'],
    ['씨 발', '', 'badWord'],
    ['우리 강아지', '죽여', 'badWord'],
    ['shut up', '', 'badWord'],
    ['제 이름은 김하늘', '', 'personal'],
    ['해맑초등학교', '', 'personal'],
    ['우리 반', '3학년 2반', 'personal'],
    ['우리 강아지', '010-1234-5678', 'personal'],
    ['아주아주아주 긴 주제 01012345678', '', 'personal'], // 자르기 전에 검사해서 숨은 번호도 막아요
    ['우리 집', 'abc@school.kr', 'personal'],
    ['www.example.com', '', 'link'],
  ];
  for (const [topic, content, reason] of cases) {
    const r = suggestLyrics({ topic, content, shape });
    assert.equal(r.ok, false, `${topic} / ${content}`);
    assert.equal(r.reason, reason, `${topic} / ${content}`);
    assert.deepEqual(r.suggestions, []);
    assert.ok(r.message.length > 5);
  }
});

test('주제·내용 정리', () => {
  assert.equal(cleanTopic('  우리   강아지!! '), '우리 강아지');
  assert.equal(cleanTopic('겨울 눈사람 노래'), '겨울 눈사람');
  assert.equal(cleanTopic('우리 강아지에 대한 노래'), '우리 강아지');
  assert.ok(countSyllables(cleanTopic('엄청 엄청 커다랗고 하얀 겨울 눈사람')) <= 8);
  assert.deepEqual(cleanKeywords('산책, 공놀이,, 산책 / 간식 / 낮잠'), ['산책', '공놀이', '간식']);
  assert.deepEqual(cleanKeywords('강아지 산책', '우리 강아지'), ['산책']);
});

test('앱 노래(노래 따라 만들기)와 모든 테마에서도 잘 만들어요', () => {
  for (const song of SONGS) {
    const theme = getTheme(song.theme);
    const shape = musicShape({ items: songItems(song, theme), bpm: song.bpm, progression: theme.progression || 'pop' });
    const r = suggestLyrics({ topic: '친구', shape, seed: 1, themeId: song.theme });
    assert.ok(r.suggestions.length >= 2, song.id);
    for (const sg of r.suggestions) for (const l of sg.lines) assert.equal(countSyllables(l), shape.syllables);
  }
  for (const themeId of ['bingsu', 'pizza', 'burger', 'cake', 'icecream', 'animals', 'space']) {
    const r = suggestLyrics({ topic: '여름 방학', shape: musicShape(), seed: 2, themeId });
    assert.equal(r.suggestions.length, 3, themeId);
  }
});
