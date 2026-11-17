// 아주 작은 GIF89a 인코더 (애니메이션, 반복 재생 지원). 외부 라이브러리 없이 동작합니다.

export interface GifFrame {
  /** 팔레트 번호 배열 (width*height) */
  indices: Uint8Array;
  /** 프레임 지속 시간 (1/100초) */
  delay: number;
}

class ByteWriter {
  data: number[] = [];
  byte(b: number) {
    this.data.push(b & 0xff);
  }
  word(w: number) {
    this.byte(w);
    this.byte(w >> 8);
  }
  str(s: string) {
    for (let i = 0; i < s.length; i++) this.byte(s.charCodeAt(i));
  }
  bytes(arr: ArrayLike<number>) {
    for (let i = 0; i < arr.length; i++) this.data.push(arr[i]);
  }
}

function lzwEncode(indices: Uint8Array, minCodeSize: number): number[] {
  const out: number[] = [];
  let cur = 0;
  let curBits = 0;
  const clearCode = 1 << minCodeSize;
  const eoiCode = clearCode + 1;
  let codeSize = minCodeSize + 1;
  let nextCode = eoiCode + 1;
  let table = new Map<number, number>();

  const emit = (code: number) => {
    cur |= code << curBits;
    curBits += codeSize;
    while (curBits >= 8) {
      out.push(cur & 0xff);
      cur >>= 8;
      curBits -= 8;
    }
  };

  emit(clearCode);
  let prefix = indices[0];
  for (let i = 1; i < indices.length; i++) {
    const k = indices[i];
    const key = (prefix << 8) | k;
    const found = table.get(key);
    if (found !== undefined) {
      prefix = found;
      continue;
    }
    emit(prefix);
    if (nextCode === 4096) {
      emit(clearCode);
      nextCode = eoiCode + 1;
      codeSize = minCodeSize + 1;
      table = new Map();
    } else {
      if (nextCode >= 1 << codeSize) codeSize++;
      table.set(key, nextCode++);
    }
    prefix = k;
  }
  emit(prefix);
  emit(eoiCode);
  if (curBits > 0) out.push(cur & 0xff);
  return out;
}

/** palette: [r,g,b] 목록 (최대 256색) */
export function encodeGif(width: number, height: number, palette: [number, number, number][], frames: GifFrame[], loop = true): Uint8Array {
  let bits = 1;
  while (1 << bits < Math.max(2, palette.length)) bits++;
  const size = 1 << bits;
  const w = new ByteWriter();
  w.str('GIF89a');
  w.word(width);
  w.word(height);
  w.byte(0x80 | ((bits - 1) << 4) | (bits - 1)); // 전역 색상표 사용
  w.byte(0);
  w.byte(0);
  for (let i = 0; i < size; i++) {
    const c = palette[i] ?? [0, 0, 0];
    w.byte(c[0]);
    w.byte(c[1]);
    w.byte(c[2]);
  }
  if (loop && frames.length > 1) {
    w.byte(0x21);
    w.byte(0xff);
    w.byte(11);
    w.str('NETSCAPE2.0');
    w.byte(3);
    w.byte(1);
    w.word(0); // 무한 반복
    w.byte(0);
  }
  const minCodeSize = Math.max(2, bits);
  for (const f of frames) {
    // 그래픽 제어 확장 (지연 시간)
    w.byte(0x21);
    w.byte(0xf9);
    w.byte(4);
    w.byte(0x04); // disposal: 그대로 두기
    w.word(Math.max(2, Math.round(f.delay)));
    w.byte(0);
    w.byte(0);
    // 이미지
    w.byte(0x2c);
    w.word(0);
    w.word(0);
    w.word(width);
    w.word(height);
    w.byte(0);
    w.byte(minCodeSize);
    const data = lzwEncode(f.indices, minCodeSize);
    for (let i = 0; i < data.length; i += 255) {
      const chunk = data.slice(i, i + 255);
      w.byte(chunk.length);
      w.bytes(chunk);
    }
    w.byte(0);
  }
  w.byte(0x3b);
  return new Uint8Array(w.data);
}
