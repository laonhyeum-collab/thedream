// 놀이 마당 그리기 (캔버스)

export const PLAYER_LOOK = [
  { name: '1P', color: '#ff7a8a', dark: '#c94a5c', kind: 'rabbit' },
  { name: '2P', color: '#5fa8ff', dark: '#2f6fc4', kind: 'bear' },
];

function roundRect(c, x, y, w, h, r) {
  c.beginPath();
  c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r);
  c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r);
  c.arcTo(x, y, x + w, y, r);
  c.closePath();
}

function flower(c, x, y, r, rot = 0) {
  c.save();
  c.translate(x, y);
  c.rotate(rot);
  c.fillStyle = '#f7a8c8';
  for (let i = 0; i < 5; i++) {
    c.rotate((Math.PI * 2) / 5);
    c.beginPath();
    c.ellipse(0, -r * 0.55, r * 0.42, r * 0.6, 0, 0, Math.PI * 2);
    c.fill();
  }
  c.fillStyle = '#d6336c';
  c.beginPath();
  c.arc(0, 0, r * 0.3, 0, Math.PI * 2);
  c.fill();
  c.restore();
}

/** 술래: 부를 때는 뒤돌아 있고, 얼음일 때는 이쪽을 봅니다 */
function drawTagger(c, x, y, s, looking, hawk, t) {
  c.save();
  c.translate(x, y);
  // 몸
  c.fillStyle = '#ffd166';
  roundRect(c, -s * 0.38, -s * 0.2, s * 0.76, s * 0.9, s * 0.25);
  c.fill();
  // 머리
  c.fillStyle = '#ffe3c2';
  c.beginPath();
  c.arc(0, -s * 0.55, s * 0.45, 0, Math.PI * 2);
  c.fill();
  // 머리카락
  c.fillStyle = '#4a3428';
  c.beginPath();
  if (looking) {
    c.arc(0, -s * 0.62, s * 0.46, Math.PI * 1.05, Math.PI * 1.95);
    c.fill();
  } else {
    c.arc(0, -s * 0.55, s * 0.46, 0, Math.PI * 2); // 뒤통수
    c.fill();
    c.fillStyle = '#5c4334';
    c.beginPath();
    c.arc(-s * 0.12, -s * 0.7, s * 0.1, 0, Math.PI * 2);
    c.fill();
  }
  if (looking) {
    // 눈
    const eye = hawk ? s * 0.13 : s * 0.1;
    for (const ex of [-s * 0.17, s * 0.17]) {
      c.fillStyle = '#fff';
      c.beginPath();
      c.arc(ex, -s * 0.52, eye, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = '#222';
      const wob = Math.sin(t * 6) * eye * 0.25;
      c.beginPath();
      c.arc(ex + wob, -s * 0.52, eye * 0.55, 0, Math.PI * 2);
      c.fill();
    }
    c.strokeStyle = '#a0522d';
    c.lineWidth = Math.max(2, s * 0.04);
    c.beginPath();
    c.arc(0, -s * 0.33, s * 0.1, Math.PI * 0.15, Math.PI * 0.85);
    c.stroke();
  }
  c.restore();
}

function drawPlayer(c, look, x, y, s, moving, caught, t) {
  const bob = moving > 0.05 ? Math.abs(Math.sin(t * 14)) * s * 0.18 * moving : 0;
  c.save();
  c.translate(x, y - bob);
  if (caught) c.rotate(Math.sin(t * 30) * 0.15);
  // 그림자
  c.fillStyle = 'rgba(0,0,0,0.15)';
  c.beginPath();
  c.ellipse(0, s * 0.5 + bob, s * 0.4, s * 0.1, 0, 0, Math.PI * 2);
  c.fill();
  // 귀
  c.fillStyle = look.color;
  if (look.kind === 'rabbit') {
    c.beginPath(); c.ellipse(-s * 0.18, -s * 0.55, s * 0.1, s * 0.3, -0.15, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.ellipse(s * 0.18, -s * 0.55, s * 0.1, s * 0.3, 0.15, 0, Math.PI * 2); c.fill();
  } else {
    c.beginPath(); c.arc(-s * 0.28, -s * 0.32, s * 0.14, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.arc(s * 0.28, -s * 0.32, s * 0.14, 0, Math.PI * 2); c.fill();
  }
  // 몸
  c.beginPath();
  c.arc(0, 0, s * 0.45, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = 'rgba(255,255,255,0.55)';
  c.beginPath();
  c.ellipse(0, s * 0.12, s * 0.25, s * 0.2, 0, 0, Math.PI * 2);
  c.fill();
  // 얼굴 (술래 쪽 = 오른쪽을 봄)
  c.fillStyle = '#222';
  if (caught) {
    c.strokeStyle = '#222';
    c.lineWidth = Math.max(2, s * 0.05);
    for (const ex of [0.02, 0.22]) {
      c.beginPath();
      c.moveTo(s * (ex - 0.06), -s * 0.16); c.lineTo(s * (ex + 0.06), -s * 0.04);
      c.moveTo(s * (ex + 0.06), -s * 0.16); c.lineTo(s * (ex - 0.06), -s * 0.04);
      c.stroke();
    }
  } else {
    c.beginPath(); c.arc(s * 0.04, -s * 0.1, s * 0.055, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.arc(s * 0.24, -s * 0.1, s * 0.055, 0, Math.PI * 2); c.fill();
  }
  c.fillStyle = look.dark;
  c.beginPath(); c.arc(s * 0.15, s * 0.02, s * 0.05, 0, Math.PI * 2); c.fill();
  // 이름표
  c.fillStyle = '#fff';
  c.font = `bold ${Math.round(s * 0.32)}px system-ui, sans-serif`;
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.lineWidth = Math.max(3, s * 0.07);
  c.strokeStyle = look.dark;
  c.strokeText(look.name, 0, s * 0.82);
  c.fillText(look.name, 0, s * 0.82);
  c.restore();
}

/**
 * @param {CanvasRenderingContext2D} c
 * @param {object} st { game, t, caughtFlash: number[] }
 */
export function drawScene(c, w, h, st) {
  const { game, t } = st;
  const looking = game.phase === 'freeze';
  // 하늘
  const sky = c.createLinearGradient(0, 0, 0, h);
  if (looking) { sky.addColorStop(0, '#ffd9d9'); sky.addColorStop(1, '#fff1e6'); }
  else { sky.addColorStop(0, '#bfe8ff'); sky.addColorStop(1, '#eafaff'); }
  c.fillStyle = sky;
  c.fillRect(0, 0, w, h);

  // 구름
  c.fillStyle = 'rgba(255,255,255,0.85)';
  for (let i = 0; i < 3; i++) {
    const cx = ((i * 0.37 + t * 0.01) % 1.2 - 0.1) * w;
    const cy = h * (0.1 + i * 0.07);
    c.beginPath();
    c.arc(cx, cy, h * 0.05, 0, Math.PI * 2);
    c.arc(cx + h * 0.06, cy - h * 0.02, h * 0.06, 0, Math.PI * 2);
    c.arc(cx + h * 0.12, cy, h * 0.045, 0, Math.PI * 2);
    c.fill();
  }

  // 땅
  const groundY = h * 0.32;
  c.fillStyle = '#9be38f';
  c.fillRect(0, groundY, w, h - groundY);

  const n = game.players.length;
  const startX = w * 0.08;
  const goalX = w * 0.78;
  // 아래쪽은 카메라 창 자리로 비워 둠 (길이 너무 좁아지지 않는 만큼만)
  const lanesBottom = Math.max(groundY + h * 0.38, h - (st.bottomReserve || 0));
  const laneH = (lanesBottom - groundY) / n;
  const s = Math.min(laneH * 0.55, w * 0.09);

  // 길과 결승선
  for (let i = 0; i < n; i++) {
    const ly = groundY + laneH * (i + 0.5);
    c.fillStyle = '#e8d3a6';
    roundRect(c, startX - s * 0.6, ly - s * 0.35, goalX - startX + s * 1.2, s * 0.95, s * 0.3);
    c.fill();
    // 눈금 (발자국)
    c.fillStyle = 'rgba(160,120,70,0.25)';
    for (let k = 1; k < 10; k++) {
      const x = startX + ((goalX - startX) * k) / 10;
      c.beginPath(); c.arc(x, ly + s * 0.12, s * 0.06, 0, Math.PI * 2); c.fill();
    }
  }
  // 결승선 (체크무늬)
  const sq = Math.max(6, s * 0.18);
  for (let y = groundY; y < lanesBottom; y += sq) {
    for (let k = 0; k < 2; k++) {
      c.fillStyle = (Math.floor((y - groundY) / sq) + k) % 2 ? '#333' : '#fff';
      c.fillRect(goalX + s * 0.55 + k * sq, y, sq, sq);
    }
  }

  // 무궁화 나무 + 술래
  const treeX = w * 0.925;
  const T = Math.min(h, w * 0.7); // 세로 화면에서도 나무가 너무 커지지 않게
  const crownY = groundY - T * 0.17;
  c.fillStyle = '#8b5a2b';
  c.fillRect(treeX - T * 0.018, crownY, T * 0.036, groundY - crownY + T * 0.03);
  c.fillStyle = '#4caf50';
  c.beginPath();
  c.arc(treeX, crownY, T * 0.12, 0, Math.PI * 2);
  c.arc(treeX - T * 0.1, crownY + T * 0.07, T * 0.09, 0, Math.PI * 2);
  c.arc(treeX + T * 0.08, crownY + T * 0.08, T * 0.09, 0, Math.PI * 2);
  c.fill();
  const bloom = game.phase === 'chant' ? game.chantProgress / 10 : looking ? 1 : 0.3;
  for (let i = 0; i < 6; i++) {
    const a = i * 1.7;
    const r = T * 0.035 * (0.5 + bloom * 0.5);
    flower(c, treeX + Math.cos(a) * T * 0.1, crownY + T * 0.03 + Math.sin(a) * T * 0.07, r, t * 0.3 + i);
  }
  drawTagger(c, treeX, groundY + (lanesBottom - groundY) * 0.5, Math.min(h * 0.22, w * 0.09), looking, game.difficulty === 'hawk', t);

  // 친구들
  game.players.forEach((p, i) => {
    const ly = groundY + laneH * (i + 0.5);
    const x = startX + ((goalX - startX) * p.progress) / 100;
    const caught = (st.caughtFlash[i] || 0) > 0;
    const moving = game.phase === 'chant' || game.phase === 'freeze' ? p.moving : 0;
    drawPlayer(c, PLAYER_LOOK[i], x, ly - s * 0.1, s, moving, caught, t);
  });
}
