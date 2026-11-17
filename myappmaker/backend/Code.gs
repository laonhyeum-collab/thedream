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
  var teacherActions = { list: listAll_, teacherApp: teacherApp_, review: review_, remove: remove_,
    worldAdmin: worldAdmin_, setWorld: setWorld_, setAsset: setAsset_, setTeacherApp: setTeacherApp_ };
  if (teacherActions[a]) { needTeacher_(p); return teacherActions[a](p); }
  needClass_(p);
  if (a === 'ping') return { classCode: CLASS_CODE, time: new Date().toISOString() };
  if (a === 'submit') return submit_(p);
  if (a === 'mine') return mine_(p);
  if (a === 'world') return world_();
  if (a === 'app') return app_(p, false);
  if (a === 'like') return like_(p);
  if (a === 'booth') return booth_(p);
  if (a === 'asset') return asset_(p);
  if (a === 'teacherAppHtml') return teacherAppHtml_();
  throw new Error('모르는 요청이에요: ' + a);
}

function needClass_(p) { if (String(p.classCode || '') !== CLASS_CODE) throw new Error('반 코드가 맞지 않아요'); }
function needTeacher_(p) { if (String(p.teacherKey || '') !== TEACHER_KEY) throw new Error('교사 열쇠가 맞지 않아요'); }

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
function submit_(p) {
  var key = str_(p.studentKey, 80);
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
  var key = str_(p.studentKey, 80);
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

function worldAdmin_() { var w = worldConf_(); return { settings: w.settings, assets: Object.keys(w.assets), teacherApp: w.teacherApp ? { title: w.teacherApp.title } : null }; }

function setWorld_(p) {
  return withLock_(function () {
    var w = worldConf_();
    var s = p.settings || {};
    w.settings = { schoolName: cleanSetting_(s.schoolName, 20), title: cleanSetting_(s.title, 24) || '친구들이 만든 앱 월드', notice: cleanSetting_(s.notice, 300) };
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
