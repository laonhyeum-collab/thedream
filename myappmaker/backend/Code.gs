/**
 * MY APP MAKER — 우리 반 저장소 (Google Apps Script 웹 앱)
 *
 * 학생 기획서·앱 제출, 교사 검토(승인/수정 요청/부스 배정), 메타버스 부스 목록,
 * 앱 월드 설정(학교 이름·공지·월드 그림·선생님의 앱)을 맡습니다.
 * 설치 방법은 backend/README.md 를 보세요.
 *
 * ▼ 선생님이 바꾸는 곳 (두 값 모두 영문·숫자로, 서로 다르게)
 */
var CLASS_CODE = 'CHANGE-ME-CLASS';     // 학생·메타버스가 쓰는 반 코드 (학생에게 알려 줘도 됨)
var TEACHER_KEY = 'CHANGE-ME-TEACHER';  // 교사 앱 전용 열쇠 (학생에게 알려 주면 안 됨)

var SHEET_NAME = '제출';
var FOLDER_NAME = 'MY APP MAKER 학생 앱';
var MAX_HTML = 500000;   // 학생 앱 HTML 최대 크기(글자)
var MAX_PLAN = 40000;    // 기획서 JSON 최대 크기(글자) — 시트 한 칸 한도(5만) 안쪽
var COLS = ['id', 'studentKey', 'developer', 'classInfo', 'appName', 'topicId', 'status', 'feedback', 'booth',
  'appUrl', 'htmlFileId', 'htmlSize', 'planJson', 'submittedAt', 'reviewedAt', 'likes', 'boothFileId'];
var MAX_IMAGE = 200000;        // 학생 부스 그림 최대 크기(글자)
var MAX_ASSET = 900000;        // 월드 그림 한 장 최대 크기(글자)
var STUDENT_BOOTHS = 12;
// 월드 그림 자리 (shared/worldart.js 의 WORLD_ASSETS 와 같게)
var ASSET_KEYS = ['map', 'hall', 'booth', 'booth_adventure', 'booth_action', 'booth_create', 'booth_mystery', 'booth_life', 'fountain', 'arch'];

function doGet(e) { return respond_(function () { return route_(e && e.parameter ? e.parameter : {}); }); }

function doPost(e) {
  return respond_(function () {
    var body = {};
    try { body = JSON.parse((e && e.postData && e.postData.contents) || '{}'); } catch (err) { throw new Error('요청을 읽지 못했어요'); }
    return route_(body);
  });
}

function respond_(fn) {
  var out;
  try { out = fn(); out.ok = true; } catch (err) { out = { ok: false, error: String(err && err.message || err) }; }
  return ContentService.createTextOutput(JSON.stringify(out)).setMimeType(ContentService.MimeType.JSON);
}

function route_(p) {
  var a = String(p.action || '');
  if (CLASS_CODE.indexOf('CHANGE-ME') === 0 || TEACHER_KEY.indexOf('CHANGE-ME') === 0) throw new Error('선생님이 Code.gs 의 CLASS_CODE·TEACHER_KEY 를 아직 정하지 않았어요');
  if (a === 'adminSetup') return adminSetup_(p);
  if (a === 'adminLogin') return adminLogin_(p);
  var teacherActions = { list: listAll_, teacherApp: teacherApp_, review: review_, remove: remove_,
    worldAdmin: worldAdmin_, setWorld: setWorld_, setAsset: setAsset_, setTeacherApp: setTeacherApp_,
    whoami: function (q, me) { return { adminId: me || '', admins: Object.keys(admins_()).length }; },
    admins: adminList_, addAdmin: addAdmin_, removeAdmin: removeAdmin_, changePassword: changePassword_,
    accounts: accounts_, createAccounts: createAccounts_, resetPin: resetPin_, removeAccount: removeAccount_ };
  if (teacherActions[a]) { var me = needTeacher_(p); return teacherActions[a](p, me); }
  needClass_(p);
  if (a === 'ping') return { classCode: CLASS_CODE, time: new Date().toISOString() };
  if (a === 'studentLogin') return studentLogin_(p);
  if (a === 'saveDraft') return saveDraft_(p);
  if (a === 'loadDraft') return loadDraft_(p);
  if (a === 'submit') return submit_(p);
  if (a === 'mine') return mine_(p);
  if (a === 'world') return world_();
  if (a === 'app') return app_(p, false);
  if (a === 'like') return like_(p);
  if (a === 'booth') return booth_(p);
  if (a === 'asset') return asset_(p);
  if (a === 'teacherAppHtml') return teacherAppHtml_();
  if (a === 'presence') return presence_(p);
  throw new Error('모르는 요청이에요: ' + a);
}

function needClass_(p) { if (String(p.classCode || '') !== CLASS_CODE) throw new Error('반 코드가 맞지 않아요'); }
// 교사 요청: 관리자 출입증(로그인) 또는 설치 열쇠(TEACHER_KEY). 돌려주는 값 = 관리자 아이디('' = 설치 열쇠)
function needTeacher_(p) {
  var k = String(p.teacherKey || '');
  if (k && k === TEACHER_KEY) return '';
  var me = adminFromToken_(k);
  if (!me) throw new Error('관리자로 다시 로그인해 주세요');
  return me;
}

// ---------- 시트 ----------
function sheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) {
    sh = ss.insertSheet(SHEET_NAME);
    sh.getRange(1, 1, 1, COLS.length).setValues([COLS]);
    sh.setFrozenRows(1);
  } else if (String(sh.getRange(1, COLS.length, 1, 1).getValues()[0][0]) !== COLS[COLS.length - 1]) {
    sh.getRange(1, 1, 1, COLS.length).setValues([COLS]);   // 예전 시트에 새 칸 이름 붙이기
  }
  return sh;
}

function rows_() {
  var sh = sheet_();
  var n = sh.getLastRow() - 1;
  if (n < 1) return [];
  var vals = sh.getRange(2, 1, n, COLS.length).getValues();
  return vals.map(function (v, i) {
    var o = { _row: i + 2 };
    COLS.forEach(function (c, j) { o[c] = v[j]; });
    return o;
  });
}

function writeRow_(o) {
  var sh = sheet_();
  var vals = [COLS.map(function (c) { return o[c] == null ? '' : o[c]; })];
  if (o._row) sh.getRange(o._row, 1, 1, COLS.length).setValues(vals);
  else sh.appendRow(vals[0]);
}

function withLock_(fn) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try { return fn(); } finally { lock.releaseLock(); }
}

function str_(v, max) { return String(v == null ? '' : v).slice(0, max || 200); }

// ---------- 학생 앱 HTML 은 드라이브 파일로 ----------
function folder_() {
  var it = DriveApp.getFoldersByName(FOLDER_NAME);
  return it.hasNext() ? it.next() : DriveApp.createFolder(FOLDER_NAME);
}

function saveHtml_(oldId, name, html) {
  if (oldId) { try { DriveApp.getFileById(oldId).setTrashed(true); } catch (e) { /* 이미 없음 */ } }
  if (!html) return '';
  return folder_().createFile(name + '.html', html, MimeType.HTML).getId();
}

// 그림·HTML 같은 긴 글은 드라이브 파일로
function saveText_(oldId, name, text) {
  if (oldId) { try { DriveApp.getFileById(oldId).setTrashed(true); } catch (e) { /* 이미 없음 */ } }
  if (!text) return '';
  return folder_().createFile(name + '.txt', text, MimeType.PLAIN_TEXT).getId();
}
function readText_(id) { return id ? DriveApp.getFileById(id).getBlob().getDataAsString('UTF-8') : ''; }
function isImage_(v, max) { return typeof v === 'string' && v.length <= max && /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+\/=]+$/.test(v); }

function readHtml_(id) {
  if (!id) return '';
  return DriveApp.getFileById(id).getBlob().getDataAsString('UTF-8');
}

// ---------- 요청 처리 ----------
// 학생 아이디로 로그인했으면 그 아이디로, 아니면 기기마다 만든 열쇠(studentKey)로 학생을 구분
function studentKey_(p) {
  if (p.token) return studentKeyOf_(needStudent_(p).loginId);
  return str_(p.studentKey, 80);
}

function submit_(p) {
  var key = studentKey_(p);
  if (!key) throw new Error('학생 구분 열쇠가 없어요');
  var developer = str_(p.developer, 20).trim();
  var appName = str_(p.appName, 30).trim();
  if (!developer || !appName) throw new Error('개발자 이름과 앱 이름을 써 주세요');
  var html = str_(p.appHtml, MAX_HTML + 1);
  if (html.length > MAX_HTML) throw new Error('앱 코드가 너무 커요 (' + MAX_HTML + '자까지)');
  var plan = p.plan ? JSON.stringify(p.plan) : '';
  if (plan.length > MAX_PLAN) throw new Error('기획서가 너무 길어요');
  var appUrl = str_(p.appUrl, 500);
  if (p.boothImage && !isImage_(p.boothImage, MAX_IMAGE)) throw new Error('부스 그림이 올바르지 않거나 너무 커요');
  if (appUrl && !/^https?:\/\//i.test(appUrl)) throw new Error('앱 주소는 https:// 로 시작해야 해요');

  return withLock_(function () {
    var all = rows_();
    var o = null;
    for (var i = 0; i < all.length; i++) if (all[i].studentKey === key) { o = all[i]; break; }
    var isNew = !o;
    if (isNew) o = { id: 'app_' + Utilities.getUuid().slice(0, 8), studentKey: key, likes: 0, booth: '', feedback: '' };
    o.developer = developer;
    o.classInfo = str_(p.classInfo, 20);
    o.appName = appName;
    o.topicId = str_(p.topicId, 40);
    o.planJson = plan;
    o.appUrl = appUrl;
    if (p.appHtml != null) { o.htmlFileId = saveHtml_(o.htmlFileId, o.id + '_' + appName, html); o.htmlSize = html.length; }
    if (p.boothImage !== undefined) o.boothFileId = saveText_(o.boothFileId, o.id + '_booth', p.boothImage || '');
    o.status = 'submitted';           // 다시 내면 선생님이 다시 확인
    o.submittedAt = new Date().toISOString();
    writeRow_(o);
    return { id: o.id, status: o.status, isNew: isNew };
  });
}

function mine_(p) {
  var key = studentKey_(p);
  if (!key) return { found: false };
  var all = rows_();
  for (var i = 0; i < all.length; i++) {
    var o = all[i];
    if (o.studentKey === key) return { found: true, id: o.id, status: o.status, feedback: o.feedback, booth: o.booth, likes: Number(o.likes) || 0, submittedAt: o.submittedAt };
  }
  return { found: false };
}

function publicItem_(o) {
  return { id: o.id, developer: o.developer, appName: o.appName, topicId: o.topicId, booth: o.booth === '' ? null : Number(o.booth),
    appUrl: o.appUrl, hasHtml: !!o.htmlFileId, hasBooth: !!o.boothFileId, likes: Number(o.likes) || 0,
    intro: planField_(o, function (pl) { return pl.f.intro || ''; }, ''),
    avatar: planField_(o, function (pl) { return pl.avatar || null; }, null) };
}

function planField_(o, fn, dflt) { try { return fn(JSON.parse(o.planJson)); } catch (e) { return dflt; }
}

function world_() {
  var items = rows_().filter(function (o) { return o.status === 'approved'; }).map(publicItem_);
  var w = worldConf_();
  return { items: items, settings: w.settings, assets: Object.keys(w.assets), teacherApp: w.teacherApp ? { title: w.teacherApp.title } : null };
}

// ---------- 앱 월드 설정 (학교 이름·공지·월드 그림·선생님의 앱) ----------
function worldConf_() {
  var raw = PropertiesService.getScriptProperties().getProperty('WORLD');
  var w = {};
  try { w = raw ? JSON.parse(raw) : {}; } catch (e) { w = {}; }
  return { settings: w.settings || { schoolName: '', title: '친구들이 만든 앱 월드', notice: '' }, assets: w.assets || {}, teacherApp: w.teacherApp || null };
}
function saveWorldConf_(w) { PropertiesService.getScriptProperties().setProperty('WORLD', JSON.stringify(w)); }

function cleanSetting_(v, n) { return str_(v, n).replace(/[<>]/g, '').trim(); }

// 지도 그림 위 문 자리 (0~1 비율)
function pt_(v) { return (v && v.length === 2 && typeof v[0] === 'number' && typeof v[1] === 'number' && v[0] >= 0 && v[0] <= 1 && v[1] >= 0 && v[1] <= 1) ? [v[0], v[1]] : null; }
var MAP_PRESET_IDS = ['castle', 'seasons', 'river', 'pixel'];   // shared/worldart.js MAP_PRESETS 와 같게

function cleanHotspots_(v) {
  v = v || {};
  var booths = [];
  for (var i = 0; i < STUDENT_BOOTHS; i++) booths.push(pt_(v.booths && v.booths[i]));
  return { hall: pt_(v.hall), start: pt_(v.start), booths: booths };
}

function worldAdmin_() { var w = worldConf_(); return { settings: w.settings, assets: Object.keys(w.assets), teacherApp: w.teacherApp ? { title: w.teacherApp.title } : null }; }

function setWorld_(p) {
  return withLock_(function () {
    var w = worldConf_();
    var s = p.settings || {};
    w.settings = { schoolName: cleanSetting_(s.schoolName, 20), title: cleanSetting_(s.title, 24) || '친구들이 만든 앱 월드', notice: cleanSetting_(s.notice, 300),
      hotspots: cleanHotspots_(s.hotspots), labelMode: s.labelMode === 'big' ? 'big' : 'small',
      mapPreset: MAP_PRESET_IDS.indexOf(s.mapPreset) >= 0 ? s.mapPreset : 'castle' };
    saveWorldConf_(w);
    return { settings: w.settings };
  });
}

function setAsset_(p) {
  var key = str_(p.key, 30);
  if (ASSET_KEYS.indexOf(key) < 0) throw new Error('모르는 그림 자리예요');
  if (p.data && !isImage_(p.data, MAX_ASSET)) throw new Error('그림이 올바르지 않거나 너무 커요');
  return withLock_(function () {
    var w = worldConf_();
    var id = saveText_(w.assets[key], 'world_' + key, p.data || '');
    if (id) w.assets[key] = id; else delete w.assets[key];
    saveWorldConf_(w);
    return { assets: Object.keys(w.assets) };
  });
}

function asset_(p) {
  var w = worldConf_();
  var id = w.assets[str_(p.key, 30)];
  if (!id) throw new Error('그림이 없어요');
  return { key: p.key, data: readText_(id) };
}

function setTeacherApp_(p) {
  var html = str_(p.html, MAX_HTML + 1);
  if (html.length > MAX_HTML) throw new Error('앱 코드가 너무 커요');
  return withLock_(function () {
    var w = worldConf_();
    var old = w.teacherApp && w.teacherApp.fileId;
    if (!html) { saveHtml_(old, '', ''); w.teacherApp = null; }
    else w.teacherApp = { title: cleanSetting_(p.title, 30) || '선생님의 앱', fileId: saveHtml_(old, 'teacher_app', html), appUrl: '' };
    saveWorldConf_(w);
    return { teacherApp: w.teacherApp ? { title: w.teacherApp.title } : null };
  });
}

function teacherAppHtml_() {
  var w = worldConf_();
  if (!w.teacherApp) throw new Error('선생님의 앱이 아직 없어요');
  return { title: w.teacherApp.title, html: readHtml_(w.teacherApp.fileId) };
}

function booth_(p) {
  var o = find_(str_(p.id, 40));
  if (o.status !== 'approved') throw new Error('아직 문을 열지 않은 부스예요');
  return { id: o.id, image: readText_(o.boothFileId) };
}

function find_(id) {
  var all = rows_();
  for (var i = 0; i < all.length; i++) if (all[i].id === id) return all[i];
  throw new Error('앱을 찾지 못했어요');
}

function app_(p, teacher) {
  var o = find_(str_(p.id, 40));
  if (!teacher && o.status !== 'approved') throw new Error('아직 문을 열지 않은 부스예요');
  return { id: o.id, appName: o.appName, html: readHtml_(o.htmlFileId), appUrl: o.appUrl };
}

function like_(p) {
  return withLock_(function () {
    var o = find_(str_(p.id, 40));
    if (o.status !== 'approved') throw new Error('아직 문을 열지 않은 부스예요');
    o.likes = (Number(o.likes) || 0) + 1;
    writeRow_(o);
    return { likes: o.likes };
  });
}

function listAll_() {
  var items = rows_().map(function (o) {
    var plan = null;
    try { plan = o.planJson ? JSON.parse(o.planJson) : null; } catch (e) { plan = null; }
    return { id: o.id, developer: o.developer, classInfo: o.classInfo, appName: o.appName, topicId: o.topicId, status: o.status,
      feedback: o.feedback, booth: o.booth === '' ? null : Number(o.booth), appUrl: o.appUrl, hasHtml: !!o.htmlFileId,
      htmlSize: Number(o.htmlSize) || 0, hasBooth: !!o.boothFileId, submittedAt: o.submittedAt, reviewedAt: o.reviewedAt, likes: Number(o.likes) || 0, plan: plan };
  });
  return { items: items };
}

function teacherApp_(p) { return app_(p, true); }

function review_(p) {
  var status = str_(p.status, 20);
  if (['submitted', 'approved', 'needs_fix'].indexOf(status) < 0) throw new Error('상태 값이 올바르지 않아요');
  return withLock_(function () {
    var o = find_(str_(p.id, 40));
    o.status = status;
    if (p.feedback != null) o.feedback = str_(p.feedback, 1000);
    if (p.booth !== undefined) o.booth = p.booth === null || p.booth === '' ? '' : Math.max(1, Math.min(STUDENT_BOOTHS, Math.floor(Number(p.booth)) || 1));
    o.reviewedAt = new Date().toISOString();
    writeRow_(o);
    return { id: o.id, status: o.status, booth: o.booth === '' ? null : o.booth };
  });
}

function remove_(p) {
  return withLock_(function () {
    var o = find_(str_(p.id, 40));
    saveHtml_(o.htmlFileId, '', '');
    saveText_(o.boothFileId, '', '');
    sheet_().deleteRow(o._row);
    return { id: o.id };
  });
}

// ====================================================================
// 계정: 관리자(선생님) 아이디·비밀번호 + 선생님이 만들어 주는 학생 아이디·비밀번호(4자리)
// - 로그인하면 서명된 출입증(token)을 줘요. 서버에 따로 적어 두지 않아도 위조를 알아챌 수 있어요.
// - 학생 비밀번호를 새로 만들거나 계정을 지우면 예전 출입증은 바로 못 써요(ver).
// - 비밀번호를 10번 틀리면 그 아이디는 5분 동안 잠겨요.
// ====================================================================
var ACCOUNT_SHEET = '학생계정';
var ACCOUNT_COLS = ['loginId', 'pin', 'ver', 'createdAt', 'lastLoginAt', 'draftFileId', 'draftAt', 'fails', 'lockedUntil'];
var SESSION_HOURS = 12;
var MAX_DRAFT = 2000000;       // 학생 작업(기획서+앱 코드+그림) 저장 최대 크기(글자)
var MAX_FAILS = 10, LOCK_MINUTES = 5;
var ID_RE = /^[A-Za-z0-9가-힣-]{1,20}$/;

function props_() { return PropertiesService.getScriptProperties(); }
function jsonProp_(k, d) { try { var v = props_().getProperty(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } }
function setJsonProp_(k, v) { props_().setProperty(k, JSON.stringify(v)); }
function hex_(bytes) { return bytes.map(function (b) { return ((b < 0 ? b + 256 : b) + 256).toString(16).slice(1); }).join(''); }
function hash_(salt, pw) { return hex_(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, salt + '|' + pw, Utilities.Charset.UTF_8)); }
function secret_() {
  var s = props_().getProperty('SECRET');
  if (!s) { s = Utilities.getUuid() + Utilities.getUuid(); props_().setProperty('SECRET', s); }
  return s;
}
function sign_(text) { return hex_(Utilities.computeHmacSha256Signature(text, secret_())).slice(0, 40); }
function normId_(v) { return str_(v, 40).trim().toLowerCase(); }

// 출입증: 역할.아이디(인코딩).버전.만료.서명
function makeToken_(role, who, ver) {
  var base = [role, encodeURIComponent(who), ver, Date.now() + SESSION_HOURS * 3600000].join('.');
  return base + '.' + sign_(base);
}
function readToken_(t, role) {
  var parts = String(t || '').split('.');
  if (parts.length !== 5 || parts[0] !== role) return null;
  var base = parts.slice(0, 4).join('.');
  if (sign_(base) !== parts[4] || Number(parts[3]) < Date.now()) return null;
  return { who: decodeURIComponent(parts[1]), ver: Number(parts[2]) };
}

// ---------- 관리자 ----------
function admins_() { return jsonProp_('ADMINS', {}); }
function adminFromToken_(t) {
  var x = readToken_(t, 'a');
  if (!x) return null;
  var a = admins_()[x.who];
  return a && Number(a.v) === x.ver ? x.who : null;
}
function setAdminPw_(all, id, pw) {
  var salt = Utilities.getUuid();
  var old = all[id] || { c: new Date().toISOString(), v: 0 };
  all[id] = { s: salt, h: hash_(salt, pw), v: (Number(old.v) || 0) + 1, c: old.c, f: 0, l: 0 };
}
function checkNewAdmin_(id, pw) {
  if (!ID_RE.test(id)) throw new Error('관리자 아이디는 영문·숫자·한글·- 로 20자까지 써 주세요');
  if (String(pw || '').length < 6) throw new Error('비밀번호는 6자 이상으로 정해 주세요');
}
// 처음 관리자 만들기 / 비밀번호를 잊었을 때: Code.gs 의 TEACHER_KEY(설치 열쇠)가 있어야 해요
function adminSetup_(p) {
  if (String(p.setupKey || '') !== TEACHER_KEY) throw new Error('설치 열쇠(Code.gs 의 TEACHER_KEY)가 맞지 않아요');
  var id = normId_(p.adminId), pw = String(p.password || '');
  checkNewAdmin_(id, pw);
  return withLock_(function () {
    var all = admins_();
    setAdminPw_(all, id, pw);
    setJsonProp_('ADMINS', all);
    return { adminId: id, token: makeToken_('a', id, all[id].v) };
  });
}
function adminLogin_(p) {
  var id = normId_(p.adminId), pw = String(p.password || '');
  return withLock_(function () {
    var all = admins_(), a = all[id];
    if (!a) throw new Error('아이디 또는 비밀번호가 맞지 않아요');
    if (Number(a.l) > Date.now()) throw new Error('비밀번호를 여러 번 틀려서 잠시 잠겼어요. ' + LOCK_MINUTES + '분 뒤에 다시 해 보세요');
    if (hash_(a.s, pw) !== a.h) {
      a.f = (Number(a.f) || 0) + 1;
      if (a.f >= MAX_FAILS) { a.f = 0; a.l = Date.now() + LOCK_MINUTES * 60000; }
      setJsonProp_('ADMINS', all);
      throw new Error('아이디 또는 비밀번호가 맞지 않아요');
    }
    a.f = 0; a.l = 0; setJsonProp_('ADMINS', all);
    return { adminId: id, token: makeToken_('a', id, a.v) };
  });
}
function adminList_() {
  var all = admins_();
  return { admins: Object.keys(all).sort().map(function (k) { return { adminId: k, createdAt: all[k].c }; }) };
}
function addAdmin_(p) {
  var id = normId_(p.adminId), pw = String(p.password || '');
  checkNewAdmin_(id, pw);
  return withLock_(function () {
    var all = admins_();
    if (all[id]) throw new Error('이미 있는 관리자 아이디예요');
    setAdminPw_(all, id, pw);
    setJsonProp_('ADMINS', all);
    return adminList_();
  });
}
function removeAdmin_(p, me) {
  var id = normId_(p.adminId);
  return withLock_(function () {
    var all = admins_();
    if (!all[id]) throw new Error('없는 관리자예요');
    if (Object.keys(all).length <= 1) throw new Error('마지막 관리자는 지울 수 없어요');
    if (id === me) throw new Error('지금 로그인한 내 계정은 지울 수 없어요');
    delete all[id];
    setJsonProp_('ADMINS', all);
    return adminList_();
  });
}
function changePassword_(p, me) {
  if (!me) throw new Error('관리자로 로그인해야 비밀번호를 바꿀 수 있어요');
  var pw = String(p.password || '');
  checkNewAdmin_(me, pw);
  return withLock_(function () {
    var all = admins_();
    setAdminPw_(all, me, pw);
    setJsonProp_('ADMINS', all);
    return { adminId: me, token: makeToken_('a', me, all[me].v) };   // 다른 기기의 예전 로그인은 풀려요
  });
}

// ---------- 학생 계정 (시트 「학생계정」) ----------
function accSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(ACCOUNT_SHEET);
  if (!sh) {
    sh = ss.insertSheet(ACCOUNT_SHEET);
    sh.getRange(1, 1, 1000, 2).setNumberFormat('@');   // 아이디·비밀번호는 글자로 (「01」이 숫자 1로 바뀌지 않게)
    sh.getRange(1, 1, 1, ACCOUNT_COLS.length).setValues([ACCOUNT_COLS]); sh.setFrozenRows(1);
  }
  return sh;
}
function accRows_() {
  var sh = accSheet_(), n = sh.getLastRow() - 1;
  if (n < 1) return [];
  return sh.getRange(2, 1, n, ACCOUNT_COLS.length).getValues().map(function (v, i) {
    var o = { _row: i + 2 };
    ACCOUNT_COLS.forEach(function (c, j) { o[c] = v[j]; });
    o.loginId = String(o.loginId); o.pin = String(o.pin);
    return o;
  });
}
function accWrite_(o) {
  var sh = accSheet_();
  var vals = [ACCOUNT_COLS.map(function (c) { return o[c] == null ? '' : o[c]; })];
  if (o._row) sh.getRange(o._row, 1, 1, ACCOUNT_COLS.length).setValues(vals); else sh.appendRow(vals[0]);
}
function accFind_(id) {
  var all = accRows_();
  for (var i = 0; i < all.length; i++) if (all[i].loginId === id) return all[i];
  return null;
}
function newPin_() { return String(1000 + Math.floor(Math.random() * 9000)); }
function studentKeyOf_(id) { return 'id:' + id; }

function accounts_() {
  var subs = {};
  rows_().forEach(function (o) { subs[o.studentKey] = o; });
  return { accounts: accRows_().map(function (a) {
    var s = subs[studentKeyOf_(a.loginId)];
    return { loginId: a.loginId, pin: a.pin, createdAt: a.createdAt, lastLoginAt: a.lastLoginAt, draftAt: a.draftAt,
      locked: Number(a.lockedUntil) > Date.now(), app: s ? { id: s.id, appName: s.appName, developer: s.developer, status: s.status, booth: s.booth === '' ? null : Number(s.booth) } : null };
  }) };
}
// 한꺼번에 만들기: prefix + 번호(두 자리). 예) prefix '' · 1~25 → 01, 02, … 25
function createAccounts_(p) {
  var prefix = str_(p.prefix, 12).trim().toLowerCase();
  var from = Math.max(1, Math.floor(Number(p.from)) || 1), count = Math.floor(Number(p.count)) || 0;
  if (count < 1 || count > 60) throw new Error('한 번에 1~60개까지 만들 수 있어요');
  if (prefix && !/^[A-Za-z0-9가-힣-]{1,12}$/.test(prefix)) throw new Error('앞글자는 영문·숫자·한글·- 로 12자까지 써 주세요');
  return withLock_(function () {
    var have = {};
    accRows_().forEach(function (a) { have[a.loginId] = true; });
    var made = [], skipped = [];
    for (var n = from; n < from + count; n++) {
      var id = prefix + (n < 10 ? '0' + n : String(n));
      if (have[id]) { skipped.push(id); continue; }
      var a = { loginId: id, pin: newPin_(), ver: 1, createdAt: new Date().toISOString(), fails: 0, lockedUntil: 0 };
      accWrite_(a); made.push({ loginId: id, pin: a.pin });
    }
    return { made: made, skipped: skipped };
  });
}
function resetPin_(p) {
  return withLock_(function () {
    var a = accFind_(normId_(p.loginId));
    if (!a) throw new Error('없는 아이디예요');
    a.pin = newPin_(); a.ver = (Number(a.ver) || 0) + 1; a.fails = 0; a.lockedUntil = 0;
    accWrite_(a);
    return { loginId: a.loginId, pin: a.pin };
  });
}
function removeAccount_(p) {
  return withLock_(function () {
    var a = accFind_(normId_(p.loginId));
    if (!a) throw new Error('없는 아이디예요');
    saveText_(a.draftFileId, '', '');
    accSheet_().deleteRow(a._row);
    return { loginId: a.loginId };
  });
}

// 학생 로그인 → 출입증
function studentLogin_(p) {
  var id = normId_(p.loginId), pin = str_(p.pin, 10).trim();
  return withLock_(function () {
    var a = accFind_(id);
    if (!a) throw new Error('아이디 또는 비밀번호가 맞지 않아요');
    if (Number(a.lockedUntil) > Date.now()) throw new Error('비밀번호를 여러 번 틀려서 잠시 잠겼어요. ' + LOCK_MINUTES + '분 뒤에 다시 하거나 선생님께 말해요');
    if (a.pin !== pin) {
      a.fails = (Number(a.fails) || 0) + 1;
      if (a.fails >= MAX_FAILS) { a.fails = 0; a.lockedUntil = Date.now() + LOCK_MINUTES * 60000; }
      accWrite_(a);
      throw new Error('아이디 또는 비밀번호가 맞지 않아요');
    }
    a.fails = 0; a.lockedUntil = 0; a.lastLoginAt = new Date().toISOString();
    accWrite_(a);
    return { loginId: a.loginId, token: makeToken_('s', a.loginId, Number(a.ver) || 1), draftAt: a.draftAt || '' };
  });
}
function studentFromToken_(t) {
  var x = readToken_(t, 's');
  if (!x) return null;
  var a = accFind_(x.who);
  return a && (Number(a.ver) || 1) === x.ver ? a : null;
}
function needStudent_(p) {
  var a = studentFromToken_(p.token);
  if (!a) throw new Error('다시 로그인해 주세요 (로그인 시간이 지났거나 비밀번호가 바뀌었어요)');
  return a;
}

// 학생 작업 저장·불러오기 (드라이브 파일 하나를 계속 덮어써요)
function saveDraft_(p) {
  var a = needStudent_(p);
  var text = typeof p.plan === 'string' ? p.plan : JSON.stringify(p.plan || null);
  if (!text || text === 'null') throw new Error('저장할 내용이 없어요');
  if (text.length > MAX_DRAFT) throw new Error('작업이 너무 커요. 큰 그림을 빼 보세요');
  var at = new Date().toISOString();
  if (a.draftFileId) {
    try { DriveApp.getFileById(a.draftFileId).setContent(text); } catch (e) { a.draftFileId = ''; }
  }
  return withLock_(function () {
    var cur = accFind_(a.loginId);
    if (!cur) throw new Error('계정이 지워졌어요');
    if (!cur.draftFileId || cur.draftFileId !== a.draftFileId) cur.draftFileId = saveText_(cur.draftFileId, 'draft_' + cur.loginId, text);
    cur.draftAt = at;
    accWrite_(cur);
    return { draftAt: at };
  });
}
function loadDraft_(p) {
  var a = needStudent_(p);
  var plan = null;
  if (a.draftFileId) { try { plan = JSON.parse(readText_(a.draftFileId)); } catch (e) { plan = null; } }
  return { loginId: a.loginId, plan: plan, draftAt: a.draftAt || '' };
}


// ---------- 메타버스: 지금 월드에 들어와 있는 친구들 (함께 보기) ----------
// 각 기기가 몇 초마다 「내 위치·캐릭터·별명」을 보내면, 최근 20초 안에 보낸 다른 친구들을 돌려줘요.
// 시트·드라이브에 적지 않고 캐시(잠깐 기억)에만 둬요 → 빠르고, 창을 닫으면 저절로 사라져요.
var PRESENCE_KEY = 'presence';
var PRESENCE_TTL = 20000;      // 이 시간(ms) 동안 소식이 없으면 나간 것으로
var PRESENCE_MAX = 60;
function presence_(p) {
  var sid = str_(p.sid, 40).replace(/[^A-Za-z0-9_-]/g, '');
  if (!sid) throw new Error('기기 구분 값이 없어요');
  var cache = CacheService.getScriptCache();
  var now = Date.now();
  var read = function () { var all = {}; try { all = JSON.parse(cache.get(PRESENCE_KEY) || '{}') || {}; } catch (e) { all = {}; } return all; };
  var prune = function (all) { Object.keys(all).forEach(function (k) { if (!all[k] || now - Number(all[k].t) > PRESENCE_TTL) delete all[k]; }); return all; };
  var all;
  var lock = LockService.getScriptLock();
  if (lock.tryLock(4000)) {
    try {
      all = prune(read());
      if (p.leave) delete all[sid];
      else {
        var av = {};
        var src = p.avatar && typeof p.avatar === 'object' ? p.avatar : {};
        Object.keys(src).slice(0, 12).forEach(function (k) { var n = Number(src[k]); if (/^[a-z]{1,10}$/.test(k) && n >= 0 && n < 100 && Math.floor(n) === n) av[k] = n; });
        all[sid] = { n: str_(p.nick, 10).replace(/[<>]/g, ''), a: av, x: Math.round(Number(p.x) || 0), y: Math.round(Number(p.y) || 0), w: Math.round(Number(p.w) || 0), t: now };
        var ids = Object.keys(all);
        if (ids.length > PRESENCE_MAX) ids.sort(function (a, b) { return all[a].t - all[b].t; }).slice(0, ids.length - PRESENCE_MAX).forEach(function (k) { delete all[k]; });
      }
      cache.put(PRESENCE_KEY, JSON.stringify(all), 600);
    } finally { lock.releaseLock(); }
  } else all = prune(read());   // 붐빌 땐 이번엔 읽기만
  var others = Object.keys(all).filter(function (k) { return k !== sid; }).map(function (k) { var o = all[k]; return { sid: k, nick: o.n, avatar: o.a, x: o.x, y: o.y, w: o.w, age: now - o.t }; });
  return { others: others, interval: 3000 };
}
