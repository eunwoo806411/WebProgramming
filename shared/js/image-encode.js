// 업로드 사진을 긴 변 900px 이하 JPEG data URL로 줄입니다. (localStorage 용량 절약)
// 캔버스로 다시 그리므로 EXIF(촬영 기기·GPS 등)는 저장되지 않습니다.
export const MAX_EDGE = 900;
export const JPEG_QUALITY = 0.8;

export async function encodeImageFile(file) {
  let bitmap;
  try { bitmap = await createImageBitmap(file, {imageOrientation: 'from-image'}); }
  catch { throw Object.assign(new Error('사진을 읽을 수 없어요. 다른 사진을 선택해 주세요.'), {code: 'INVALID_IMAGE'}); }
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale)), height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, width, height); // 투명 PNG 배경
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close?.();
  return canvas.toDataURL('image/jpeg', JPEG_QUALITY);
}
