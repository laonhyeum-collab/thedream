// [앱 월드] 지도: 부스 배치·충돌·가까운 부스 찾기 (화면 그리기와 상관없는 순수 계산)
export const CELL_W = 240;
export const CELL_H = 230;
export const BOOTH_W = 150;
export const BOOTH_H = 110;
export const PLAZA_H = 360;
export const MARGIN = 120;
export const PLAYER_R = 18;

export function sortItems(items) {
  return [...items].sort((a, b) => {
    const an = Number.isFinite(a.booth) && a.booth > 0 ? a.booth : 1e6;
    const bn = Number.isFinite(b.booth) && b.booth > 0 ? b.booth : 1e6;
    return an - bn || String(a.appName).localeCompare(String(b.appName), 'ko');
  });
}

export function layoutWorld(items, { cols: wantCols } = {}) {
  const list = sortItems(items);
  const cols = wantCols || Math.max(3, Math.min(6, Math.ceil(Math.sqrt(list.length * 1.6))));
  const rows = Math.max(1, Math.ceil(list.length / cols));
  const width = MARGIN * 2 + cols * CELL_W;
  const height = PLAZA_H + rows * CELL_H + MARGIN;
  const booths = list.map((item, i) => {
    const c = i % cols, r = Math.floor(i / cols);
    const cx = MARGIN + c * CELL_W + CELL_W / 2;
    const top = PLAZA_H + r * CELL_H + 30;
    const x = cx - BOOTH_W / 2, y = top;
    return {
      item, index: i, label: Number.isFinite(item.booth) && item.booth > 0 ? item.booth : i + 1,
      x, y, w: BOOTH_W, h: BOOTH_H,
      door: { x: cx, y: y + BOOTH_H + 26 },
      host: { x: x + BOOTH_W + 18, y: y + BOOTH_H + 6 },
    };
  });
  const plaza = { x: width / 2, y: PLAZA_H / 2 + 10, r: 70 };
  const sign = { x: width / 2 - 230, y: 90, w: 150, h: 70 };
  return { width, height, cols, rows, booths, plaza, sign, spawn: { x: width / 2, y: PLAZA_H - 60 } };
}

// 동그라미(플레이어)와 네모(부스·안내판)가 겹치면 밀어내기
function pushOut(p, r, box) {
  const nx = Math.max(box.x, Math.min(p.x, box.x + box.w));
  const ny = Math.max(box.y, Math.min(p.y, box.y + box.h));
  const dx = p.x - nx, dy = p.y - ny;
  const d2 = dx * dx + dy * dy;
  if (d2 >= r * r) return p;
  if (d2 === 0) { // 중심이 상자 안: 가장 가까운 변으로
    const opts = [
      { x: box.x - r, y: p.y, d: p.x - box.x }, { x: box.x + box.w + r, y: p.y, d: box.x + box.w - p.x },
      { x: p.x, y: box.y - r, d: p.y - box.y }, { x: p.x, y: box.y + box.h + r, d: box.y + box.h - p.y },
    ].sort((a, b) => a.d - b.d);
    return { x: opts[0].x, y: opts[0].y };
  }
  const d = Math.sqrt(d2);
  return { x: nx + (dx / d) * r, y: ny + (dy / d) * r };
}

export function moveWithin(world, from, dx, dy, r = PLAYER_R) {
  let p = { x: from.x + dx, y: from.y + dy };
  p.x = Math.max(r, Math.min(world.width - r, p.x));
  p.y = Math.max(r, Math.min(world.height - r, p.y));
  for (const b of world.booths) p = pushOut(p, r, b);
  p = pushOut(p, r, world.sign);
  // 분수대
  const fx = p.x - world.plaza.x, fy = p.y - world.plaza.y, fd = Math.hypot(fx, fy), fr = world.plaza.r * 0.6 + r;
  if (fd < fr) p = fd === 0 ? { x: p.x, y: world.plaza.y + fr } : { x: world.plaza.x + (fx / fd) * fr, y: world.plaza.y + (fy / fd) * fr };
  return p;
}

export function nearestBooth(world, p, maxDist = 70) {
  let best = null, bd = Infinity;
  for (const b of world.booths) {
    const d = Math.hypot(p.x - b.door.x, p.y - b.door.y);
    if (d < bd) { bd = d; best = b; }
  }
  return bd <= maxDist ? best : null;
}

export function boothAt(world, x, y) {
  return world.booths.find((b) => x >= b.x - 10 && x <= b.x + b.w + 10 && y >= b.y - 30 && y <= b.door.y + 10) || null;
}

export function nearSign(world, p, maxDist = 90) {
  const s = world.sign;
  return Math.hypot(p.x - (s.x + s.w / 2), p.y - (s.y + s.h + 20)) <= maxDist;
}
