import test from 'node:test';
import assert from 'node:assert/strict';
import * as controls from '../pages/main/time-controls.js';
import {filterPhotos} from '../shared/js/photo-query.js';

test('날짜 필터는 한국 시간의 하루 전체를 포함한다', () => {
  assert.equal(typeof controls.dateSelection, 'function');
  const range = controls.dateSelection('2026-10-10', '2026-10-10');
  assert.deepEqual(range, {start: Date.parse('2026-10-09T15:00:00Z'), end: Date.parse('2026-10-10T14:59:59.999Z')});
  const photos = ['2026-10-09T14:59:59.999Z', '2026-10-09T15:00:00Z', '2026-10-10T14:59:59.999Z', '2026-10-10T15:00:00Z'].map((uploadedAt, id) => ({id, uploadedAt}));
  assert.deepEqual(filterPhotos(photos, range).map(p => p.id), [1, 2]);
});
test('빈 날짜와 존재하지 않는 날짜는 무효 처리한다', () => {
  assert.equal(typeof controls.dateSelection, 'function');
  assert.deepEqual(controls.dateSelection('', '2026-02-30'), {start: null, end: null});
});
test('최근 한 달은 월말과 한국 시간의 날짜 전환을 처리한다', () => {
  assert.equal(typeof controls.presetSelection, 'function');
  assert.deepEqual(controls.presetSelection('month', Date.parse('2026-03-30T15:30:00Z')), {
    start: Date.parse('2026-02-27T15:00:00Z'), end: Date.parse('2026-03-31T14:59:59.999Z')
  });
});
test('올해는 한국 시간의 1월 1일부터 오늘 끝까지 선택한다', () => {
  assert.equal(typeof controls.presetSelection, 'function');
  assert.deepEqual(controls.presetSelection('year', Date.parse('2026-01-01T00:00:00Z')), {
    start: Date.parse('2025-12-31T15:00:00Z'), end: Date.parse('2026-01-01T14:59:59.999Z')
  });
});
test('기본 기간은 오늘(한국 시간)을 끝 날짜로, 3일 전을 시작 날짜로 한다', () => {
  // 2026-10-28 11:48 KST
  assert.deepEqual(controls.presetSelection('recent', Date.parse('2026-10-28T02:48:00Z')), {
    start: Date.parse('2026-10-24T15:00:00Z'), end: Date.parse('2026-10-28T14:59:59.999Z')
  });
  // 월초에는 이전 달로 넘어간다: 2026-03-02 → 2026-02-27
  assert.deepEqual(controls.presetSelection('recent', Date.parse('2026-03-02T03:00:00Z')), {
    start: Date.parse('2026-02-26T15:00:00Z'), end: Date.parse('2026-03-02T14:59:59.999Z')
  });
});
