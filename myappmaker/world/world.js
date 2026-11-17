// [앱 월드] 메타버스: 아바타로 걸어 다니며 친구들의 앱 부스에 들어가 놀아요.
import { topicById, categoryById } from '../shared/topics.js';
import { loadConfig, createApi } from '../shared/api.js';
import { mountApp } from '../shared/sandbox.js';
import { readFileText } from '../shared/files.js';
import { layoutWorld, moveWithin, nearestBooth, boothAt, nearSign, PLAYER_R } from './worldmap.js';
import { h, $, toast } from '../shared/ui.js';

const AVATARS = ['🐰', '🐻', '🐱', '🐶', '🦊', '🐼', '🐧', '🐸', '🐯', '🦁', '🐨', '🐹'];
const HOSTS = ['🧑‍💻', '👩‍💻', '👨‍💻', '🧑‍🎨', '👩‍🔬', '🧑‍🚀', '🦸', '🧙'];
const PREF = 'myappmaker.world.me';
const LIKED = 'myappmaker.world.liked';
const SPEED = 240;

const cfg = loadConfig('world');
const api = createApi(cfg);
const params = new URLSearchParams(location.search);

// 체험용 샘플 부스 (저장소도 파일도 없을 때)
const DEMO = [
  { id: 'demo-fruit', developer: '샘플', appName: '과일 바구니', topicId: 'fruit-bomb', booth: 1, intro: '떨어지는 과일은 받고 폭탄은 피해요!', appUrl: 'samples/fruit-catch.html' },
  { id: 'demo-memory', developer: '샘플', appName: '동물 짝꿍 카드', topicId: 'memory-cards', booth: 2, intro: '뒤집힌 카드에서 같은 동물 짝을 찾아요.', appUrl: 'samples/memory-cards.html' },
  { id: 'demo-mugunghwa', developer: '선생님', appName: '무궁화 꽃이 피었습니다', topicId: null, emoji: '🌺', booth: 3, intro: '카메라가 술래! 몸으로 하는 놀이 (카메라 허용 필요)', appUrl: '../../mugunghwa/' },
];

let source = 'demo';
let items = [];
let world = null;
let me = loadMe();
let pos = { x: 0, y: 0 };
let target = null;            // 화면을 눌러 정한 목적지
let autoEnter = null;         // 목적지 도착 후 들어갈 부스
let joy = null;               // 끌어서 움직이기
let near = null;
let nearDir = false;
let moving = false;
let roomOpen = false;
const keys = new Set();

function loadMe() {
  try { return { nick: '', avatar: AVATARS[0], ...JSON.parse(localStorage.getItem(PREF) || '{}') }; } catch { return { nick: '', avatar: AVATARS[0] }; }
}
function likedSet() { try { return new Set(JSON.parse(localStorage.getItem(LIKED) || '[]')); } catch { return new Set(); } }

// ---------- 데이터 ----------
async function loadItems() {
  if (source === 'file') return items;
  if (api.enabled && !params.has('demo')) {
    try {
      const r = await api.world();
      source = 'server';
      return r.items;
    } catch (e) {
      toast(`우리 반 저장소를 읽지 못했어요: ${e.message}`, 5000);
      source = 'error';
      return [];
    }
  }
  source = 'demo';
  return DEMO;
}

function describeSource() {
  const n = items.length;
  return {
    server: `🏫 우리 반 저장소 · 부스 ${n}개`,
    file: `📁 메타버스 파일 · 부스 ${n}개`,
    demo: '🧪 체험용 샘플 부스 3개 (우리 반 저장소를 연결하면 친구들 부스가 열려요)',
    error: '⚠ 저장소 연결 오류 · 잠시 뒤 새로고침',
  }[source];
}

async function refreshItems(first = false) {
  const next = await loadItems();
  const sig = (l) => l.map((x) => `${x.id}:${x.booth}:${x.appName}`).join('|');
  if (!first && sig(next) === sig(items)) { items = next; return; }
  items = next;
  world = layoutWorld(items);
  if (first) pos = { ...world.spawn };
  else pos = moveWithin(world, pos, 0, 0);
  $('#sourceInfo').textContent = describeSource();
  $('#boothCount').textContent = items.length ? `🏪 부스 ${items.length}개` : '아직 열린 부스가 없어요';
}

// ---------- 입장 ----------
function renderLobby(keepNick = false) {
  if (!keepNick) $('#nick').value = me.nick;
  $('#avatarPick').replaceChildren(...AVATARS.map((a) => h('button', {
    type: 'button', 'aria-pressed': String(me.avatar === a), 'aria-label': `아바타 ${a}`,
    onclick: () => { me.avatar = a; renderLobby(true); },
  }, a)));
}
$('#enterBtn').onclick = () => {
  me.nick = $('#nick').value.trim().slice(0, 10) || '방문자';
  try { localStorage.setItem(PREF, JSON.stringify(me)); } catch { /* 저장 불가 */ }
  $('#lobby').hidden = true;
  $('#stage').hidden = false;
  resize();
  $('#map').focus?.();
};
$('#exitBtn').onclick = () => { $('#stage').hidden = true; $('#lobby').hidden = false; renderLobby(); };
$('#worldFile').onchange = async (e) => {
  const f = e.target.files[0]; e.target.value = '';
  if (!f) return;
  try {
    const data = JSON.parse(await readFileText(f, 15_000_000));
    if (data.schema !== 'myappmaker.world/1' || !Array.isArray(data.items)) throw new Error('메타버스 파일이 아니에요');
    source = 'file';
    items = data.items.map((x) => ({ ...x, booth: x.booth == null ? null : Number(x.booth) }));
    world = layoutWorld(items);
    pos = { ...world.spawn };
    $('#sourceInfo').textContent = describeSource();
    $('#boothCount').textContent = `🏪 부스 ${items.length}개`;
    toast(`📁 부스 ${items.length}개를 열었어요`);
  } catch (err) { toast(`불러오지 못했어요: ${err.message}`, 4000); }
};

// ---------- 그리기 ----------
const canvas = $('#map');
const ctx = canvas.getContext('2d');
let vw = 0, vh = 0, dpr = 1;
function resize() {
  dpr = Math.min(2, window.devicePixelRatio || 1);
  vw = window.innerWidth; vh = window.innerHeight;
  canvas.width = Math.round(vw * dpr); canvas.height = Math.round(vh * dpr);
}
window.addEventListener('resize', resize);

function camera() {
  const cx = world.width <= vw ? (world.width - vw) / 2 : Math.max(0, Math.min(world.width - vw, pos.x - vw / 2));
  const cy = world.height <= vh ? (world.height - vh) / 2 : Math.max(0, Math.min(world.height - vh, pos.y - vh / 2));
  return { x: cx, y: cy };
}

function hash(s) { let x = 0; for (const ch of String(s)) x = (x * 31 + ch.codePointAt(0)) >>> 0; return x; }
function itemEmoji(it) { return it.emoji || topicById(it.topicId)?.emoji || '🎮'; }
function itemColor(it) { const t = topicById(it.topicId); return t ? categoryById(t.cat).color : '#6c5ce7'; }

function roundRect(x, y, w, hh, r) { ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x, y, w, hh, r) : ctx.rect(x, y, w, hh); }
function emoji(ch, x, y, size) { ctx.font = `${size}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(ch, x, y); }
function label(text, x, y, { size = 14, bg = 'rgba(255,255,255,.92)', color = '#23253a', maxW = 150 } = {}) {
  ctx.font = `700 ${size}px "Gowun Dodum","Apple SD Gothic Neo","Malgun Gothic",sans-serif`;
  let t = String(text);
  while (ctx.measureText(t).width > maxW && t.length > 1) t = t.slice(0, -2) + '…';
  const w = ctx.measureText(t).width + 14;
  ctx.fillStyle = bg; roundRect(x - w / 2, y - size / 2 - 5, w, size + 10, 8); ctx.fill();
  ctx.fillStyle = color; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(t, x, y + 1);
}

function drawGround(t) {
  ctx.fillStyle = '#9edca4'; ctx.fillRect(-2000, -2000, world.width + 4000, world.height + 4000);
  ctx.fillStyle = '#bfe8c3'; ctx.fillRect(0, 0, world.width, world.height);
  // 풀 무늬
  ctx.fillStyle = 'rgba(80,160,90,.18)';
  for (let i = 0; i < 160; i++) { const hx = (hash(`g${i}`) % world.width), hy = (hash(`h${i}`) % world.height); ctx.fillRect(hx, hy, 3, 7); }
  // 광장과 길
  ctx.fillStyle = '#f3e3b5';
  roundRect(40, 40, world.width - 80, 300, 40); ctx.fill();
  for (let r = 0; r < world.rows; r++) { const y = 360 + r * 230 + 110 + 30; roundRect(60, y, world.width - 120, 52, 26); ctx.fill(); }
  ctx.fillRect(world.width / 2 - 26, 300, 52, world.height - 360);
  // 분수대
  const p = world.plaza;
  ctx.fillStyle = '#d8c9a0'; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#74c0fc'; ctx.beginPath(); ctx.arc(p.x, p.y, p.r - 12, 0, Math.PI * 2); ctx.fill();
  for (let i = 0; i < 6; i++) { const a = t / 900 + (i * Math.PI) / 3; emoji('✨', p.x + Math.cos(a) * 30, p.y + Math.sin(a) * 30, 16); }
  emoji('⛲', p.x, p.y, 44);
  // 안내소
  const s = world.sign;
  ctx.fillStyle = '#8d6e63'; ctx.fillRect(s.x + 20, s.y + s.h, 8, 26); ctx.fillRect(s.x + s.w - 28, s.y + s.h, 8, 26);
  ctx.fillStyle = '#fff'; roundRect(s.x, s.y, s.w, s.h, 14); ctx.fill();
  ctx.strokeStyle = nearDir ? '#fab005' : '#8d6e63'; ctx.lineWidth = nearDir ? 5 : 3; ctx.stroke();
  label('📋 안내소', s.x + s.w / 2, s.y + 24, { bg: 'transparent', size: 18 });
  label('부스 목록', s.x + s.w / 2, s.y + 50, { bg: 'transparent', size: 13, color: '#6b6f8a' });
  // 환영 문구
  label('🌏 우리 반 앱 월드에 어서 와요!', world.width / 2 + 170, 90, { size: 18, maxW: 320 });
  // 나무
  for (let i = 0; i < 14; i++) {
    const side = i % 2 ? world.width - 50 : 50;
    emoji(i % 3 ? '🌳' : '🌲', side + ((hash(`t${i}`) % 30) - 15), 420 + i * 120 % Math.max(200, world.height - 420), 40);
  }
}

function drawBooth(b, t) {
  const it = b.item, color = itemColor(it), on = near === b;
  ctx.fillStyle = 'rgba(0,0,0,.12)'; roundRect(b.x + 6, b.y + 12, b.w, b.h, 14); ctx.fill();
  ctx.fillStyle = '#fffdf7'; roundRect(b.x, b.y + 20, b.w, b.h - 20, 12); ctx.fill();
  if (on) { ctx.strokeStyle = '#fab005'; ctx.lineWidth = 6; ctx.stroke(); }
  // 지붕
  ctx.fillStyle = color; roundRect(b.x - 10, b.y, b.w + 20, 34, 12); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.35)'; for (let i = 0; i < 6; i++) ctx.fillRect(b.x - 10 + i * ((b.w + 20) / 6), b.y + 4, (b.w + 20) / 12, 26);
  label(`${b.label}`, b.x + 6, b.y + 17, { size: 14, bg: '#fff', color });
  // 간판 이모지
  emoji(itemEmoji(it), b.x + b.w / 2, b.y + 62 + (on ? Math.sin(t / 150) * 3 : 0), 40);
  // 문
  ctx.fillStyle = color; roundRect(b.x + b.w / 2 - 18, b.y + b.h - 26, 36, 26, 6); ctx.fill();
  label(it.appName || '이름 없는 앱', b.x + b.w / 2, b.door.y + 4, { size: 14, maxW: 170 });
  // 개발자
  emoji(HOSTS[hash(it.developer) % HOSTS.length], b.host.x, b.host.y - 6, 26);
  label(it.developer || '', b.host.x, b.host.y + 18, { size: 11, maxW: 70 });
  if (it.likes) label(`👍 ${it.likes}`, b.x + b.w - 14, b.y + 44, { size: 11, bg: '#fff6d6' });
}

function drawPlayer(t) {
  const bob = moving ? Math.abs(Math.sin(t / 110)) * 5 : 0;
  ctx.fillStyle = 'rgba(0,0,0,.15)'; ctx.beginPath(); ctx.ellipse(pos.x, pos.y + PLAYER_R, PLAYER_R, 7, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(pos.x, pos.y - bob, PLAYER_R + 4, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#6c5ce7'; ctx.lineWidth = 3; ctx.stroke();
  emoji(me.avatar, pos.x, pos.y - bob + 1, 30);
  label(me.nick || '나', pos.x, pos.y - PLAYER_R - 22 - bob, { size: 13, bg: '#6c5ce7', color: '#fff' });
  if (target) { ctx.strokeStyle = 'rgba(108,92,231,.6)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(target.x, target.y, 10 + Math.sin(t / 120) * 3, 0, Math.PI * 2); ctx.stroke(); }
}

function draw(t) {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, vw, vh);
  const cam = camera();
  ctx.translate(-cam.x, -cam.y);
  drawGround(t);
  for (const b of world.booths) drawBooth(b, t);
  if (!world.booths.length) label(source === 'error' ? '저장소에 연결하지 못했어요' : '아직 열린 부스가 없어요. 선생님이 입점을 승인하면 생겨요!', world.width / 2, 470, { size: 16, maxW: 600 });
  drawPlayer(t);
}

// ---------- 움직이기 ----------
function step(dt) {
  let dx = 0, dy = 0;
  if (!roomOpen) {
    if (keys.has('ArrowLeft') || keys.has('KeyA')) dx -= 1;
    if (keys.has('ArrowRight') || keys.has('KeyD')) dx += 1;
    if (keys.has('ArrowUp') || keys.has('KeyW')) dy -= 1;
    if (keys.has('ArrowDown') || keys.has('KeyS')) dy += 1;
    if (joy && joy.active) { dx = joy.dx; dy = joy.dy; }
    if (dx || dy) { target = null; autoEnter = null; } else if (target) {
      const tx = target.x - pos.x, ty = target.y - pos.y, d = Math.hypot(tx, ty);
      if (d < 6) {
        target = null;
        if (autoEnter) { const b = autoEnter; autoEnter = null; openRoom(b.item); }
      } else { dx = tx / d; dy = ty / d; }
    }
  }
  const len = Math.hypot(dx, dy);
  moving = len > 0.05;
  if (moving) {
    const k = Math.min(1, len) / (len || 1);
    const next = moveWithin(world, pos, dx * k * SPEED * dt, dy * k * SPEED * dt);
    if (target && Math.hypot(next.x - pos.x, next.y - pos.y) < 0.2) { target = null; autoEnter = null; }   // 막힘
    pos = next;
  }
  near = nearestBooth(world, pos);
  nearDir = !near && nearSign(world, pos);
  const hint = $('#enterHint');
  hint.hidden = roomOpen || !(near || nearDir);
  if (near) $('#enterText').textContent = `${near.label}번 부스 · ${near.item.appName}`;
  else if (nearDir) $('#enterText').textContent = '📋 안내소';
}

let last = performance.now();
function frame(t) {
  const dt = Math.min(0.05, (t - last) / 1000); last = t;
  if (world && !$('#stage').hidden) { step(dt); draw(t); }
  requestAnimationFrame(frame);
}

window.addEventListener('keydown', (e) => {
  if ($('#stage').hidden) return;
  if (roomOpen || !$('#directory').hidden) { if (e.key === 'Escape') { closeRoom(); closeDir(); } return; }
  if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space'].includes(e.code)) e.preventDefault();
  if (e.code === 'Space' || e.code === 'Enter') { enterNear(); return; }
  keys.add(e.code);
});
window.addEventListener('keyup', (e) => keys.delete(e.code));
window.addEventListener('blur', () => keys.clear());

function toWorld(e) { const cam = camera(); return { x: e.clientX + cam.x, y: e.clientY + cam.y }; }
canvas.addEventListener('pointerdown', (e) => {
  canvas.setPointerCapture(e.pointerId);
  joy = { id: e.pointerId, sx: e.clientX, sy: e.clientY, dx: 0, dy: 0, active: false };
});
canvas.addEventListener('pointermove', (e) => {
  if (!joy || joy.id !== e.pointerId) return;
  const mx = e.clientX - joy.sx, my = e.clientY - joy.sy, d = Math.hypot(mx, my);
  if (d > 14) {
    joy.active = true;
    const k = Math.min(1, d / 50);
    joy.dx = (mx / d) * k; joy.dy = (my / d) * k;
    const j = $('#joystick');
    j.style.display = 'block'; j.style.left = `${joy.sx - 60}px`; j.style.top = `${joy.sy - 60}px`;
    const kd = Math.min(d, 40);
    j.firstElementChild.style.transform = `translate(${(mx / d) * kd}px, ${(my / d) * kd}px)`;
  }
});
function endJoy(e) {
  if (!joy || joy.id !== e.pointerId) return;
  if (!joy.active) {   // 짧게 누름 = 거기로 가기 (부스를 누르면 문으로 가서 들어가기)
    const p = toWorld(e);
    const b = boothAt(world, p.x, p.y);
    if (b) { target = { ...b.door }; autoEnter = b; } else { target = p; autoEnter = null; }
    const s = world.sign;
    if (p.x >= s.x && p.x <= s.x + s.w && p.y >= s.y && p.y <= s.y + s.h) { target = null; openDir(); }
  }
  joy = null;
  $('#joystick').style.display = 'none';
}
canvas.addEventListener('pointerup', endJoy);
canvas.addEventListener('pointercancel', endJoy);

function enterNear() {
  if (near) openRoom(near.item);
  else if (nearDir) openDir();
}
$('#enterBooth').onclick = enterNear;

// ---------- 부스 안 ----------
let current = null;
async function openRoom(it) {
  current = it;
  roomOpen = true; keys.clear(); target = null;
  const t = topicById(it.topicId);
  $('#roomEmoji').textContent = itemEmoji(it);
  $('#roomTitle').textContent = it.appName;
  $('#roomMeta').textContent = [`개발자 ${it.developer}`, it.booth ? `${it.booth}번 부스` : '', t ? t.name : ''].filter(Boolean).join(' · ');
  $('#roomIntro').textContent = it.intro || '';
  $('#likeCount').textContent = String(it.likes || 0);
  $('#likeBtn').disabled = likedSet().has(it.id);
  const nt = $('#newTab');
  nt.hidden = !it.appUrl || !!it.html || !!it.hasHtml;
  if (it.appUrl) nt.href = it.appUrl;
  $('#appRoom').hidden = false;
  const frame = $('#roomFrame');
  frame.srcdoc = '<p style="font-family:sans-serif;color:#888;text-align:center;margin-top:20%">앱을 여는 중…</p>';
  try {
    let html = it.html || '';
    if (!html && it.hasHtml && source === 'server') html = (await api.app(it.id)).html;
    if (current !== it) return;
    if (html) mountApp(frame, { html });
    else if (it.appUrl) mountApp(frame, { url: it.appUrl });
    else frame.srcdoc = '<p style="font-family:sans-serif;text-align:center;margin-top:20%">이 부스는 아직 준비 중이에요</p>';
  } catch (e) {
    frame.srcdoc = '<p style="font-family:sans-serif;color:#c00;text-align:center;margin-top:20%">앱을 불러오지 못했어요</p>';
    toast(e.message);
  }
  $('#closeRoom').focus();
}
function closeRoom() {
  if (!roomOpen) return;
  roomOpen = false; current = null;
  $('#appRoom').hidden = true;
  const f = $('#roomFrame'); f.removeAttribute('src'); f.srcdoc = '';
  canvas.focus?.();
}
$('#closeRoom').onclick = closeRoom;
$('#likeBtn').onclick = async () => {
  if (!current) return;
  const it = current;
  const liked = likedSet();
  if (liked.has(it.id)) return;
  $('#likeBtn').disabled = true;
  try {
    if (source === 'server') it.likes = (await api.like(it.id)).likes;
    else it.likes = (it.likes || 0) + 1;
    liked.add(it.id);
    try { localStorage.setItem(LIKED, JSON.stringify([...liked])); } catch { /* 저장 불가 */ }
    $('#likeCount').textContent = String(it.likes);
    toast(`👍 ${it.developer}에게 좋아요를 보냈어요!`);
  } catch (e) { $('#likeBtn').disabled = false; toast(e.message); }
};

// ---------- 부스 목록 ----------
function openDir() {
  $('#dirList').replaceChildren(...(world.booths.length ? world.booths.map((b) => h('button', {
    class: 'dir-item', type: 'button', onclick: () => { closeDir(); pos = moveWithin(world, b.door, 0, 0); openRoom(b.item); },
  }, h('span', { class: 'emo' }, itemEmoji(b.item)),
  h('span', {}, h('b', {}, b.item.appName), h('br'), h('span', { class: 'muted small' }, `${b.item.developer}${b.item.intro ? ` · ${b.item.intro}` : ''}`)),
  h('span', { class: 'no' }, `${b.label}번`))) : [h('p', { class: 'muted' }, '아직 열린 부스가 없어요.')]));
  $('#directory').hidden = false;
}
function closeDir() { $('#directory').hidden = true; }
$('#listBtn').onclick = openDir;
$('#closeDir').onclick = closeDir;
for (const id of ['#appRoom', '#directory']) $(id).addEventListener('click', (e) => { if (e.target === $(id)) { closeRoom(); closeDir(); } });

// ---------- 시작 ----------
renderLobby();
resize();
await refreshItems(true);
requestAnimationFrame(frame);
setInterval(() => { if (source === 'server' && !roomOpen && !document.hidden) refreshItems(false); }, 60000);
