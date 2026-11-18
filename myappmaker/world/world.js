// [앱 월드] 픽셀 섬 메타버스: 가운데 「선생님의 앱」 + 학생 부스 12개. 내 캐릭터로 걸어 다니며 친구들 앱을 체험해요.
import { topicById, categoryById } from '../shared/topics.js';
import { loadConfig, createApi } from '../shared/api.js';
import { mountApp } from '../shared/sandbox.js';
import { readFileText } from '../shared/files.js';
import { cleanWorldSettings, worldName, DEFAULT_WORLD, WORLD_ASSET_KEYS, hasHotspots, presetById, presetUrl } from '../shared/worldart.js';
import { cleanAvatar, randomAvatar, avatarFromText, avatarPixels, avatarBuilder, AVATAR_W, AVATAR_H } from '../shared/avatar.js';
import { layoutWorld, layoutIllustrated, moveWithin, nearestDoor, buildingAt, PLAYER_R } from './worldmap.js';
import { PX, buildGround, boothSprite, emptyLotSprite, hallSprite, fountainSprite, archSprite, sparkles } from './pixelart.js';
import { h, $, toast } from '../shared/ui.js';

const PREF = 'myappmaker.world.me';
const LIKED = 'myappmaker.world.liked';
const PROGRESS = 'myappmaker.world.progress';
const MYBOOTH = 'myappmaker.world.mybooth';
const SPEED = 260;

const cfg = loadConfig('world');
const api = createApi(cfg);
const params = new URLSearchParams(location.search);

// 체험용 (저장소도 파일도 없을 때)
const DEMO = {
  items: [
    { id: 'demo-fruit', developer: '샘플', appName: '과일 바구니', topicId: 'fruit-bomb', booth: 1, intro: '떨어지는 과일은 받고 폭탄은 피해요!', appUrl: 'samples/fruit-catch.html' },
    { id: 'demo-memory', developer: '샘플', appName: '동물 짝꿍 카드', topicId: 'memory-cards', booth: 2, intro: '뒤집힌 카드에서 같은 동물 짝을 찾아요.', appUrl: 'samples/memory-cards.html' },
  ],
  teacherApp: { title: '무궁화 꽃이 피었습니다', url: '../../mugunghwa/', emoji: '🌺', intro: '카메라가 술래! 몸으로 하는 놀이 (카메라 허용 필요)' },
};

const state = {
  source: 'demo', items: [], settings: { ...DEFAULT_WORLD }, teacherApp: null,
  assets: {}, boothImgs: new Map(), world: null, ground: null,
};
let me = loadJSON(PREF, null) || { nick: '', avatar: randomAvatar() };
me.avatar = cleanAvatar(me.avatar);
let pos = { x: 0, y: 0 }, target = null, autoEnter = null, joy = null, near = null, nearWish = false, moving = false, walkT = 0;
let roomOpen = false, panelOpen = false, overview = false, current = null;
const keys = new Set();

function loadJSON(k, d) { try { const v = JSON.parse(localStorage.getItem(k)); return v ?? d; } catch { return d; } }
function saveJSON(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* 저장 불가 */ } }
const progress = () => ({ visited: [], teacher: false, wish: false, badges: [], ...loadJSON(PROGRESS, {}) });
const likedSet = () => new Set(loadJSON(LIKED, []));

function loadImg(src) {
  return new Promise((ok) => { if (!src) { ok(null); return; } const i = new Image(); i.onload = () => ok(i); i.onerror = () => ok(null); i.src = src; });
}

// ---------- 데이터 ----------
async function loadServer() {
  const r = await api.world();
  state.source = 'server';
  state.items = r.items;
  state.settings = cleanWorldSettings(r.settings);
  state.teacherApp = r.teacherApp ? { title: r.teacherApp.title, server: true } : null;
  const want = (r.assets || []).filter((k) => WORLD_ASSET_KEYS.includes(k) && !state.assets[k]);
  await Promise.all(want.map(async (k) => { try { state.assets[k] = await loadImg((await api.asset(k)).data); } catch { /* 그림 없이 */ } }));
  await Promise.all(r.items.filter((it) => it.hasBooth && !state.boothImgs.has(it.id)).map(async (it) => {
    try { state.boothImgs.set(it.id, await loadImg((await api.booth(it.id)).image)); } catch { /* 기본 건물 */ }
  }));
}

async function loadFile(data) {
  if (data.schema !== 'myappmaker.world/1' || !Array.isArray(data.items)) throw new Error('메타버스 파일이 아니에요');
  state.source = 'file';
  state.items = data.items.map((x) => ({ ...x, booth: x.booth == null ? null : Number(x.booth) }));
  state.settings = cleanWorldSettings(data.settings);
  state.teacherApp = data.teacherApp && (data.teacherApp.html || data.teacherApp.url) ? data.teacherApp : null;
  state.assets = {};
  for (const k of WORLD_ASSET_KEYS) if (data.assets && data.assets[k]) state.assets[k] = await loadImg(data.assets[k]);
  state.boothImgs = new Map();
  for (const it of state.items) if (it.boothImage) state.boothImgs.set(it.id, await loadImg(it.boothImage));
}

async function loadData(first) {
  if (state.source === 'file' && !first) return;
  if (api.enabled && !params.has('demo')) {
    try { await loadServer(); } catch (e) { if (first) toast(`우리 반 저장소를 읽지 못했어요: ${e.message}`, 5000); state.source = 'error'; }
  } else {
    state.source = 'demo';
    state.items = DEMO.items;
    state.teacherApp = DEMO.teacherApp;
  }
  await loadPreset();
  rebuild(first);
}

// 어떤 지도를 쓸까: ① 선생님이 올린 지도 + 문 자리 ② 준비된 지도 그림(기본) ③ 앱이 그리는 픽셀 섬
async function loadPreset() {
  const custom = state.assets.map && hasHotspots(state.settings.hotspots);
  const p = custom ? null : presetById(state.settings.mapPreset);
  if (!p) { state.preset = null; return; }
  if (state.preset && state.preset.id === p.id && state.preset.img) return;
  state.preset = { ...p, img: await loadImg(presetUrl(p)) };
}

function rebuild(first) {
  const custom = !!(state.assets.map && hasHotspots(state.settings.hotspots));
  const pre = !custom && state.preset && state.preset.img ? state.preset : null;
  const map = custom ? state.assets.map : pre ? pre.img : null;
  const hotspots = custom ? state.settings.hotspots : pre ? pre.hotspots : null;
  state.mapImg = map;
  state.bigLabels = pre ? true : state.settings.labelMode === 'big';
  const illustrated = !!(map && hotspots);
  const sig = JSON.stringify([state.items.map((x) => [x.id, x.booth]), illustrated && hotspots, map && map.width, pre && pre.id]);
  if (!state.world || state.sig !== sig) {
    state.sig = sig;
    // 그림 지도 + 문 자리가 있으면 그 그림 그대로, 없으면 앱이 그린 픽셀 섬
    state.world = illustrated ? layoutIllustrated(state.items, hotspots, 1920, Math.round((1920 * map.height) / map.width)) : layoutWorld(state.items);
    if (!illustrated) state.ground = state.ground || buildGround(state.world);
    canvasEl.dataset.mode = illustrated ? (pre ? `preset:${pre.id}` : 'illustrated') : 'pixel';   // 시험·디버깅용 표시
    if (first) pos = { ...state.world.spawn }; else pos = moveWithin(state.world, pos, 0, 0);
  }
  const name = worldName(state.settings);
  $('#lobbyTitle').textContent = name;
  document.title = `${name} · MY APP META WORLD`;
  $('#friendCount').textContent = String(state.items.length);
  $('#noticeDot').hidden = !state.settings.notice;
  $('#sourceInfo').textContent = {
    server: `🏫 우리 반 저장소 · 부스 ${state.items.length}개${state.teacherApp ? ' · 선생님의 앱 열림' : ''}`,
    file: `📁 메타버스 파일 · 부스 ${state.items.length}개`,
    demo: '🧪 체험용 샘플 부스 2개 + 선생님의 앱(무궁화). 우리 반 저장소를 연결하면 친구들 부스가 열려요.',
    error: '⚠ 저장소 연결 오류 · 잠시 뒤 새로고침',
  }[state.source];
}

// ---------- 입장 ----------
function renderLobby() {
  $('#idLogin').hidden = !api.enabled || params.has('demo');
  $('#nick').value = me.nick;
  $('#lobbyAvatar').replaceChildren(avatarBuilder(h, me.avatar, (a) => { me.avatar = a; saveJSON(PREF, me); paintMe(); }));
}
// (선택) 선생님이 만든 아이디로 들어오면 내 부스를 자동으로 찾아요. 아이디는 저장하지 않아요.
async function findMyBooth() {
  const id = $('#wLoginId').value.trim(), pin = $('#wLoginPin').value.trim();
  if (!api.enabled || !id || !pin) return;
  try {
    const { token } = await api.studentLogin(id, pin);
    const r = await api.mine('', token);
    $('#wLoginPin').value = '';
    if (r.found && r.status === 'approved') { saveJSON(MYBOOTH, r.id); toast('⭐ 내 부스를 찾았어요! 위의 「⭐ 내 앱」을 눌러 봐요', 4500); }
    else if (r.found) toast('내 앱은 아직 선생님이 확인하는 중이에요', 4000);
    else toast('아직 입점 신청한 앱이 없어요', 4000);
  } catch (e) { toast(`아이디 확인: ${e.message}`, 4500); }
}
$('#enterBtn').onclick = () => {
  findMyBooth();
  me.nick = $('#nick').value.trim().slice(0, 10) || '방문자';
  saveJSON(PREF, me);
  paintMe();
  $('#lobby').hidden = true;
  $('#stage').hidden = false;
  resize();
  $('#map').focus();
};
$('#worldFile').onchange = async (e) => {
  const f = e.target.files[0]; e.target.value = '';
  if (!f) return;
  try {
    await loadFile(JSON.parse(await readFileText(f, 40_000_000)));
    await loadPreset(); state.sig = null; rebuild(true);
    toast(`📁 부스 ${state.items.length}개를 열었어요`);
  } catch (err) { toast(`불러오지 못했어요: ${err.message}`, 4000); }
};

// ---------- 그리기 ----------
const canvasEl = $('#map');
const ctx = canvasEl.getContext('2d');
let vw = 0, vh = 0, dpr = 1;
function resize() {
  dpr = Math.min(2, window.devicePixelRatio || 1);
  vw = window.innerWidth; vh = window.innerHeight;
  canvasEl.width = Math.round(vw * dpr); canvasEl.height = Math.round(vh * dpr);
}
window.addEventListener('resize', resize);

function zoom() {
  if (overview) return Math.min(vw / state.world.width, (vh - 60) / state.world.height);
  const z = Math.max(0.42, Math.min(1.3, Math.min(vw / 1150, vh / 700)));
  if (state.world.illustrated) return z;
  // 픽셀아트 한 칸이 화면 픽셀 정수배가 되게 (칸 크기가 들쭉날쭉하지 않게)
  const k = Math.max(1, Math.round(PX * z * dpr));
  return k / (PX * dpr);
}
function camera(z) {
  const W = state.world.width, H = state.world.height, sw = vw / z, sh = vh / z;
  const cx = sw >= W ? (W - sw) / 2 : Math.max(0, Math.min(W - sw, pos.x - sw / 2));
  const cy = sh >= H ? (H - sh) / 2 - (overview ? 30 / z : 0) : Math.max(-60 / z, Math.min(H - sh, pos.y - sh / 2));
  const g = z * dpr;   // 화면 픽셀에 딱 맞추기
  return { x: Math.round(cx * g) / g, y: Math.round(cy * g) / g };
}

// 캐릭터 그림 캐시 (12×16 → 확대)
const avatarCache = new Map();
function avatarCanvas(a, frame) {
  const key = `${JSON.stringify(a)}:${frame}`;
  if (avatarCache.has(key)) return avatarCache.get(key);
  const g = avatarPixels(a, frame);
  const c = document.createElement('canvas'); c.width = AVATAR_W; c.height = AVATAR_H;
  const x = c.getContext('2d');
  for (let y = 0; y < AVATAR_H; y++) for (let i = 0; i < AVATAR_W; i++) if (g[y][i]) { x.fillStyle = g[y][i]; x.fillRect(i, y, 1, 1); }
  avatarCache.set(key, c);
  return c;
}
function drawChar(a, x, bottom, frame, scale = 4) {
  ctx.fillStyle = 'rgba(0,0,0,.2)';
  ctx.beginPath(); ctx.ellipse(x, bottom, 18, 6, 0, 0, Math.PI * 2); ctx.fill();
  ctx.drawImage(avatarCanvas(a, frame), x - (AVATAR_W * scale) / 2, bottom - AVATAR_H * scale, AVATAR_W * scale, AVATAR_H * scale);
}

const spriteCache = new Map();
const cached = (k, fn) => { if (!spriteCache.has(k)) spriteCache.set(k, fn()); return spriteCache.get(k); };
const itemColor = (it) => { const t = topicById(it.topicId); return t ? categoryById(t.cat).color : '#8E6BD8'; };
const itemEmoji = (it) => it.emoji || topicById(it.topicId)?.emoji || '🎮';

// 그림을 (가운데 x, 바닥 y)에 w×h 안으로 맞춰 그리기
function drawFit(img, x, bottom, w, hgt) {
  const k = Math.min(w / img.width, hgt / img.height);
  ctx.drawImage(img, x - (img.width * k) / 2, bottom - img.height * k, img.width * k, img.height * k);
}

function emoji(ch, x, y, size) {
  ctx.font = `${size}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(ch, x, y);
}

function label(text, x, y, { n = null, color = '#8E6BD8', size = 20, maxW = 220 } = {}) {
  const s = size * labelScale;
  ctx.font = `400 ${s}px "Jua","Gowun Dodum",sans-serif`;
  let t = String(text);
  while (ctx.measureText(t).width > maxW * labelScale && t.length > 1) t = `${t.slice(0, -2)}…`;
  const tw = ctx.measureText(t).width, badge = n == null ? 0 : s * 1.5, pad = s * 0.6;
  const w = tw + pad * 2 + badge, hh = s * 1.6, x0 = x - w / 2, y0 = y - hh / 2;
  ctx.fillStyle = '#3B2F5C'; rr(x0 - 2, y0 - 2 + 3, w + 4, hh + 4, hh / 2); ctx.fill();
  ctx.fillStyle = '#FFFFFF'; rr(x0, y0, w, hh, hh / 2); ctx.fill();
  ctx.strokeStyle = '#3B2F5C'; ctx.lineWidth = 2.5; ctx.stroke();
  if (n != null) {
    ctx.fillStyle = color; ctx.beginPath(); ctx.arc(x0 + hh / 2, y, hh / 2 - 3, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = `400 ${s * 0.85}px "Jua",sans-serif`;
    ctx.fillText(String(n).padStart(2, '0'), x0 + hh / 2, y + 1);
    ctx.font = `400 ${s}px "Jua","Gowun Dodum",sans-serif`;
  }
  ctx.fillStyle = '#2B2350'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(t, x0 + badge + (w - badge) / 2, y + 1);
}
function rr(x, y, w, hh, r) { ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x, y, w, hh, r) : ctx.rect(x, y, w, hh); }
let labelScale = 1;

function drawBooth(b, t) {
  const it = b.item;
  if (!it) {   // 빈 자리: 울타리 친 꽃밭
    const s = cached('lot', emptyLotSprite);
    ctx.drawImage(s, b.x - (s.width * PX) / 2, b.y - s.height * PX + 10, s.width * PX, s.height * PX);
    return;
  }
  const own = state.boothImgs.get(it.id);
  const t0 = topicById(it.topicId);
  const catImg = t0 && state.assets[`booth_${t0.cat}`];
  const img = own || catImg || state.assets.booth;
  if (img) drawFit(img, b.x, b.y + 4, b.w + 24, b.h + 24);
  let ey = b.y - b.h + 34, ex = b.x, es = 34;
  if (!img) {
    const cat = topicById(it.topicId)?.cat;
    const s = cached(`booth:${cat}:${itemColor(it)}:${b.n}`, () => boothSprite(cat, itemColor(it), b.n));
    const x0 = b.x - (s.width * PX) / 2, y0 = b.y - s.height * PX + 6;
    ctx.drawImage(s, x0, y0, s.width * PX, s.height * PX);
    if (s.emblem) { ex = x0 + s.emblem.x * PX; ey = y0 + s.emblem.y * PX; es = s.emblem.r * PX * 1.35; }
  }
  if (!own) emoji(itemEmoji(it), ex, ey + (near && near.booth === b ? Math.sin(t / 150) * 3 : 0), es);
  if (near && near.booth === b) doorRing(b.door.x, b.door.y - 14, t);
}

// 가까이 간 문: 바닥에 반짝이는 노란 고리
function doorRing(x, y, t) {
  const k = 1 + Math.sin(t / 160) * 0.08;
  ctx.fillStyle = 'rgba(255,213,79,.28)'; ctx.beginPath(); ctx.ellipse(x, y + 12, 56 * k, 18 * k, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#FFD54F'; ctx.lineWidth = 5; ctx.stroke();
}

function drawHall(t) {
  const hl = state.world.hall;
  if (state.assets.hall) { drawFit(state.assets.hall, hl.x, hl.y + 6, hl.w + 40, hl.h + 50); }
  else {
    const s = cached('hall', hallSprite), x0 = hl.x - (s.width * PX) / 2, y0 = hl.y - s.height * PX + 12;
    ctx.drawImage(s, x0, y0, s.width * PX, s.height * PX);
    emoji('🎓', x0 + s.emblem.x * PX, y0 + s.emblem.y * PX, s.emblem.r * PX * 1.3);
  }
  if (near && near.kind === 'teacher') doorRing(hl.door.x, hl.door.y - 20, t);
  if (state.teacherApp) emoji('✨', hl.x + hl.w / 2 - 10, hl.y - hl.h + 20 + Math.sin(t / 300) * 4, 26);
}

function drawFountain(t) {
  const f = state.world.fountain;
  if (state.assets.fountain) drawFit(state.assets.fountain, f.x, f.y + 40, f.r * 2.4, f.r * 2.2);
  else {
    const s = cached('fountain', fountainSprite);
    ctx.drawImage(s, f.x - (s.width * PX) / 2, f.y - (s.height * PX) / 2 - 4, s.width * PX, s.height * PX);
    ctx.fillStyle = '#E6FAFF';
    for (let i = 0; i < 6; i++) { const a = t / 260 + i; ctx.fillRect(Math.round((f.x + Math.cos(a) * 22) / PX) * PX, Math.round((f.y - 46 - Math.abs(Math.sin(a * 1.7)) * 16) / PX) * PX, PX, PX); }
  }
  emoji('⭐', f.x, f.y - 74 + Math.sin(t / 400) * 5, 40);
  if (nearWish) { ctx.strokeStyle = '#FFD54F'; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(f.x, f.y, f.r + 18, 0, Math.PI * 2); ctx.stroke(); }
}

function drawArch() {
  const a = state.world.arch;
  if (state.assets.arch) drawFit(state.assets.arch, a.x, a.y + 4, a.w + 20, a.h + 30);
  else { const s = cached('arch', archSprite); ctx.drawImage(s, a.x - (s.width * PX) / 2, a.y - s.height * PX + 4, s.width * PX, s.height * PX); }
}

function drawIllustrated(t) {
  const w = state.world, small = !state.bigLabels;
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(state.mapImg, 0, 0, w.width, w.height);
  ctx.imageSmoothingEnabled = false;
  const ring = (x, y) => { ctx.strokeStyle = '#FFD54F'; ctx.lineWidth = 6; ctx.beginPath(); ctx.ellipse(x, y, 58 + Math.sin(t / 150) * 4, 22, 0, 0, Math.PI * 2); ctx.stroke(); };
  if (near && near.kind === 'teacher' && w.hall) ring(w.hall.door.x, w.hall.door.y);
  if (near && near.booth) ring(near.booth.door.x, near.booth.door.y);
  const list = [
    ...w.booths.filter((b) => b.item).map((b) => ({ y: b.host.y, fn: () => drawChar(b.item.avatar ? cleanAvatar(b.item.avatar) : avatarFromText(b.item.developer), b.host.x, b.host.y, 0, 3) })),
    { y: pos.y + PLAYER_R, fn: () => drawChar(me.avatar, pos.x, pos.y + PLAYER_R, moving ? Math.floor(walkT / 0.16) % 2 : 0, 3) },
  ].sort((a, b) => a.y - b.y);
  for (const d of list) d.fn();
  for (const b of w.booths) {
    if (b.item) {
      if (small) label(`${b.item.appName} · ${b.item.developer}`, b.x, b.y + 36, { size: 13, maxW: 200 });
      else label(b.item.appName || '이름 없는 앱', b.x, b.y + 38, { n: b.n, color: itemColor(b.item) });
    } else if (!small) label('빈 부스', b.x, b.y + 36, { n: b.n, color: '#B0A8C8', size: 14 });
  }
  if (w.hall && state.teacherApp) label(small ? state.teacherApp.title : `🎓 ${state.teacherApp.title}`, w.hall.x, w.hall.y + 36, { size: small ? 13 : 20, maxW: 240 });
  if (state.settings.schoolName) label(`🏫 ${worldName(state.settings)}`, w.width / 2, 34, { size: 22, maxW: 600 });
  label(me.nick || '나', pos.x, pos.y - 54, { size: 14, maxW: 120 });
  if (target) { ctx.strokeStyle = 'rgba(110,79,192,.7)'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(target.x, target.y, 12 + Math.sin(t / 120) * 3, 0, Math.PI * 2); ctx.stroke(); }
}

function draw(t) {
  const z = zoom(), cam = camera(z);
  labelScale = Math.max(1, 0.8 / z);
  if (state.world.illustrated) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#5BC8F5'; ctx.fillRect(0, 0, canvasEl.width, canvasEl.height);
    ctx.setTransform(dpr * z, 0, 0, dpr * z, -cam.x * dpr * z, -cam.y * dpr * z);
    drawIllustrated(t);
    return;
  }
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = '#5BC8F5'; ctx.fillRect(0, 0, canvasEl.width, canvasEl.height);
  ctx.setTransform(dpr * z, 0, 0, dpr * z, -cam.x * dpr * z, -cam.y * dpr * z);
  ctx.imageSmoothingEnabled = false;
  const W = state.world.width, H = state.world.height;
  if (state.assets.map) { ctx.imageSmoothingEnabled = true; ctx.drawImage(state.assets.map, 0, 0, W, H); ctx.imageSmoothingEnabled = false; }
  else {
    ctx.drawImage(state.ground, 0, 0, W, H);
    ctx.fillStyle = '#FFFFFF';   // 물 반짝임
    for (const s of sparkles()) {
      const ph = (t / 500 + s.p) % 4;
      if (ph < 1) { ctx.fillRect(s.x, s.y, PX, PX); if (ph > 0.3 && ph < 0.7) { ctx.fillRect(s.x - PX, s.y, PX, PX); ctx.fillRect(s.x + PX, s.y, PX, PX); ctx.fillRect(s.x, s.y - PX, PX, PX); ctx.fillRect(s.x, s.y + PX, PX, PX); } }
    }
  }

  // 위에서 아래로 (가까운 것이 앞에)
  const list = [
    { y: state.world.hall.y, fn: () => drawHall(t) },
    { y: state.world.fountain.y + 20, fn: () => drawFountain(t) },
    { y: state.world.arch.y, fn: drawArch },
    ...state.world.booths.map((b) => ({ y: b.y, fn: () => drawBooth(b, t) })),
    ...state.world.booths.filter((b) => b.item).map((b) => ({ y: b.host.y, fn: () => drawChar(b.item.avatar ? cleanAvatar(b.item.avatar) : avatarFromText(b.item.developer), b.host.x, b.host.y, 0) })),
    { y: pos.y + PLAYER_R, fn: () => drawChar(me.avatar, pos.x, pos.y + PLAYER_R, moving ? Math.floor(walkT / 0.16) % 2 : 0) },
  ].sort((a, b) => a.y - b.y);
  for (const d of list) d.fn();

  // 이름표 (맨 위)
  const hl = state.world.hall;
  label(state.teacherApp ? `🎓 ${state.teacherApp.title}` : '🎓 선생님의 앱', hl.x, hl.y + 50, { size: 18, maxW: 260 });
  for (const b of state.world.booths) {
    if (b.item) {
      label(b.item.appName || '이름 없는 앱', b.x, b.y + 46, { n: b.n, color: itemColor(b.item), size: 16, maxW: 170 });
      label(b.item.developer || '', b.host.x, b.host.y + 14, { size: 12, maxW: 90 });
    } else label('곧 열려요', b.x, b.y + 30, { n: b.n, color: '#B0A8C8', size: 12 });
  }
  const a = state.world.arch;
  ctx.font = `400 ${24 * Math.min(1.2, labelScale)}px "Jua",sans-serif`;
  ctx.fillStyle = '#4A3A8A'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(worldName(state.settings), a.x, a.y - (state.assets.arch ? a.h * 0.72 : 86), state.assets.arch ? a.w - 40 : 255);
  label(me.nick || '나', pos.x, pos.y - 70, { size: 15, maxW: 120 });
  if (target) { ctx.strokeStyle = 'rgba(110,79,192,.7)'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(target.x, target.y, 12 + Math.sin(t / 120) * 3, 0, Math.PI * 2); ctx.stroke(); }
  if (!state.items.length && state.source === 'server') label('선생님이 입점을 승인하면 부스가 열려요!', state.world.fountain.x, state.world.fountain.y + 120, { size: 18, maxW: 520 });
}

// ---------- 움직이기 ----------
function step(dt) {
  let dx = 0, dy = 0;
  if (!roomOpen && !panelOpen) {
    if (keys.has('ArrowLeft') || keys.has('KeyA')) dx -= 1;
    if (keys.has('ArrowRight') || keys.has('KeyD')) dx += 1;
    if (keys.has('ArrowUp') || keys.has('KeyW')) dy -= 1;
    if (keys.has('ArrowDown') || keys.has('KeyS')) dy += 1;
    if (joy && joy.active) { dx = joy.dx; dy = joy.dy; }
    if (dx || dy) { target = null; autoEnter = null; } else if (target) {
      const tx = target.x - pos.x, ty = target.y - pos.y, d = Math.hypot(tx, ty);
      if (d < 8) { target = null; if (autoEnter) { const a = autoEnter; autoEnter = null; enter(a); } } else { dx = tx / d; dy = ty / d; }
    }
  }
  const len = Math.hypot(dx, dy);
  moving = len > 0.05;
  if (moving) {
    const k = Math.min(1, len) / (len || 1);
    const next = moveWithin(state.world, pos, dx * k * SPEED * dt, dy * k * SPEED * dt);
    if (target && Math.hypot(next.x - pos.x, next.y - pos.y) < 0.2) { target = null; autoEnter = null; }
    pos = next; walkT += dt;
  }
  near = nearestDoor(state.world, pos);
  const f = state.world.fountain;
  nearWish = !!f && !near && Math.hypot(pos.x - f.x, pos.y - f.y) < f.r + 70;
  const hint = $('#enterHint');
  hint.hidden = roomOpen || panelOpen || !(near || nearWish);
  if (near && near.kind === 'teacher') $('#enterText').textContent = state.teacherApp ? `🎓 선생님의 앱 · ${state.teacherApp.title}` : '🎓 선생님의 앱 (준비 중)';
  else if (near) $('#enterText').textContent = `${String(near.booth.n).padStart(2, '0')}번 부스 · ${near.booth.item.appName}`;
  else if (nearWish) $('#enterText').textContent = '⭐ 분수에 소원 빌기';
  $('#enterBooth').textContent = nearWish && !near ? '소원 빌기 ⭐' : '들어가기 ▶';
}

let last = performance.now();
function frame(t) {
  const dt = Math.min(0.05, (t - last) / 1000); last = t;
  if (state.world && !$('#stage').hidden) { step(dt); draw(t); }
  requestAnimationFrame(frame);
}

window.addEventListener('keydown', (e) => {
  if ($('#stage').hidden) return;
  if (roomOpen || panelOpen) { if (e.key === 'Escape') { closeRoom(); closePanel(); } return; }
  if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space'].includes(e.code)) e.preventDefault();
  if (e.code === 'Space' || e.code === 'Enter') { enterNear(); return; }
  if (e.code === 'KeyM') { toggleMap(); return; }
  keys.add(e.code);
});
window.addEventListener('keyup', (e) => keys.delete(e.code));
window.addEventListener('blur', () => keys.clear());

function toWorld(e) { const z = zoom(), cam = camera(z); return { x: e.clientX / z + cam.x, y: e.clientY / z + cam.y }; }
canvasEl.addEventListener('pointerdown', (e) => { canvasEl.setPointerCapture(e.pointerId); joy = { id: e.pointerId, sx: e.clientX, sy: e.clientY, dx: 0, dy: 0, active: false }; });
canvasEl.addEventListener('pointermove', (e) => {
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
  if (!joy.active) {
    const p = toWorld(e);
    const b = buildingAt(state.world, p.x, p.y);
    if (overview) { overview = false; setNav('home'); }
    if (b) { target = b.kind === 'teacher' ? { ...state.world.hall.door } : { ...b.booth.door }; autoEnter = b; } else { target = p; autoEnter = null; }
    if (target) target = moveWithin(state.world, target, 0, 0);
  }
  joy = null;
  $('#joystick').style.display = 'none';
}
canvasEl.addEventListener('pointerup', endJoy);
canvasEl.addEventListener('pointercancel', endJoy);

function enterNear() {
  if (near) enter(near);
  else if (nearWish) makeWish();
}
$('#enterBooth').onclick = enterNear;
function enter(d) { if (d.kind === 'teacher') openTeacher(); else openRoom(d.booth.item); }

// ---------- 미션·배지 ----------
const BADGES = { visit3: ['🧭', '꼬마 탐험가'], like3: ['💖', '응원 대장'], teacher: ['🎓', '모범생'], wish: ['⭐', '소원 별'], all: ['🏆', '앱 월드 마스터'] };
function missions() {
  const p = progress();
  const ids = new Set(state.items.map((x) => x.id));
  const visitedNow = p.visited.filter((v) => ids.has(v)).length;
  return [
    { id: 'visit3', emo: '🧭', title: '친구 부스 3곳 놀러 가기', val: Math.min(3, visitedNow), goal: 3 },
    { id: 'like3', emo: '💖', title: '마음에 드는 앱에 좋아요 3번', val: Math.min(3, likedSet().size), goal: 3 },
    { id: 'teacher', emo: '🎓', title: '선생님의 앱 해 보기', val: p.teacher ? 1 : 0, goal: 1 },
    ...(state.world && state.world.fountain ? [{ id: 'wish', emo: '⭐', title: '광장 분수에서 소원 빌기', val: p.wish ? 1 : 0, goal: 1 }] : []),
    { id: 'all', emo: '🏆', title: '모든 부스 가 보기', val: visitedNow, goal: Math.max(1, ids.size) },
  ];
}
function checkBadges() {
  const p = progress();
  for (const m of missions()) {
    if (m.val >= m.goal && !p.badges.includes(m.id)) {
      p.badges.push(m.id);
      saveJSON(PROGRESS, p);
      toast(`🏅 배지를 받았어요: ${BADGES[m.id][0]} ${BADGES[m.id][1]}`, 4000);
    }
  }
}
function markVisit(id) { const p = progress(); if (!p.visited.includes(id)) { p.visited.push(id); saveJSON(PROGRESS, p); } checkBadges(); }
function makeWish() {
  const p = progress(); p.wish = true; saveJSON(PROGRESS, p);
  toast('⭐ 소원을 빌었어요! 멋진 앱을 많이 만나길!', 3000);
  checkBadges();
}

// ---------- 부스 안 ----------
function showRoom({ emoji: emo, title, meta, intro, likes, canLike, newTab }) {
  roomOpen = true; keys.clear(); target = null;
  $('#roomEmoji').textContent = emo;
  $('#roomTitle').textContent = title;
  $('#roomMeta').textContent = meta;
  $('#roomIntro').textContent = intro || '';
  $('#likeBtn').hidden = !canLike;
  $('#likeCount').textContent = String(likes || 0);
  const nt = $('#newTab'); nt.hidden = !newTab; if (newTab) nt.href = newTab;
  $('#appRoom').hidden = false;
  $('#roomFrame').srcdoc = '<p style="font-family:sans-serif;color:#888;text-align:center;margin-top:20%">앱을 여는 중…</p>';
  $('#closeRoom').focus();
}
async function openRoom(it) {
  current = it;
  const t = topicById(it.topicId);
  showRoom({ emoji: itemEmoji(it), title: it.appName, meta: [`개발자 ${it.developer}`, it.booth ? `${String(it.booth).padStart(2, '0')}번 부스` : '', t ? t.name : ''].filter(Boolean).join(' · '), intro: it.intro, likes: it.likes, canLike: true, newTab: it.appUrl && !it.html && !it.hasHtml ? it.appUrl : '' });
  $('#likeBtn').disabled = likedSet().has(it.id);
  try {
    let html = it.html || '';
    if (!html && it.hasHtml && state.source === 'server') html = (await api.app(it.id)).html;
    if (current !== it) return;
    if (html) mountApp($('#roomFrame'), { html });
    else if (it.appUrl) mountApp($('#roomFrame'), { url: it.appUrl });
    else $('#roomFrame').srcdoc = '<p style="font-family:sans-serif;text-align:center;margin-top:20%">이 부스는 아직 준비 중이에요</p>';
    markVisit(it.id);
  } catch (e) { $('#roomFrame').srcdoc = '<p style="font-family:sans-serif;color:#c00;text-align:center;margin-top:20%">앱을 불러오지 못했어요</p>'; toast(e.message); }
}
async function openTeacher() {
  const ta = state.teacherApp;
  if (!ta) { toast('🎓 선생님의 앱은 곧 열려요!'); return; }
  current = 'teacher';
  showRoom({ emoji: ta.emoji || '🎓', title: ta.title, meta: '선생님의 앱', intro: ta.intro || '', canLike: false, newTab: ta.url && !ta.html ? ta.url : '' });
  try {
    let html = ta.html || '';
    if (!html && ta.server) html = (await api.teacherAppHtml()).html;
    if (current !== 'teacher') return;
    if (html) mountApp($('#roomFrame'), { html }); else mountApp($('#roomFrame'), { url: ta.url });
    const p = progress(); p.teacher = true; saveJSON(PROGRESS, p); checkBadges();
  } catch (e) { toast(e.message); }
}
function closeRoom() {
  if (!roomOpen) return;
  roomOpen = false; current = null;
  $('#appRoom').hidden = true;
  const f = $('#roomFrame'); f.removeAttribute('src'); f.srcdoc = '';
  canvasEl.focus();
}
$('#closeRoom').onclick = closeRoom;
$('#likeBtn').onclick = async () => {
  const it = current;
  if (!it || it === 'teacher') return;
  const liked = likedSet();
  if (liked.has(it.id)) return;
  $('#likeBtn').disabled = true;
  try {
    if (state.source === 'server') it.likes = (await api.like(it.id)).likes; else it.likes = (it.likes || 0) + 1;
    liked.add(it.id); saveJSON(LIKED, [...liked]);
    $('#likeCount').textContent = String(it.likes);
    toast(`👍 ${it.developer}에게 좋아요를 보냈어요!`);
    checkBadges();
  } catch (e) { $('#likeBtn').disabled = false; toast(e.message); }
};

// ---------- 메뉴 창 ----------
function openPanel(title, ...body) {
  panelOpen = true; keys.clear();
  $('#panelTitle').textContent = title;
  $('#panelBody').replaceChildren(...body);
  $('#panel').hidden = false;
}
function closePanel() { if (!panelOpen) return; panelOpen = false; $('#panel').hidden = true; canvasEl.focus(); }
$('#closePanel').onclick = closePanel;
for (const id of ['#appRoom', '#panel']) $(id).addEventListener('click', (e) => { if (e.target === $(id)) { closeRoom(); closePanel(); } });

function goTo(door) { pos = moveWithin(state.world, { x: door.x, y: door.y + 10 }, 0, 0); overview = false; setNav('home'); }
function faceCanvas(a, size = 44) {
  const c = h('canvas', { width: size, height: size, class: 'face', style: 'image-rendering:pixelated;border-radius:50%;background:#E8F7FF' });
  const x = c.getContext('2d'); x.imageSmoothingEnabled = false;
  x.drawImage(avatarCanvas(a, 0), 0, 0, AVATAR_W, 10, (size - size * 1.1) / 2, size * 0.08, size * 1.1, (size * 1.1 * 10) / AVATAR_W);
  return c;
}

function explorePanel() {
  const visited = new Set(progress().visited);
  const rows = [
    h('button', { class: 'dir-item', type: 'button', onclick: () => { closePanel(); if (state.world.hall) goTo(state.world.hall.door); openTeacher(); } },
      h('span', { class: 'emo' }, '🎓'), h('span', {}, h('b', {}, state.teacherApp ? state.teacherApp.title : '선생님의 앱'), h('br'), h('span', { class: 'muted small' }, state.teacherApp ? '가운데 큰 건물' : '곧 열려요')), h('span', { class: 'no' }, '★')),
    ...state.world.booths.filter((b) => b.item).map((b) => h('button', { class: `dir-item${visited.has(b.item.id) ? ' visited' : ''}`, type: 'button', 'data-booth': b.n, onclick: () => { closePanel(); goTo(b.door); openRoom(b.item); } },
      h('span', { class: 'emo' }, itemEmoji(b.item)),
      h('span', {}, h('b', {}, b.item.appName), visited.has(b.item.id) ? ' ✅' : '', h('br'), h('span', { class: 'muted small' }, `${b.item.developer}${b.item.intro ? ` · ${b.item.intro}` : ''}`)),
      h('span', { class: 'no' }, String(b.n).padStart(2, '0')))),
    ...state.world.extra.map((it) => h('button', { class: 'dir-item', type: 'button', onclick: () => { closePanel(); openRoom(it); } },
      h('span', { class: 'emo' }, itemEmoji(it)), h('span', {}, h('b', {}, it.appName), h('br'), h('span', { class: 'muted small' }, `${it.developer} · 부스 자리가 모자라 목록에서만 열려요`)), h('span', { class: 'no' }, '+'))),
  ];
  openPanel('🧭 탐험 — 어디로 갈까요?', h('div', { class: 'dir-list' }, ...rows));
}
function friendsPanel() {
  const list = state.items.length ? state.world.booths.filter((b) => b.item).map((b) => h('button', { class: 'dir-item', type: 'button', onclick: () => { closePanel(); goTo(b.door); } },
    faceCanvas(b.item.avatar ? cleanAvatar(b.item.avatar) : avatarFromText(b.item.developer)),
    h('span', {}, h('b', {}, b.item.developer), h('br'), h('span', { class: 'muted small' }, `${b.item.appName} · 👍 ${b.item.likes || 0}`)),
    h('span', { class: 'no' }, String(b.n).padStart(2, '0')))) : [h('p', { class: 'muted' }, '아직 부스를 연 친구가 없어요.')];
  openPanel(`👥 친구 ${state.items.length}명`, h('p', { class: 'muted small' }, '친구를 누르면 그 친구 부스 앞으로 가요.'), h('div', { class: 'dir-list' }, ...list));
}
function missionsPanel() {
  openPanel('✅ 오늘의 미션', ...missions().map((m) => h('div', { class: `mission${m.val >= m.goal ? ' done' : ''}` },
    h('span', { class: 'emo' }, m.emo),
    h('div', {}, h('b', {}, m.title), h('div', { class: 'bar' }, h('i', { style: `width:${Math.round((m.val / m.goal) * 100)}%` }))),
    h('b', {}, m.val >= m.goal ? '완료!' : `${m.val}/${m.goal}`))));
}
function badgesPanel() {
  const got = new Set(progress().badges);
  openPanel('🏅 내 배지', h('div', { class: 'badges' }, ...Object.entries(BADGES).map(([id, [emo, name]]) => h('div', { class: `badge${got.has(id) ? '' : ' locked'}` }, h('span', { class: 'emo' }, emo), h('b', {}, name), h('span', { class: 'small muted' }, got.has(id) ? '받았어요!' : '미션을 해 봐요')))));
}
function noticePanel() {
  openPanel('📢 선생님 공지', state.settings.notice ? h('p', { class: 'notice-text' }, state.settings.notice) : h('p', { class: 'muted' }, '아직 공지가 없어요.'));
}
function mePanel() {
  const nick = h('input', { type: 'text', maxlength: 10, value: me.nick || '' });
  nick.value = me.nick || '';
  nick.oninput = () => { me.nick = nick.value.trim().slice(0, 10) || '방문자'; saveJSON(PREF, me); paintMe(); };
  openPanel('🙂 나의 공간', h('label', { class: 'field' }, h('span', {}, '내 별명 (🔒 진짜 이름 ✕)'), nick),
    avatarBuilder(h, me.avatar, (a) => { me.avatar = a; saveJSON(PREF, me); paintMe(); }),
    h('p', { class: 'small muted' }, `🏅 배지 ${progress().badges.length}개 · 가 본 부스 ${progress().visited.length}곳`));
}
// ⭐ 내 앱: 내 부스를 한 번 골라 두면 바로 갈 수 있어요
function myAppPanel() {
  const mine = loadJSON(MYBOOTH, null);
  const booths = state.world.booths.filter((b) => b.item);
  const found = booths.find((b) => b.item.id === mine);
  openPanel('⭐ 내 앱',
    found ? h('div', { class: 'mission done' }, h('span', { class: 'emo' }, itemEmoji(found.item)), h('div', {}, h('b', {}, found.item.appName), h('br'), h('span', { class: 'small muted' }, `${String(found.n).padStart(2, '0')}번 부스 · 👍 ${found.item.likes || 0}`)),
      h('button', { class: 'primary', onclick: () => { closePanel(); goTo(found.door); } }, '내 부스로 가기')) : h('p', { class: 'muted' }, '아래에서 내 부스를 골라 두면 다음부터 바로 갈 수 있어요.'),
    h('div', { class: 'dir-list' }, ...booths.map((b) => h('button', { class: 'dir-item', type: 'button', onclick: () => { saveJSON(MYBOOTH, b.item.id); closePanel(); goTo(b.door); toast('⭐ 내 부스로 정했어요'); } },
      h('span', { class: 'emo' }, itemEmoji(b.item)), h('span', {}, h('b', {}, b.item.appName), h('br'), h('span', { class: 'muted small' }, b.item.developer)), h('span', { class: 'no' }, String(b.n).padStart(2, '0'))))),
    h('p', { class: 'small' }, h('a', { href: '../student/', target: '_blank', rel: 'noopener' }, '📝 학생 앱에서 내 앱 고치기 ↗')));
}

function paintMe() {
  $('#meNick').textContent = me.nick || '나의 공간';
  const c = $('#meFace'); const x = c.getContext('2d'); x.clearRect(0, 0, 48, 48); x.imageSmoothingEnabled = false;
  x.drawImage(avatarCanvas(me.avatar, 0), 0, 0, AVATAR_W, 10, -2, 4, 52, 43);
}

function setNav(id) { document.querySelectorAll('[data-nav]').forEach((b) => b.classList.toggle('on', b.dataset.nav === id)); }
function toggleMap() { overview = !overview; setNav(overview ? 'map' : 'home'); }
document.addEventListener('click', (e) => {
  const n = e.target.closest('[data-nav]');
  if (n) {
    const id = n.dataset.nav;
    if (id === 'home') { overview = false; pos = { ...state.world.spawn }; setNav('home'); }
    if (id === 'map') toggleMap();
    if (id === 'myapp') myAppPanel();
    if (id === 'friends') friendsPanel();
    if (id === 'me') mePanel();
    if (id === 'exit') { closeRoom(); closePanel(); $('#stage').hidden = true; $('#lobby').hidden = false; renderLobby(); }
    return;
  }
  const s = e.target.closest('[data-side]');
  if (s) ({ explore: explorePanel, missions: missionsPanel, badges: badgesPanel, notice: noticePanel })[s.dataset.side]();
});

// ---------- 시작 ----------
renderLobby();
resize();
await loadData(true);
paintMe();
requestAnimationFrame(frame);
setInterval(() => { if (state.source === 'server' && !roomOpen && !document.hidden) loadData(false).catch(() => {}); }, 60000);
