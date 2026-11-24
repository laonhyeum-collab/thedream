import { MISSIONS, type Mission } from '../data/missions';

/** '오늘 수업 모드' 주소 규칙: ?lesson=m1.m3.m5 (미션 id를 점으로 이어요). 로그인·서버 없이 주소만으로 동작해요. */
export const LESSON_PARAM = 'lesson';

export function parseLesson(search: string): Mission[] | null {
  let raw: string | null = null;
  try {
    raw = new URLSearchParams(search).get(LESSON_PARAM);
  } catch {
    return null;
  }
  if (!raw) return null;
  const ids = raw.split(/[.,\s]+/).filter(Boolean);
  const seen = new Set<string>();
  const list: Mission[] = [];
  for (const id of ids) {
    const m = MISSIONS.find((x) => x.id === id);
    if (m && !seen.has(m.id)) {
      seen.add(m.id);
      list.push(m);
    }
  }
  return list.length ? list : null;
}

/** 선생님이 고른 미션 id로 학생용 주소를 만들어요. 미션 순서는 원래 미션 번호 순서로 맞춰요. */
export function buildLessonUrl(baseHref: string, ids: string[]): string {
  const ordered = MISSIONS.filter((m) => ids.includes(m.id)).map((m) => m.id);
  const url = new URL(baseHref);
  url.hash = '';
  url.search = '';
  if (ordered.length) url.searchParams.set(LESSON_PARAM, ordered.join('.'));
  return url.toString().replace(/%2E/gi, '.');
}
