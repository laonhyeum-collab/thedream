import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import {
  DIFFICULTY, validateCardSet, shuffle, pickPairs, buildDeck, MatchGame,
  formatTime, summaryLine, safeSetName,
} from '../js/game.js';

function seeded(seed = 1) {
  return () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
}
const dataDir = new URL('../data/', import.meta.url);
const load = (name) => JSON.parse(readFileSync(new URL(name, dataDir), 'utf8'));

const sample = validateCardSet(load('cards.json')).set;

/** 정답을 아는 채로 끝까지 맞히기 */
function solve(game) {
  const byPair = {};
  game.cards.forEach((c) => (byPair[c.pairId] ||= []).push(c.index));
  let last;
  for (const [i, j] of Object.values(byPair)) {
    game.flip(i);
    last = game.flip(j);
  }
  return last;
}

test('data 폴더의 문제표는 모두 올바르다', () => {
  const files = readdirSync(dataDir).filter((f) => f.endsWith('.json'));
  assert.ok(files.includes('cards.json'));
  for (const f of files) {
    const r = validateCardSet(load(f));
    assert.equal(r.ok, true, `${f}: ${r.errors.join(' / ')}`);
    assert.ok(r.set.pairs.length >= DIFFICULTY.normal.pairs, `${f}: 보통(8쌍)을 하려면 짝이 8개 이상 필요`);
  }
});

test('기본 문제표: 겨울 그림 짝과 코딩 개념(순차·반복) 짝이 섞여 있다', () => {
  const texts = sample.pairs.map((p) => `${p.a}=${p.b}`);
  assert.ok(texts.includes('눈송이=❄️'));
  assert.ok(texts.includes('순차=차례대로 한 줄씩 실행'));
  assert.ok(texts.includes('반복=같은 일을 여러 번'));
  assert.equal(sample.pairs.length, 8);
});

test('문제표 검사: 잘못된 모양을 알려 준다', () => {
  assert.equal(validateCardSet(null).ok, false);
  assert.equal(validateCardSet([]).ok, false);
  assert.equal(validateCardSet({ pairs: 'x' }).ok, false);
  const one = validateCardSet({ pairs: [{ a: '눈', b: '❄️' }] });
  assert.equal(one.ok, false);
  assert.match(one.errors.join(), /2개 이상/);
  const blank = validateCardSet({ pairs: [{ a: '눈', b: '' }, { a: 'x', b: 'y' }, { a: 'p', b: 'q' }] });
  assert.equal(blank.ok, false);
  assert.match(blank.errors[0], /1번째 짝/);
  const dup = validateCardSet({ pairs: [{ a: '눈', b: '❄️' }, { a: '눈', b: '☃️' }] });
  assert.equal(dup.ok, false);
  const same = validateCardSet({ pairs: [{ a: '눈', b: '눈' }, { a: 'x', b: 'y' }] });
  assert.equal(same.ok, false);
  const long = validateCardSet({ pairs: [{ a: '가'.repeat(31), b: 'b' }, { a: 'x', b: 'y' }] });
  assert.equal(long.ok, false);
});

test('문제표 검사: 제목·설명이 없으면 기본값을 채운다', () => {
  const r = validateCardSet({ pairs: [{ a: '눈', b: '❄️' }, { a: ' 장갑 ', b: '🧤', bLabel: '장갑 그림' }] });
  assert.equal(r.ok, true);
  assert.equal(r.set.title, '짝 맞추기');
  assert.equal(r.set.pairs[0].bLabel, '❄️');
  assert.equal(r.set.pairs[1].a, '장갑');
  assert.equal(r.set.pairs[1].bLabel, '장갑 그림');
});

test('?set= 이름은 안전한 파일 이름만 받는다', () => {
  assert.equal(safeSetName('coding'), 'coding');
  assert.equal(safeSetName('coding.json'), 'coding');
  assert.equal(safeSetName('../secret'), null);
  assert.equal(safeSetName('https://x.y/a'), null);
  assert.equal(safeSetName(''), null);
  assert.equal(safeSetName(null), null);
});

test('shuffle 은 같은 것들을 순서만 바꾼다', () => {
  const list = [...Array(20).keys()];
  const out = shuffle(list, seeded(7));
  assert.notDeepEqual(out, list);
  assert.deepEqual([...out].sort((a, b) => a - b), list);
  assert.deepEqual(list, [...Array(20).keys()], '원본은 그대로');
});

test('buildDeck: 짝마다 정확히 두 장(a, b)', () => {
  for (let s = 1; s < 20; s++) {
    const deck = buildDeck(sample.pairs, seeded(s));
    assert.equal(deck.length, 16);
    const count = {};
    deck.forEach((c, i) => {
      assert.equal(c.index, i);
      assert.equal(c.faceUp, false);
      (count[c.pairId] ||= []).push(c.side);
    });
    for (const sides of Object.values(count)) assert.deepEqual(sides.sort(), ['a', 'b']);
  }
});

test('pickPairs: 쉬움 6쌍에도 코딩 카드가 꼭 들어간다', () => {
  for (let s = 1; s < 60; s++) {
    const picked = pickPairs(sample.pairs, DIFFICULTY.easy.pairs, seeded(s));
    assert.equal(picked.length, 6);
    assert.equal(new Set(picked.map((p) => p.id)).size, 6);
    assert.ok(picked.some((p) => p.type === '코딩'), `seed ${s}`);
    assert.ok(picked.some((p) => p.type === '겨울'), `seed ${s}`);
  }
  assert.equal(pickPairs(sample.pairs, 99).length, 8, '있는 만큼만');
});

test('짝이 맞으면 열린 채로 남고, 틀리면 다시 덮인다', () => {
  const g = new MatchGame(sample.pairs.slice(0, 3), seeded(3));
  const first = g.cards[0];
  const mate = g.cards.find((c) => c.pairId === first.pairId && c !== first);
  const wrong = g.cards.find((c) => c.pairId !== first.pairId);

  assert.equal(g.flip(0).type, 'flip');
  assert.equal(g.flip(0).type, 'ignored', '같은 카드 두 번은 무시');
  const miss = g.flip(wrong.index);
  assert.equal(miss.type, 'miss');
  assert.equal(g.moves, 1);
  assert.equal(g.pendingMiss, true);

  // 다른 카드를 누르면 틀린 두 장이 자동으로 덮임
  const r = g.flip(mate.index);
  assert.deepEqual(r.hidden.sort(), [0, wrong.index].sort());
  assert.equal(g.cards[0].faceUp, false);
  assert.equal(r.type, 'flip');
  const hit = g.flip(0);
  assert.equal(hit.type, 'match');
  assert.equal(g.cards[0].matched, true);
  assert.equal(g.flip(0).type, 'ignored', '찾은 카드는 다시 못 누름');
  assert.equal(g.moves, 2);
  assert.equal(g.matched, 1);
  assert.equal(g.isWon(), false);
});

test('모든 짝을 찾으면 win 이고, 그 뒤로는 아무것도 안 바뀐다', () => {
  const g = new MatchGame(pickPairs(sample.pairs, 8, seeded(5)), seeded(9));
  const last = solve(g);
  assert.equal(last.type, 'win');
  assert.equal(last.moves, 8);
  assert.equal(g.done, true);
  assert.equal(g.isWon(), true);
  assert.equal(g.flip(0).type, 'ignored');
});

test('hideMiss 는 틀린 두 장만 덮는다', () => {
  const g = new MatchGame(sample.pairs.slice(0, 2), seeded(2));
  const a = g.cards[0];
  const b = g.cards.find((c) => c.pairId !== a.pairId);
  g.flip(a.index);
  g.flip(b.index);
  assert.deepEqual(g.hideMiss().sort(), [a.index, b.index].sort());
  assert.ok(g.cards.every((c) => !c.faceUp));
});

test('시간 표시와 끝 화면 한 줄 정리', () => {
  assert.equal(formatTime(0), '0:00');
  assert.equal(formatTime(65.7), '1:05');
  assert.equal(summaryLine(8, 9, 42), '8쌍을 9번 만에, 42초 동안 모두 찾았어요. 기억력 최고예요!');
  assert.match(summaryLine(6, 20, 125), /^6쌍을 20번 만에, 2분 5초 동안 모두 찾았어요\./);
});
