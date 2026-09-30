// 폼 값 → 등록 입력값 변환과 검증. DOM/지도에 의존하지 않아 Node 테스트가 가능합니다.
import {CONFIG} from '../../shared/js/config.js';
import {parseKstInput} from '../../shared/js/time.js';

export const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const fail = (message, field) => Object.assign(new Error(message), {field});

export function isInsideCampus(latitude, longitude) {
  const [[south, west], [north, east]] = CONFIG.map.maxBounds;
  return latitude >= south && latitude <= north && longitude >= west && longitude <= east;
}

export function validateImageFile(file) {
  if (!file?.size || file.size > MAX_IMAGE_BYTES || !ALLOWED_IMAGE_TYPES.includes(file.type)) {
    throw fail('8MB 이하 JPG, PNG, WEBP 사진을 선택해 주세요.', 'image');
  }
  return file;
}

const toNumber = value => (String(value ?? '').trim() === '' ? NaN : Number(value));

// FormData → { imageFile, latitude, longitude, placeName, description, capturedAt(ISO) }
export function parseUploadFields(data) {
  const imageFile = validateImageFile(data.get('image'));
  const placeName = String(data.get('placeName') ?? '').trim();
  if (!placeName) throw fail('촬영 장소명을 입력해 주세요.', 'placeName');
  const latitude = toNumber(data.get('latitude')), longitude = toNumber(data.get('longitude'));
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) {
    throw fail('지도에서 위치를 선택하거나 위도·경도를 확인해 주세요.', 'latitude');
  }
  if (!isInsideCampus(latitude, longitude)) throw fail('숭실대 캠퍼스 지도 범위 안의 위치를 선택해 주세요.', 'latitude');
  const captured = parseKstInput(String(data.get('capturedAt') ?? ''));
  if (captured === null) throw fail('촬영 날짜와 시간을 확인해 주세요.', 'capturedAt');
  const description = String(data.get('description') ?? '').trim();
  if (!description) throw fail('한 줄 설명을 입력해 주세요.', 'description');
  return {imageFile, latitude, longitude, placeName, description, capturedAt: new Date(captured).toISOString()};
}

export const readUploadInput = form => parseUploadFields(new FormData(form));
