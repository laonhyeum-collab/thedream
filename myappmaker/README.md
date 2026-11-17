# 📱 MY APP MAKER

아이들이 **게임 앱을 직접 기획**하고, **AI와 함께 만들어**, **메타버스 앱 월드에 부스로 여는** 40분 × 4차시 프로젝트 도구입니다.

세 앱은 **폴더로 완전히 나뉘어** 있고, 서로의 코드를 가져다 쓰지 않습니다(공통 부분은 `shared/`에만). 기기에 저장하는 이름도 `myappmaker.student.*` / `teacher.*` / `world.*` 로 따로 써서, 한 기기에서 여러 앱을 열어도 섞이지 않습니다. (`npm test`가 이 규칙을 검사합니다.)

| 앱 (주소) | 누가 | 하는 일 |
|---|---|---|
| [`student/`](student/) | 학생 | 하고 싶은 게임을 말하면 주제 추천(안전 필터·배움 요소) → 기획서(15개 항목, 자동 저장) → 앱 제작·이미지 프롬프트 → 내 앱 붙여 넣고 시험 → 입점 신청 |
| [`teacher/`](teacher/) | 교사 | 제출 현황·기획서·앱 실행 확인 → 피드백, 입점 승인/수정 요청, 부스 번호 → 일괄 인쇄·백업 · 4차시 수업 흐름과 타이머 |
| [`world/`](world/) | 모두 | 아바타로 걸어 다니며 친구 부스에 들어가 앱 체험, 좋아요 |
| [`index.html`](index.html) | — | 세 앱으로 가는 첫 화면 (링크만 있음) |

- 기획서 검토 의견과 4차시 조정안: [`docs/기획서_검토.md`](docs/기획서_검토.md)
- 프로젝트 설명 발표 자료: [`slides/MY_APP_MAKER_프로젝트_소개.pptx`](slides/MY_APP_MAKER_프로젝트_소개.pptx)
- 우리 반 저장소(선택) 설치: [`backend/README.md`](backend/README.md)

## 주제 추천과 안전 규칙 (`shared/recommend.js`)

학생이 좋아하는 것이나 만들고 싶은 게임을 쓰거나(🎤 말해도 됨) 「주제 추천받기」를 누르면, 28가지 관심 분야의 84개 주제 가운데 알맞은 것을 추천합니다.

| 학생이 말한 것 | 앱이 하는 일 |
|---|---|
| 이미 있는 게임·유명 캐릭터 (마인크래프트, 포켓몬 등) | 그대로 추천하지 않고, 좋아한 점(블록 쌓기, 도감 채우기 등)만 살린 나만의 주제로 바꿈 |
| 초등학생에게 알맞지 않은 폭력 (죽이기, 총, 피 등) | 그 말을 빼고 구하고·지키고·피하는 평화로운 주제로 바꿈 |
| 학교에서 만들 수 없는 내용 (도박, 성인, 약물 등) | 추천하지 않음 |
| 배움 요소 | 모든 추천 주제에 붙어 있고, 배움 요소가 없는 주제는 보여 주지 않음 |

기획서에 위와 같은 말이 들어가면 「3. 프롬프트」에서 고칠 항목을 알려 주고, 고칠 때까지 프롬프트 복사가 막힙니다. 교사 앱에도 「확인 필요」로 표시됩니다.

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

빌드가 필요 없는 정적 사이트입니다. `main`에 올라가면 `.github/workflows/pages.yml` 이 `index.html`·`student/`·`teacher/`·`world/`·`shared/` 를 GitHub Pages 로 자동 배포합니다.
(처음 한 번: 저장소 **Settings → Pages → Source 를 "GitHub Actions"** 로 설정)
아래 주소로 열립니다.

| 앱 | 주소 |
|---|---|
| 첫 화면 | `https://laonhyeum-collab.github.io/thedream/myappmaker/` |
| 학생 앱 | `https://laonhyeum-collab.github.io/thedream/myappmaker/student/` |
| 교사 앱 | `https://laonhyeum-collab.github.io/thedream/myappmaker/teacher/` |
| 앱 월드 | `https://laonhyeum-collab.github.io/thedream/myappmaker/world/` |

 학교 서버·다른 정적 호스팅에 `myappmaker/` 폴더를 그대로 올려도 됩니다.
(앱 월드의 무궁화 샘플 부스는 저장소의 `mugunghwa/` 를 쓰므로 두 폴더를 같이 올려 주세요.)

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
├── index.html             첫 화면 (세 앱으로 가는 링크만)
├── student/               🧒 학생 앱 — 이 폴더만으로 학생 화면 완성
│   ├── index.html · student.css · student.js
│   └── store.js           기획서 자동 저장 (학생 앱 전용)
├── teacher/               🧑‍🏫 교사 앱
│   ├── index.html · teacher.css · teacher.js
│   └── lesson.js          4차시 수업 흐름 (교사 앱 전용)
├── world/                 🌏 앱 월드 (메타버스)
│   ├── index.html · world.css · world.js
│   ├── worldmap.js        부스 배치·충돌 (앱 월드 전용)
│   └── samples/           체험용 샘플 부스 앱 2개
├── shared/                세 앱 공통 (앱 폴더를 참조하지 않음)
│   ├── config.js          선생님이 저장소 주소·반 코드를 적는 곳 (선택)
│   ├── common.css · ui.js · files.js
│   ├── topics.js          20개 기본 게임 방식
│   ├── recommend.js       관심사 → 주제 추천 + 안전 필터
│   ├── plan.js            기획서 15개 항목 · 프롬프트 만들기 (학생이 쓰고 교사가 읽음)
│   ├── api.js             우리 반 저장소와 통신 (연결 설정은 앱마다 따로 저장)
│   └── sandbox.js         학생 앱 격리 실행
├── backend/Code.gs        우리 반 저장소 (Google Apps Script)
├── slides/                발표 자료와 생성 스크립트
├── docs/                  기획서 검토
└── tests/                 단위·분리 규칙·백엔드·브라우저 시험, 개발 서버
```
