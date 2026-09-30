import test from 'node:test';
import assert from 'node:assert/strict';
import {createLocalAdapter} from '../shared/js/local-adapter.js';
import {UPLOADS_KEY} from '../shared/js/upload-store.js';

const memory = () => { const m = new Map(); return {getItem: k => m.get(k) ?? null, setItem: (k, v) => m.set(k, v)}; };
const encodeImage = async () => 'data:image/jpeg;base64,AAAA';
const input = (over = {}) => ({imageFile: {}, latitude: 37.4964, longitude: 126.95705, placeName: '중앙 잔디광장', description: '설명', capturedAt: '2026-09-30T01:00:00.000Z', ...over});

test('비로그인은 등록할 수 없다', async () => {
  const api = createLocalAdapter(memory(), {encodeImage});
  await assert.rejects(api.createPhoto(input()), {code: 'AUTH_REQUIRED'});
});

test('등록한 사진이 목록·상세에 나타나고 새 접속에도 유지된다', async () => {
  const store = memory(), api = createLocalAdapter(store, {encodeImage});
  const before = (await api.listPhotos()).length;
  const user = await api.signInDemo();
  const created = await api.createPhoto(input());
  assert.equal(created.authorId, user.id);
  assert.equal(created.likeCount, 0);
  assert.equal(created.isDemo, false);
  assert.ok(Number.isFinite(Date.parse(created.uploadedAt)));
  const fresh = createLocalAdapter(store, {encodeImage});
  assert.equal((await fresh.listPhotos()).length, before + 1);
  assert.equal((await fresh.getPhoto(created.id)).placeName, '중앙 잔디광장');
});

test('등록한 사진에도 좋아요가 동작하고 유지된다', async () => {
  const store = memory(), api = createLocalAdapter(store, {encodeImage});
  const user = await api.signInDemo(), {id} = await api.createPhoto(input());
  assert.equal((await api.setPhotoLiked(id, true)).photo.likeCount, 1);
  const fresh = createLocalAdapter(store, {encodeImage});
  assert.deepEqual(await fresh.getUserLikedPhotoIds(user.id), [id]);
  assert.equal((await fresh.getPhoto(id)).likeCount, 1);
});

test('잘못된 입력은 저장하지 않는다 (빈 좌표를 0으로 보지 않음)', async () => {
  const api = createLocalAdapter(memory(), {encodeImage}); await api.signInDemo();
  const before = (await api.listPhotos()).length;
  for (const bad of [{latitude: '37.4'}, {latitude: null}, {longitude: 181}, {placeName: ' '}, {description: ''}, {capturedAt: 'x'}, {imageFile: null}])
    await assert.rejects(api.createPhoto(input(bad)), {code: 'INVALID_INPUT'});
  assert.equal((await api.listPhotos()).length, before);
});

test('저장 공간 오류는 성공으로 처리하지 않고 목록을 바꾸지 않는다', async () => {
  const base = memory(); let fail = false;
  const store = {getItem: base.getItem, setItem: (k, v) => { if (fail && k === UPLOADS_KEY) throw Error('quota'); base.setItem(k, v); }};
  const api = createLocalAdapter(store, {encodeImage}); await api.signInDemo();
  const before = (await api.listPhotos()).length; fail = true;
  await assert.rejects(api.createPhoto(input()), {code: 'STORAGE_UNAVAILABLE'});
  assert.equal((await api.listPhotos()).length, before);
});

test('손상된 등록 데이터는 무시된다', async () => {
  const store = memory(); store.setItem(UPLOADS_KEY, '{broken');
  const api = createLocalAdapter(store, {encodeImage}); assert.ok(Array.isArray(await api.listPhotos()));
  store.setItem(UPLOADS_KEY, JSON.stringify({version: 1, items: [{id: 'x', imageUrl: 'http://evil'}, null]}));
  assert.equal((await api.getPhoto('x')), null);
});
