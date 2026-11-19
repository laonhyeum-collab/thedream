// 가사 쓰기 "교육용 체크" (5단계를 모두 깨면 열려요)
// - 이 기기 안에서만 검사해요. 가사는 어디에도 보내지 않아요 (인터넷 연결 없음).
// - 고운 말인지, 개인 정보(전화번호·주소·이메일·이름·학교)가 없는지, 짧은지 확인해요.
// 검사는 순수 함수라 시험하기 쉬워요.

export const LYRICS_MAX = 80; // 글자 수
export const LYRICS_MAX_LINES = 4;

// 쓰면 안 되는 말 (욕설 · 놀리는 말 · 무서운 말). 띄어쓰기·기호를 빼고 비교해요.
// 고운 말에 섞여 들어가는 짧은 말(예: "새끼손가락", "불이 꺼져요", "북을 때려요")은 일부러 넣지 않았어요.
const BAD_KO = [
  // 욕설
  '씨발', '씨빨', '시발놈', '시발년', '시발아', '씨팔', '시팔', '씨바', '쌍놈', '쌍년', '좆', '존나', '졸라', '지랄',
  '병신', '븅신', '빙신', '개새', '개세끼', '개쉐', '쌔끼', '새꺄', '썅', '니미', '느금', '엠창', '염병',
  '꺼지라', '닥쳐', '닥치라', '미친놈', '미친년', '미친새', '또라이', '돌아이', '등신', '찐따', '병맛',
  // 놀리는 말
  '멍청이', '멍청아', '바보야', '바보같', '못생긴', '뚱땡이', '찌질',
  // 무서운 말 (폭력)
  '죽여', '죽일', '죽인다', '죽어라', '죽어버', '뒤져', '디져', '살인', '자살', '때려죽', '패버', '패죽', '찔러', '피투성이', '총으로쏴',
];
// 자음만 쓴 욕설
const BAD_JAMO = ['ㅅㅂ', 'ㅆㅂ', 'ㅂㅅ', 'ㅈㄹ', 'ㅈㄴ', 'ㄲㅈ', 'ㅁㅊ', 'ㄷㅊ', 'ㅄ'];
// 영어 (단어 단위로 비교해서 "class", "diet" 같은 말은 괜찮아요)
const BAD_EN = [
  'fuck', 'fucking', 'fck', 'fuk', 'shit', 'sh1t', 'bitch', 'damn', 'ass', 'asshole', 'bastard', 'crap', 'dick',
  'stupid', 'idiot', 'dumb', 'loser', 'ugly', 'shutup',
  'kill', 'killing', 'die', 'dead', 'murder', 'gun', 'blood', 'suicide', 'sex', 'sexy', 'porn', 'drug', 'drugs', 'hate',
];
const BAD_EMOJI = ['🖕', '💩🖕', '🔪', '🔫', '💣'];

const MESSAGES = {
  empty: '✏️ 가사를 한 줄 이상 써 주세요.',
  tooLong: `✂️ 가사가 너무 길어요. ${LYRICS_MAX}글자 안으로 짧고 즐겁게 써 볼까요?`,
  tooManyLines: `✂️ 가사는 ${LYRICS_MAX_LINES}줄까지 쓸 수 있어요.`,
  badWord: '🌱 노래에는 고운 말만 써요. 친구가 들어도 기분 좋은 말로 바꿔 볼까요?',
  personal: '🔒 전화번호·주소·이메일·이름·학교 같은 개인 정보는 노래에 쓰지 않아요. 다른 말로 바꿔 주세요.',
  link: '🔒 인터넷 주소(링크)는 노래에 쓰지 않아요.',
  ok: '✅ 교육용 체크 통과! 멋진 가사예요.',
};

export function lyricsMessage(reason) {
  return MESSAGES[reason] || MESSAGES.badWord;
}

// 줄바꿈은 살리고, 줄마다 앞뒤 공백·여러 칸 공백을 정리해요. 보이지 않는 글자는 빼요.
export function tidyLyrics(text) {
  return String(text ?? '')
    .normalize('NFC')
    .replace(/[\u0000-\u0009\u000b-\u001f\u007f\u200b-\u200f\u2028-\u202e\u2060-\u206f\ufeff]/g, '')
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((l) => l.replace(/\s+/g, ' ').trim())
    .filter((l, i, arr) => l || (i > 0 && arr[i - 1])) // 빈 줄이 겹치지 않게
    .join('\n')
    .trim();
}

// 비교용: 소문자, 띄어쓰기·기호·숫자 사이 끼운 것 빼기 ("시 . 발", "f-u-c-k")
function squash(text) {
  return text.toLowerCase().replace(/[\s.,·~!?\-_*+'"`^()[\]{}<>/\\|:;@#$%&=]/g, '');
}

function hasBadWord(text) {
  const sq = squash(text);
  if (BAD_KO.some((w) => sq.includes(w))) return true;
  if (BAD_JAMO.some((w) => sq.includes(w))) return true;
  if (BAD_EMOJI.some((w) => text.includes(w))) return true;
  // 영어: 단어마다 (사이에 낀 기호도 빼서) 비교
  const words = text.toLowerCase().replace(/[*.\-_]/g, '').split(/[^a-z0-9]+/).filter(Boolean);
  if (words.some((w) => BAD_EN.includes(w))) return true;
  // "shut up"처럼 띄어 쓴 말
  const joined = text.toLowerCase().replace(/[^a-z]/g, '');
  return joined.includes('fuck') || joined.includes('shutup') || joined.includes('bitch');
}

function hasLink(text) {
  return /(https?:\/\/|www\.|\.(com|net|org|kr|io|co)\b|[a-z0-9-]+\.[a-z]{2,}\/)/i.test(text);
}

function hasPersonalInfo(text) {
  const t = text.toLowerCase();
  // 이메일
  if (/[a-z0-9._%+-]+\s*(@|＠|골뱅이)\s*[a-z0-9.-]+/i.test(t)) return true;
  // 전화번호: 숫자가 (띄어쓰기·- 섞여서) 7개 이상 이어짐, 또는 010
  if (/\d{7,}/.test(t.replace(/[\s\-.()]/g, ''))) return true;
  if (/(^|\D)01[016789][\s\-.]*\d{3,4}/.test(t)) return true;
  if (/(전화\s*번호|폰\s*번호|핸드폰|휴대폰|연락처|카톡\s*아이디|아이디\s*는|비밀\s*번호|주민\s*(등록)?\s*번호)/.test(t)) return true;
  // 주소: "주소", "○○로 12-3", "○○길 5번길", "101동 202호", "번지"
  if (/(주소|번지|우편\s*번호)/.test(t)) return true;
  if (/[가-힣]+(로|길)\s*\d+\s*(-\s*\d+|번길|번지)/.test(t) || /\d+\s*(번길|번지)/.test(t)) return true;
  if (/[가-힣]+동\s*\d+\s*-\s*\d+/.test(t)) return true;
  if (/\d+\s*동\s*\d+\s*호|\d{3,}\s*호/.test(t)) return true;
  // 이름 · 학교 · 반
  if (/(제|내|나의|우리\s*엄마|우리\s*아빠|엄마|아빠)\s*이름은|my\s*name\s*is|i\s*am\s+[a-z]+\s+from/.test(t)) return true;
  if (/[가-힣]{1,10}(초등학교|중학교|고등학교|초교)|[가-힣]{2,}초\s*\d+\s*학년/.test(t)) return true;
  if (/\d\s*학년\s*\d+\s*반/.test(t)) return true;
  return false;
}

// 가사 검사: { ok, text(정리된 가사), reason, message }
export function checkLyrics(raw) {
  const text = tidyLyrics(raw);
  const fail = (reason) => ({ ok: false, text, reason, message: lyricsMessage(reason) });
  if (!text) return fail('empty');
  if ([...text.replace(/\n/g, '')].length > LYRICS_MAX) return fail('tooLong');
  if (text.split('\n').length > LYRICS_MAX_LINES) return fail('tooManyLines');
  if (hasBadWord(text)) return fail('badWord');
  if (hasPersonalInfo(text)) return fail('personal');
  if (hasLink(text)) return fail('link');
  return { ok: true, text, reason: 'ok', message: MESSAGES.ok };
}

// 저장된 가사를 다시 열 때: 통과한 가사만 살려요 (아니면 빈 가사)
export function safeLyrics(raw) {
  if (typeof raw !== 'string' || !raw.trim()) return '';
  const r = checkLyrics(raw);
  return r.ok ? r.text : '';
}
