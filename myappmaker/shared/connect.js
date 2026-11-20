// 「우리 반에 연결하기」 안내 화면
// 연결 정보(저장소 주소·반 코드)가 없는 기기에서 학생·월드 앱을 열면, 조용히 파일 제출 방식으로 가지 않고
// 먼저 「선생님이 준 주소나 QR 코드로 다시 열어요」를 보여 줘요. 저장소 없이 하기는 작은 보조 버튼이에요.
import { isValidEndpoint } from './api.js';

const offKey = (app) => `myappmaker.${app}.offline`;

// 선생님이 준 주소(…?api=…&class=…)에서 연결 정보를 꺼내요. 주소가 아니거나 정보가 없으면 null.
export function parseClassLink(text) {
  const s = String(text || '').trim();
  if (!s) return null;
  let u;
  try { u = new URL(s); } catch { return null; }
  const endpoint = (u.searchParams.get('api') || '').trim();
  const classCode = (u.searchParams.get('class') || '').trim();
  if (!endpoint || !isValidEndpoint(endpoint)) return null;
  return { endpoint, classCode };
}

// 지금 페이지 주소에 연결 정보를 붙인 주소 (해시는 그대로)
export function linkWith(href, info) {
  const u = new URL(href);
  u.searchParams.set('api', info.endpoint);
  if (info.classCode) u.searchParams.set('class', info.classCode); else u.searchParams.delete('class');
  return u.toString();
}

export function offlineChosen(app, storage = globalThis.localStorage) {
  try { return storage.getItem(offKey(app)) === '1'; } catch { return false; }
}
export function chooseOffline(app, on = true, storage = globalThis.localStorage) {
  try { if (on) storage.setItem(offKey(app), '1'); else storage.removeItem(offKey(app)); } catch { /* 저장 불가 */ }
}

// 안내 화면이 필요한가? (연결 정보 없음 + ?demo·?offline 아님 + 「저장소 없이 하기」를 고른 적 없음)
export function needsConnect(app, cfg, search = '', storage = globalThis.localStorage) {
  if (cfg && cfg.endpoint && isValidEndpoint(cfg.endpoint)) return false;
  const q = new URLSearchParams(search);
  if (q.has('demo') || q.has('offline')) return false;
  return !offlineChosen(app, storage);
}

const TEXT = {
  student: { who: '학생 앱', offline: '저장소 없이 하기 (파일로 제출)', offNote: '이 기기에만 저장되고, 입점은 「제출 파일」로 해요.' },
  world: { who: '메타버스', offline: '저장소 없이 둘러보기 (체험 모드)', offNote: '우리 반 부스 대신 샘플 부스가 보여요.' },
};

// 연결이 필요하면 안내 화면을 띄워요. 「저장소 없이」를 고르면 닫혀요. 띄웠으면 true.
export function connectGate(app, cfg) {
  if (typeof document === 'undefined' || !needsConnect(app, cfg, location.search)) return false;
  const t = TEXT[app] || TEXT.student;
  const wrap = document.createElement('div');
  wrap.className = 'modal connect-gate';
  wrap.id = 'connectGate';
  wrap.setAttribute('role', 'dialog');
  wrap.setAttribute('aria-modal', 'true');
  wrap.setAttribute('aria-labelledby', 'connectTitle');
  wrap.innerHTML = `
    <div class="sheet" style="max-width:560px">
      <h2 id="connectTitle" style="margin-top:0">🏫 우리 반에 연결하기</h2>
      <p class="lead">이 기기는 아직 <b>우리 반 저장소</b>에 연결되지 않았어요.</p>
      <ol class="small" style="line-height:1.8;padding-left:1.3em">
        <li>선생님이 나눠 준 <b>주소</b>(클래스룸·패들렛 링크)를 눌러 다시 열어요.</li>
        <li>또는 칠판·화면의 <b>QR 코드</b>를 태블릿 카메라로 찍어요.</li>
        <li>주소를 복사해 두었다면 아래 칸에 붙여 넣어요.</li>
      </ol>
      <label class="field"><span>선생님이 준 주소 붙여 넣기</span>
        <input id="connectLink" type="url" autocomplete="off" spellcheck="false" placeholder="https://…/${app === 'world' ? 'world' : 'student'}/?api=…&class=…"></label>
      <div class="row"><button id="connectGo" type="button" class="primary big">🔗 연결하기</button></div>
      <p id="connectMsg" class="small" role="status" aria-live="polite"></p>
      <hr style="border:0;border-top:1px dashed #ddd;margin:16px 0 10px">
      <p class="muted small" style="margin:0 0 6px">선생님이 「저장소 없이」 하자고 했을 때만 눌러요. ${t.offNote}</p>
      <button id="connectOffline" type="button" class="ghost small">${t.offline}</button>
    </div>`;
  document.body.appendChild(wrap);
  const input = wrap.querySelector('#connectLink');
  const msg = wrap.querySelector('#connectMsg');
  const go = () => {
    const info = parseClassLink(input.value);
    if (!info) { msg.textContent = '⚠ 선생님이 준 주소 전체를 붙여 넣어 주세요 (…api=…&class=… 가 들어 있는 주소)'; return; }
    msg.textContent = '연결하는 중…';
    location.href = linkWith(location.href, info);
  };
  wrap.querySelector('#connectGo').onclick = go;
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); });
  wrap.querySelector('#connectOffline').onclick = () => { chooseOffline(app); wrap.remove(); };
  setTimeout(() => input.focus(), 0);
  return true;
}
