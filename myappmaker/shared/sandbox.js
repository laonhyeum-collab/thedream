// 학생이 만든 앱(HTML)을 안전한 상자(iframe sandbox) 안에서 실행합니다.
// - allow-same-origin 을 주지 않아서, 학생 앱은 이 사이트의 저장소·쿠키를 볼 수 없어요.
// - 그 대신 학생 앱의 localStorage·쿠키는 막히므로, 메모리 저장소로 바꿔 끼워 게임이 멈추지 않게 합니다.
// - allow-forms: AI가 만든 퀴즈·입력 앱은 <form> 으로 「확인」 버튼을 많이 만들어요. 없으면 버튼이 아무 반응이 없어요.

export const SANDBOX = 'allow-scripts allow-modals allow-pointer-lock allow-downloads allow-forms';

const SHIM = `<script>(function(){try{window.localStorage.getItem('x');}catch(e){
var mk=function(){var d={};return{getItem:function(k){k=String(k);return Object.prototype.hasOwnProperty.call(d,k)?d[k]:null},setItem:function(k,v){d[String(k)]=String(v)},removeItem:function(k){delete d[String(k)]},clear:function(){d={}},key:function(i){return Object.keys(d)[i]||null},get length(){return Object.keys(d).length}}};
try{Object.defineProperty(window,'localStorage',{value:mk(),configurable:true});Object.defineProperty(window,'sessionStorage',{value:mk(),configurable:true});}catch(e2){}}
try{document.cookie;}catch(e){var ck='';try{Object.defineProperty(document,'cookie',{get:function(){return ck},set:function(v){ck=String(v).split(';')[0]},configurable:true});}catch(e3){}}})();<\/script>`;

export const MAX_APP_BYTES = 500_000;

// AI 답변 전체를 붙여 넣어도 코드 블록만 골라냅니다.
// AI가 HTML · CSS · JavaScript 를 코드 블록 여러 개(index.html / style.css / script.js)로 나눠 주면 하나로 합칩니다.
export function extractHtml(text) {
  const s = String(text || '').trim();
  if (!s) return '';
  const fence = /```([^\n`]*)\r?\n([\s\S]*?)```/g;
  let best = '', bestAt = -1;
  const blocks = [];
  for (let m; (m = fence.exec(s));) {
    const lang = m[1].trim().toLowerCase(), code = m[2];
    blocks.push({ lang, code });
    if (/<(html|body|script|canvas|div)/i.test(code) && code.length > best.length) { best = code; bestAt = blocks.length - 1; }
  }
  if (best) return mergeBlocks(best.trim(), blocks.filter((_, i) => i !== bestAt));
  const start = s.search(/<!doctype html|<html[\s>]/i);
  if (start >= 0) {
    const end = s.toLowerCase().lastIndexOf('</html>');
    return (end > start ? s.slice(start, end + 7) : s.slice(start)).trim();
  }
  return s;
}

const isCss = (b) => /^(css|style\.css|scss)$/.test(b.lang) || /\.css$/.test(b.lang);
const isJs = (b) => /^(js|javascript|jsx?|script\.js|main\.js|app\.js|game\.js)$/.test(b.lang) || /\.js$/.test(b.lang);
// 이미 코드 안에 있는 부분을 설명용으로 다시 보여 준 블록은 합치지 않아요(같은 코드가 두 번 들어가 멈추지 않게).
// HTML 이 css/js 파일을 불러오거나(<link href="style.css"> / <script src="script.js">) 그 부분이 아예 없을 때만 합쳐요.
const LOCAL_CSS = /<link[^>]+href=["']?(?!https?:|\/\/|data:)[^"'\s>]+\.css["']?[^>]*>/gi;
const LOCAL_JS = /<script[^>]+src=["']?(?!https?:|\/\/|data:)[^"'\s>]+\.js["']?[^>]*>\s*<\/script>/gi;
function mergeBlocks(html, rest) {
  const wantCss = new RegExp(LOCAL_CSS.source, 'i').test(html) || !/<style[\s>]/i.test(html);
  const wantJs = new RegExp(LOCAL_JS.source, 'i').test(html) || !/<script(?![^>]*\bsrc=)[^>]*>\s*\S/i.test(html);
  const css = wantCss ? rest.filter(isCss).map((b) => b.code.trim()).filter(Boolean) : [];
  const js = wantJs ? rest.filter(isJs).map((b) => b.code.trim()).filter((c) => c && !/^</.test(c)) : [];
  let out = html;
  if (css.length) {
    out = out.replace(LOCAL_CSS, '');
    const style = `<style>\n${css.join('\n')}\n</style>`;
    out = /<\/head>/i.test(out) ? out.replace(/<\/head>/i, () => `${style}\n</head>`) : style + '\n' + out;
  }
  if (js.length) {
    out = out.replace(LOCAL_JS, '');
    const script = `<script>\n${js.join('\n').replace(/<\/script/gi, '<\\/script')}\n</script>`;
    const at = out.toLowerCase().lastIndexOf('</body>');
    out = at >= 0 ? out.slice(0, at) + script + '\n' + out.slice(at) : out + '\n' + script;
  }
  return out;
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
