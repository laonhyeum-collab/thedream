// 학생이 만든 앱(HTML)을 안전한 상자(iframe sandbox) 안에서 실행합니다.
// - allow-same-origin 을 주지 않아서, 학생 앱은 이 사이트의 저장소·쿠키를 볼 수 없어요.
// - 그 대신 학생 앱의 localStorage 는 막히므로, 메모리 저장소로 바꿔 끼워 게임이 멈추지 않게 합니다.

export const SANDBOX = 'allow-scripts allow-modals allow-pointer-lock allow-downloads';

const SHIM = `<script>(function(){try{window.localStorage.getItem('x');}catch(e){
var mk=function(){var d={};return{getItem:function(k){k=String(k);return Object.prototype.hasOwnProperty.call(d,k)?d[k]:null},setItem:function(k,v){d[String(k)]=String(v)},removeItem:function(k){delete d[String(k)]},clear:function(){d={}},key:function(i){return Object.keys(d)[i]||null},get length(){return Object.keys(d).length}}};
try{Object.defineProperty(window,'localStorage',{value:mk(),configurable:true});Object.defineProperty(window,'sessionStorage',{value:mk(),configurable:true});}catch(e2){}}})();<\/script>`;

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
    const end = s.toLowerCase().lastIndexOf('</html>');
    return (end > start ? s.slice(start, end + 7) : s.slice(start)).trim();
  }
  return s;
}

export function looksLikeApp(html) {
  return /<(script|canvas|button|body|div)[\s>]/i.test(html || '');
}

export function srcdocFor(html) {
  const s = String(html || '');
  const m = s.match(/<head[^>]*>/i);
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

export function isHttpUrl(u) {
  try { const x = new URL(u); return x.protocol === 'https:' || x.protocol === 'http:'; } catch { return false; }
}
