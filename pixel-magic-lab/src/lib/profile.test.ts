import { beforeEach, describe, expect, it } from 'vitest';

const m = new Map<string, string>();
(globalThis as { localStorage?: unknown }).localStorage = {
  getItem: (k: string) => (m.has(k) ? m.get(k)! : null),
  setItem: (k: string, v: string) => void m.set(k, String(v)),
  removeItem: (k: string) => void m.delete(k),
  key: (i: number) => [...m.keys()][i] ?? null,
  get length() {
    return m.size;
  },
};

const profile = await import('./profile');
const storage = await import('./storage');

describe('누가 할까요 (이름 넣을 때만 저장)', () => {
  beforeEach(() => {
    m.clear();
    profile._reset();
  });

  it('처음부터 하기는 기기에 아무것도 남기지 않고, 다음 친구도 처음부터', () => {
    profile.startGuest();
    storage.saveProgress({ m1: { stars: 3, blocks: 4, bonus: true, doneAt: 1 } });
    expect(Object.keys(storage.loadProgress())).toEqual(['m1']);
    expect(m.size).toBe(0);
    profile.startGuest();
    expect(storage.loadProgress()).toEqual({});
  });

  it('이름으로 하면 그 이름으로만 저장하고 같은 이름은 이어서', () => {
    profile.startNamed('별빛토끼');
    storage.saveProgress({ m1: { stars: 2, blocks: 5, bonus: false, doneAt: 1 } });
    storage.saveSettings({ ...storage.loadSettings(), lastMission: 'm3' });
    profile.startNamed('구름');
    expect(storage.loadProgress()).toEqual({});
    expect(storage.loadSettings().lastMission).toBe('m1');
    profile.startNamed('별빛토끼');
    expect(Object.keys(storage.loadProgress())).toEqual(['m1']);
    expect(storage.loadSettings().lastMission).toBe('m3');
    expect(profile.listPlayers().map((p) => p.name)).toEqual(['별빛토끼', '구름']);
  });

  it('처음부터 다시·기록 지우기는 그 이름 것만', () => {
    profile.startNamed('가');
    storage.saveProgress({ m1: { stars: 2, blocks: 5, bonus: false, doneAt: 1 } });
    profile.startNamed('나');
    storage.saveProgress({ m2: { stars: 2, blocks: 5, bonus: false, doneAt: 1 } });
    profile.startNamed('가', { fresh: true });
    expect(storage.loadProgress()).toEqual({});
    profile.forgetPlayer('나');
    expect(profile.hasPlayer('나')).toBe(false);
    expect(profile.hasPlayer('가')).toBe(true);
  });

  it('이름은 빈칸·위험한 글자를 빼고 12자까지', () => {
    expect(profile.cleanName('  <별>  ')).toBe('별');
    expect(profile.cleanName('가'.repeat(20))).toHaveLength(12);
    expect(profile.startNamed('   ')).toBeNull();
  });
});
