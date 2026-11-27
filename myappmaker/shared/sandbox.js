// 학생이 만든 앱(HTML)을 안전한 상자(iframe sandbox) 안에서 실행합니다.
// - allow-same-origin 을 주지 않아서, 학생 앱은 이 사이트의 저장소·쿠키를 볼 수 없어요.
// - 그 대신 학생 앱의 localStorage 는 막히므로, 메모리 저장소로 바꿔 끼워 게임이 멈추지 않게 합니다.

// allow-forms: 정답 입력 칸(<form>)을 쓰는 퀴즈 게임이 「확인」을 눌러도 멈추지 않게 (allow-same-origin 은 여전히 주지 않음)
export const SANDBOX = 'allow-scripts allow-forms allow-modals allow-pointer-lock allow-downloads';

// 한 줄로만 씁니다(줄 수가 바뀌지 않아야 오류 줄 번호가 학생 코드와 같아요).
// ① localStorage·sessionStorage·document.cookie 가 막혀도 게임이 멈추지 않게 메모리로 바꿔 끼움
// ② 학생 앱에서 난 오류를 부모 화면(학생·교사 앱)에 알려 줌 → 「오류가 있어요」 안내
const SHIM = `<script>(function(){var send=function(m,l){try{parent.postMessage({myappmaker:'app-error',message:String(m||'').slice(0,300),line:l||0},'*')}catch(e){}};window.addEventListener('error',function(e){if(e&&e.message)send(e.message,e.lineno)});window.addEventListener('unhandledrejection',function(e){send(e&&e.reason&&e.reason.message||e&&e.reason,0)});var mk=function(){var d={};return{getItem:function(k){k=String(k);return Object.prototype.hasOwnProperty.call(d,k)?d[k]:null},setItem:function(k,v){d[String(k)]=String(v)},removeItem:function(k){delete d[String(k)]},clear:function(){d={}},key:function(i){return Object.keys(d)[i]||null},get length(){return Object.keys(d).length}}};try{window.localStorage.getItem('x');}catch(e){try{Object.defineProperty(window,'localStorage',{value:mk(),configurable:true});Object.defineProperty(window,'sessionStorage',{value:mk(),configurable:true});}catch(e2){}}try{document.cookie;}catch(e){var c='';try{Object.defineProperty(document,'cookie',{get:function(){return c},set:function(v){var p=String(v).split(';')[0];c=c?c+'; '+p:p},configurable:true});}catch(e3){}}})();<\/script>`;

export const MAX_APP_BYTES = 500_000;

// AI 답변 전체를 붙여 넣어도 코드 블록만 골라냅니다.
// - 닫는 ``` 는 줄 맨 앞에 있을 때만 인정해요(코드 안의 ``` 글자에서 잘리지 않게).
// - AI가 HTML · CSS · JavaScript 를 블록 여러 개로 나눠 주면 하나의 HTML 로 합쳐요.
const FENCE = /(^|\n)[ \t]*```[ \t]*([A-Za-z0-9_+-]*)[^\n]*\n([\s\S]*?)\n[ \t]*```(?=[ \t]*(\n|$))/g;
function fences(s) {
  const out = [];
  for (let m; (m = FENCE.exec(s));) out.push({ lang: m[2].toLowerCase(), code: m[3] });
  return out;
}
function mergeParts(html, css, js) {
  let out = html;
  if (css) {
    out = out.replace(/<link[^>]+href=["'](?!https?:|\/\/)[^"']+\.css["'][^>]*>/gi, '');
    const tag = `<style>\n${css}\n</style>`;
    out = /<\/head>/i.test(out) ? out.replace(/<\/head>/i, () => `${tag}\n</head>`) : tag + '\n' + out;
  }
  if (js) {
    out = out.replace(/<script[^>]+src=["'](?!https?:|\/\/)[^"']+\.js["'][^>]*>\s*<\/script>/gi, '');
    const tag = `<script>\n${js}\n<\/script>`;
    out = /<\/body>/i.test(out) ? out.replace(/<\/body>(?![\s\S]*<\/body>)/i, () => `${tag}\n</body>`) : out + '\n' + tag;
  }
  return out;
}
export function extractHtml(text) {
  const s = String(text || '').replace(/\r\n?/g, '\n').trim();
  if (!s) return '';
  const blocks = fences(s);
  let best = null;
  for (const b of blocks) if (/<(html|body|script|canvas|div)/i.test(b.code) && (!best || b.code.length > best.code.length)) best = b;
  if (best) {
    const rest = blocks.filter((b) => b !== best);
    const css = rest.filter((b) => b.lang === 'css').map((b) => b.code).join('\n');
    const js = rest.filter((b) => ['js', 'javascript', 'jsx'].includes(b.lang)).map((b) => b.code).join('\n');
    return mergeParts(best.code.trim(), css, js).trim();
  }
  const start = s.search(/<!doctype html|<html[\s>]/i);
  if (start >= 0) {
    // 코드 다음 설명에 「</html>」이 또 나와도 코드 끝에서 자르기
    const end = s.toLowerCase().indexOf('</html>', start);
    return (end > start ? s.slice(start, end + 7) : s.slice(start)).trim();
  }
  return s;
}

// AI에게 보낼 프롬프트를 실수로 코드 칸에 붙여 넣었는지 (앱 제작·고쳐 줘 프롬프트에 있는 말)
export function looksLikePrompt(text) {
  const s = String(text || '');
  return /HTML 파일 하나|코드 블록 하나로|그림 자리를 만들어 줘/.test(s) && !/<\/(script|body|html)>/i.test(s);
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
