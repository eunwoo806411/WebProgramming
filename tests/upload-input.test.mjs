import test from 'node:test';
import assert from 'node:assert/strict';
import {parseUploadFields, isInsideCampus} from '../pages/upload/upload-input.js';

const image = (type = 'image/jpeg', size = 10, name = 'a.jpg') => new File([new Uint8Array(size)], name, {type});
const form = (over = {}) => {
  const f = new FormData();
  const v = {image: image(), placeName: '중앙 잔디광장', latitude: '37.4964', longitude: '126.95705', capturedAt: '2026-09-22T10:00:00', description: '설명', ...over};
  for (const [k, val] of Object.entries(v)) f.set(k, val);
  return f;
};

test('올바른 입력은 위도·경도 숫자와 UTC ISO 촬영 시각으로 변환된다', () => {
  const r = parseUploadFields(form());
  assert.equal(r.latitude, 37.4964);
  assert.equal(r.longitude, 126.95705);
  assert.equal(r.capturedAt, '2026-09-22T01:00:00.000Z');
});
test('사진 형식·크기 오류는 image 필드로 알린다', () => {
  assert.throws(() => parseUploadFields(form({image: image('image/gif')})), {field: 'image'});
  assert.throws(() => parseUploadFields(form({image: image('image/png', 20 * 1024 * 1024 + 1)})), {field: 'image'});
  assert.throws(() => parseUploadFields(form({image: image('image/png', 0)})), {field: 'image'});
});
test('빈 좌표를 0으로 취급하지 않고, 캠퍼스 밖 좌표는 거부한다', () => {
  assert.throws(() => parseUploadFields(form({latitude: ''})), {field: 'latitude'});
  assert.throws(() => parseUploadFields(form({latitude: '37.5665', longitude: '126.978'})), {field: 'latitude'});
  assert.equal(isInsideCampus(37.4964, 126.9575), true);
  assert.equal(isInsideCampus(0, 0), false);
});
test('공백뿐인 장소명·설명과 잘못된 촬영 시각을 거부한다', () => {
  assert.throws(() => parseUploadFields(form({placeName: '   '})), {field: 'placeName'});
  assert.throws(() => parseUploadFields(form({description: ' '})), {field: 'description'});
  assert.throws(() => parseUploadFields(form({capturedAt: '2026-02-30T10:00'})), {field: 'capturedAt'});
});
test('HEIC 사진은 형식 또는 확장자로 허용한다', () => {
  assert.doesNotThrow(() => parseUploadFields(form({image: image('image/heic', 10, 'IMG_0001.HEIC')})));
  assert.doesNotThrow(() => parseUploadFields(form({image: image('', 10, 'IMG_0002.heic')})));
  assert.throws(() => parseUploadFields(form({image: image('', 10, 'note.txt')})), {field: 'image'});
});
test('미리 변환한 이미지가 있으면 그 이미지를 등록 입력으로 쓴다', () => {
  const converted = image('image/jpeg', 20, 'converted.jpg');
  assert.equal(parseUploadFields(form({image: image('image/heic', 10, 'a.heic')}), {imageFile: converted}).imageFile, converted);
});
test('미래 촬영 시각은 거부하고 1분 이내 시계 차이는 허용한다', () => {
  const now = Date.parse('2026-11-10T01:00:00Z'); // 한국 시간 10:00
  assert.throws(() => parseUploadFields(form({capturedAt: '2026-11-10T10:05:00'}), {now}), {field: 'capturedAt'});
  assert.doesNotThrow(() => parseUploadFields(form({capturedAt: '2026-11-10T10:00:30'}), {now}));
});
test('장소명 100자, 설명 1000자를 넘으면 거부한다', () => {
  assert.doesNotThrow(() => parseUploadFields(form({placeName: '가'.repeat(100), description: '나'.repeat(1000)})));
  assert.throws(() => parseUploadFields(form({placeName: '가'.repeat(101)})), {field: 'placeName'});
  assert.throws(() => parseUploadFields(form({description: '나'.repeat(1001)})), {field: 'description'});
});
test('사진 EXIF 촬영 시각을 한국 시간 입력값으로 바꾼다', async () => {
  const {exifDateToKstInput, isHeic} = await import('../pages/upload/image-prepare.js');
  assert.equal(exifDateToKstInput('2025:04:03 17:42:10'), '2025-04-03T17:42:10');
  assert.equal(exifDateToKstInput('2025:04:03 08:00:00', '+00:00'), '2025-04-03T17:00:00');
  assert.equal(exifDateToKstInput('0000:00:00 00:00:00'), null);
  assert.equal(exifDateToKstInput(undefined), null);
  assert.equal(isHeic({type: '', name: 'IMG_1.HEIC'}), true);
  assert.equal(isHeic({type: 'image/jpeg', name: 'a.jpg'}), false);
});
test('JPEG·HEIC 안의 EXIF 촬영 시각을 직접 읽는다', async () => {
  const {readExifDates} = await import('../pages/upload/image-prepare.js');
  const fs = await import('node:fs');
  const dir = process.env.EXIF_SAMPLES;
  if (!dir) {
    // 작은 TIFF(빅엔디언)를 직접 만들어 확인: IFD0 → ExifIFD → DateTimeOriginal
    const date = '2025:04:03 17:42:10\0';
    const b = new Uint8Array(6 + 8 + 18 + 18 + 20); const v = new DataView(b.buffer);
    b.set([0x45, 0x78, 0x69, 0x66, 0, 0], 0); const t = 6;
    b.set([0x4d, 0x4d, 0, 0x2a], t); v.setUint32(t + 4, 8);
    v.setUint16(t + 8, 1); v.setUint16(t + 10, 0x8769); v.setUint16(t + 12, 4); v.setUint32(t + 14, 1); v.setUint32(t + 18, 26);
    v.setUint16(t + 26, 1); v.setUint16(t + 28, 0x9003); v.setUint16(t + 30, 2); v.setUint32(t + 32, 20); v.setUint32(t + 36, 44);
    for (let i = 0; i < date.length; i++) b[t + 44 + i] = date.charCodeAt(i);
    assert.deepEqual(readExifDates(b), {original: '2025:04:03 17:42:10', offset: null});
    assert.equal(readExifDates(new Uint8Array(20)), null);
    return;
  }
  for (const f of ['exif-portrait.jpg', 'iphone.heic']) assert.equal(readExifDates(new Uint8Array(fs.readFileSync(`${dir}/${f}`))).original, '2025:04:03 17:42:10');
});
