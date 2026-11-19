import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getTheme, soundOf, normalizeVoices, VOICE_LIST, THEMES, ENSEMBLES, INSTRUMENTS } from '../js/themes.js';
import { VOICES } from '../js/audio.js';
import { normalizeItems } from '../js/storage.js';

const theme = getTheme('bingsu');

test('고를 수 있는 악기 소리가 모두 실제 소리로 있다', () => {
  assert.equal(VOICE_LIST.filter((v) => v.ensemble === 'band').length, 10, '밴드는 10가지');
  for (const v of VOICE_LIST) assert.equal(typeof VOICES[v.id], 'function', v.id);
});

test('테마 7개가 모두 열려 있고, 테마마다 악단이 달라요', () => {
  assert.equal(THEMES.length, 7);
  assert.ok(THEMES.every((t) => t.ready));
  const ens = THEMES.map((t) => t.ensemble);
  assert.equal(new Set(ens).size, 7, `악단이 모두 달라요: ${ens}`);
  for (const t of THEMES) {
    const e = ENSEMBLES[t.ensemble];
    assert.ok(e, t.id);
    assert.ok(t.ingredients.length >= 7, `${t.id} 재료 7개 이상`);
    assert.equal(new Set(t.ingredients.map((i) => i.id)).size, t.ingredients.length, `${t.id} 재료 이름 겹치지 않음`);
    for (const i of t.ingredients) {
      assert.equal(INSTRUMENTS[i.instrument].ensemble, t.ensemble, `${t.id}/${i.id} 는 ${e.name} 악기`);
      assert.equal(typeof VOICES[i.voice], 'function', `${t.id}/${i.id} 소리`);
    }
    // 악단의 악기마다 그 악기를 내는 재료가 있어요
    for (const inst of e.instruments) assert.ok(t.ingredients.some((i) => i.instrument === inst), `${t.id}: ${inst}`);
    // 컵 칸 모양 안에 재료가 들어가요
    const items = [{ ing: t.ingredients[0].id, row: t.rows - 1, col: t.cols - 1, size: 2 }];
    assert.equal(normalizeItems(items, t).length, 1, `${t.id} 칸`);
  }
});

test('국악은 5음(도 레 미 솔 라)만 써요', async () => {
  const { PROGRESSIONS } = await import('../js/engine.js');
  const pent = new Set([0, 2, 4, 7, 9]);
  for (const c of PROGRESSIONS.gugak) for (const m of [c.root, ...c.tones]) assert.ok(pent.has(m % 12), `${c.name}: ${m}`);
});

test('고르지 않으면 기획서의 기본 악기', () => {
  const s = soundOf(theme, 'ice');
  assert.equal(s.voice, 'drum');
  assert.equal(s.instrument, 'drum');
  assert.equal(s.custom, false);
  assert.equal(s.sound, '기본 리듬');
});

test('고른 악기로 바뀐다', () => {
  const s = soundOf(theme, 'ice', { ice: 'guitarRock' });
  assert.equal(s.voice, 'guitarRock');
  assert.equal(s.instrument, 'guitar');
  assert.equal(s.name, '일렉트릭 기타');
  assert.equal(s.custom, true);
  assert.equal(soundOf(theme, 'mango', { ice: 'guitarRock' }).voice, 'keysBright', '다른 재료는 그대로');
});

test('저장된 악기 선택 정리: 없는 재료·소리, 기본과 같은 것은 버림', () => {
  assert.deepEqual(normalizeVoices({
    ice: 'synthPad', mango: 'keysBright', pizza: 'drum', banana: 'kazoo', jelly: 'bass',
  }, theme), { ice: 'synthPad', jelly: 'bass' });
  assert.deepEqual(normalizeVoices(null, theme), {});
  assert.deepEqual(normalizeVoices('망가짐', theme), {});
});
