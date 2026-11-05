import test from 'node:test';
import assert from 'node:assert/strict';
import {CAMPUS_BUILDINGS, searchBuildings, findBuilding} from '../pages/upload/campus-buildings.js';
import {isInsideCampus} from '../pages/upload/upload-input.js';

test('모든 건물은 고유 ID를 가지고 캠퍼스 지도 범위 안에 있다', () => {
  assert.ok(CAMPUS_BUILDINGS.length >= 20);
  assert.equal(new Set(CAMPUS_BUILDINGS.map(b => b.id)).size, CAMPUS_BUILDINGS.length);
  for (const b of CAMPUS_BUILDINGS) assert.ok(isInsideCampus(b.latitude, b.longitude), b.name);
});
test('건물 검색은 이름 일부·별칭·공백을 처리한다', () => {
  assert.deepEqual(searchBuildings('형남').map(b => b.name), ['형남공학관']);
  assert.deepEqual(searchBuildings('정보 과학').map(b => b.name), ['정보과학관']);
  assert.deepEqual(searchBuildings('기숙사').map(b => b.name), ['레지던스홀']);
  assert.equal(searchBuildings('').length, CAMPUS_BUILDINGS.length);
  assert.deepEqual(searchBuildings('없는건물'), []);
});
test('ID로 건물을 찾고, 없으면 null', () => {
  assert.equal(findBuilding('hyungnam').name, '형남공학관');
  assert.equal(findBuilding('nope'), null);
});
