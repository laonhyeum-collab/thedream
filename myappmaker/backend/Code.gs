/**
 * MY APP MAKER — 우리 반 저장소 (Google Apps Script 웹 앱)
 *
 * 학생 기획서·앱 제출, 교사 검토(승인/수정 요청/부스 배정), 메타버스 부스 목록을 맡습니다.
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
  'appUrl', 'htmlFileId', 'htmlSize', 'planJson', 'submittedAt', 'reviewedAt', 'likes'];

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
  var teacherActions = { list: listAll_, teacherApp: teacherApp_, review: review_, remove: remove_ };
  if (teacherActions[a]) { needTeacher_(p); return teacherActions[a](p); }
  needClass_(p);
  if (a === 'ping') return { classCode: CLASS_CODE, time: new Date().toISOString() };
  if (a === 'submit') return submit_(p);
  if (a === 'mine') return mine_(p);
  if (a === 'world') return world_();
  if (a === 'app') return app_(p, false);
  if (a === 'like') return like_(p);
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
    appUrl: o.appUrl, hasHtml: !!o.htmlFileId, likes: Number(o.likes) || 0,
    intro: (function () { try { return JSON.parse(o.planJson).f.intro || ''; } catch (e) { return ''; } })() };
}

function world_() {
  var items = rows_().filter(function (o) { return o.status === 'approved'; }).map(publicItem_);
  return { items: items };
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
      htmlSize: Number(o.htmlSize) || 0, submittedAt: o.submittedAt, reviewedAt: o.reviewedAt, likes: Number(o.likes) || 0, plan: plan };
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
    if (p.booth !== undefined) o.booth = p.booth === null || p.booth === '' ? '' : Math.max(1, Math.min(99, Math.floor(Number(p.booth)) || 1));
    o.reviewedAt = new Date().toISOString();
    writeRow_(o);
    return { id: o.id, status: o.status, booth: o.booth === '' ? null : o.booth };
  });
}

function remove_(p) {
  return withLock_(function () {
    var o = find_(str_(p.id, 40));
    saveHtml_(o.htmlFileId, '', '');
    sheet_().deleteRow(o._row);
    return { id: o.id };
  });
}
