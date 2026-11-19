# 레고 사이언스 교안 생성기

대표님 원본 레고사이언스 교안(지붕 위의 암소, 두 배의 푸시)의 형식을 그대로 따라 3종 세트를 만들어요.

- 교안 PPT 13장 (16:9)
- 상세 강의 지도안 (A4, 교안 13슬라이드 기준)
- 학생 활동지 (A4, 개념 확인 → 활동 1~5 → 마무리 퀴즈 → 스스로 점검)

## 쓰는 법

```bash
npm install
node build.js lessons/28.json out
cd out && for f in *.pptx *.docx; do soffice --headless --convert-to pdf "$f"; done
```

## 수업 JSON

`lessons/28.json`~`32.json`이 예시예요. 새 수업은 예시 하나를 복사해서 내용만 바꿔요.

| 키 | 내용 |
|---|---|
| no, date, code, page, unit | 차시, 날짜, 키트 코드(C303), 조립설명서 쪽(C3 28p), 단원 |
| title, en, emoji, deco, question | 제목, 영문 제목, 표지 이모지, 오른쪽 장식 3개, 탐구 질문 |
| vocab | 핵심 낱말 3개 `{w, d}` |
| goals | 학습 목표 3개 `{t, d, slides}` |
| overview, concept | 개요(story, emoji, qa 2개), 핵심 개념(def, diagram 3칸, ops 2개, tip) |
| roles, mission | 4색 미니피겨 역할 4개, 탐구 미션 |
| build1, explore, explain | 조립·탐구(점검 5, 탐구 4), 체험·관찰, 설명·공유(prompts 3, qa 2) |
| build2, share, real, eval, summary | 확장 설계(options 4), 모델 공유(scale 3), 실생활, 평가(모범 답안), 정리 3카드 |
| plan | 지도안의 교사 발화·예상 반응·지도 포인트·주의사항·평가 기준·유의사항 |
| sheet | 활동지 미션, 낱말 잇기 순서, 빈칸, 예측, 기록표, 적용, 설계, OX 3·4지선다 3, 자기 점검 |

내용은 레고 에듀케이션 사이트의 공개 개요를 참고하되 문장을 그대로 옮기지 말고 우리 수업에 맞게 다시 써요.
