// [교사 앱] 계정: 관리자 로그인(아이디·비밀번호) · 관리자 추가 · 학생 아이디 만들기·비밀번호 카드 인쇄
// 저장소(구글 Apps Script)가 연결되어 있어야 해요. 로그인하면 받은 출입증을 교사 열쇠 자리에 씁니다.
import { h, $, toast, fmtTime } from '../shared/ui.js';

const STATUS = { submitted: '📨 확인 대기', needs_fix: '🔧 수정 요청', approved: '🏪 입점' };

export function createAccountsAdmin({ getApi, getKey, setKey, onLogin }) {
  let me = '';   // 로그인한 관리자 아이디

  // ---------- 관리자 로그인 (⚙️ 연결 설정 탭) ----------
  // box: 그릴 곳 (기본 = ⚙️ 연결 설정 탭, 시작 화면에서는 시작 화면 안)
  async function renderAdmin(box = $('#adminBox')) {
    const api = getApi();
    if (!api.enabled) {
      box.replaceChildren(h('h2', {}, '👤 관리자 로그인'), h('p', { class: 'muted small' }, '위에서 저장소 주소와 반 코드를 먼저 저장해 주세요. 저장소 없이 파일 방식으로 쓸 때는 로그인이 필요 없어요.'));
      return;
    }
    me = '';
    if (getKey()) { try { me = (await api.whoami(getKey())).adminId; if (me) setKey(getKey(), me); } catch { setKey(''); } }
    if (getKey() && me) return renderLoggedIn(box);
    if (getKey() && !me) {   // 예전 방식(설치 열쇠)으로 연결되어 있음
      box.replaceChildren(h('h2', {}, '👤 관리자 로그인'),
        h('p', { class: 'pill warn' }, '지금은 설치 열쇠로 연결되어 있어요. 아래에서 관리자 계정을 만들어 로그인하면 더 안전해요.'), setupForm());
      return;
    }
    const id = h('input', { type: 'text', maxlength: 20, autocomplete: 'off', autocapitalize: 'off', spellcheck: 'false', placeholder: '관리자 아이디' });
    const pw = h('input', { type: 'password', autocomplete: 'current-password', placeholder: '비밀번호' });
    const msg = h('span', { class: 'small' });
    const login = async () => {
      msg.textContent = '로그인 중…';
      try {
        const r = await api.adminLogin(id.value.trim(), pw.value);
        setKey(r.token, r.adminId); toast(`👋 ${r.adminId} 선생님, 반가워요`); renderAdmin(); onLogin();
      } catch (e) { msg.textContent = `⚠ ${e.message}`; }
    };
    pw.addEventListener('keydown', (e) => { if (e.key === 'Enter') login(); });
    box.replaceChildren(
      h('h2', {}, '👤 관리자 로그인'),
      h('div', { class: 'row' }, h('label', { class: 'field grow' }, h('span', {}, '아이디'), id), h('label', { class: 'field grow' }, h('span', {}, '비밀번호'), pw)),
      h('div', { class: 'row' }, h('button', { id: 'adminLoginBtn', class: 'primary', onclick: login }, '🔓 로그인'), msg),
      h('details', { class: 'small' }, h('summary', {}, '처음 쓰나요? · 비밀번호를 잊었나요? → 설치 열쇠로 관리자 계정 만들기'), setupForm()));
  }

  // 설치 열쇠(Code.gs 의 TEACHER_KEY)로 첫 관리자 만들기 / 비밀번호 다시 정하기
  function setupForm() {
    const api = getApi();
    const key = h('input', { type: 'password', autocomplete: 'off', placeholder: 'Code.gs 의 TEACHER_KEY' });
    const id = h('input', { type: 'text', maxlength: 20, placeholder: '예) kim' });
    const pw = h('input', { type: 'password', autocomplete: 'new-password', placeholder: '6자 이상' });
    const msg = h('span', { class: 'small' });
    return h('div', { class: 'card', style: 'margin-top:8px' },
      h('p', { class: 'muted small' }, '설치 열쇠는 저장소를 만들 때 Code.gs 맨 위에 적은 TEACHER_KEY 예요. 같은 아이디로 다시 만들면 그 관리자의 비밀번호가 새로 바뀌어요.'),
      h('label', { class: 'field' }, h('span', {}, '설치 열쇠'), key),
      h('div', { class: 'row' }, h('label', { class: 'field grow' }, h('span', {}, '새 관리자 아이디'), id), h('label', { class: 'field grow' }, h('span', {}, '비밀번호'), pw)),
      h('div', { class: 'row' }, h('button', { id: 'adminSetupBtn', class: 'mint', onclick: async () => {
        msg.textContent = '만드는 중…';
        try {
          const r = await api.adminSetup(key.value.trim(), id.value.trim(), pw.value);
          setKey(r.token, r.adminId); toast(`✅ 관리자 ${r.adminId} 계정으로 로그인했어요`); renderAdmin(); onLogin();
        } catch (e) { msg.textContent = `⚠ ${e.message}`; }
      } }, '✨ 관리자 계정 만들기'), msg));
  }

  async function renderLoggedIn(box) {
    const api = getApi();
    let list = [];
    try { list = (await api.admins(getKey())).admins; } catch { /* 목록 없이 */ }
    const nid = h('input', { type: 'text', maxlength: 20, placeholder: '예) lee' });
    const npw = h('input', { type: 'password', autocomplete: 'new-password', placeholder: '6자 이상' });
    const mypw = h('input', { type: 'password', autocomplete: 'new-password', placeholder: '새 비밀번호 (6자 이상)' });
    box.replaceChildren(
      h('div', { class: 'row' }, h('h2', { class: 'grow' }, '👤 관리자'), h('span', { class: 'pill ok' }, `✅ ${me} 로그인됨`),
        h('button', { class: 'ghost', onclick: () => { setKey(''); toast('로그아웃했어요'); renderAdmin(); onLogin(); } }, '🚪 로그아웃')),
      h('h3', {}, '관리자 목록'),
      h('ul', { class: 'admin-list' }, ...list.map((a) => h('li', {}, h('b', {}, a.adminId), a.adminId === me ? ' (나)' : '', h('span', { class: 'muted small' }, ` · ${fmtTime(a.createdAt)}`),
        a.adminId === me ? '' : h('button', { class: 'danger small', onclick: async () => {
          if (!confirm(`관리자 ${a.adminId} 를 지울까요?`)) return;
          try { await api.removeAdmin(getKey(), a.adminId); toast('지웠어요'); renderAdmin(); } catch (e) { toast(e.message, 4000); }
        } }, '삭제')))),
      h('div', { class: 'row' }, h('label', { class: 'field grow' }, h('span', {}, '관리자 추가: 아이디'), nid), h('label', { class: 'field grow' }, h('span', {}, '비밀번호'), npw),
        h('button', { class: 'primary', onclick: async () => {
          try { await api.addAdmin(getKey(), nid.value.trim(), npw.value); toast('➕ 관리자를 추가했어요'); renderAdmin(); } catch (e) { toast(e.message, 4000); }
        } }, '➕ 추가')),
      h('div', { class: 'row' }, h('label', { class: 'field grow' }, h('span', {}, '내 비밀번호 바꾸기'), mypw),
        h('button', { class: 'ghost', onclick: async () => {
          try { const r = await api.changePassword(getKey(), mypw.value); setKey(r.token, r.adminId); mypw.value = ''; toast('🔑 비밀번호를 바꿨어요 (다른 기기의 로그인은 풀려요)'); } catch (e) { toast(e.message, 4000); }
        } }, '🔑 바꾸기')));
  }

  // ---------- 👥 학생 계정 탭 ----------
  async function renderAccounts() {
    const root = $('#accountsAdmin');
    const api = getApi();
    if (!api.enabled || !getKey()) {
      root.replaceChildren(h('div', { class: 'card' }, h('h2', {}, '👥 학생 계정'),
        h('p', {}, '학생 아이디는 우리 반 저장소에 만들어요. ⚙️ 연결 설정에서 저장소를 연결하고 관리자로 로그인해 주세요.'),
        h('button', { class: 'primary', onclick: () => document.querySelector('[data-tab="settings"]').click() }, '⚙️ 연결 설정으로')));
      return;
    }
    root.replaceChildren(h('p', { class: 'muted' }, '불러오는 중…'));
    let accounts = [];
    try { accounts = (await api.accounts(getKey())).accounts; } catch (e) { root.replaceChildren(h('p', { class: 'pill bad' }, `⚠ ${e.message}`)); return; }
    const prefix = h('input', { type: 'text', maxlength: 12, placeholder: '비워 두면 01, 02 …', style: 'max-width:180px' });
    const from = h('input', { type: 'number', min: 1, value: accounts.length + 1, style: 'max-width:110px' });
    const count = h('input', { type: 'number', min: 1, max: 60, value: accounts.length ? 1 : 25, style: 'max-width:110px' });
    const preview = h('span', { class: 'small muted' });
    const pad = (n) => (n < 10 ? `0${n}` : String(n));
    const upd = () => { const f = Number(from.value) || 1, c = Number(count.value) || 0; preview.textContent = c > 0 ? `만들 아이디: ${prefix.value.trim()}${pad(f)} ~ ${prefix.value.trim()}${pad(f + c - 1)}` : ''; };
    [prefix, from, count].forEach((x) => { x.oninput = upd; }); upd();

    const row = (a) => h('tr', {},
      h('td', {}, h('b', { class: 'mono' }, a.loginId)),
      h('td', {}, h('span', { class: 'mono' }, a.pin), a.locked ? h('span', { class: 'pill bad small' }, ' 잠김') : ''),
      h('td', { class: 'small' }, a.lastLoginAt ? fmtTime(a.lastLoginAt) : h('span', { class: 'muted' }, '아직')),
      h('td', { class: 'small' }, a.draftAt ? `☁️ ${fmtTime(a.draftAt)}` : h('span', { class: 'muted' }, '—')),
      h('td', { class: 'small' }, a.app ? `${STATUS[a.app.status] || ''} ${a.app.appName}${a.app.booth ? ` · ${a.app.booth}번` : ''}` : h('span', { class: 'muted' }, '—')),
      h('td', {},
        h('button', { class: 'ghost small', title: '비밀번호를 새로 만들어요. 그 학생은 새 비밀번호로 다시 로그인해요', onclick: async () => {
          if (!confirm(`${a.loginId} 의 비밀번호를 새로 만들까요? (지금 로그인된 기기는 로그아웃돼요)`)) return;
          try { const r = await api.resetPin(getKey(), a.loginId); toast(`🔑 ${r.loginId} 새 비밀번호: ${r.pin}`, 6000); renderAccounts(); } catch (e) { toast(e.message, 4000); }
        } }, '🔑 새 비밀번호'),
        h('button', { class: 'danger small', onclick: async () => {
          if (!confirm(`${a.loginId} 계정을 지울까요?\n저장소에 저장된 이 학생의 작업(기획서·앱)도 지워져요. 입점 신청한 앱은 학생 현황에 그대로 남아요.`)) return;
          try { await api.removeAccount(getKey(), a.loginId); toast('지웠어요'); renderAccounts(); } catch (e) { toast(e.message, 4000); }
        } }, '삭제')));

    root.replaceChildren(
      h('div', { class: 'card' },
        h('h2', {}, '👥 학생 아이디 만들기'),
        h('p', { class: 'small' }, '학생마다 아이디와 비밀번호(숫자 4자리)를 만들어 줘요. 학생은 이 아이디로 로그인하면 어느 노트북에서든 자기 기획서와 앱을 이어서 쓰고, 입점 상태를 볼 수 있어요.'),
        h('p', { class: 'muted small' }, '🔒 아이디에 학생 이름을 쓰지 마세요. 출석 번호처럼 번호만 쓰고, 누가 몇 번인지는 선생님만 알아 두세요.'),
        h('div', { class: 'row' },
          h('label', { class: 'field' }, h('span', {}, '앞글자 (선택)'), prefix),
          h('label', { class: 'field' }, h('span', {}, '시작 번호'), from),
          h('label', { class: 'field' }, h('span', {}, '몇 명'), count),
          h('button', { id: 'createAccBtn', class: 'primary', onclick: async () => {
            try {
              const r = await api.createAccounts(getKey(), { prefix: prefix.value.trim(), from: Number(from.value), count: Number(count.value) });
              toast(`✨ ${r.made.length}개를 만들었어요${r.skipped.length ? ` (이미 있는 ${r.skipped.join(', ')} 은 건너뜀)` : ''}`, 5000);
              renderAccounts();
            } catch (e) { toast(e.message, 4000); }
          } }, '✨ 만들기')),
        preview),
      h('div', { class: 'card' },
        h('div', { class: 'row' }, h('h2', { class: 'grow' }, `📇 학생 계정 ${accounts.length}개`),
          accounts.length ? h('button', { class: 'sun', onclick: () => printCards(accounts) }, '🖨️ 로그인 카드 인쇄') : '',
          h('button', { class: 'ghost', onclick: renderAccounts }, '🔄 새로고침')),
        accounts.length
          ? h('div', { class: 'table-wrap' }, h('table', { class: 'acc-table' },
            h('thead', {}, h('tr', {}, ...['아이디', '비밀번호', '마지막 로그인', '작업 저장', '입점', ''].map((t) => h('th', {}, t)))),
            h('tbody', {}, ...accounts.map(row))))
          : h('p', { class: 'muted' }, '아직 학생 계정이 없어요. 위에서 만들어 주세요.')));
  }

  // 오려서 나눠 주는 로그인 카드 (아이디·비밀번호·학생 앱 주소)
  function printCards(accounts) {
    const link = $('#studentLink') ? $('#studentLink').dataset.url : '';
    const w = window.open('', '_blank');
    if (!w) { toast('팝업이 막혀 있어요. 주소창 오른쪽에서 팝업을 허용해 주세요', 5000); return; }
    const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    w.document.write(`<!doctype html><html lang="ko"><head><meta charset="utf-8"><title>MY APP MAKER 로그인 카드</title><style>
      body{font-family:"맑은 고딕","Malgun Gothic",sans-serif;margin:12mm}
      .grid{display:grid;grid-template-columns:repeat(3,1fr);gap:6mm}
      .c{border:2px dashed #8E6BD8;border-radius:10px;padding:5mm;break-inside:avoid}
      .t{font-weight:700;color:#6E4FC0;margin-bottom:3mm} .r{font-size:15pt;margin:1.5mm 0} .r b{font-size:20pt;letter-spacing:1px}
      .u{font-size:8pt;color:#555;word-break:break-all;margin-top:3mm} .n{font-size:8pt;color:#888;margin-top:2mm}
    </style></head><body><div class="grid">${accounts.map((a) => `<div class="c"><div class="t">📱 MY APP MAKER 로그인 카드</div>
      <div class="r">아이디 <b>${esc(a.loginId)}</b></div><div class="r">비밀번호 <b>${esc(a.pin)}</b></div>
      ${link ? `<div class="u">학생 앱: ${esc(link)}</div>` : ''}<div class="n">🔒 친구에게 보여 주지 않아요 · 다 쓰면 「나가기」</div></div>`).join('')}</div>
      <script>window.onload=function(){window.print()}<\/script></body></html>`);
    w.document.close();
  }

  return { renderAdmin, renderAccounts, get me() { return me; } };
}
