// 파일 내려받기·올리기 도우미 (학생·교사·앱 월드 공용)
export function download(filename, text, type = 'application/json') {
  const blob = new Blob([text], { type: `${type};charset=utf-8` });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
}

export function readFileText(file, maxBytes = 2_000_000) {
  return new Promise((resolve, reject) => {
    if (file.size > maxBytes) { reject(new Error(`파일이 너무 커요 (${Math.round(maxBytes / 1000)}KB 까지)`)); return; }
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(new Error('파일을 읽지 못했어요'));
    r.readAsText(file, 'utf-8');
  });
}

export const safeName = (s) => String(s || '').replace(/[\\/:*?"<>|\s]+/g, '_').slice(0, 40) || '이름없음';
