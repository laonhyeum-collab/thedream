import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  COMBOS, COMBO_THEMES, comboTheme, comboThemeId, getCombo, pickCombo, comboChallenge, comboIsValid, backingPreviewItems,
} from '../js/combos.js';
import { getTheme, THEMES, soundOf, progressionOf } from '../js/themes.js';
import { VOICES } from '../js/voices.js';
import { PROGRESSIONS } from '../js/engine.js';
import { normalizeWork, saveWork, loadWorks, loadComboDone, markComboDone } from '../js/storage.js';

function memoryStore() {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) };
}

test('조합이 여러 개 있고, 모두 듣기 좋게 맞춰져 있다', () => {
  assert.ok(COMBOS.length >= 6);
  assert.equal(new Set(COMBOS.map((c) => c.id)).size, COMBOS.length, 'id 가 겹치지 않아요');
  for (const c of COMBOS) {
    assert.ok(comboIsValid(c), c.id);
    assert.ok(VOICES[c.backing], `${c.id}: 반주 소리 ${c.backing}`);
    for (const v of c.layers) assert.ok(VOICES[v], `${c.id}: 소리 ${v}`);
    assert.ok(c.layers.length >= 5, `${c.id}: 쌓을 악기가 넉넉해요`);
    assert.ok(PROGRESSIONS[c.progression], `${c.id}: 화음 흐름`);
  }
});

test('반주와 쌓는 악기는 같은 화음 흐름(조)·같은 빠르기로 연주해요', () => {
  for (const c of COMBOS) {
    const t = comboTheme(c.id);
    assert.equal(progressionOf(t), c.progression);
    assert.equal(t.backing, c.backing);
    assert.equal(t.bpm, c.bpm);
    // 화음은 모두 C 를 중심으로 (흰 건반 + 재즈의 A7 만 예외) → 반주와 악기가 같은 조
    for (const ch of PROGRESSIONS[c.progression]) for (const m of ch.tones) {
      const pc = ((m % 12) + 12) % 12;
      const white = [0, 2, 4, 5, 7, 9, 11].includes(pc);
      assert.ok(white || (c.progression === 'jazz' && ch.name === 'A7'), `${c.id} ${ch.name}`);
    }
    // 국악 반주는 5음(도 레 미 솔 라)만
    if (c.progression === 'gugak') {
      for (const ch of PROGRESSIONS.gugak) for (const m of ch.tones) assert.ok([0, 2, 4, 7, 9].includes(m % 12));
    }
  }
});

test('거문고 + 오케스트라, 피아노 + 밴드 조합이 있다', () => {
  assert.equal(getCombo('geomungoOrchestra').backing, 'geomungo');
  assert.equal(getCombo('pianoBand').ensemble, 'band');
});

test('조합 무대는 테마처럼 열리고 저장·복원돼요 (테마 목록에는 안 보여요)', () => {
  for (const t of COMBO_THEMES) {
    assert.equal(getTheme(t.id), getTheme(comboThemeId(t.combo)));
    assert.ok(getTheme(t.id));
    assert.ok(!THEMES.includes(t));
    for (const ing of t.ingredients) assert.equal(soundOf(t, ing.id).voice, ing.voice);
  }
  const s = memoryStore();
  const theme = comboTheme('pianoBand');
  const saved = saveWork({ id: 'c1', title: '조합 노래', theme: theme.id, bpm: 100, items: [{ id: 'a', ing: 'drum', row: 0, col: 0, size: 2 }], lyrics: '시원한 빙수 한 그릇' }, s);
  assert.ok(saved);
  const [w] = loadWorks(s);
  assert.equal(w.theme, theme.id);
  assert.equal(w.items.length, 1);
  assert.equal(w.lyrics, '시원한 빙수 한 그릇');
});

test('랜덤 조합: 정해진 rng 로 고르고, 방금 한 조합은 다시 안 나와요', () => {
  assert.equal(pickCombo(() => 0).id, COMBOS[0].id);
  assert.equal(pickCombo(() => 0.9999).id, COMBOS[COMBOS.length - 1].id);
  assert.notEqual(pickCombo(() => 0, COMBOS[0].id).id, COMBOS[0].id);
  for (let i = 0; i < 50; i++) {
    const last = COMBOS[i % COMBOS.length].id;
    assert.notEqual(pickCombo(Math.random, last).id, last);
  }
  assert.ok(pickCombo(() => NaN), '이상한 값이어도 하나는 골라요');
  const seen = new Set();
  for (let i = 0; i < COMBOS.length; i++) seen.add(pickCombo(() => (i + 0.5) / COMBOS.length).id);
  assert.equal(seen.size, COMBOS.length, '모든 조합이 나올 수 있어요');
});

test('조합 도전 조건: 악기 3가지, 3층, 함께 연주하는 층', () => {
  const c = getCombo('pianoBand');
  const t = comboTheme(c.id);
  const ch = comboChallenge(c);
  const it = (ing, row, col) => ({ id: `${ing}${row}${col}`, ing, row, col, size: 2 });
  assert.equal(ch.check(t, []), false);
  assert.equal(ch.check(t, [it('drum', 0, 0), it('bass', 1, 0), it('keysBright', 2, 0)]), false, '함께 연주하는 층이 없어요');
  assert.equal(ch.check(t, [it('drum', 0, 0), it('bass', 0, 1), it('keysBright', 1, 0), it('cymbal', 2, 0)]), true);
  assert.equal(ch.check(t, [it('drum', 0, 0), it('drum', 0, 1), it('drum', 1, 0), it('drum', 2, 0)]), false, '한 악기뿐');
});

test('반주 듣기: 화음 4개를 4박씩 반주 소리로', () => {
  const items = backingPreviewItems(getCombo('geomungoOrchestra'));
  assert.equal(items.length, 4);
  assert.ok(items.every((i) => i.voice === 'geomungo' && i.size === 4));
  assert.deepEqual(items.map((i) => i.row), [0, 1, 2, 3]);
});

test('조합 성공 기록', () => {
  const s = memoryStore();
  assert.equal(loadComboDone(s).size, 0);
  markComboDone('pianoBand', s);
  assert.ok(loadComboDone(s).has('pianoBand'));
  assert.equal(normalizeWork({ theme: 'combo-없음' }), null);
});
