import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getTheme, soundOf, normalizeVoices, VOICE_LIST } from '../js/themes.js';
import { VOICES } from '../js/audio.js';

const theme = getTheme('bingsu');

test('고를 수 있는 악기 소리 10가지가 모두 실제 소리로 있다', () => {
  assert.equal(VOICE_LIST.length, 10);
  for (const v of VOICE_LIST) assert.equal(typeof VOICES[v.id], 'function', v.id);
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
