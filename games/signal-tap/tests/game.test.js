import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import {
  GAME_MS, STAGES, SignalGame, validateWordFile, safeSetName, stageAt, ruleText, withIfJosa, gapMs, FAST_MS,
} from '../js/game.js';

const dataDir = new URL('../data/', import.meta.url);
const load = (name) => JSON.parse(readFileSync(new URL(name, dataDir), 'utf8'));
const seeded = (seed = 1) => () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const fixed = (v) => () => v; // 0.1 → 탭할 신호, 0.9 → 참을 신호

test('data 폴더의 낱말 파일은 모두 올바르고, 묶음 안에 yes·no가 겹치지 않는다', () => {
  const files = readdirSync(dataDir).filter((f) => f.endsWith('.json'));
  assert.ok(files.length >= 1);
  for (const f of files) {
    const r = validateWordFile(load(f));
    assert.equal(r.ok, true, `${f}: ${r.errors.join(' ')}`);
    for (const s of r.data.sets) {
      const yes = new Set(s.yes);
      assert.ok(s.no.every((w) => !yes.has(w)), `${f} ${s.target}`);
    }
  }
});

test('기본 낱말에 과일 묶음이 있다 (기획: 과일만 탭)', () => {
  const r = validateWordFile(load('words.json'));
  assert.ok(r.data.sets.some((s) => s.target === '과일'));
});

test('잘못된 낱말 파일은 이유를 알려 준다', () => {
  assert.equal(validateWordFile(null).ok, false);
  assert.equal(validateWordFile({ sets: [] }).ok, false);
  const r = validateWordFile({ sets: [{ target: '과일', yes: ['사과'], no: ['연필'] }] });
  assert.equal(r.ok, false);
  assert.match(r.errors[0], /3개 이상/);
  const long = validateWordFile({ sets: [{ target: 'x', yes: ['a', 'b', 'c', '아주아주아주아주긴낱말이에요'], no: ['d', 'e', 'f'] }] });
  assert.equal(long.data.sets[0].yes.length, 3);
});

test('파일 이름 검사 (?set=)', () => {
  assert.equal(safeSetName('math-3'), 'math-3');
  assert.equal(safeSetName('fruit.json'), 'fruit');
  assert.equal(safeSetName('../secret'), null);
  assert.equal(safeSetName('https://x.com/a'), null);
});

test('받침에 맞는 말: 과일이면 / 짝수면', () => {
  assert.equal(withIfJosa('과일'), '과일이면');
  assert.equal(withIfJosa('짝수'), '짝수면');
  assert.equal(withIfJosa('겨울 물건'), '겨울 물건이면');
  assert.equal(ruleText(STAGES[1], '동물'), '동물이면 탭! 아니면 멈춰요');
});

test('단계는 0·20·40초에 올라가고 한 판은 60초', () => {
  assert.equal(GAME_MS, 60000);
  assert.equal(stageAt(0).id, 1);
  assert.equal(stageAt(19999).id, 1);
  assert.equal(stageAt(20000).id, 2);
  assert.equal(stageAt(45000).id, 3);
  assert.ok(STAGES[2].showMs < STAGES[1].showMs, '3단계는 더 빨라요');
});

const fruit = validateWordFile(load('words.json')).data.sets[0];

test('1단계: 초록에 탭하면 점수, 빨리 누르면 번개 +2', () => {
  const g = new SignalGame({ wordSet: fruit, rand: fixed(0.1) });
  g.start(0);
  const s = g.next(1000);
  assert.equal(s.kind, 'color');
  assert.equal(s.color, 'green');
  assert.equal(g.tap(1000 + FAST_MS + 100), 'hit');
  assert.equal(g.score, 1);
  g.next(3000);
  assert.equal(g.tap(3200), 'fast');
  assert.equal(g.score, 3);
});

test('1단계: 빨강에 탭하면 -1(0점 아래로는 안 내려감), 참으면 +1', () => {
  const g = new SignalGame({ wordSet: fruit, rand: fixed(0.9) });
  g.start(0);
  assert.equal(g.next(1000).color, 'red');
  assert.equal(g.tap(1300), 'wrong');
  assert.equal(g.score, 0);
  g.next(3000);
  assert.equal(g.timeout(), 'held');
  assert.equal(g.score, 1);
  assert.equal(g.wrong, 1);
});

test('초록을 놓치면 missed, 신호 없을 때 누르면 early(점수 그대로)', () => {
  const g = new SignalGame({ wordSet: fruit, rand: fixed(0.1) });
  g.start(0);
  assert.equal(g.tap(500), 'early');
  g.next(1000);
  assert.equal(g.timeout(), 'missed');
  assert.equal(g.tap(1200), 'early', '이미 끝난 신호');
  assert.equal(g.score, 0);
  assert.equal(g.missed, 1);
});

test('한 신호에 두 번 눌러도 한 번만 센다', () => {
  const g = new SignalGame({ wordSet: fruit, rand: fixed(0.1) });
  g.start(0);
  g.next(1000);
  g.tap(1700);
  assert.equal(g.tap(1800), 'early');
  assert.equal(g.hits, 1);
});

test('2단계부터는 낱말: 과일이면 탭할 신호, 아니면 참을 신호', () => {
  const go = new SignalGame({ wordSet: fruit, rand: fixed(0.1) });
  go.start(0);
  const a = go.next(21000);
  assert.equal(a.kind, 'word');
  assert.ok(fruit.yes.includes(a.text));
  assert.equal(a.go, true);
  const stop = new SignalGame({ wordSet: fruit, rand: fixed(0.9) });
  stop.start(0);
  const b = stop.next(41000);
  assert.ok(fruit.no.includes(b.text));
  assert.equal(b.go, false);
  assert.equal(b.until - b.shownAt, STAGES[2].showMs);
});

test('낱말 파일이 없으면 끝까지 색 신호로 논다', () => {
  const g = new SignalGame({ wordSet: null, rand: seeded(3) });
  g.start(0);
  assert.equal(g.next(50000).kind, 'color');
});

test('60초가 지나면 끝나고 신호가 나오지 않는다', () => {
  const g = new SignalGame({ wordSet: fruit, rand: seeded(5) });
  g.start(100);
  assert.equal(g.isOver(60099), false);
  assert.equal(g.next(60100), null);
  assert.equal(g.tap(60200), 'over');
});

test('끝까지 시뮬레이션: 낱말이 연달아 같지 않고 요약 문장이 나온다', () => {
  const rand = seeded(7);
  const g = new SignalGame({ wordSet: fruit, rand });
  g.start(0);
  let t = 500;
  let prev = null;
  let repeats = 0;
  while (true) {
    const s = g.next(t);
    if (!s) break;
    if (s.kind === 'word' && s.text === prev) repeats += 1;
    prev = s.text;
    if (s.go) g.tap(t + 450); else g.timeout();
    t = s.until + gapMs(rand);
  }
  assert.equal(repeats, 0);
  const sum = g.summary();
  assert.equal(sum.wrong, 0);
  assert.equal(sum.missed, 0);
  assert.ok(sum.score > 30, `score ${sum.score}`);
  assert.match(sum.line, /점수 \d+점/);
  assert.ok(sum.avgMs >= 400 && sum.avgMs <= 500);
});

test('쉬는 시간은 0.4~0.9초', () => {
  assert.equal(gapMs(() => 0), 400);
  assert.ok(gapMs(() => 0.999) < 900);
});
