import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SONGS, getSong, songItems, songBeats, compareToSong } from '../js/songs.js';
import { getTheme } from '../js/themes.js';
import { normalizeItems } from '../js/storage.js';

const theme = getTheme('bingsu');
const it = (ing, row, col, size) => ({ id: `${ing}${row}${col}`, ing, row, col, size });

test('노래는 모두 빙수 재료로만 되어 있고 컵(8층 × 3칸)에 들어간다', () => {
  assert.ok(SONGS.length >= 6);
  for (const s of SONGS) {
    const items = songItems(s, theme);
    assert.equal(normalizeItems(items, theme).length, items.length, s.id);
    assert.ok(s.steps.length <= theme.rows && s.steps.every((st) => st.length <= theme.cols), s.id);
  }
  assert.equal(songBeats(getSong('first-step')), 8, '첫걸음은 두 마디(8박)');
});

test('똑같이 쌓으면 정답', () => {
  const song = getSong('all-together');
  const r = compareToSong(song, theme, songItems(song, theme));
  assert.equal(r.allOk, true);
  assert.equal(r.correct, 4);
});

test('자리(왼쪽/오른쪽, 빈 층)는 달라도 소리가 같으면 정답', () => {
  const song = getSong('berry-march');
  const mine = [it('ice', 0, 2, 3), it('strawberry', 2, 0, 2), it('mango', 5, 1, 2), it('icecream', 7, 1, 3)];
  assert.equal(compareToSong(song, theme, mine).allOk, true);
});

test('층마다 무엇이 틀렸는지 알려 준다', () => {
  const song = getSong('berry-march'); // 얼음2박 / 딸기1박 / 망고1박 / 아이스크림2박
  const mine = [it('ice', 0, 0, 3), it('strawberry', 1, 0, 3), it('banana', 2, 0, 2)];
  const r = compareToSong(song, theme, mine);
  assert.deepEqual(r.steps.map((s) => s.reason), ['ok', 'length', 'instrument', 'missing']);
  assert.equal(r.steps[1].hint, 'shorter', '딸기를 더 짧게');
  assert.equal(r.allOk, false);
  const more = compareToSong(song, theme, [...songItems(song, theme), it('jelly', 7, 0, 2)]);
  assert.deepEqual(more.steps.map((s) => s.reason), ['ok', 'ok', 'ok', 'ok', 'extra']);
  assert.equal(more.allOk, false, '정답보다 많으면 아직');
});

test('함께 연주하는 층은 악기가 모두 같아야 맞다', () => {
  const song = getSong('all-together');
  const mine = songItems(song, theme).filter((i) => !(i.row === 0 && i.ing === 'redbean'));
  assert.equal(compareToSong(song, theme, mine).steps[0].reason, 'instrument');
});

test('내가 바꾼 악기로 같은 소리를 내도 정답', () => {
  const song = getSong('first-step'); // 얼음(드럼) / 떡(스네어) ...
  const mine = [it('mango', 0, 0, 3), it('tteok', 1, 0, 3), it('mango', 2, 0, 3), it('tteok', 3, 0, 3)];
  assert.equal(compareToSong(song, theme, mine).allOk, false);
  assert.equal(compareToSong(song, theme, mine, { mango: 'drum' }).allOk, true);
});
