// [앱 월드] 섬 지도: 부스 배치(선생님 건물 1 + 학생 부스 12), 땅·물, 부딪힘, 가까운 문 찾기 (화면과 상관없는 순수 계산)
import { WORLD_W, WORLD_H, HALL, FOUNTAIN, ARCH, BOOTH_SIZE, SLOTS, STUDENT_BOOTHS } from '../shared/worldart.js';

export const PLAYER_R = 16;
export const DOOR_REACH = 80;

// 섬 모양: 큰 타원 + 아래쪽 입구 + 왼쪽 아래 등대 섬(걸어갈 수 없음)
export function isLand(x, y) {
  const wob = 0.045 * Math.sin(x * 0.011) + 0.035 * Math.cos(y * 0.015 + x * 0.004);
  const e1 = ((x - 960) / 930) ** 2 + ((y - 540) / 500) ** 2 < 1 + wob;
  const e2 = ((x - 960) / 240) ** 2 + ((y - 985) / 125) ** 2 < 1;
  return e1 || e2;
}
export const isIslet = (x, y) => ((x - 150) / 85) ** 2 + ((y - 945) / 62) ** 2 < 1;

export function sortItems(items) {
  return [...items].sort((a, b) => {
    const an = Number.isFinite(a.booth) && a.booth > 0 ? a.booth : 1e6;
    const bn = Number.isFinite(b.booth) && b.booth > 0 ? b.booth : 1e6;
    return an - bn || String(a.appName).localeCompare(String(b.appName), 'ko');
  });
}

const box = (x, y, w, h) => ({ x, y, w, h });

// 부스 번호(1~12)대로 자리에 앉히고, 번호가 없거나 겹치면 빈자리에. 12개를 넘으면 extra 로.
export function layoutWorld(items) {
  const slots = SLOTS.map((s) => ({ ...s, item: null }));
  const rest = [];
  for (const it of sortItems(items)) {
    const want = Number.isFinite(it.booth) && it.booth >= 1 && it.booth <= STUDENT_BOOTHS ? slots[it.booth - 1] : null;
    if (want && !want.item) want.item = it; else rest.push(it);
  }
  const extra = [];
  for (const it of rest) { const free = slots.find((s) => !s.item); if (free) free.item = it; else extra.push(it); }

  const booths = slots.map((s) => {
    const { w, h } = BOOTH_SIZE;
    return {
      n: s.n, item: s.item, x: s.x, y: s.y, w, h,
      body: box(s.x - w * 0.42, s.y - h * 0.62, w * 0.84, h * 0.62 - 12),
      door: { x: s.x, y: s.y + 26 },
      host: { x: s.x + w * 0.5 + 6, y: s.y + 12 },
    };
  });
  const hall = { ...HALL, body: box(HALL.x - HALL.w * 0.45, HALL.y - HALL.h * 0.62, HALL.w * 0.9, HALL.h * 0.62 - 10), door: { x: HALL.x, y: HALL.y + 30 } };
  const arch = { ...ARCH, pillars: [box(ARCH.x - ARCH.w / 2 + 6, ARCH.y - 70, 40, 64), box(ARCH.x + ARCH.w / 2 - 46, ARCH.y - 70, 40, 64)] };
  const sign = { x: 1060, y: 820 };   // 광장 안내판
  return {
    width: WORLD_W, height: WORLD_H, booths, hall, fountain: { ...FOUNTAIN }, arch, sign, extra,
    spawn: { x: ARCH.x, y: ARCH.y - 205 },
    plaza: { x: FOUNTAIN.x, y: FOUNTAIN.y, r: 165 },
  };
}

function inBox(p, b, r) { return p.x > b.x - r && p.x < b.x + b.w + r && p.y > b.y - r && p.y < b.y + b.h + r; }

export function blocked(world, p, r = PLAYER_R) {
  if (!isLand(p.x, p.y + r * 0.5) || p.x < r || p.y < r || p.x > world.width - r || p.y > world.height - r) return true;
  if (world.booths.some((b) => inBox(p, b.body, r * 0.6))) return true;
  if (inBox(p, world.hall.body, r * 0.6)) return true;
  if (world.arch.pillars.some((b) => inBox(p, b, r * 0.4))) return true;
  if (Math.hypot(p.x - world.fountain.x, p.y - world.fountain.y) < world.fountain.r * 0.85 + r * 0.5) return true;
  return false;
}

// 막히면 x, y 를 따로 움직여 벽을 따라 미끄러지기
export function moveWithin(world, from, dx, dy, r = PLAYER_R) {
  if (world.illustrated) {
    const p = { x: Math.max(r, Math.min(world.width - r, from.x + dx)), y: Math.max(r + 20, Math.min(world.height - r, from.y + dy)) };
    return p;
  }
  const full = { x: from.x + dx, y: from.y + dy };
  if (!blocked(world, full, r)) return full;
  const onlyX = { x: from.x + dx, y: from.y };
  if (dx && !blocked(world, onlyX, r)) return onlyX;
  const onlyY = { x: from.x, y: from.y + dy };
  if (dy && !blocked(world, onlyY, r)) return onlyY;
  return { ...from };
}

// 가장 가까운 문: { kind: 'teacher' | 'booth', booth? }
export function nearestDoor(world, p, reach = DOOR_REACH) {
  let best = null, bd = Infinity;
  const consider = (door, v) => { const d = Math.hypot(p.x - door.x, p.y - door.y); if (d < bd) { bd = d; best = v; } };
  if (world.hall) consider(world.hall.door, { kind: 'teacher' });
  for (const b of world.booths) if (b.item) consider(b.door, { kind: 'booth', booth: b });
  return bd <= reach ? best : null;
}

// 화면을 누른 곳의 건물
export function buildingAt(world, x, y) {
  const h = world.hall;
  if (world.illustrated) {
    if (h && Math.abs(x - h.x) < 130 && y > h.y - 200 && y < h.y + 40) return { kind: 'teacher' };
    for (const b of world.booths) if (b.item && Math.abs(x - b.x) < 90 && y > b.y - 160 && y < b.y + 40) return { kind: 'booth', booth: b };
    return null;
  }
  if (x > h.x - h.w / 2 && x < h.x + h.w / 2 && y > h.y - h.h && y < h.y + 30) return { kind: 'teacher' };
  for (const b of world.booths) if (b.item && x > b.x - b.w / 2 && x < b.x + b.w / 2 && y > b.y - b.h && y < b.y + 34) return { kind: 'booth', booth: b };
  return null;
}

// ---------- 그림 지도 모드: 선생님이 올린 지도 그림 + 그 위에 찍은 문 자리 ----------
// 건물은 그림 속에 이미 있으니 앱은 문 자리에 이름표·부스 지기·들어가기만 얹어요. 걷기는 그림 안 어디든.
export function layoutIllustrated(items, hotspots, W, H) {
  const at = (p) => ({ x: p[0] * W, y: p[1] * H });
  const slots = hotspots.booths.map((p, i) => (p ? { n: i + 1, ...at(p), item: null } : null)).filter(Boolean);
  const rest = [];
  for (const it of sortItems(items)) {
    const want = slots.find((s) => s.n === it.booth);
    if (want && !want.item) want.item = it; else rest.push(it);
  }
  const extra = [];
  for (const it of rest) { const free = slots.find((s) => !s.item); if (free) free.item = it; else extra.push(it); }
  const booths = slots.map((s) => ({ n: s.n, item: s.item, x: s.x, y: s.y, w: 150, h: 150, door: { x: s.x, y: s.y + 6 }, host: { x: s.x + 58, y: s.y + 8 } }));
  const hall = hotspots.hall ? { ...at(hotspots.hall), w: 260, h: 220 } : null;
  if (hall) hall.door = { x: hall.x, y: hall.y + 6 };
  const start = hotspots.start ? at(hotspots.start) : { x: W / 2, y: H * 0.85 };
  return { illustrated: true, width: W, height: H, booths, hall, extra, spawn: start };
}

