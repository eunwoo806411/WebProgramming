import test from 'node:test';
import assert from 'node:assert/strict';
import {parseUploadFields, isInsideCampus} from '../pages/upload/upload-input.js';

const image = (type = 'image/jpeg', size = 10) => new File([new Uint8Array(size)], 'a.jpg', {type});
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
  assert.throws(() => parseUploadFields(form({image: image('image/png', 8 * 1024 * 1024 + 1)})), {field: 'image'});
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
