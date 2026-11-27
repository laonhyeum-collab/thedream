// 학생이 만든 앱(HTML)을 안전한 상자(iframe sandbox) 안에서 실행합니다.
// - allow-same-origin 을 주지 않아서, 학생 앱은 이 사이트의 저장소·쿠키를 볼 수 없어요.
// - 그 대신 학생 앱의 localStorage 는 막히므로, 메모리 저장소로 바꿔 끼워 게임이 멈추지 않게 합니다.

export const SANDBOX = 'allow-scripts allow-modals allow-pointer-lock allow-downloads';

// 한 줄로만 씁니다(줄 수가 바뀌지 않아야 오류 줄 번호가 학생 코드와 같아요).
// ① localStorage·sessionStorage·document.cookie 가 막혀도 게임이 멈추지 않게 메모리로 바꿔 끼움
// ② 학생 앱에서 난 오류를 부모 화면(학생·교사 앱)에 알려 줌 → 「오류가 있어요」 안내
const SHIM = `<script>(function(){var send=function(m,l){try{parent.postMessage({myappmaker:'app-error',message:String(m||'').slice(0,300),line:l||0},'*')}catch(e){}};window.addEventListener('error',function(e){if(e&&e.message)send(e.message,e.lineno)});window.addEventListener('unhandledrejection',function(e){send(e&&e.reason&&e.reason.message||e&&e.reason,0)});var mk=function(){var d={};return{getItem:function(k){k=String(k);return Object.prototype.hasOwnProperty.call(d,k)?d[k]:null},setItem:function(k,v){d[String(k)]=String(v)},removeItem:function(k){delete d[String(k)]},clear:function(){d={}},key:function(i){return Object.keys(d)[i]||null},get length(){return Object.keys(d).length}}};try{window.localStorage.getItem('x');}catch(e){try{Object.defineProperty(window,'localStorage',{value:mk(),configurable:true});Object.defineProperty(window,'sessionStorage',{value:mk(),configurable:true});}catch(e2){}}try{document.cookie;}catch(e){var c='';try{Object.defineProperty(document,'cookie',{get:function(){return c},set:function(v){var p=String(v).split(';')[0];c=c?c+'; '+p:p},configurable:true});}catch(e3){}}})();<\/script>`;

export const MAX_APP_BYTES = 500_000;

// AI 답변 전체를 붙여 넣어도 코드 블록만 골라냅니다.
export function extractHtml(text) {
  const s = String(text || '').trim();
  if (!s) return '';
  const fence = /```(?:html|HTML)?[^\n]*\n([\s\S]*?)```/g;
  let best = '';
  for (let m; (m = fence.exec(s));) if (/<(html|body|script|canvas|div)/i.test(m[1]) && m[1].length > best.length) best = m[1];
  if (best) return best.trim();
  const start = s.search(/<!doctype html|<html[\s>]/i);
  if (start >= 0) {
    // 코드 다음 설명에 「</html>」이 또 나와도 코드 끝에서 자르기
    const end = s.toLowerCase().indexOf('</html>', start);
    return (end > start ? s.slice(start, end + 7) : s.slice(start)).trim();
  }
  return s;
}

export function looksLikeApp(html) {
  return /<(script|canvas|button|body|div)[\s>]/i.test(html || '');
}

// AI 답이 중간에 끊긴 코드인지 확인 (무료 AI는 긴 코드를 자주 끝까지 못 써요) → 고칠 말
export function codeProblems(html) {
  const s = String(html || '');
  const low = s.toLowerCase();
  const out = [];
  const opens = (low.match(/<script\b/g) || []).length;
  const closes = (low.match(/<\/script>/g) || []).length;
  if (opens > closes || (/<html[\s>]/.test(low) && !low.includes('</html>')) || (/<body[\s>]/.test(low) && !low.includes('</body>'))) {
    out.push('cut');
  }
  return out;
}

export function srcdocFor(html) {
  const s = String(html || '');
  const m = s.match(/<head(?:\s[^>]*)?>/i);   // <header> 는 빼고
  if (m) return s.slice(0, m.index + m[0].length) + SHIM + s.slice(m.index + m[0].length);
  const h = s.match(/<html[^>]*>/i);
  if (h) return s.slice(0, h.index + h[0].length) + '<head>' + SHIM + '</head>' + s.slice(h.index + h[0].length);
  return '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' + SHIM + '</head><body>' + s + '</body></html>';
}

export function mountApp(iframe, { html, url }) {
  iframe.removeAttribute('src');
  iframe.removeAttribute('srcdoc');
  iframe.setAttribute('allow', 'fullscreen; autoplay');
  if (html) {
    iframe.setAttribute('sandbox', SANDBOX);
    iframe.srcdoc = srcdocFor(html);
  } else if (url) {
    // 같은 사이트의 앱(예: 무궁화)은 카메라까지 허용, 다른 사이트는 일반 상자
    const same = (() => { try { return new URL(url, location.href).origin === location.origin; } catch { return false; } })();
    if (same) { iframe.removeAttribute('sandbox'); iframe.setAttribute('allow', 'fullscreen; autoplay; camera; microphone'); }
    else iframe.setAttribute('sandbox', SANDBOX + ' allow-same-origin allow-forms allow-popups');
    iframe.src = new URL(url, location.href).toString();
  }
}

// 상자 안 학생 앱에서 난 오류 듣기 (그 상자에서 온 것만) → 멈추는 함수
export function onAppError(iframe, fn) {
  const on = (e) => {
    const d = e.data;
    if (!d || d.myappmaker !== 'app-error' || e.source !== iframe.contentWindow) return;
    fn({ message: String(d.message || '').slice(0, 300), line: Number(d.line) || 0 });
  };
  window.addEventListener('message', on);
  return () => window.removeEventListener('message', on);
}

export function isHttpUrl(u) {
  try { const x = new URL(u); return x.protocol === 'https:' || x.protocol === 'http:'; } catch { return false; }
}
