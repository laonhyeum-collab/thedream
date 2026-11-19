// 픽셀 캐릭터: 학생이 고른 모양(성별·피부·머리·옷·소품)으로 2등신 픽셀 캐릭터를 그립니다.
// 학생 앱(내 캐릭터 만들기)과 앱 월드(내 아바타·부스 지기)가 함께 씁니다. 개인정보는 들어가지 않아요.

export const AVATAR_OPTIONS = {
  gender: ['남자아이', '여자아이'],
  skin: ['#FFE3C8', '#F6CBA4', '#E2A87C', '#BC7F55', '#8B5A3C'],
  hair: ['짧은 머리', '단발', '긴 머리', '양갈래', '곱슬', '삐죽'],
  hairColor: ['#3B2A20', '#6B4226', '#C98B4B', '#F2C14E', '#E4572E', '#8E6BD8', '#3A86FF', '#4CAF50'],
  top: ['#3A86FF', '#E4572E', '#4CAF50', '#F2C14E', '#AB47BC', '#FF8FB1', '#26C6DA', '#F5F5F5'],
  bottom: ['#1E3A5F', '#4E342E', '#546E7A', '#283593', '#AD1457', '#2E7D32'],
  acc: ['없음', '모자', '리본', '안경', '왕관', '헤드폰'],
};
export const AVATAR_LABELS = { gender: '성별', skin: '피부', hair: '머리 모양', hairColor: '머리 색', top: '윗옷', bottom: '하의 색', acc: '소품' };
const KEYS = Object.keys(AVATAR_OPTIONS);
// 2등신 치비 캐릭터: 큰 머리(반짝이는 눈·볼) + 작은 몸. 테두리 칸까지 18×21
export const AVATAR_W = 18;
export const AVATAR_H = 21;
const OUTLINE = '#3B2F5C';
const EYE = '#2B2350';

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

// 색 밝게(+)·어둡게(-)
export function shade(hex, k) {
  const n = parseInt(hex.slice(1), 16);
  const f = (c) => Math.max(0, Math.min(255, Math.round(k < 0 ? c * (1 + k) : c + (255 - c) * k)));
  return `#${[(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => f(c).toString(16).padStart(2, '0')).join('')}`;
}

// 18×21 칸에 색 채우기 → 2차원 배열 (빈칸 null). frame 1 = 걷는 모습
export function avatarPixels(cfg, frame = 0) {
  const a = cleanAvatar(cfg);
  const g = Array.from({ length: AVATAR_H }, () => Array(AVATAR_W).fill(null));
  // 그림 좌표(16×19)를 테두리 1칸 안쪽에
  const set = (x, y, c) => { const X = x + 1, Y = y + 1; if (X >= 0 && X < AVATAR_W && Y >= 0 && Y < AVATAR_H) g[Y][X] = c; };
  const rect = (x0, y0, x1, y1, c) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) set(x, y, c); };
  const girl = a.gender === 1;
  const skin = AVATAR_OPTIONS.skin[a.skin], skinD = shade(skin, -0.12);
  const hair = AVATAR_OPTIONS.hairColor[a.hairColor], hairD = shade(hair, -0.28), hairL = shade(hair, 0.35);
  const top = AVATAR_OPTIONS.top[a.top], topD = shade(top, -0.2);
  const bottom = AVATAR_OPTIONS.bottom[a.bottom], bottomD = shade(bottom, -0.25);
  const walk = frame === 1;

  // 뒷머리 (몸 뒤로 내려오는 머리)
  if (a.hair === 2) { rect(2, 4, 13, 13, hairD); rect(3, 4, 12, 12, hair); }
  if (a.hair === 3) { rect(0, 5, 1, 9, hair); rect(14, 5, 15, 9, hair); set(0, 9, hairD); set(15, 9, hairD); set(1, 5, '#FF5DA2'); set(14, 5, '#FF5DA2'); }

  // 다리·신발 (걷기: 한쪽 다리 들고 팔 흔들기)
  rect(5, 16, 6, 16, skin); rect(9, 16, 10, 16, skin);
  if (walk) { rect(4, 16, 6, 16, '#4A3B55'); rect(9, 17, 11, 17, '#4A3B55'); }
  else { rect(4, 17, 6, 17, '#4A3B55'); rect(9, 17, 11, 17, '#4A3B55'); }
  set(4, walk ? 16 : 17, '#6B5A78'); set(9, 17, '#6B5A78');
  // 하의: 남자아이 반바지 / 여자아이 치마
  if (girl) { rect(4, 14, 11, 14, bottom); rect(3, 15, 12, 15, bottom); set(3, 15, bottomD); set(12, 15, bottomD); set(5, 15, bottomD); set(8, 15, bottomD); set(10, 15, bottomD); }
  else { rect(4, 14, 11, 14, bottom); rect(4, 15, 6, 15, bottom); rect(9, 15, 11, 15, bottom); set(7, 14, bottomD); set(8, 14, bottomD); }
  // 몸·팔·손
  rect(4, 11, 11, 13, top); rect(4, 13, 11, 13, topD);
  set(7, 11, shade(top, 0.25)); set(8, 11, shade(top, 0.25));                 // 옷깃
  const armUp = walk ? 1 : 0;
  rect(3, 11, 3, 12 - armUp, top); set(3, 13 - armUp, skin);
  rect(12, 11, 12, 12, top); set(12, 13, skin);

  // 얼굴 (큰 머리)
  rect(4, 2, 11, 2, skin); rect(3, 3, 12, 9, skin); rect(4, 10, 11, 10, skin);
  rect(4, 10, 11, 10, skinD);                                                      // 턱 그림자
  // 눈: 2×2 + 반짝임
  rect(5, 6, 6, 7, EYE); rect(9, 6, 10, 7, EYE); set(6, 6, '#FFFFFF'); set(10, 6, '#FFFFFF');
  if (girl) { set(4, 6, EYE); set(11, 6, EYE); }                                   // 속눈썹
  set(4, 8, '#FF9EB0'); set(11, 8, '#FF9EB0'); set(5, 8, '#FFC2CE'); set(10, 8, '#FFC2CE');   // 볼
  set(7, 9, '#C0505E'); set(8, 9, '#C0505E');                                      // 입

  // 앞머리
  rect(5, 0, 10, 0, hair); rect(4, 1, 11, 1, hair); rect(3, 2, 12, 3, hair);
  rect(3, 4, 12, 4, hair); set(7, 4, skin); set(10, 4, skin); set(5, 4, hairD);
  set(3, 5, hair); set(12, 5, hair);
  set(6, 1, hairL); set(7, 1, hairL); set(5, 2, hairL);                            // 윤기
  if (a.hair === 1) { rect(2, 3, 3, 9, hair); rect(12, 3, 13, 9, hair); set(2, 9, hairD); set(13, 9, hairD); rect(3, 5, 3, 9, hairD); rect(12, 5, 12, 9, hairD); }
  if (a.hair === 2) { rect(2, 3, 3, 10, hair); rect(12, 3, 13, 10, hair); }
  if (a.hair === 3) { rect(2, 3, 2, 6, hair); rect(13, 3, 13, 6, hair); }
  if (a.hair === 4) { set(4, 0, hair); set(11, 0, hair); set(6, -1, hair); set(9, -1, hair); rect(2, 2, 2, 6, hair); rect(13, 2, 13, 6, hair); set(2, 6, hairD); set(13, 6, hairD); set(5, 4, hair); set(8, 4, hairD); }
  if (a.hair === 5) { set(4, -1, hair); set(7, -1, hair); set(10, -1, hair); set(2, 1, hair); set(13, 1, hair); set(2, 2, hair); set(13, 2, hair); }
  if (girl && a.hair === 0) { rect(2, 3, 2, 7, hair); rect(13, 3, 13, 7, hair); }  // 여자아이 짧은 머리: 옆머리 조금

  // 소품
  if (a.acc === 1) { rect(5, -1, 10, -1, '#E4572E'); rect(4, 0, 11, 2, '#E4572E'); rect(3, 3, 13, 3, '#B8401F'); set(7, 0, '#FFFFFF'); set(8, 0, '#FFFFFF'); }
  if (a.acc === 2) { set(11, 0, '#FF5DA2'); set(11, 1, '#FF5DA2'); set(13, 0, '#FF5DA2'); set(13, 1, '#FF5DA2'); set(12, 0, '#C2185B'); set(12, 1, '#FFB3D1'); }
  if (a.acc === 3) {
    const G = '#7E57C2';   // 보라 안경테 (눈이 가려지지 않게 밝은 색)
    rect(4, 5, 7, 5, G); rect(4, 8, 7, 8, G); set(4, 6, G); set(4, 7, G); set(7, 6, G); set(7, 7, G);
    rect(8, 5, 11, 5, G); rect(8, 8, 11, 8, G); set(11, 6, G); set(11, 7, G); set(8, 6, G); set(8, 7, G);
    set(6, 7, '#9ED8F5'); set(10, 7, '#9ED8F5');
  }
  if (a.acc === 4) { set(5, -1, '#F5C400'); set(7, -1, '#F5C400'); set(8, -1, '#F5C400'); set(10, -1, '#F5C400'); rect(5, 0, 10, 0, '#F5C400'); set(7, 0, '#E4572E'); set(8, 0, '#3A86FF'); }
  if (a.acc === 5) { rect(4, -1, 11, -1, '#2B2D42'); set(3, 0, '#2B2D42'); set(12, 0, '#2B2D42'); rect(1, 4, 2, 7, '#FF5DA2'); rect(13, 4, 14, 7, '#FF5DA2'); rect(2, 1, 2, 3, '#2B2D42'); rect(13, 1, 13, 3, '#2B2D42'); }

  // 진한 테두리 (픽셀 게임 느낌)
  const out = g.map((r) => r.slice());
  for (let y = 0; y < AVATAR_H; y++) for (let x = 0; x < AVATAR_W; x++) {
    if (g[y][x]) continue;
    const near = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => g[y + dy] && g[y + dy][x + dx]);
    if (near) out[y][x] = OUTLINE;
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
  const cv = h('canvas', { width: AVATAR_W * 7, height: AVATAR_H * 7 + 6, class: 'avatar-preview', 'aria-label': '내 캐릭터 미리보기' });
  const paint = () => { const x = cv.getContext('2d'); x.clearRect(0, 0, cv.width, cv.height); drawAvatar(x, cur, cv.width / 2, cv.height - 3, 7); };
  const labels = AVATAR_LABELS;
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
