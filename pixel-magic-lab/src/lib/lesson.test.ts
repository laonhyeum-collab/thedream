import { describe, expect, it } from 'vitest';
import { buildLessonUrl, parseLesson } from './lesson';
import { MISSIONS } from '../data/missions';

describe('오늘 수업 모드 주소', () => {
  it('주소에서 고른 미션만 순서대로 읽어요', () => {
    const list = parseLesson('?lesson=m3.m1.m5');
    expect(list?.map((m) => m.id)).toEqual(['m3', 'm1', 'm5']);
  });
  it('없는 미션·중복은 빼고, 남는 게 없으면 수업 모드가 아니에요', () => {
    expect(parseLesson('?lesson=m2.m2.zz')?.map((m) => m.id)).toEqual(['m2']);
    expect(parseLesson('?lesson=zz')).toBeNull();
    expect(parseLesson('')).toBeNull();
  });
  it('선생님이 고른 미션으로 학생 주소를 만들고 다시 읽을 수 있어요', () => {
    const url = buildLessonUrl('https://example.org/pixel-magic-lab/?x=1#top', ['m5', 'm1']);
    expect(url).toBe('https://example.org/pixel-magic-lab/?lesson=m1.m5');
    expect(parseLesson(new URL(url).search)?.map((m) => m.id)).toEqual(['m1', 'm5']);
  });
  it('모든 미션 id가 주소에 쓸 수 있는 글자예요', () => {
    for (const m of MISSIONS) expect(m.id).toMatch(/^[a-z0-9-]+$/);
  });
});
