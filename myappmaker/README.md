# 📱 MY APP MAKER

아이들이 **게임 앱을 직접 기획**하고, **AI와 함께 만들어**, **메타버스 앱 월드에 부스로 여는** 40분 × 4차시 프로젝트 도구입니다.

| 화면 | 누가 | 하는 일 |
|---|---|---|
| [`student.html`](student.html) | 학생 | 20개 주제 미리보기 → 기획서(15개 항목, 자동 저장) → 앱 제작·이미지 프롬프트 → 내 앱 붙여 넣고 시험 → 입점 신청 |
| [`teacher.html`](teacher.html) | 교사 | 제출 현황·기획서·앱 실행 확인 → 피드백, 입점 승인/수정 요청, 부스 번호 → 일괄 인쇄·백업 · 4차시 수업 흐름과 타이머 |
| [`world.html`](world.html) | 모두 | 아바타로 걸어 다니며 친구 부스에 들어가 앱 체험, 좋아요 |
| [`index.html`](index.html) | — | 세 화면으로 가는 첫 화면 |

- 기획서 검토 의견과 4차시 조정안: [`docs/기획서_검토.md`](docs/기획서_검토.md)
- 프로젝트 설명 발표 자료: [`slides/MY_APP_MAKER_프로젝트_소개.pptx`](slides/MY_APP_MAKER_프로젝트_소개.pptx)
- 우리 반 저장소(선택) 설치: [`backend/README.md`](backend/README.md)

## 흐름

```
학생 앱 ──(선생님께 보내기)──▶ 우리 반 저장소 (구글 시트+드라이브) ◀── 교사 앱 (승인·부스)
   │                                   │
   └─(저장소가 없으면) 제출 파일 ──▶ 교사 앱 ──▶ 메타버스 파일 ──▶ 앱 월드
                                       ▼
                               앱 월드 (승인한 앱만 부스로)
```

- 학생 앱(AI가 만든 HTML)은 앱 월드·교사 앱 안에서 **격리된 상자(iframe sandbox)**로 실행되어 이 사이트의 저장소·다른 학생 데이터에 접근할 수 없습니다.
- 저장소가 연결되지 않으면 앱 월드는 **체험용 샘플 부스 3개**(과일 바구니, 동물 짝꿍 카드, 무궁화 꽃이 피었습니다)로 열립니다.

## 올리기 (GitHub Pages 예)

빌드가 필요 없는 정적 사이트입니다. 저장소 **Settings → Pages → Branch: main / root** 로 켜면
`https://<계정>.github.io/thedream/myappmaker/` 에서 열립니다. 학교 서버·다른 정적 호스팅에 `myappmaker/` 폴더를 그대로 올려도 됩니다.
(무궁화 샘플 부스는 `../mugunghwa/` 를 쓰므로 두 폴더를 같이 올려 주세요.)

## 내 컴퓨터에서

```bash
cd myappmaker
npm start          # 사이트 + 가짜 우리 반 저장소 (http://localhost:8090) — 반 코드 TEST-CLASS / 교사 열쇠 TEST-TEACHER
npm test           # 주제·기획서·프롬프트·저장·월드 배치 + Code.gs(가짜 Apps Script 위에서) 시험
npm run e2e        # 진짜 브라우저로 학생→교사→월드 전체 흐름 (Playwright + Chromium)
npm run slides     # 발표 자료 다시 만들기 (pptxgenjs)
```

## 파일

```
myappmaker/
├── index.html · student.html · teacher.html · world.html
├── config.js          선생님이 저장소 주소·반 코드를 적는 곳 (선택)
├── css/               공통·학생·교사·월드 꾸미기
├── js/
│   ├── topics.js      20개 주제 (미리보기 내용 포함)
│   ├── plan.js        기획서 15개 항목 정의 · 앱 제작/이미지/고쳐 줘 프롬프트
│   ├── lesson.js      4차시 수업 흐름 (교사 앱·발표 자료가 함께 씀)
│   ├── store.js       이 기기 자동 저장 · 파일 내려받기/올리기
│   ├── api.js         우리 반 저장소와 통신
│   ├── sandbox.js     학생 앱 격리 실행
│   ├── worldmap.js    앱 월드 부스 배치·충돌
│   ├── student.js · teacher.js · world.js · ui.js
├── backend/Code.gs    우리 반 저장소 (Google Apps Script)
├── samples/           체험용 샘플 앱 2개
├── slides/            발표 자료와 생성 스크립트
├── docs/              기획서 검토
└── tests/             단위·백엔드·브라우저 시험, 개발 서버
```
