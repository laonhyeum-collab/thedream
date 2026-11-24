import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { MISSIONS, LEVEL_INFO } from '../data/missions';
import { buildLessonUrl } from '../lib/lesson';
import { Icon } from './Icons';

/** 선생님 메뉴: 오늘 쓸 미션을 고르면 학생용 주소와 QR을 만들어요(주소에 미션 번호만 담겨요). */
export function LessonMaker({ initial, toast }: { initial: string[]; toast: (t: string, k?: 'info' | 'ok' | 'warn') => void }) {
  const [picked, setPicked] = useState<string[]>(initial);
  const [qr, setQr] = useState('');
  const url = picked.length ? buildLessonUrl(window.location.href, picked) : '';

  useEffect(() => {
    let alive = true;
    if (!url) {
      setQr('');
      return;
    }
    QRCode.toDataURL(url, { margin: 1, width: 360, errorCorrectionLevel: 'M' })
      .then((d: string) => alive && setQr(d))
      .catch(() => alive && setQr(''));
    return () => {
      alive = false;
    };
  }, [url]);

  const toggle = (id: string) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      toast('학생용 주소를 복사했어요.', 'ok');
    } catch {
      toast('복사가 안 돼요. 주소 칸을 길게 눌러 복사해 주세요.', 'warn');
    }
  };

  return (
    <section className="lesson-maker" aria-label="오늘 수업 모드 만들기">
      <h3>오늘 수업 모드 만들기</h3>
      <p className="modal-note">오늘 쓸 미션을 고르면, 학생 화면에는 고른 미션과 「다음」 버튼만 보여요. 로그인 없이 주소(QR)만으로 열려요.</p>
      <div className="lesson-picks">
        {MISSIONS.map((m) => (
          <label key={m.id} className={`lesson-pick ${picked.includes(m.id) ? 'on' : ''}`} title={`${LEVEL_INFO[m.level].name} · ${m.concept}`}>
            <input type="checkbox" checked={picked.includes(m.id)} onChange={() => toggle(m.id)} />
            <span>
              {m.num}. {m.title}
            </span>
          </label>
        ))}
      </div>
      {url ? (
        <div className="lesson-out">
          {qr && <img src={qr} alt="오늘 수업 모드 QR코드" width={180} height={180} />}
          <div className="lesson-out-text">
            <b>미션 {picked.length}개 · 학생용 주소</b>
            <input type="text" readOnly value={url} aria-label="학생용 주소" onFocus={(e) => e.currentTarget.select()} />
            <div className="teacher-btns">
              <button type="button" className="btn lav" onClick={copy}>
                <Icon name="copy" size={18} /> 주소 복사
              </button>
              <a className="btn plain" href={url} target="_blank" rel="noopener">
                새 창에서 열어 보기
              </a>
              {qr && (
                <a className="btn plain" href={qr} download="오늘수업모드-QR.png">
                  <Icon name="download" size={18} /> QR 받기
                </a>
              )}
            </div>
          </div>
        </div>
      ) : (
        <p className="muted">미션을 하나 이상 골라 주세요.</p>
      )}
    </section>
  );
}
