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
