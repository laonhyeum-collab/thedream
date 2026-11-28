# AI 사무실 인수인계 (새 채팅창에서 이어 하기)

새 채팅창에서 이렇게 시작하면 돼요:
> "ai-office/HANDOFF.md 읽고 AI 사무실 관리 이어서 해줘"

이 파일은 `ccr-8a446f2b-ewnnm3` 브랜치에 있어요(그 전 판: `ccr-66f2298d-7em7xh`). 2026-11-27 재설계 전의 긴 기록은 `ccr-da84d6ad-xl0g9k` 브랜치에 있어요.

## 핵심 위치
- 사무실 페이지: https://claude.ai/artifact/VfA5m37psAvPz4w1SzYFid (소스: `ai-office/index.html`)
- 데이터(DB): tasks, notices, imageReqs, classes, meetings, docs, apps, schedule, qna, office/state, config/*
- 규칙: DB `config/rules` 한 장(부서별 제작 기준과 금지사항만). 예전 규칙 원문은 `ai-office/archive/`에 있어요.
- main에 직접 push 금지, 강제 push·브랜치 삭제 금지.

## 설계 원칙 (2026-11-27 재설계)
문제가 생기면 규칙·상태·화면을 더하지 않고 빼거나 합쳐요. 순서와 흐름은 글로 된 규칙이 아니라 **화면 코드**와 **정기 세션 지침 한 곳**에서 정해요.

### 업무 상태: 5개 + 깃발 2개
| 화면 표시 | status | 뜻 |
|---|---|---|
| 할 일 | approved | 아직 시작 안 함 |
| 하는 중 | doing | 세션이 작업 중이거나 다음 세션이 이어받을 일 |
| 대표님 확인 | confirm / proposed(기획안) | 대표님 컨펌·결재 차례 |
| 끝 | done / rejected | 끝남 |
| 보류 | hold | 대표님이 다시 진행을 누를 때까지 손대지 않음 |

- 깃발 `urgent`(🔥): 바로 깨우기. 목록 맨 앞.
- 깃발 `fix`(고칠 것): 대표님 수정·반려 메모와 💬 코멘트가 여기에 쌓여요. 직원은 fix에 적힌 것만 고치고, 끝나면 fix를 지워요. '처음부터'가 있을 때만 새로 만들어요.
- 없앤 것: revise·final·handoff 상태, queue·slot·slotLabel·planDate·order·size·nightFirst·planResetAt·lateCount·ceoCommentNew·rewrite, plans(배분표), 늦은 일 판정 8가지(이제 "하루 넘게 그대로" 하나만).

### 순서 (화면 코드 `prioRank`, 세션 지침도 같음)
🔥 urgent → ✏️ fix 있음 → ▶ doing → 대표 지시 → 나머지. 같은 칸 안에서는 오래된 순서예요. 아무도 순서를 따로 매기지 않아요.

### 세션
- **정기 세션 하루 3번** `trig_01F2xPSizJ7HiWEFXm3YWp9y` (`CRON_TZ=Asia/Seoul 7 2,14,22 * * *`)
  - 14시: 긴급공지·🔥·fix와 작은 일만 해요(낮 사용량 남기기).
  - 22시·02시: 목록이 빌 때까지 계속해요. 못 끝내면 doing으로 두고 다음 세션이 이어받아요.
  - 첫 호출은 query 3개(tasks approved·doing, notices new, imageReqs uploaded)예요. 비어 있으면 바로 끝나요.
- **바로 깨우기는 🔥만**: 수정·반려·💬·컨펌(병합) 창마다 "🔥 지금 바로" 체크가 있고, **기본은 꺼짐**이에요. 켜면 그 업무 하나만 처리하는 세션이 바로 떠요. 긴급공지는 항상 바로 깨워요.
- 오전 회의 `trig_01UAYy5g8qAk7sW54vgCsgA3`: **꺼짐**(배분이 코드로 바뀌어 필요 없음). 아침 보고는 대시보드 '오늘의 브리핑'이 데이터로 바로 계산해요.
- 01:31 야간 업무 `trig_01TvF8PnhkyTvrVxTdfENxP3`: 꺼짐(예전부터).
- 업무 정지: `office/state.paused` true면 세션이 바로 끝나고 화면도 직원을 깨우지 않아요.

### 코드가 자동으로 만드는 업무
- 기획서·구성안 컨펌 → `[제작]` 업무 생성(followUpOf), 담당은 dept의 부서장.
- 앱 컨펌(branch 있음) → 같은 업무가 할 일로 돌아가고 fix "병합: …"이 붙어요. 세션이 PR 병합·배포 확인 뒤 done으로 바꿔요. 충돌이면 다시 맞춘 뒤 확인(confirm)으로 올려요.
- 수업 일정 넣기 → `[수업 준비]` 업무(교육 새봄) 생성. 컨펌 마감이 3일 안이면 🔥로 바로 시작해요.
- 회의 마치기 → 대표님이 시킨 일과 답 못 한 질문이 업무로 올라가요(예전 '[회의 후속 점검]'은 없앴어요).

### 직원 (6명, 2026-11-27 기획 전담 윤슬 추가)
전략 한결(총괄 지시·담당 정하기), **기획 윤슬**(모든 새 기획서·구성안·아이디어), 교육 새봄, 앱 하늘, 미디어 하랑, 검수 가람(최종 결과물만). owner는 '전략 한결'·'기획 윤슬'·'교육 새봄'·'앱 하늘'·'미디어 하랑' 중 하나예요.
- 윤슬의 기획서에는 ① 아이디어와 인문학적 배경 ② 디자인 시안 1장 ③ 만들 수 있는지(앱 기능·디자인 구현)를 넣어요(config/rules r7_plan). 업무에는 stage "plan"을 달아요.
- 대표님이 윤슬의 기획을 컨펌하면 화면 코드가 `[제작]` 업무를 dept에 맞는 부서장(edu 새봄·app 하늘·media 하랑, 그 밖에는 한결)에게 만들어요.
- 이미 있는 것의 수정·오류, 대표님이 직접 시킨 제작은 부서장이 바로 해요(기획서 없음).
- 3D 사무실에서는 전략부서 자리에 앉아 있어요(dept strategy, team '기획 전담').

## 페이지를 고칠 때
- 실제 DB를 내려받아(ArtifactData list → JSON) 그 데이터로 모든 탭과 바뀐 기능을 Playwright로 한 번에 점검한 뒤 한 번만 올려요.
- 직원 세션이 쓴 데이터는 형식이 들쭉날쭉하니 목록 필드는 asList로 방어하고, 화면 일부의 오류가 나머지를 멈추지 않게 safeRun으로 감싸요.

## 대표님이 정한 규칙 (요약, 전문은 config/rules)
- 대표님이 컨펌한 것만 병합해요. 외부 게시·영상 업로드·결제는 하지 않아요. 학생 개인정보 금지.
- 설치 열쇠(TEACHER_KEY)는 config.js에 넣거나 어디에도 보내지 않아요.
- 교육: 기획서 → 지도안 → 교안 → 활동지를 한 단계씩 컨펌받아요. 영상↔활동지 연결(design 목록).
- 앱: 지시 원문을 체크리스트로 적어요. 하늘이 시험하고 가람이 다시 시험해요. office/app-YYYYMMDD-n 브랜치만 써요.
- 미디어: 기획 컨펌 전에는 영상을 만들지 않아요. 컨펌 대기는 1개만.
- 규칙을 바꾸는 건 대표님만 해요(대화창).

## 2026-11-27 재설계 때 바로잡은 것
- 열린 업무 25건의 순서·배분 필드를 지우고 owner를 4명 표기로 통일했어요.
- `o-myapp-20261127`(나의앱 메이커 실행 오류 수정): PR #48 병합이 충돌로 막혔는데 status가 done이라 아무도 다시 잡지 않던 상태였어요. 할 일 + fix(충돌 해결 → 재검수 → 확인)로 되돌렸어요.

## 2026-11-27 저녁 (윤슬 추가 세션)
- 예전 배분 메모(오전 회의·s1~s5 구간) 10건 정리, `o-myapp-20261127` owner '앱 하늘'로 맞춤, office/state의 briefing·morningAgenda 비움.
- 기획 단계 업무 4건을 윤슬로 옮김(stage plan): 마곡초 겨울방학 특강(o-mwxqi45w), 1~2학년(fu-mg1), 3~4학년(mg2f), 5~6학년(fu12).
- '규칙 한눈에 보기'(fu7)는 ⛔ 막힘: 대표님이 계속할지 정해 주실 것.
- 📩 새 답 표시: 직원 답(ceoCommentReply.at)이 대표님의 마지막 코멘트와 `replyReadAt`보다 새것이면 대표 요청 목록 맨 위 '📩 직원이 새로 답했어요'에 올라가고 대시보드 탭에 숫자가 떠요. '✓ 읽음'이나 💬 창을 열면 replyReadAt과 그 답의 표시(replyReadKey = at|글 앞 60자)가 찍혀 제자리로 가요(코드 `newReply`). 직원 세션이 답 시각을 앞당겨(미래로) 적는 일이 있어 시각 비교만으로는 안 돼요. 세션은 지금처럼 ceoCommentReply만 쓰면 돼요.
- 📎 캡처 첨부: 총괄 지시·💬 코멘트·직원에게 묻기(질문/업무로 지시)에도 파일·캡처 첨부와 붙여넣기(Ctrl+V)를 넣었어요(attPending 키 gen·cmt·ask). 코멘트 첨부는 ceoComments 항목과 task.attachments 둘 다에 들어가요. 질문하기는 sample에 images를 넘기지만, 페이지 선언에 `sample: {images: true}`가 없으면 그림 없이 파일 이름만 전해요(선언 확인 못 함: db 규칙 1개 내용을 몰라 capabilities를 다시 쓰지 않았어요).
- 🌐 환경: 정기 세션(트리거)은 **Default 환경**(env_015LVcNACh6L6stVcPqGffCF)에서 돌아요. 'thedream' 환경이 아니에요. 2026-11-27에 Default에 목소리·모델 사이트 9개(translate.google.com, speech.platform.bing.com, huggingface 계열, raw.githubusercontent.com)를 더했어요. 직원 세션에 필요한 사이트는 Default에 넣어야 해요.
- 🔊 목소리: Default 환경 설정 스크립트가 새 세션마다 edge-tts와 `ko-tts` 명령을 설치해요. `ko-tts "글 또는 @파일.txt" 결과.mp3 [ko-KR-SunHiNeural|ko-KR-InJoonNeural] [+0%]`. edge-tts는 자체 인증서 묶음을 써서 프록시에서 실패하므로 ko-tts가 /root/.ccr/ca-bundle.crt로 바꿔 연결해요.
- 🧩 스킬: 직원용 스킬은 저장소 `.claude/skills/`에 넣어요(정기 세션은 main에서 시작해서 main에 있어야 읽어요). 2026-11-28 frontend-design·algorithmic-art를 Anthropic 공식 저장소에서 가져와 PR #50으로 올렸어요. 출처를 확인한 것만 넣어요.
- 🟢 지금 하는 일 표시: '부서별 할 일' 맨 위에 사무실 상태 줄(🟢 지금 일하는 중 / ⏸ 쉬는 시간 + 다음 세션·마지막 작업), 직원 카드마다 '지금 하는 일' 또는 '다음에 할 일'. 새 필드 없이 status doing + updatedAt 40분 안(코드 `isLive`)으로 판단해요.
- 🗑 '방금 들어온 소식'(feed 모음)을 대시보드에서 없앴어요. 재설계 뒤 세션이 feed를 쓰지 않아 11/26에 멈춰 있었어요. 직원 말풍선·직원 창의 최근 한 일은 업무 기록(tasks.updatedAt)에서 바로 만들어요(코드 `taskFeed`). feed 컬렉션은 더 읽지 않아요.
