# AI 사무실 인수인계 (새 채팅창에서 이어 하기)

새 채팅창에서 이렇게 시작하면 돼요:
> "ai-office/HANDOFF.md 읽고 AI 사무실 관리 이어서 해줘"

## 핵심 위치
- 사무실 페이지: https://claude.ai/artifact/VfA5m37psAvPz4w1SzYFid (소스: `ai-office/index.html`)
- 데이터(DB 컬렉션): tasks, feed, docs, notices, classes, imageReqs, qna, meetings, apps, schedule
- 규칙: `config/workflow`(1~15번), `config/media`, `config/classes`, `config/library`, `config/proposal-template`, `config/marketing`(보류), `config/system`
- 작업 브랜치: `ccr-713a6b37-67zfiu` (main에 직접 push 금지, 강제 push·브랜치 삭제 금지)

## 자동 실행
- 매시 7분 정기 점검: trigger `trig_01F2xPSizJ7HiWEFXm3YWp9y` (낮 08~24시는 급한 일, 밤 00~08시는 오래 걸리는 일)
- 평일 01:31 출근 세션: `trig_01TvF8PnhkyTvrVxTdfENxP3`
- 페이지의 '바로' 버튼은 위 정기 점검 trigger를 즉시 실행해요.

## 대표님이 정한 규칙 (요약)
- 대표님이 컨펌한 것만 병합. 외부 게시·영상 업로드·결제 금지. 학생 개인정보 금지.
- 설치 열쇠(TEACHER_KEY)는 config.js에 넣거나 어디에도 보내지 않음.
- 아이디어 요청 = 기획안만, 제작은 승인 뒤 (13번). 사용량 아끼기 (14번).
- '보류'라고 적으면 직원은 손대지 않음 (11번). 시스템·규칙 총괄 = 전략부서 한결 (12번).
- 미디어: 5단계 표시, 4줄 보고, 대표님 요청은 한 번에 하나씩, 영상은 실제 파일까지 만든 뒤 한 번만 컨펌 (config/media).

## 지금 진행 중 (2026-11-25)
- 목소리 고르기 카드 `t-20261125-voice` (결재함, 카드 안에서 재생 후 A·B·C 선택)
- 쇼츠 3편 영상 파일 `t-20261125-fu1` — 11/25 밤 맨 먼저 (nightFirst)
- 캐릭터판 유튜브 프로필·배너 그림 요청 `t-20261125-chprof` — 11/25 밤
- 유튜브 채널: 블록앤비트 @blockbit-edu. 아동용/아동용 아님 방향은 대표님이 결정 대기
- 미디어 전면 점검 보고: docs `d-20261125-media-audit`

## 페이지 기능 메모
- 그림 올리기 전 컨셉 확인(확인 항목 + AI 비교, sample images 사용)
- 고르기 카드: task에 `choice:{question, options:[{key,label,files}]}`를 넣고 status `confirm`으로 두면 됨
