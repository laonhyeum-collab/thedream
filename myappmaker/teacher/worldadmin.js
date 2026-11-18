// [교사 앱] 월드 꾸미기: 학교 이름·월드 이름·공지, 선생님의 앱, 월드 그림(프롬프트 복사 → 그림 올리기)
// 우리 반 저장소가 있으면 저장소에, 없으면 이 기기에 저장하고 「메타버스 파일」에 함께 담습니다.
import { worldPrompts, mapWithSchoolNamePrompt, cleanWorldSettings, cleanHotspots, worldName, STUDENT_BOOTHS } from '../shared/worldart.js';
import { processPicture } from '../shared/picture.js';
import { extractHtml, looksLikeApp, mountApp, MAX_APP_BYTES } from '../shared/sandbox.js';
import { readFileText } from '../shared/files.js';
import { h, $, toast, copyText } from '../shared/ui.js';

const LOCAL = 'myappmaker.teacher.world';
const MAX_ASSET = { map: 880_000 };

export function createWorldAdmin({ getApi, getKey }) {
  const remote = () => getApi().enabled && !!getKey();
  const localGet = () => { try { return JSON.parse(localStorage.getItem(LOCAL)) || {}; } catch { return {}; } };
  const localSet = (w) => { try { localStorage.setItem(LOCAL, JSON.stringify(w)); return true; } catch { toast('이 기기 저장 공간이 부족해요. 큰 그림(지도)을 줄여 보세요', 5000); return false; } };

  let conf = { settings: cleanWorldSettings({}), assets: {}, teacherApp: null };   // assets: key → data URL(또는 '' = 저장소에 있음)

  async function load() {
    if (remote()) {
      const r = await getApi().worldAdmin(getKey());
      conf = { settings: cleanWorldSettings(r.settings), assets: Object.fromEntries(r.assets.map((k) => [k, ''])), teacherApp: r.teacherApp };
    } else {
      const w = localGet();
      conf = { settings: cleanWorldSettings(w.settings), assets: w.assets || {}, teacherApp: w.teacherApp || null };
    }
  }
  async function assetData(key) {
    if (conf.assets[key]) return conf.assets[key];
    if (key in conf.assets && remote()) { const d = (await getApi().asset(key)).data; conf.assets[key] = d; return d; }
    return '';
  }
  async function saveSettings(s) {
    const clean = cleanWorldSettings(s);
    if (remote()) conf.settings = cleanWorldSettings((await getApi().setWorld(getKey(), clean)).settings);
    else { const w = localGet(); w.settings = clean; if (!localSet(w)) return; conf.settings = clean; }
  }
  async function saveAsset(key, data) {
    if (remote()) { await getApi().setAsset(getKey(), key, data); if (data) conf.assets[key] = data; else delete conf.assets[key]; return; }
    const w = localGet(); w.assets = { ...(w.assets || {}) };
    if (data) w.assets[key] = data; else delete w.assets[key];
    if (!localSet(w)) throw new Error('저장하지 못했어요');
    conf.assets = w.assets;
  }
  async function saveTeacherApp(title, html) {
    if (remote()) { conf.teacherApp = (await getApi().setTeacherApp(getKey(), title, html || '')).teacherApp; conf.teacherAppHtml = html || ''; return; }
    const w = localGet(); w.teacherApp = html ? { title: title || '선생님의 앱', html } : null;
    if (!localSet(w)) throw new Error('저장하지 못했어요');
    conf.teacherApp = w.teacherApp;
  }
  async function teacherAppHtml() {
    if (!conf.teacherApp) return '';
    if (conf.teacherApp.html) return conf.teacherApp.html;
    if (conf.teacherAppHtml) return conf.teacherAppHtml;
    if (remote()) { conf.teacherAppHtml = (await getApi().teacherAppHtml()).html; return conf.teacherAppHtml; }
    return '';
  }

  // 메타버스 파일에 담을 월드 정보
  async function exportPart() {
    const assets = {};
    for (const k of Object.keys(conf.assets)) { try { const d = await assetData(k); if (d) assets[k] = d; } catch { /* 빼고 */ } }
    const html = await teacherAppHtml().catch(() => '');
    return { settings: conf.settings, assets, teacherApp: conf.teacherApp && html ? { title: conf.teacherApp.title, html } : null };
  }

  // ---------- 화면 ----------
  async function render() {
    const root = $('#worldAdmin');
    root.replaceChildren(h('p', { class: 'muted' }, '불러오는 중…'));
    try { await load(); } catch (e) { root.replaceChildren(h('p', { class: 'pill bad' }, `⚠ ${e.message}`)); return; }
    const s = conf.settings;
    const school = h('input', { type: 'text', maxlength: 20, placeholder: '예) 해솔초등학교' }); school.value = s.schoolName;
    const title = h('input', { type: 'text', maxlength: 24, placeholder: '친구들이 만든 앱 월드' }); title.value = s.title;
    const notice = h('textarea', { rows: 3, maxlength: 300, placeholder: '예) 오늘 3교시에 앱 월드가 열려요! 친구 부스 3곳에 좋아요를 남겨 봐요.' }); notice.value = s.notice;
    const preview = h('b', {}, worldName(s));
    const upd = () => { preview.textContent = worldName({ schoolName: school.value.trim(), title: title.value.trim() }); };
    school.oninput = upd; title.oninput = upd;

    // 선생님의 앱
    const taTitle = h('input', { type: 'text', maxlength: 30, placeholder: '예) 구구단 마을' }); taTitle.value = conf.teacherApp ? conf.teacherApp.title : '';
    const taCode = h('textarea', { class: 'code', spellcheck: 'false', placeholder: 'AI가 만든 HTML 코드를 붙여 넣거나 .html 파일을 올려요' });
    const taFile = h('input', { type: 'file', accept: '.html,.htm,text/html', hidden: true, id: 'taFile' });
    const taFrame = h('iframe', { class: 'app-frame', title: '선생님의 앱 미리보기', style: 'height:300px' });
    taFile.onchange = async (e) => { const f = e.target.files[0]; e.target.value = ''; if (f) taCode.value = await readFileText(f, MAX_APP_BYTES); };
    const showTA = async () => { const code = await teacherAppHtml().catch(() => ''); if (code) { taCode.value = code; mountApp(taFrame, { html: code }); } };

    root.replaceChildren(
      h('div', { class: 'card' },
        h('h2', {}, '🏫 학교와 월드 이름'),
        h('p', { class: 'muted small' }, '학교 이름은 앱 월드의 입구 아치 현수막과 제목에 나오고, 지도 그림 프롬프트에도 들어가요. (앱 월드는 주소를 아는 사람이 볼 수 있어요)'),
        h('div', { class: 'row' }, h('label', { class: 'field grow' }, h('span', {}, '학교 이름'), school), h('label', { class: 'field grow' }, h('span', {}, '월드 이름'), title)),
        h('label', { class: 'field' }, h('span', {}, '📢 공지 (앱 월드 「공지」에 보여요)'), notice),
        h('div', { class: 'row' }, h('span', { class: 'grow' }, '미리보기: 🚪 ', preview),
          h('button', { class: 'primary', onclick: async () => { try { await saveSettings({ ...conf.settings, schoolName: school.value, title: title.value, notice: notice.value }); toast('💾 월드 이름과 공지를 저장했어요'); render(); } catch (e) { toast(e.message, 4000); } } }, '💾 저장'))),
      h('div', { class: 'card' },
        h('h2', {}, '🎓 선생님의 앱 (가운데 큰 건물)'),
        h('p', { class: 'muted small' }, '선생님이 만든 앱 1개를 올리면 앱 월드 한가운데 「선생님의 앱」 건물에서 열려요.'),
        h('label', { class: 'field' }, h('span', {}, '앱 이름'), taTitle),
        taCode,
        h('div', { class: 'row' },
          h('button', { class: 'primary', onclick: async () => {
            const html = extractHtml(taCode.value);
            if (!html || !looksLikeApp(html)) { toast('HTML 코드를 넣어 주세요'); return; }
            if (html.length > MAX_APP_BYTES) { toast('코드가 너무 커요'); return; }
            try { await saveTeacherApp(taTitle.value.trim() || '선생님의 앱', html); mountApp(taFrame, { html }); toast('🎓 선생님의 앱을 올렸어요'); } catch (e) { toast(e.message, 4000); }
          } }, '🚀 올리기'),
          h('label', { class: 'btn', for: 'taFile' }, '📄 .html 파일'), taFile,
          conf.teacherApp ? h('button', { class: 'danger', onclick: async () => { if (!confirm('선생님의 앱을 내릴까요?')) return; try { await saveTeacherApp('', ''); toast('내렸어요'); render(); } catch (e) { toast(e.message); } } }, '🗑️ 내리기') : '',
          h('span', { class: 'small muted' }, conf.teacherApp ? `✅ 지금: ${conf.teacherApp.title}` : '아직 없어요')),
        taFrame),
      h('div', { class: 'card' },
        h('div', { class: 'row' }, h('h2', { class: 'grow' }, '🖼️ 월드 그림'),
          h('a', { class: 'btn sun', href: '../docs/월드_이미지_프롬프트.docx', download: '' }, '📄 프롬프트 문서(.docx)')),
        h('p', { class: 'small' }, `그림을 올리지 않아도 앱이 픽셀아트 섬을 그려요. 이미지 AI로 만든 그림을 올리면 그 그림으로 바뀌어요. 학생 부스는 ${STUDENT_BOOTHS}개, 가운데에 선생님의 앱 건물 1개가 있어요.`),
        h('p', { class: 'muted small' }, '순서: 📋 프롬프트 복사 → 이미지 AI(예: Gemini)에 붙여 넣기 → 그림 저장 → 📷 올리기. 건물·분수·아치 그림의 하얀 배경은 앱이 지워요. 이미지 AI는 한글 글씨를 틀리게 그릴 수 있어서, 학교 이름은 앱이 아치 현수막에 써 줘요.'),
        h('div', { class: 'row' }, h('button', { class: 'ghost small', onclick: () => copyText(mapWithSchoolNamePrompt(conf.settings), '📋 학교 이름을 그림에 넣는 지도 프롬프트를 복사했어요') }, '📋 (선택) 학교 이름을 그림에 직접 넣는 지도 프롬프트')),
        h('div', { class: 'asset-grid', id: 'assetGrid' })),
      h('div', { class: 'card', id: 'hotspotCard' }),
    );
    renderAssets();
    renderHotspots();
    showTA();
  }

  // ---------- 지도 그림 위에 문 자리 찍기 ----------
  async function renderHotspots() {
    const card = $('#hotspotCard');
    const map = 'map' in conf.assets ? await assetData('map').catch(() => '') : '';
    if (!map) {
      card.replaceChildren(h('h2', {}, '📍 지도 그림 위에 문 자리 찍기'),
        h('p', { class: 'muted small' }, '위에서 🗺️ 월드 지도 그림을 올리면 여기서 건물 문 자리를 찍을 수 있어요. 건물까지 다 그려진 지도를 쓰면 그 그림 그대로 앱 월드가 돼요.'));
      return;
    }
    let hs = cleanHotspots(conf.settings.hotspots);
    let labelMode = conf.settings.labelMode;
    let pick = 'hall';
    const targets = [['hall', '🎓 선생님의 앱'], ['start', '🚩 시작 자리'], ...Array.from({ length: STUDENT_BOOTHS }, (_, i) => [`b${i}`, String(i + 1).padStart(2, '0')])];
    const getPt = (k) => (k === 'hall' ? hs.hall : k === 'start' ? hs.start : hs.booths[Number(k.slice(1))]);
    const setPt = (k, v) => { if (k === 'hall') hs.hall = v; else if (k === 'start') hs.start = v; else hs.booths[Number(k.slice(1))] = v; };
    const pickRow = h('div', { class: 'chips hs-pick' });
    const stage = h('div', { class: 'hs-stage' });
    const img = h('img', { src: map, alt: '월드 지도', draggable: 'false' });
    stage.append(img);
    const status = h('p', { class: 'small' });
    const drawPick = () => {
      pickRow.replaceChildren(...targets.map(([k, lbl]) => h('button', { type: 'button', class: 'chip', 'aria-pressed': String(pick === k), 'data-hs': k,
        onclick: () => { pick = k; drawPick(); } }, `${getPt(k) ? '✅' : '⬜'} ${lbl}`)));
      stage.querySelectorAll('.hs-marker').forEach((m) => m.remove());
      for (const [k, lbl] of targets) {
        const p = getPt(k);
        if (p) stage.append(h('span', { class: `hs-marker${k === pick ? ' on' : ''}${k === 'hall' ? ' hall' : k === 'start' ? ' start' : ''}`, style: `left:${p[0] * 100}%;top:${p[1] * 100}%` }, k === 'hall' ? '🎓' : k === 'start' ? '🚩' : lbl));
      }
      const done = hs.booths.filter(Boolean).length;
      status.textContent = `선생님의 앱 ${hs.hall ? '✅' : '⬜'} · 시작 자리 ${hs.start ? '✅' : '⬜'} · 학생 부스 ${done}/${STUDENT_BOOTHS}`;
    };
    stage.addEventListener('click', (e) => {
      const r = img.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
      if (x < 0 || x > 1 || y < 0 || y > 1) return;
      setPt(pick, [Math.round(x * 10000) / 10000, Math.round(y * 10000) / 10000]);
      const i = targets.findIndex(([k]) => k === pick);   // 다음 자리로 자동 이동
      const next = targets.slice(i + 1).find(([k]) => !getPt(k));
      if (next) pick = next[0];
      drawPick();
    });
    const modes = h('div', { class: 'chips' }, ...[['small', '그림 속 간판 살리기 (작은 이름표)'], ['big', '앱이 큰 이름표 달기']].map(([m, lbl]) => h('button', {
      type: 'button', class: 'chip', 'aria-pressed': String(labelMode === m), onclick: (e) => { labelMode = m; e.target.parentElement.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(b === e.target))); },
    }, lbl)));
    card.replaceChildren(
      h('h2', {}, '📍 지도 그림 위에 문 자리 찍기'),
      h('p', { class: 'small' }, '① 아래에서 자리를 고르고 ② 지도에서 그 건물의 문(입구)을 눌러요. 다 찍으면 💾 저장. 문 자리를 찍으면 앱 월드는 이 그림을 그대로 쓰고, 그 위에 이름표·캐릭터·들어가기만 얹어요.'),
      pickRow, stage, status,
      h('div', { class: 'field' }, h('span', { class: 'small muted' }, '이름표'), modes),
      h('div', { class: 'row' },
        h('button', { class: 'primary', onclick: async () => { try { await saveSettings({ ...conf.settings, hotspots: hs, labelMode }); toast('💾 문 자리를 저장했어요. 앱 월드를 새로 열면 바뀌어요'); } catch (e) { toast(e.message, 4000); } } }, '💾 저장'),
        h('button', { class: 'ghost', onclick: () => { if (!getPt(pick)) return; setPt(pick, null); drawPick(); } }, '고른 자리 지우기'),
        h('button', { class: 'ghost', onclick: () => { if (!confirm('찍은 문 자리를 모두 지울까요?')) return; hs = cleanHotspots({}); pick = 'hall'; drawPick(); } }, '모두 지우기')));
    drawPick();
  }

  async function renderAssets() {
    const grid = $('#assetGrid');
    const prompts = worldPrompts(conf.settings);
    grid.replaceChildren(...prompts.map((a) => {
      const has = a.key in conf.assets;
      const thumb = h('div', { class: 'pic-thumb' }, has ? '⏳' : '🖼️');
      if (has) assetData(a.key).then((d) => { if (d) thumb.replaceChildren(h('img', { src: d, alt: a.title })); }).catch(() => { thumb.textContent = '⚠'; });
      const file = h('input', { type: 'file', accept: 'image/*', hidden: true, id: `asset-${a.key}` });
      file.onchange = async (e) => {
        const f = e.target.files[0]; e.target.value = '';
        if (!f) return;
        toast('🪄 그림을 다듬는 중…');
        try {
          const r = await processPicture(f, a, { maxChars: MAX_ASSET[a.key] || 300_000 });
          await saveAsset(a.key, r.dataUrl);
          toast(`✨ ${a.title} 그림을 올렸어요`);
          renderAssets();
          if (a.key === 'map') renderHotspots();
        } catch (err) { toast(err.message, 4500); }
      };
      return h('div', { class: `pic-slot${has ? ' done' : ''}`, 'data-asset': a.key },
        h('b', {}, a.title, h('span', { class: 'muted small' }, ` ${a.ratio}`)),
        h('span', { class: 'small muted' }, a.use),
        thumb,
        h('div', { class: 'row' },
          h('button', { type: 'button', onclick: () => copyText(a.prompt, `📋 ${a.title} 프롬프트를 복사했어요`) }, a.key === 'map' ? '📋 건물까지 그린 지도 (추천)' : '📋 프롬프트'),
          a.key === 'map' ? h('button', { type: 'button', class: 'ghost', onclick: () => copyText(a.groundPrompt, '📋 바닥만 있는 지도 프롬프트를 복사했어요') }, '📋 바닥만') : '',
          h('label', { class: 'btn primary', for: `asset-${a.key}` }, has ? '🔁 바꾸기' : '📷 올리기'), file,
          has ? h('button', { type: 'button', class: 'ghost', 'aria-label': `${a.title} 빼기`, onclick: async () => { try { await saveAsset(a.key, null); renderAssets(); if (a.key === 'map') renderHotspots(); } catch (err) { toast(err.message); } } }, '✕') : ''));
    }));
  }

  return { render, exportPart, load };
}
