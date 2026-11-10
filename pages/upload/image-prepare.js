// 사진을 고르는 순간 실제로 열리는 사진인지 확인하고, 미리보기·등록에 쓸 이미지를 준비합니다.
// - HEIC/HEIF(아이폰 사진): 브라우저가 직접 열지 못하면 vendor/heic2any로 JPEG 변환 (필요할 때만 불러옴)
// - 촬영 시각: 사진 속 EXIF(DateTimeOriginal)를 직접 읽음 (없으면 null)
// 서버로 보내기 전 shared/js/image-encode.js가 다시 JPEG로 그리므로 EXIF(위치 등)는 저장되지 않습니다.
import {toKstInput} from '../../shared/js/time.js';

const fail = message => Object.assign(new Error(message), {field: 'image'});

export const isHeic = file => /^image\/hei[cf]/i.test(file?.type ?? '') || /\.hei[cf]$/i.test(file?.name ?? '');

let heicLoader = null;
function loadHeic2any() {
  if (window.heic2any) return Promise.resolve(window.heic2any);
  heicLoader ??= new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = new URL('./vendor/heic2any.min.js', import.meta.url).href;
    script.onload = () => window.heic2any ? resolve(window.heic2any) : reject(new Error('heic2any'));
    script.onerror = () => { heicLoader = null; reject(new Error('heic2any')); };
    document.head.append(script);
  });
  return heicLoader;
}

async function decodable(blob) {
  try { const bitmap = await createImageBitmap(blob); const size = {width: bitmap.width, height: bitmap.height}; bitmap.close?.(); return size; }
  catch { return null; }
}

// EXIF 날짜 'YYYY:MM:DD HH:MM:SS' (+ 선택 시간대) → KST 입력값 'YYYY-MM-DDTHH:MM:SS'
// 시간대 정보가 없으면 한국에서 찍은 사진으로 보고 한국 시간으로 해석합니다.
export function exifDateToKstInput(raw, offset) {
  const m = /^(\d{4}):(\d{2}):(\d{2})[ T](\d{2}):(\d{2}):(\d{2})/.exec(String(raw ?? '').trim());
  if (!m || m[1] === '0000') return null;
  const zone = /^[+-]\d{2}:\d{2}$/.test(String(offset ?? '').trim()) ? String(offset).trim() : '+09:00';
  const ms = Date.parse(`${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}${zone}`);
  return Number.isFinite(ms) ? toKstInput(ms) : null;
}

// 'Exif\0\0' 바로 뒤의 TIFF 머리(II*\0 / MM\0*)를 찾습니다. JPEG(APP1)·HEIC(Exif 항목) 모두 이 형태로 들어 있습니다.
function findTiffStart(bytes) {
  for (let i = 0; i + 10 < bytes.length; i++) {
    if (bytes[i] !== 0x45 || bytes[i + 1] !== 0x78 || bytes[i + 2] !== 0x69 || bytes[i + 3] !== 0x66 || bytes[i + 4] !== 0 || bytes[i + 5] !== 0) continue;
    const j = i + 6;
    if ((bytes[j] === 0x49 && bytes[j + 1] === 0x49 && bytes[j + 2] === 0x2a && bytes[j + 3] === 0)
      || (bytes[j] === 0x4d && bytes[j + 1] === 0x4d && bytes[j + 2] === 0 && bytes[j + 3] === 0x2a)) return j;
  }
  return -1;
}

// TIFF 안에서 필요한 날짜 태그만 읽습니다. (0x0132 DateTime, 0x9003 DateTimeOriginal, 0x9004 CreateDate, 0x9011 OffsetTimeOriginal)
export function readExifDates(bytes) {
  const start = findTiffStart(bytes);
  if (start < 0) return null;
  const view = new DataView(bytes.buffer, bytes.byteOffset + start, bytes.length - start);
  const le = view.getUint8(0) === 0x49;
  const u16 = o => view.getUint16(o, le), u32 = o => view.getUint32(o, le);
  const ascii = (count, valueOffset) => {
    const at = count <= 4 ? valueOffset : u32(valueOffset);
    if (at + count > view.byteLength) return null;
    let text = ''; for (let k = 0; k < count; k++) { const c = view.getUint8(at + k); if (!c) break; text += String.fromCharCode(c); }
    return text;
  };
  const readIfd = offset => {
    const tags = {};
    if (offset + 2 > view.byteLength) return tags;
    const n = u16(offset);
    for (let k = 0; k < n; k++) {
      const entry = offset + 2 + k * 12;
      if (entry + 12 > view.byteLength) break;
      const tag = u16(entry), type = u16(entry + 2), count = u32(entry + 4);
      if (type === 2) tags[tag] = ascii(count, entry + 8);
      else if (tag === 0x8769) tags[tag] = u32(entry + 8);
    }
    return tags;
  };
  try {
    const ifd0 = readIfd(u32(4));
    const exif = Number.isFinite(ifd0[0x8769]) ? readIfd(ifd0[0x8769]) : {};
    return {original: exif[0x9003] ?? exif[0x9004] ?? ifd0[0x0132] ?? null, offset: exif[0x9011] ?? null};
  } catch { return null; }
}

export async function readCaptureTime(file) {
  try {
    const dates = readExifDates(new Uint8Array(await file.arrayBuffer()));
    return dates ? exifDateToKstInput(dates.original, dates.offset) : null;
  } catch { return null; }
}

// 반환: {blob(브라우저가 그릴 수 있는 이미지), width, height, capturedAt(KST 입력값 또는 null), converted}
export async function prepareImage(file) {
  let blob = file, size = await decodable(file), converted = false;
  if (!size && isHeic(file)) {
    let heic2any;
    try { heic2any = await loadHeic2any(); } catch { throw fail('HEIC 변환 도구를 불러오지 못했어요. 네트워크를 확인하고 다시 골라 주세요.'); }
    try {
      const out = await heic2any({blob: file, toType: 'image/jpeg', quality: 0.92});
      blob = Array.isArray(out) ? out[0] : out; converted = true;
    } catch { throw fail('HEIC 사진을 변환하지 못했어요. 다른 사진을 골라 주세요.'); }
    size = await decodable(blob);
  }
  if (!size) throw fail('사진 파일을 열 수 없어요. 손상되지 않은 사진을 골라 주세요.');
  const capturedAt = await readCaptureTime(file);
  return {blob, ...size, capturedAt, converted};
}
