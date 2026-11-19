// 우리 반 저장소(구글 Apps Script 웹 앱)와 이야기합니다. 설정이 없으면 파일 방식으로만 씁니다.
// - GET  ?action=...      : 읽기
// - POST (text/plain JSON): 쓰기  — text/plain 이라 브라우저 사전 요청(CORS preflight)이 없습니다.

// 연결 설정은 앱마다 따로 저장합니다 (myappmaker.student.config / teacher / world) — 한 기기에서 서로 덮어쓰지 않게.
const cfgKey = (app) => `myappmaker.${app}.config`;

export function loadConfig(app, search = globalThis.location ? location.search : '') {
  const base = (globalThis.window && window.MYAPP_CONFIG) || {};
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem(cfgKey(app)) || '{}'); } catch { /* 없음 */ }
  const q = new URLSearchParams(search);
  const cfg = {
    endpoint: q.get('api') || saved.endpoint || base.endpoint || '',
    classCode: q.get('class') || saved.classCode || base.classCode || '',
  };
  if (q.get('api') || q.get('class')) saveConfig(app, cfg);
  return cfg;
}

export function saveConfig(app, cfg) {
  try {
    const old = JSON.parse(localStorage.getItem(cfgKey(app)) || '{}');
    localStorage.setItem(cfgKey(app), JSON.stringify({ ...old, endpoint: cfg.endpoint || '', classCode: cfg.classCode || '' }));
  } catch { /* 저장 불가 */ }
}

export function isValidEndpoint(url) {
  try {
    const u = new URL(url);
    return u.protocol === 'https:' || u.hostname === 'localhost' || u.hostname === '127.0.0.1';
  } catch { return false; }
}

export function createApi(cfg, fetchImpl = globalThis.fetch.bind(globalThis)) {
  const enabled = !!(cfg.endpoint && isValidEndpoint(cfg.endpoint));

  async function call(method, params) {
    if (!enabled) throw new Error('우리 반 저장소가 연결되지 않았어요');
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 20000);
    try {
      let res;
      if (method === 'GET') {
        const u = new URL(cfg.endpoint);
        for (const [k, v] of Object.entries(params)) if (v != null) u.searchParams.set(k, v);
        res = await fetchImpl(u.toString(), { signal: ctrl.signal, redirect: 'follow' });
      } else {
        res = await fetchImpl(cfg.endpoint, { method: 'POST', body: JSON.stringify(params), signal: ctrl.signal, redirect: 'follow' });
      }
      const text = await res.text();
      let data;
      try { data = JSON.parse(text); } catch { throw new Error('저장소 응답을 읽지 못했어요 (주소 또는 배포 설정 확인)'); }
      if (!data.ok) throw new Error(data.error || '저장소에서 거절했어요');
      return data;
    } catch (e) {
      if (e.name === 'AbortError') throw new Error('저장소 응답이 너무 늦어요. 잠시 뒤 다시 해 보세요');
      if (e instanceof TypeError) {
        // 대부분: 배포 「액세스 권한」이 「모든 사용자」가 아니거나, 주소가 …/exec 가 아님 (구글 로그인 화면이 대신 와서 읽지 못함)
        throw new Error(/\/exec(\?|$)/.test(cfg.endpoint)
          ? '저장소에 닿지 못했어요. Apps Script 배포의 「액세스 권한이 있는 사용자」가 「모든 사용자」인지 확인해 주세요 (「Google 계정이 있는 모든 사용자」는 안 돼요). 인터넷 연결도 확인해 주세요'
          : '저장소 주소가 맞지 않아요. 배포 뒤에 나온 「웹 앱 URL」(…/exec 로 끝나는 주소)을 넣어 주세요');
      }
      throw e;
    } finally { clearTimeout(timer); }
  }

  const classCode = cfg.classCode;
  return {
    enabled,
    ping: () => call('GET', { action: 'ping', classCode }),
    // 학생 (선생님이 만든 아이디로 로그인하면 token 으로 구분)
    studentLogin: (loginId, pin) => call('POST', { action: 'studentLogin', classCode, loginId, pin }),
    loadDraft: (token) => call('POST', { action: 'loadDraft', classCode, token }),
    saveDraft: (token, plan) => call('POST', { action: 'saveDraft', classCode, token, plan }),
    submit: (sub) => call('POST', { action: 'submit', classCode, ...sub }),
    mine: (studentKey, token) => call('POST', { action: 'mine', classCode, studentKey, token }),
    // 메타버스
    world: () => call('GET', { action: 'world', classCode }),
    app: (id) => call('GET', { action: 'app', classCode, id }),
    like: (id) => call('POST', { action: 'like', classCode, id }),
    booth: (id) => call('GET', { action: 'booth', classCode, id }),
    asset: (key) => call('GET', { action: 'asset', classCode, key }),
    teacherAppHtml: () => call('GET', { action: 'teacherAppHtml', classCode }),
    // 관리자 계정 (teacherKey 자리에 로그인 출입증을 넣어요)
    adminSetup: (setupKey, adminId, password) => call('POST', { action: 'adminSetup', setupKey, adminId, password }),
    adminLogin: (adminId, password) => call('POST', { action: 'adminLogin', adminId, password }),
    whoami: (teacherKey) => call('POST', { action: 'whoami', teacherKey }),
    admins: (teacherKey) => call('POST', { action: 'admins', teacherKey }),
    addAdmin: (teacherKey, adminId, password) => call('POST', { action: 'addAdmin', teacherKey, adminId, password }),
    removeAdmin: (teacherKey, adminId) => call('POST', { action: 'removeAdmin', teacherKey, adminId }),
    changePassword: (teacherKey, password) => call('POST', { action: 'changePassword', teacherKey, password }),
    accounts: (teacherKey) => call('POST', { action: 'accounts', teacherKey }),
    createAccounts: (teacherKey, o) => call('POST', { action: 'createAccounts', teacherKey, ...o }),
    resetPin: (teacherKey, loginId) => call('POST', { action: 'resetPin', teacherKey, loginId }),
    removeAccount: (teacherKey, loginId) => call('POST', { action: 'removeAccount', teacherKey, loginId }),
    // 교사 (teacherKey 필요)
    list: (teacherKey) => call('POST', { action: 'list', teacherKey }),
    teacherApp: (teacherKey, id) => call('POST', { action: 'teacherApp', teacherKey, id }),
    review: (teacherKey, r) => call('POST', { action: 'review', teacherKey, ...r }),
    remove: (teacherKey, id) => call('POST', { action: 'remove', teacherKey, id }),
    worldAdmin: (teacherKey) => call('POST', { action: 'worldAdmin', teacherKey }),
    setWorld: (teacherKey, settings) => call('POST', { action: 'setWorld', teacherKey, settings }),
    setAsset: (teacherKey, key, data) => call('POST', { action: 'setAsset', teacherKey, key, data }),
    setTeacherApp: (teacherKey, title, html) => call('POST', { action: 'setTeacherApp', teacherKey, title, html }),
  };
}
