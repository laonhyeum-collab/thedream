// 픽셀 캐릭터: 학생이 고른 모양(피부·머리·옷·소품)으로 12×16 픽셀 캐릭터를 그립니다.
// 학생 앱(내 캐릭터 만들기)과 앱 월드(내 아바타·부스 지기)가 함께 씁니다. 개인정보는 들어가지 않아요.

export const AVATAR_OPTIONS = {
  skin: ['#FFE3C8', '#F6CBA4', '#E2A87C', '#BC7F55', '#8B5A3C'],
  hair: ['짧은 머리', '단발', '긴 머리', '양갈래', '곱슬', '삐죽'],
  hairColor: ['#3B2A20', '#6B4226', '#C98B4B', '#F2C14E', '#E4572E', '#8E6BD8', '#3A86FF', '#4CAF50'],
  top: ['#3A86FF', '#E4572E', '#4CAF50', '#F2C14E', '#AB47BC', '#FF8FB1', '#26C6DA', '#F5F5F5'],
  bottom: ['#1E3A5F', '#4E342E', '#546E7A', '#283593', '#AD1457', '#2E7D32'],
  acc: ['없음', '모자', '리본', '안경', '왕관', '헤드폰'],
};
const KEYS = Object.keys(AVATAR_OPTIONS);
export const AVATAR_W = 12;
export const AVATAR_H = 16;

export function cleanAvatar(v) {
  const o = {};
  for (const k of KEYS) {
    const n = Number(v && v[k]);
    o[k] = Number.isInteger(n) && n >= 0 && n < AVATAR_OPTIONS[k].length ? n : 0;
  }
  return o;
}

export function randomAvatar(rand = Math.random) {
  const o = {};
  for (const k of KEYS) o[k] = Math.floor(rand() * AVATAR_OPTIONS[k].length);
  if (rand() < 0.5) o.acc = 0;
  return o;
}

// 글자(별명 등)로 늘 같은 캐릭터 만들기
export function avatarFromText(text) {
  let x = 7;
  for (const ch of String(text || '')) x = (x * 31 + ch.codePointAt(0)) >>> 0;
  return randomAvatar(() => ((x = (x * 1103515245 + 12345) >>> 0) / 4294967296));
}

// 12×16 칸에 색 채우기 → 2차원 배열 (빈칸 null). frame 1 = 걷는 모습
export function avatarPixels(cfg, frame = 0) {
  const a = cleanAvatar(cfg);
  const g = Array.from({ length: AVATAR_H }, () => Array(AVATAR_W).fill(null));
  const set = (x, y, c) => { if (x >= 0 && x < AVATAR_W && y >= 0 && y < AVATAR_H) g[y][x] = c; };
  const rect = (x0, y0, x1, y1, c) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) set(x, y, c); };
  const skin = AVATAR_OPTIONS.skin[a.skin], hair = AVATAR_OPTIONS.hairColor[a.hairColor];
  const top = AVATAR_OPTIONS.top[a.top], bottom = AVATAR_OPTIONS.bottom[a.bottom];

  // 다리·신발 (걷기: 한쪽 다리 들기)
  const lift = frame === 1 ? 1 : 0;
  rect(4, 13, 5, 14 - lift, bottom); rect(6, 13, 7, 14, bottom);
  rect(4, 15 - lift, 5, 15 - lift, '#3D3D4E'); rect(6, 15, 7, 15, '#3D3D4E');
  // 몸·팔·손
  rect(3, 8, 8, 12, top); rect(3, 12, 8, 12, bottom);
  rect(2, 8, 2, 10, top); rect(9, 8, 9, 10, top);
  set(2, 11, skin); set(9, 11, skin);
  // 머리 (얼굴)
  rect(3, 2, 8, 7, skin);
  set(4, 5, '#2B2D42'); set(7, 5, '#2B2D42');            // 눈
  set(3, 6, '#FF9EB0'); set(8, 6, '#FF9EB0');            // 볼
  set(5, 7, '#C0605A'); set(6, 7, '#C0605A');            // 입
  // 머리카락
  rect(3, 1, 8, 2, hair); set(2, 2, hair); set(9, 2, hair); set(2, 3, hair); set(9, 3, hair);
  if (a.hair === 1 || a.hair === 2) { rect(2, 3, 2, 7, hair); rect(9, 3, 9, 7, hair); }
  if (a.hair === 2) { rect(2, 8, 2, 10, hair); rect(9, 8, 9, 10, hair); }
  if (a.hair === 3) { rect(0, 3, 1, 5, hair); rect(10, 3, 11, 5, hair); }
  if (a.hair === 4) { set(3, 0, hair); set(5, 0, hair); set(7, 0, hair); rect(2, 1, 9, 1, hair); }
  if (a.hair === 5) { set(3, 0, hair); set(6, 0, hair); set(8, 0, hair); }
  // 소품
  if (a.acc === 1) { rect(2, 0, 9, 1, '#E4572E'); rect(2, 2, 10, 2, '#E4572E'); }
  if (a.acc === 2) { set(8, 1, '#FF5DA2'); set(9, 0, '#FF5DA2'); set(10, 1, '#FF5DA2'); set(9, 1, '#FFB3D1'); }
  if (a.acc === 3) { rect(3, 4, 5, 4, '#2B2D42'); rect(6, 4, 8, 4, '#2B2D42'); set(3, 5, '#2B2D42'); set(8, 5, '#2B2D42'); }
  if (a.acc === 4) { set(3, 0, '#F5C400'); set(5, 0, '#F5C400'); set(7, 0, '#F5C400'); rect(3, 1, 8, 1, '#F5C400'); }
  if (a.acc === 5) { rect(3, 0, 8, 0, '#2B2D42'); rect(1, 3, 2, 5, '#2B2D42'); rect(9, 3, 10, 5, '#2B2D42'); }
  // 테두리 (픽셀 그림 느낌)
  const out = g.map((r) => r.slice());
  for (let y = 0; y < AVATAR_H; y++) for (let x = 0; x < AVATAR_W; x++) {
    if (g[y][x]) continue;
    const near = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => g[y + dy] && g[y + dy][x + dx]);
    if (near) out[y][x] = 'rgba(43,45,66,.55)';
  }
  return out;
}

// (cx, bottom)에 발이 닿게 그리기. px = 픽셀 하나의 크기
export function drawAvatar(ctx, cfg, cx, bottom, px = 4, frame = 0) {
  const g = avatarPixels(cfg, frame);
  const x0 = Math.round(cx - (AVATAR_W * px) / 2), y0 = Math.round(bottom - AVATAR_H * px);
  ctx.fillStyle = 'rgba(0,0,0,.18)';
  ctx.beginPath(); ctx.ellipse(cx, bottom, AVATAR_W * px * 0.35, px * 1.4, 0, 0, Math.PI * 2); ctx.fill();
  for (let y = 0; y < AVATAR_H; y++) for (let x = 0; x < AVATAR_W; x++) {
    const c = g[y][x];
    if (!c) continue;
    ctx.fillStyle = c;
    ctx.fillRect(x0 + x * px, y0 + y * px, px, px);
  }
}

// 캐릭터 만들기 화면 (학생 앱·앱 월드 공용). h = ui.js 의 h
export function avatarBuilder(h, cfg, onChange) {
  let cur = cleanAvatar(cfg);
  const cv = h('canvas', { width: AVATAR_W * 8, height: AVATAR_H * 8 + 6, class: 'avatar-preview', 'aria-label': '내 캐릭터 미리보기' });
  const paint = () => { const x = cv.getContext('2d'); x.clearRect(0, 0, cv.width, cv.height); drawAvatar(x, cur, cv.width / 2, cv.height - 3, 8); };
  const labels = { skin: '피부', hair: '머리 모양', hairColor: '머리 색', top: '윗옷', bottom: '바지·치마', acc: '소품' };
  const rows = KEYS.map((k) => {
    const row = h('div', { class: 'avatar-row', role: 'group', 'aria-label': labels[k] }, h('span', { class: 'avatar-label' }, labels[k]));
    const draw = () => {
      row.querySelectorAll('button').forEach((b) => b.remove());
      AVATAR_OPTIONS[k].forEach((v, i) => {
        const isColor = v.startsWith('#');
        row.append(h('button', {
          type: 'button', class: `avatar-opt${isColor ? ' swatch' : ''}`, 'aria-pressed': String(cur[k] === i), 'data-k': k, 'data-i': i,
          style: isColor ? `background:${v}` : null, 'aria-label': isColor ? `${labels[k]} ${i + 1}` : v,
          onclick: () => { cur = { ...cur, [k]: i }; draw(); paint(); onChange(cur); },
        }, isColor ? '' : v));
      });
    };
    draw();
    return row;
  });
  const shuffle = h('button', { type: 'button', class: 'ghost', onclick: () => { cur = randomAvatar(); wrap.replaceWith(avatarBuilder(h, cur, onChange)); onChange(cur); } }, '🎲 아무거나');
  const wrap = h('div', { class: 'avatar-builder' }, h('div', { class: 'avatar-stage' }, cv, shuffle), h('div', { class: 'avatar-rows' }, ...rows));
  paint();
  return wrap;
}
