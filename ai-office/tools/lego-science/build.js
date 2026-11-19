// 레고 사이언스 교안 3종 세트 생성기: node build.js lessons/xx.json outdir
const fs = require("fs"), path = require("path");
const pptxgen = require("pptxgenjs");
const D = require("docx");
const L = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const OUT = process.argv[3] || "out"; fs.mkdirSync(OUT, { recursive: true });
const F = "맑은 고딕";
const C = { teal: "0B5D63", teal2: "1A8A8E", teal3: "2BB5BA", mint: "D9F0EE", mint2: "F1FAF9", mint3: "E6F8F9",
  yel: "E8A93B", yel2: "C9931B", yelBg: "FFF3D9", yelBg2: "FEF5E0", red: "E8543F", redBg: "FDE4E0",
  org: "F5A366", orgBg: "FCE3CC", ink: "1D2B33", sub: "5B6B72", line: "C9DCDD" };
const ROLE = [["🔵", "파랑", "1565C0", "EAF1FB"], ["🔴", "빨강", "E8543F", "FFDDDD"], ["🟢", "초록", "2E8B57", "E3F4EA"], ["🟡", "노랑", "C9931B", "FFF6D9"]];
const base = `${L.no}차시_${L.title.replace(/[\\/:*?"<>|]/g, "")}`;
const vocabLine = L.vocab.map(v => v.w).join(" · ");
// v2 구성(대표 지시 2026-11-19): 개념 영상 슬라이드, 만든 후 활동 슬라이드, 개념 마무리, 마무리용 활동지
const HV = !!L.video, HA = !!L.after, V2 = HV || HA;
const sn = n => n <= 4 ? n : n <= 7 ? n + (HV ? 1 : 0) : n + (HV ? 1 : 0) + (HA ? 1 : 0);
const NS = 13 + (HV ? 1 : 0) + (HA ? 1 : 0);
L.goals.forEach(g => { g.slides = String(g.slides).replace(/\d+/g, d => sn(+d)); });

/* ================= PPT ================= */
const pptx = new pptxgen(); pptx.layout = "LAYOUT_16x9"; pptx.author = "블록앤비트 교육부서";
pptx.title = `${L.title} (${L.en}) ${L.code}`;
const W = 10, H = 5.625;
function bar(s, title, time) {
  s.background = { color: "FFFFFF" };
  s.addShape("rect", { x: 0, y: 0, w: W, h: 0.62, fill: { color: C.teal }, line: { color: C.teal } });
  s.addText(title + (time ? `   ⏱️ ${time}` : ""), { x: 0.35, y: 0, w: W - 0.7, h: 0.62, fontFace: F, fontSize: 19, bold: true, color: "FFFFFF", valign: "middle" });
  s.addShape("rect", { x: 0, y: H - 0.22, w: W, h: 0.22, fill: { color: C.mint }, line: { color: C.mint } });
  s.addText(`레고 에듀케이션 사이언스 11+  |  ${L.unit}  |  ${L.code} · ${L.page}`, { x: 0.35, y: H - 0.22, w: W - 0.7, h: 0.22, fontFace: F, fontSize: 8, color: C.teal, valign: "middle" });
}
function card(s, x, y, w, h, fill, line, r = 0.12) { s.addShape("roundRect", { x, y, w, h, fill: { color: fill }, line: { color: line, width: 1.2 }, rectRadius: r }); }
function txt(s, t, o) { s.addText(t, Object.assign({ fontFace: F, color: C.ink, fontSize: 12, valign: "top", margin: 4 }, o)); }
function band(s, t, y = H - 0.72) { card(s, 0.35, y, W - 0.7, 0.42, C.yelBg, C.yel, 0.08); txt(s, t, { x: 0.5, y, w: W - 1, h: 0.42, fontSize: 12, bold: true, color: "8A5A00", valign: "middle" }); }

// 1 표지
{ const s = pptx.addSlide(); s.background = { color: "FFFFFF" };
  s.addShape("rect", { x: 0, y: 0, w: 0.18, h: H, fill: { color: C.teal }, line: { color: C.teal } });
  card(s, 0.45, 0.35, 6.0, 4.55, "FFFFFF", C.line);
  txt(s, L.emoji, { x: 0.75, y: 0.6, w: 3, h: 0.9, fontSize: 44, fontFace: "Segoe UI Emoji" });
  txt(s, L.title, { x: 0.75, y: 1.5, w: 5.5, h: 0.9, fontSize: 32, bold: true, color: C.yel2 });
  txt(s, `(${L.en})  ${L.code}`, { x: 0.75, y: 2.35, w: 5.5, h: 0.4, fontSize: 13, color: C.sub });
  txt(s, "❓ " + L.question, { x: 0.75, y: 2.8, w: 5.5, h: 0.55, fontSize: 15, color: C.teal, bold: true });
  txt(s, `대상 초등 고학년 · 4인 1조 · 45분\n키트 ${L.code} · 조립설명서 ${L.page}\n핵심 어휘 ${vocabLine}`, { x: 0.75, y: 3.45, w: 5.5, h: 1.1, fontSize: 11, color: C.sub });
  card(s, 6.75, 0.35, 2.85, 4.55, C.mint2, C.teal3);
  txt(s, L.deco.join("\n\n"), { x: 6.75, y: 0.7, w: 2.85, h: 3.3, fontSize: 30, align: "center", fontFace: "Segoe UI Emoji" });
  s.addShape("rect", { x: 6.75, y: 4.35, w: 2.85, h: 0.55, fill: { color: C.teal2 }, line: { color: C.teal2 } });
  txt(s, `${L.no}차시 · ${L.date}`, { x: 6.75, y: 4.35, w: 2.85, h: 0.55, fontSize: 12, color: "FFFFFF", bold: true, align: "center", valign: "middle" });
  s.addShape("rect", { x: 0, y: H - 0.3, w: W, h: 0.3, fill: { color: C.ink }, line: { color: C.ink } });
  txt(s, `레고 에듀케이션 사이언스 11+  |  ${L.unit}  |  조립설명서 ${L.page}`, { x: 0.35, y: H - 0.3, w: W - 0.7, h: 0.3, fontSize: 9, color: "FFFFFF", valign: "middle" });
}
// 2 목표
{ const s = pptx.addSlide(); bar(s, "⭐  오늘 배울 내용");
  txt(s, "이 수업이 끝나면 여러분은 이것을 할 수 있어요!", { x: 0.4, y: 0.72, w: 9, h: 0.35, fontSize: 12, color: C.sub });
  const cols = [[C.teal, C.mint2], [C.yel, C.yelBg], [C.red, C.redBg]];
  L.goals.forEach((g, i) => { const y = 1.12 + i * 1.0;
    card(s, 0.4, y, 9.2, 0.86, cols[i][1], cols[i][0]);
    s.addShape("ellipse", { x: 0.6, y: y + 0.15, w: 0.56, h: 0.56, fill: { color: cols[i][0] }, line: { color: cols[i][0] } });
    txt(s, "0" + (i + 1), { x: 0.6, y: y + 0.15, w: 0.56, h: 0.56, fontSize: 13, bold: true, color: "FFFFFF", align: "center", valign: "middle", margin: 0 });
    txt(s, g.t, { x: 1.35, y, w: 3.3, h: 0.86, fontSize: 14, bold: true, color: cols[i][0] === C.yel ? C.yel2 : cols[i][0], valign: "middle" });
    s.addShape("line", { x: 4.75, y: y + 0.12, w: 0, h: 0.62, line: { color: cols[i][0], width: 2 } });
    txt(s, g.d, { x: 4.9, y, w: 4.6, h: 0.86, fontSize: 11.5, valign: "middle" });
  });
  band(s, "🔑  핵심 낱말:  " + vocabLine, 4.25);
}
// 3 개요
{ const s = pptx.addSlide(); bar(s, `${L.emoji.slice(0, 2)}  개요 — ${L.title}`);
  card(s, 0.4, 0.8, 6.3, 1.95, C.mint2, C.teal3);
  txt(s, L.overview.story, { x: 0.6, y: 0.9, w: 5.9, h: 1.75, fontSize: 13.5, valign: "middle" });
  card(s, 6.9, 0.8, 2.7, 1.95, C.yelBg, C.yel);
  txt(s, L.overview.emoji, { x: 6.9, y: 0.8, w: 2.7, h: 1.95, fontSize: 36, align: "center", valign: "middle", fontFace: "Segoe UI Emoji" });
  L.overview.qa.forEach((qa, i) => { const y = 2.95 + i * 0.95;
    card(s, 0.4, y, 4.4, 0.82, C.teal, C.teal); txt(s, "Q  " + qa[0], { x: 0.55, y, w: 4.15, h: 0.82, fontSize: 12, bold: true, color: "FFFFFF", valign: "middle" });
    card(s, 5.0, y, 4.6, 0.82, "FFFFFF", C.teal3); txt(s, "A  " + qa[1], { x: 5.15, y, w: 4.35, h: 0.82, fontSize: 11.5, valign: "middle" });
  });
}
// 4 핵심 개념
{ const s = pptx.addSlide(); bar(s, `💡  ${L.concept.title}`);
  card(s, 0.4, 0.8, 9.2, 0.85, C.mint3, C.teal3);
  txt(s, "📌 " + L.concept.def, { x: 0.6, y: 0.8, w: 8.8, h: 0.85, fontSize: 13, bold: true, color: C.teal, valign: "middle" });
  const bx = [[C.mint2, C.teal3], [C.yelBg, C.yel], [C.redBg, C.red]];
  L.concept.diagram.forEach((d, i) => { const x = 0.4 + i * 3.2;
    card(s, x, 1.9, 2.8, 2.2, bx[i][0], bx[i][1]);
    txt(s, d.e, { x, y: 2.0, w: 2.8, h: 0.8, fontSize: 30, align: "center", fontFace: "Segoe UI Emoji" });
    txt(s, d.t, { x, y: 2.8, w: 2.8, h: 0.45, fontSize: 14, bold: true, align: "center", color: C.teal });
    txt(s, d.d, { x: x + 0.1, y: 3.25, w: 2.6, h: 0.8, fontSize: 10.5, align: "center", color: C.sub });
    if (i < 2) txt(s, L.concept.ops[i], { x: x + 2.8, y: 2.6, w: 0.4, h: 0.6, fontSize: 24, bold: true, color: C.teal2, align: "center", margin: 0 });
  });
  band(s, "👉  " + L.concept.tip, 4.35);
}
// (v2) 개념 영상
if (HV) { const s = pptx.addSlide(); const v = L.video; bar(s, `🎬  개념 영상 — ${v.title}`);
  card(s, 0.4, 0.8, 4.9, 2.9, C.ink, C.ink);
  txt(s, "▶", { x: 0.4, y: 1.2, w: 4.9, h: 1.2, fontSize: 54, color: "FFFFFF", align: "center", valign: "middle", fontFace: "Segoe UI Emoji" });
  txt(s, "영상 자리 (2~3분)\n🔎 " + v.search, { x: 0.55, y: 2.45, w: 4.6, h: 1.1, fontSize: 11, color: "DDE7EA", align: "center" });
  card(s, 5.5, 0.8, 4.1, 2.9, C.mint2, C.teal3);
  txt(s, "👀  영상에서 이것을 찾아봐요", { x: 5.65, y: 0.85, w: 3.9, h: 0.4, fontSize: 13, bold: true, color: C.teal });
  txt(s, v.watch.map((w, i) => `${i + 1}. ${w}`).join("\n"), { x: 5.65, y: 1.3, w: 3.85, h: 2.3, fontSize: 12, paraSpaceAfter: 6 });
  card(s, 0.4, 3.9, 9.2, 1.3, C.yelBg, C.yel);
  txt(s, "🔗  오늘 우리 작품과 연결", { x: 0.6, y: 3.95, w: 6, h: 0.4, fontSize: 13, bold: true, color: C.yel2 });
  txt(s, v.relation, { x: 0.6, y: 4.33, w: 8.8, h: 0.85, fontSize: 12 });
}
// 5 역할
{ const s = pptx.addSlide(); bar(s, "👥  탐구 — 역할을 나눠봐요");
  card(s, 0.4, 0.75, 9.2, 0.45, C.mint3, C.teal3);
  txt(s, "4명이 색깔 미니피겨로 역할을 나누고, 함께 조립하고 탐구해봐요!", { x: 0.55, y: 0.75, w: 9, h: 0.45, fontSize: 12, bold: true, color: C.teal, valign: "middle" });
  L.roles.forEach((r, i) => { const x = 0.4 + i * 2.33, R = ROLE[i];
    card(s, x, 1.35, 2.15, 2.25, R[3], R[2]);
    txt(s, R[0], { x, y: 1.45, w: 2.15, h: 0.65, fontSize: 28, align: "center", fontFace: "Segoe UI Emoji" });
    txt(s, R[1] + " 미니피겨", { x, y: 2.1, w: 2.15, h: 0.4, fontSize: 13, bold: true, color: R[2], align: "center" });
    txt(s, r, { x: x + 0.1, y: 2.5, w: 1.95, h: 1.0, fontSize: 11, align: "center" });
  });
  card(s, 0.4, 3.8, 9.2, 1.4, "FFFFFF", C.teal3);
  txt(s, "🔍  탐구 미션", { x: 0.6, y: 3.85, w: 4, h: 0.4, fontSize: 13, bold: true, color: C.teal });
  txt(s, L.mission, { x: 0.6, y: 4.25, w: 8.8, h: 0.9, fontSize: 12 });
}
// 6 조립 및 탐구
{ const s = pptx.addSlide(); bar(s, `🔨  조립 및 탐구 — ${L.build1.title}`, V2 ? "12분" : "15분");
  txt(s, `📘 조립설명서 ${L.page}  |  키트 ${L.code}  |  ⚠️ 조립 후 점검 항목을 꼭 확인해요`, { x: 0.4, y: 0.7, w: 9.2, h: 0.35, fontSize: 11, color: C.sub });
  card(s, 0.4, 1.1, 4.5, 3.95, C.mint2, C.teal3);
  txt(s, "✅  조립 점검 항목", { x: 0.55, y: 1.15, w: 4.2, h: 0.4, fontSize: 13, bold: true, color: C.teal });
  txt(s, L.build1.checks.map((c, i) => "①②③④⑤"[i] + " " + c).join("\n"), { x: 0.55, y: 1.55, w: 4.2, h: 3.4, fontSize: 11, paraSpaceAfter: 6 });
  card(s, 5.1, 1.1, 4.5, 2.6, C.yelBg, C.yel);
  txt(s, "🔬  탐구해 볼 것", { x: 5.25, y: 1.15, w: 4.2, h: 0.4, fontSize: 13, bold: true, color: C.yel2 });
  txt(s, L.build1.vars.map((v, i) => `${i + 1}. ${v}`).join("\n"), { x: 5.25, y: 1.55, w: 4.2, h: 2.1, fontSize: 11, paraSpaceAfter: 5 });
  card(s, 5.1, 3.85, 4.5, 1.2, "FFFFFF", C.line);
  txt(s, "🖼️ 완성 모델 사진 자리\n(조립설명서 " + L.page + " 완성 그림을 넣어요)", { x: 5.1, y: 3.85, w: 4.5, h: 1.2, fontSize: 10.5, color: C.sub, align: "center", valign: "middle" });
}
// 7 체험·관찰
{ const s = pptx.addSlide(); bar(s, `🎮  조립 및 탐구 — ${L.explore.title}`);
  card(s, 0.4, 0.8, 9.2, 1.5, C.mint2, C.teal3);
  txt(s, "🕹️  체험 활동", { x: 0.6, y: 0.85, w: 5, h: 0.4, fontSize: 13, bold: true, color: C.teal });
  txt(s, L.explore.activity, { x: 0.6, y: 1.25, w: 8.8, h: 1.0, fontSize: 12 });
  card(s, 0.4, 2.45, 9.2, 1.35, C.yelBg, C.yel);
  txt(s, "📋  관찰하며 기록해요", { x: 0.6, y: 2.5, w: 5, h: 0.4, fontSize: 13, bold: true, color: C.yel2 });
  txt(s, L.explore.observe, { x: 0.6, y: 2.9, w: 8.8, h: 0.85, fontSize: 12 });
  card(s, 0.4, 3.95, 9.2, 1.25, C.redBg, C.red);
  txt(s, L.emoji.slice(0, 2), { x: 0.5, y: 3.95, w: 1, h: 1.25, fontSize: 30, align: "center", valign: "middle", fontFace: "Segoe UI Emoji" });
  txt(s, "생각해보기\n" + L.explore.think, { x: 1.5, y: 3.95, w: 8, h: 1.25, fontSize: 13, bold: true, color: C.red, valign: "middle" });
}
// (v2) 만들기 사진 + 만든 후 활동
if (HA) { const s = pptx.addSlide(); const a = L.after; bar(s, `📸  만든 후 활동 — ${a.title}`, "6분");
  [["🧱", "완성 모델 사진 자리", `조립설명서 ${L.page} 완성 모델`], ["🙌", "활동 장면 사진 자리", "만든 뒤 친구들과 활동하는 모습"]].forEach((ph, i) => { const y = 0.8 + i * 1.75;
    card(s, 0.4, y, 3.6, 1.6, "FFFFFF", C.line);
    txt(s, ph[0], { x: 0.4, y: y + 0.08, w: 3.6, h: 0.6, fontSize: 24, align: "center", fontFace: "Segoe UI Emoji" });
    txt(s, ph[1] + "\n" + ph[2], { x: 0.5, y: y + 0.7, w: 3.4, h: 0.85, fontSize: 10.5, color: C.sub, align: "center" }); });
  card(s, 4.2, 0.8, 5.4, 3.35, C.mint2, C.teal3);
  txt(s, "🎯  만든 다음에 이렇게 해봐요", { x: 4.35, y: 0.85, w: 5.1, h: 0.4, fontSize: 13, bold: true, color: C.teal });
  txt(s, a.steps.map((t, i) => "①②③④⑤"[i] + " " + t).join("\n"), { x: 4.35, y: 1.3, w: 5.1, h: 2.8, fontSize: 12, paraSpaceAfter: 7 });
  band(s, "💡  " + a.goal, 4.4);
}
// 8 설명·공유
{ const s = pptx.addSlide(); bar(s, `📝  설명 · 💬 공유 — ${L.explain.title}`, V2 ? "4분" : "5분");
  L.vocab.slice(0, 2).forEach((v, i) => { const x = 0.4 + i * 4.7;
    card(s, x, 0.8, 4.5, 1.05, C.mint3, C.teal3);
    txt(s, `🔑 ${v.w}`, { x: x + 0.15, y: 0.82, w: 4.2, h: 0.38, fontSize: 13, bold: true, color: C.teal });
    txt(s, v.d, { x: x + 0.15, y: 1.18, w: 4.2, h: 0.65, fontSize: 11 }); });
  L.explain.prompts.forEach((p, i) => { const y = 2.0 + i * 0.6;
    card(s, 0.4, y, 9.2, 0.5, "FFFFFF", C.line); txt(s, "💭  " + p, { x: 0.55, y, w: 9, h: 0.5, fontSize: 12, valign: "middle" }); });
  L.explain.qa.forEach((qa, i) => { const x = 0.4 + i * 4.7;
    card(s, x, 3.9, 4.5, 1.3, C.yelBg, C.yel);
    txt(s, "Q  " + qa[0], { x: x + 0.12, y: 3.93, w: 4.25, h: 0.5, fontSize: 11, bold: true, color: C.yel2 });
    txt(s, "A  " + qa[1], { x: x + 0.12, y: 4.4, w: 4.25, h: 0.78, fontSize: 10.5 }); });
}
// 9 조립② 확장 설계
{ const s = pptx.addSlide(); bar(s, `🔨  조립② — ${L.build2.title}`, V2 ? "6분" : "10분");
  card(s, 0.4, 0.8, 9.2, 0.9, C.mint2, C.teal3);
  txt(s, L.build2.prompt, { x: 0.6, y: 0.8, w: 8.8, h: 0.9, fontSize: 13, bold: true, color: C.teal, valign: "middle" });
  const bx = [[C.mint2, C.teal3], [C.yelBg, C.yel], [C.redBg, C.red], [C.orgBg, C.org]];
  L.build2.options.forEach((o, i) => { const x = 0.4 + i * 2.33;
    card(s, x, 1.9, 2.15, 2.0, bx[i][0], bx[i][1]);
    txt(s, o.e, { x, y: 2.0, w: 2.15, h: 0.8, fontSize: 30, align: "center", fontFace: "Segoe UI Emoji" });
    txt(s, o.t, { x: x + 0.08, y: 2.85, w: 2.0, h: 0.95, fontSize: 11.5, bold: true, align: "center" }); });
  band(s, "💡  " + L.build2.tip, 4.15);
}
// 10 조립 모델 공유
{ const s = pptx.addSlide(); bar(s, "🗣️  조립 모델 공유 — 우리 모델을 소개해요");
  card(s, 0.4, 0.8, 9.2, 1.25, C.mint2, C.teal3);
  txt(s, "🎤  발표 문장으로 말해봐요", { x: 0.6, y: 0.83, w: 6, h: 0.4, fontSize: 13, bold: true, color: C.teal });
  txt(s, L.share.say, { x: 0.6, y: 1.22, w: 8.8, h: 0.8, fontSize: 12.5 });
  txt(s, "✅  이해도 점검", { x: 0.4, y: 2.2, w: 6, h: 0.4, fontSize: 13, bold: true, color: C.teal });
  L.share.scale.forEach((t, i) => { const y = 2.65 + i * 0.83;
    card(s, 0.4, y, 9.2, 0.72, ["FFFFFF", C.mint2, C.yelBg][i], [C.line, C.teal3, C.yel][i]);
    txt(s, "⭐".repeat(i + 1), { x: 0.55, y, w: 1.3, h: 0.72, fontSize: 15, valign: "middle", fontFace: "Segoe UI Emoji" });
    txt(s, t, { x: 1.85, y, w: 7.6, h: 0.72, fontSize: 12, valign: "middle" }); });
}
// 11 실생활
{ const s = pptx.addSlide(); bar(s, `🌍  실생활 예시 — ${L.real.title}`);
  card(s, 0.4, 0.8, 3.4, 4.35, C.mint2, C.teal3);
  txt(s, L.real.emoji, { x: 0.4, y: 1.1, w: 3.4, h: 1.4, fontSize: 44, align: "center", fontFace: "Segoe UI Emoji" });
  txt(s, L.real.text, { x: 0.6, y: 2.6, w: 3.0, h: 2.4, fontSize: 11.5, align: "center" });
  card(s, 4.0, 0.8, 5.6, 4.35, "FFFFFF", C.teal3);
  txt(s, "🤔  연결해서 생각해보기", { x: 4.2, y: 0.88, w: 5, h: 0.4, fontSize: 13, bold: true, color: C.teal });
  L.real.points.forEach((p, i) => { const y = 1.4 + i * 1.2;
    card(s, 4.2, y, 5.2, 1.05, [C.mint3, C.yelBg, C.redBg][i], [C.teal3, C.yel, C.red][i]);
    txt(s, "•  " + p, { x: 4.35, y, w: 5, h: 1.05, fontSize: 12, valign: "middle" }); });
}
// 12 평가
{ const s = pptx.addSlide(); bar(s, "📝  평가 — 배운 내용 보여주기", "5분");
  card(s, 0.4, 0.8, 9.2, 1.6, C.mint2, C.teal3);
  txt(s, L.emoji.slice(0, 2), { x: 0.5, y: 0.8, w: 1.1, h: 1.6, fontSize: 32, align: "center", valign: "middle", fontFace: "Segoe UI Emoji" });
  txt(s, L.eval.q, { x: 1.6, y: 0.8, w: 7.8, h: 1.6, fontSize: 14, bold: true, color: C.teal, valign: "middle" });
  txt(s, "평가 관점", { x: 0.4, y: 2.55, w: 4, h: 0.4, fontSize: 13, bold: true, color: C.yel2 });
  L.eval.points.forEach((p, i) => { const y = 3.0 + i * 0.72;
    card(s, 0.4, y, 9.2, 0.6, C.yelBg, C.yel); txt(s, "✔️  " + p, { x: 0.55, y, w: 9, h: 0.6, fontSize: 12, valign: "middle" }); });
}
// 13 정리
{ const s = pptx.addSlide(); bar(s, V2 ? "🎉  오늘 배운 개념 마무리" : "🎉  오늘 배운 내용, 다시 한 번");
  const bx = [[C.mint2, C.teal3, C.teal], [C.yelBg, C.yel, C.yel2], [C.redBg, C.red, C.red]];
  L.summary.forEach((m, i) => { const x = 0.4 + i * 3.1;
    card(s, x, 0.85, 2.95, 2.9, bx[i][0], bx[i][1]);
    txt(s, m.e, { x, y: 1.0, w: 2.95, h: 0.8, fontSize: 32, align: "center", fontFace: "Segoe UI Emoji" });
    txt(s, m.t, { x, y: 1.85, w: 2.95, h: 0.5, fontSize: 15, bold: true, color: bx[i][2], align: "center" });
    txt(s, m.d, { x: x + 0.12, y: 2.35, w: 2.7, h: 1.3, fontSize: 11, align: "center" }); });
  band(s, "🔑  핵심 낱말:  " + vocabLine, 3.95);
  txt(s, L.wrap ? `💬 ${L.wrap}   수고했어요! 👏` : "수고했어요! 👏", { x: 0.4, y: 4.45, w: 9.2, h: 0.65, fontSize: L.wrap ? 14 : 18, bold: true, color: C.teal, align: "center", valign: "middle" });
}

/* ================= DOCX helpers ================= */
const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, ShadingType, AlignmentType, BorderStyle, HeightRule } = D;
const PW = 10466; // A4 - margins (dxa) with 720 margins
const r = (t, o = {}) => new TextRun(Object.assign({ text: t, font: F, size: o.size || 19, color: o.color || "2D2A4A" }, o));
const P = (t, o = {}) => new Paragraph({ spacing: { before: o.before ?? 40, after: o.after ?? 40 }, alignment: o.align, children: Array.isArray(t) ? t : [r(t, o)] });
const bd = c => ({ top: { style: BorderStyle.SINGLE, size: 6, color: c }, bottom: { style: BorderStyle.SINGLE, size: 6, color: c }, left: { style: BorderStyle.SINGLE, size: 6, color: c }, right: { style: BorderStyle.SINGLE, size: 6, color: c } });
function cell(ch, o = {}) { return new TableCell({ width: { size: o.w || PW, type: WidthType.DXA }, shading: o.fill ? { type: ShadingType.CLEAR, color: "auto", fill: o.fill } : undefined, borders: bd(o.border || "B7CFD1"), margins: { top: 70, bottom: 70, left: 110, right: 110 }, verticalAlign: o.va, children: (Array.isArray(ch) ? ch : [ch]).map(x => typeof x === "string" ? P(x, o.text || {}) : x) }); }
function table(rows, widths, o = {}) { return new Table({ width: { size: widths.reduce((a, b) => a + b, 0), type: WidthType.DXA }, columnWidths: widths, rows: rows.map((rw, ri) => new TableRow({ cantSplit: true, height: o.heights ? { value: o.heights[ri] || o.heights[0], rule: HeightRule.ATLEAST } : undefined, children: rw.map((c, ci) => c instanceof TableCell ? c : cell(c, Object.assign({ w: widths[ci] }, (o.head && ri === 0) ? { fill: o.headFill || C.teal, text: { color: "FFFFFF", bold: true } } : (o.cellOpt ? o.cellOpt(ri, ci) : {})))) })) }); }
function box(title, lines, fill, border, tcolor) { return table([[cell([P([r(title, { bold: true, color: tcolor || C.teal2 })]), ...lines.map(l => P(l))], { fill, border, w: PW })]], [PW]); }
const gap = (n = 60) => new Paragraph({ spacing: { before: 0, after: n }, children: [] });
function sectionBar(t, fill = C.teal) { return table([[cell(P([r(t, { bold: true, color: "FFFFFF", size: 21 })]), { fill, border: fill, w: PW })]], [PW]); }
const talk = l => box("👩‍🏫  교사 발화", l.map(x => `"${x}"`), C.mint3, C.teal3);
const react = l => box("🙋  예상 학생 반응", l.map(x => "• " + x), "F1F8EC", "A9CC8E", "3F6F2A");
const tip = l => box("💡  지도 포인트", l.map(x => "• " + x), C.yelBg2, "E8C77A", "C07820");
const qa2 = q => table(q.map(([a, b]) => [cell(P([r("Q  ", { bold: true, color: C.teal2 }), r(a)]), { fill: C.mint2, w: PW / 2 }), cell(P([r("A  ", { bold: true, color: "C07820" }), r(b)]), { w: PW / 2 })]), [PW / 2, PW / 2]);
const step = t => P([r(t, { bold: true, size: 21, color: C.teal })], { before: 160, after: 60 });
const doc = (children) => new Document({ styles: { default: { document: { run: { font: F, size: 19 } } } }, sections: [{ properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 720, bottom: 720, left: 720, right: 720 } } }, children }] });

/* ================= 상세 강의 지도안 ================= */
const T = L.plan; L.sheet.evalNo = V2 ? 4 + L.sheet.ox.length + L.sheet.mc.length : 7 + L.sheet.predict.length + L.sheet.apply.length;
const SL = (...a) => a.map(sn).join("·");
const planKids = [
  P([r(`${L.title} (${L.en}) ${L.code}`, { bold: true, size: 34, color: C.teal })], { align: AlignmentType.CENTER, after: 40 }),
  P([r(`상세 강의 지도안  (교안 ${NS}슬라이드 기준)`, { bold: true, size: 24, color: C.teal2 })], { align: AlignmentType.CENTER }),
  P([r(`레고 에듀케이션 사이언스 11+  |  ${L.unit}  |  라온반 온돌봄  |  박수나  |  ${L.no}차시`, { size: 18, color: C.sub })], { align: AlignmentType.CENTER, after: 120 }),
  table([
    ["수업일시", `2026. ${L.date.replace("/", ". ")}. (       )`, "지도강사", "박수나"],
    ["대상", "초등 고학년  |  라온반 온돌봄  |  4인 1조", "수업 시간", V2 ? "45분 (도입 7 + 전개 28 + 정리 10)" : "45분 (도입 5 + 전개 30 + 정리 10)"],
    ["키트", `${L.code}  |  조립설명서 ${L.page}`, "핵심 어휘", L.vocab.map(v => `${v.w}`).join(", ")]],
    [1300, 3933, 1300, 3933], { cellOpt: (ri, ci) => ci % 2 === 0 ? { fill: "D9D9D9", text: { bold: true } } : {} }),
  gap(120),
  table([[cell(P([r("【 학습 목표 — 교안 슬라이드 2 기준 】", { bold: true, color: C.teal })]), { fill: C.mint, w: 7466 }), cell(P([r("관련 슬라이드", { bold: true, color: C.teal })]), { fill: C.mint, w: 3000 })],
    ...L.goals.map((g, i) => ["①②③"[i] + " " + g.d, g.slides])], [7466, 3000]),
  gap(160),
  sectionBar(V2 && HV ? "▶  도입  (7분)  |  슬라이드 1~5" : "▶  도입  (5분)  |  슬라이드 1~4"),
  step("① 인사 및 분위기 조성  [슬라이드 1]"), talk(T.s1), gap(), react(T.s1react),
  step("② 개요 발문  [슬라이드 3·4]"), talk(T.s3), gap(), qa2(L.overview.qa), gap(), tip(T.s3tip),
  step("③ 학습 목표 안내  [슬라이드 2]"), talk(["오늘 수업 후 세 가지를 할 수 있어야 해요.", ...L.goals.map((g, i) => `${["첫째", "둘째", "셋째"][i]}, ${g.d}`)]),
  ...(HV ? [step("🎬 개념 영상 보기 + 오늘 작품과 연결  ⏱ 2분  [슬라이드 5]"), talk(L.video.talk), gap(), box("🔎  영상 준비 (교사 참고)", [`검색어: ${L.video.search}`, "2~3분 길이, 광고·댓글이 보이지 않게 전체 화면으로 틀어요. 수업 전 꼭 미리 보고 고르세요.", ...L.video.watch.map((w, i) => `확인 ${i + 1}. ${w}`)], "FFFFFF", C.teal3), gap(), tip([L.video.relation])] : []),
  gap(160),
  sectionBar(V2 ? `▶  전개  (28분)  |  슬라이드 ${sn(5)}~${sn(10)}` : "▶  전개  (30분)  |  슬라이드 5~10"),
  step(`【 활동 1 】 역할 나누기 + 조립 및 탐구  ⏱ ${V2 ? 12 : 15}분  [슬라이드 ${SL(5, 6, 7)}]`), talk(T.a1),
  gap(), box("📋  조립 점검 순서  (교사 체크리스트)", L.build1.checks.map((c, i) => "①②③④⑤"[i] + " " + c), "FFFFFF", C.teal3),
  gap(), table([[cell([P([r("🔬  탐구해 볼 것", { bold: true, color: C.teal2 })]), ...L.build1.vars.map((v, i) => P(`• ${"①②③④"[i]} ${v}`))], { fill: C.mint2, w: PW / 2 }),
    cell([P([r("⚠️  지도 주의사항", { bold: true, color: C.red })]), ...T.cautions.map(v => P("• " + v))], { fill: C.redBg, border: "F0B3A8", w: PW / 2 })]], [PW / 2, PW / 2]),
  gap(), tip(T.a1tip),
  ...(HA ? [step(`【 활동 1-2 】 만든 후 활동 — ${L.after.title}  ⏱ 6분  [슬라이드 ${sn(7) + 1}]`), talk(L.after.talk), gap(), box("🎯  활동 순서", L.after.steps.map((t, i) => "①②③④⑤"[i] + " " + t), C.mint2, C.teal3), gap(), tip([L.after.goal, "완성 모델과 활동 장면을 사진으로 찍어 두면 다음 시간 도입과 학부모 안내에 쓸 수 있어요."])] : []),
  step(`【 활동 2 】 설명 + 공유 — 핵심 어휘 정리  ⏱ ${V2 ? 4 : 5}분  [슬라이드 ${sn(8)}]`), talk(T.a2), gap(), qa2(L.explain.qa), gap(), tip(T.a2tip),
  step(`【 활동 3 】 조립② 확장 설계 + 공유  ⏱ ${V2 ? 6 : 10}분  [슬라이드 ${SL(9, 10)}]`), talk(T.a3), gap(),
  box("📊  이해도 척도 확인 포인트", L.share.scale.map((t, i) => "⭐".repeat(i + 1) + "  " + t), "F3EEFB", "C8B6E6", "6A4FA0"),
  gap(160),
  sectionBar(`▶  정리  (10분)  |  슬라이드 ${SL(11, 12, 13)}`),
  step(`④ 실생활 연결  [슬라이드 ${sn(11)}]`), talk(T.real), gap(), react(T.realreact),
  step(`⑤ 평가  [슬라이드 ${sn(12)}]`), talk([`마지막 질문이에요 — 활동지 ${L.sheet.evalNo}번에 써봐요!`, L.eval.q]), gap(),
  box("📝  평가 모범 답안  (교사 참고)", [L.eval.model], "FFFFFF", "E8C77A", "C07820"),
  step(`⑥ 개념 마무리  [슬라이드 ${sn(13)}]`), talk(L.wrap ? [...T.end.slice(0, -1), `오늘의 핵심 문장! "${L.wrap}"`, T.end[T.end.length - 1]] : T.end),
  gap(160), sectionBar("▶  평가 기준표"), gap(60),
  table([["수준", "척도", "평가 기준"], ["매우 잘함", "⭐⭐⭐", T.rubric[0]], ["잘함", "⭐⭐", T.rubric[1]], ["노력 필요", "⭐", T.rubric[2]]], [1500, 1200, 7766], { head: true }),
  gap(160), sectionBar("▶  수업 유의사항 및 팁"), gap(60),
  box("📌  꼭 챙겨요", T.notes, C.mint2, C.teal3),
  gap(120), P([r("참고: 레고 에듀케이션 사이언스 수업 안내(공개 개요) " + L.source + " — 내용은 우리 수업에 맞게 다시 썼어요.", { size: 15, color: C.sub })]),
];

/* ================= 학생 활동지 ================= */
const S = L.sheet; let n = 0;
const q = t => P([r(`${++n}. `, { bold: true, color: C.teal }), r(t)], { before: 120, after: 60 });
const writeBox = (h = 900) => table([[cell("", { w: PW, border: "9FC3C6" })]], [PW], { heights: [h] });
const secCols = [C.teal, C.red, C.yel2, C.teal2, "D97B2B", C.teal];
let si = 0; const sec = t => [gap(120), sectionBar(t, secCols[si++ % secCols.length]), gap(40)];
const sheetKidsV1 = () => [
  P([r("LEGO SCIENCE · 학생 활동지", { bold: true, size: 17, color: C.yel2 })], { align: AlignmentType.CENTER }),
  P([r(`${L.title}`, { bold: true, size: 40, color: C.teal })], { align: AlignmentType.CENTER, after: 100 }),
  table([["모둠", "", "이름", ""]], [1300, 3933, 1300, 3933], { cellOpt: (ri, ci) => ci % 2 === 0 ? { fill: C.teal, text: { color: "FFFFFF", bold: true } } : {}, heights: [480] }),
  gap(100),
  P([r(L.emoji.slice(0, 2) + " 오늘의 미션", { bold: true, color: C.teal, size: 21 })]),
  P(S.mission),
  ...sec("📘  개념 확인 — 오늘 낱말을 정리해봐요"),
  q("알맞은 것끼리 줄로 이어보세요."),
  table([["낱말", "", "뜻"], ...L.vocab.map((v, i) => [v.w, "", S.matchOrder[i]])], [2200, 2800, 5466], { head: true, cellOpt: (ri, ci) => ci === 0 ? { text: { bold: true, align: AlignmentType.CENTER } } : {} }),
  q("빈칸에 알맞은 낱말을 써넣어 문장을 완성해보세요."),
  table([[S.blank]], [PW]),
  ...sec("🔍  활동 1 — 탐구 전 예측해보기"),
  ...S.predict.flatMap(t => [q(t), writeBox(800)]),
  ...sec(`🧱  활동 2 — 조립① 기록표 (${L.build1.title})`),
  q("우리 모둠의 역할과 담당 내용, 담당자 이름을 적어보세요."),
  table([["역할", "담당 내용", "담당자"], ...L.roles.map((rr, i) => [ROLE[i][0] + " " + ROLE[i][1], rr, ""])], [1800, 5666, 3000], { head: true, cellOpt: (ri, ci) => ci === 0 ? { fill: ROLE[ri - 1][3], text: { bold: true, color: ROLE[ri - 1][2] } } : {} }),
  q(S.record.q),
  table([S.record.head, ...S.record.rows.map(rw => [rw, ...S.record.head.slice(1).map(() => "")])], S.record.head.map((_, i, a) => i === 0 ? 2600 : Math.floor((PW - 2600) / (a.length - 1))), { head: true, heights: [400, 700], cellOpt: (ri, ci) => ci === 0 ? { fill: C.mint2, text: { bold: true } } : {} }),
  ...sec("📏  활동 3 — 개념 적용하기"),
  ...S.apply.flatMap(t => [q(t), writeBox(800)]),
  ...sec(`♻️  활동 4 — 조립② 설계 (${L.build2.title})`),
  q(S.design),
  table([["우리 설계 이름", ""], ["반영한 점", ""]], [2600, 7866], { heights: [520], cellOpt: (ri, ci) => ci === 0 ? { fill: C.mint2, text: { bold: true } } : {} }),
  q("완성한 모델을 그려보세요."), writeBox(2600),
  ...sec("✍️  활동 5 — 오늘 배운 내용 한 문장으로 쓰기"),
  q(L.eval.q), writeBox(1100),
  ...sec("🎯  마무리 퀴즈"),
  ...S.ox.flatMap(o => [q(`(O / X)  ${o[0]}`), P([r(`정답: ${o[1]}  —  ${o[2]}`, { size: 16, color: C.sub })])]),
  ...S.mc.flatMap(o => [q(o.q), P(o.c.map((c, i) => "①②③④"[i] + " " + c).join("     ")), P([r(`정답: ${"①②③④"[o.a]}  —  ${o.why}`, { size: 16, color: C.sub })])]),
  ...sec("⭐  스스로 점검"),
  table([["점검 항목", "😊", "😐", "😢"], ...S.self.map(t => [t, "", "", ""])], [7366, 1033, 1033, 1034], { head: true, heights: [400, 520] }),
];
// v2 활동지: 수업 끝에 간단히 마무리하는 용도 (개념 확인 → 기록 → 마무리 퀴즈 → 한 문장 → 점검, 정답은 맨 뒤 선생님용)
const sheetKidsV2 = () => [
  P([r("LEGO SCIENCE · 마무리 활동지", { bold: true, size: 17, color: C.yel2 })], { align: AlignmentType.CENTER }),
  P([r(`${L.title}`, { bold: true, size: 40, color: C.teal })], { align: AlignmentType.CENTER, after: 100 }),
  table([["모둠", "", "이름", ""]], [1300, 3933, 1300, 3933], { cellOpt: (ri, ci) => ci % 2 === 0 ? { fill: C.teal, text: { color: "FFFFFF", bold: true } } : {}, heights: [480] }),
  gap(100),
  P([r(L.emoji.slice(0, 2) + " 오늘의 미션", { bold: true, color: C.teal, size: 21 })]),
  P(S.mission),
  ...sec("📘  개념 확인 — 오늘 낱말"),
  q("알맞은 것끼리 줄로 이어보세요."),
  table([["낱말", "", "뜻"], ...L.vocab.map((v, i) => [v.w, "", S.matchOrder[i]])], [2200, 2800, 5466], { head: true, cellOpt: (ri, ci) => ci === 0 ? { text: { bold: true, align: AlignmentType.CENTER } } : {} }),
  q("빈칸에 알맞은 낱말을 써넣어 보세요."),
  table([[S.blank]], [PW]),
  ...sec(`🧱  우리 작품 기록 (${L.build1.title})`),
  q(S.record.q),
  table([S.record.head, ...S.record.rows.map(rw => [rw, ...S.record.head.slice(1).map(() => "")])], S.record.head.map((_, i, a) => i === 0 ? 2600 : Math.floor((PW - 2600) / (a.length - 1))), { head: true, heights: [400, 640], cellOpt: (ri, ci) => ci === 0 ? { fill: C.mint2, text: { bold: true } } : {} }),
  ...sec("🎯  마무리 퀴즈"),
  ...S.ox.map(o => q(`${o[0]}        ( O  /  X )`)),
  ...S.mc.flatMap(o => [q(o.q), P(o.c.map((c, i) => "①②③④"[i] + " " + c).join("     "))]),
  ...sec("✍️  오늘 배운 개념 한 문장으로"),
  q(L.eval.q), writeBox(1000),
  ...sec("⭐  스스로 점검"),
  table([["점검 항목", "😊", "😐", "😢"], ...S.self.map(t => [t, "", "", ""])], [7366, 1033, 1033, 1034], { head: true, heights: [400, 480] }),
  gap(200),
  P([r("✂ ─ ─ ─ ─ 선생님용 정답과 해설 (나눠 줄 때는 이 아래를 잘라요) ─ ─ ─ ─", { size: 15, color: C.sub })], { align: AlignmentType.CENTER }),
  P([r(`${3 + 1}~${3 + S.ox.length}번 OX: ` + S.ox.map(o => `${o[1]}(${o[2]})`).join("  /  "), { size: 15, color: C.sub })]),
  P([r(`${4 + S.ox.length}~${3 + S.ox.length + S.mc.length}번: ` + S.mc.map(o => `${"①②③④"[o.a]}(${o.why})`).join("  /  "), { size: 15, color: C.sub })]),
  P([r(`${L.sheet.evalNo}번 예시 답: ${L.eval.model}`, { size: 15, color: C.sub })]),
];
const sheetKids = V2 ? sheetKidsV2() : sheetKidsV1();

(async () => {
  const sheetDoc = doc(sheetKids);
  fs.writeFileSync(path.join(OUT, base + "_학생활동지.docx"), await Packer.toBuffer(sheetDoc));
  fs.writeFileSync(path.join(OUT, base + "_상세강의지도안.docx"), await Packer.toBuffer(doc(planKids)));
  await pptx.writeFile({ fileName: path.join(OUT, base + "_교안.pptx") });
  console.log("done", base, "evalNo", L.sheet.evalNo, "n", n);
})();
