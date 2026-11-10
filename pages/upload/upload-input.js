// 폼 값 → 등록 입력값 변환과 검증. DOM/지도에 의존하지 않아 Node 테스트가 가능합니다.
import {CONFIG} from '../../shared/js/config.js';
import {parseKstInput} from '../../shared/js/time.js';

// 원본 사진은 브라우저에서 긴 변 1600px JPEG로 줄인 뒤 보내므로 원본 크기 제한은 넉넉하게 둡니다.
export const MAX_IMAGE_BYTES = 20 * 1024 * 1024;
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];
// 서버(shared/server/photo-routes.js)·마이페이지 수정 화면과 같은 글자 수 제한
export const PLACE_MAX = 100;
export const DESCRIPTION_MAX = 1000;
// 기기 시계 차이를 고려해 1분까지는 허용
const FUTURE_TOLERANCE_MS = 60 * 1000;

const fail = (message, field) => Object.assign(new Error(message), {field});
const isHeicName = name => /\.hei[cf]$/i.test(name ?? '');

export function isInsideCampus(latitude, longitude) {
  const [[south, west], [north, east]] = CONFIG.map.maxBounds;
  return latitude >= south && latitude <= north && longitude >= west && longitude <= east;
}

export function validateImageFile(file) {
  if (!file?.size) throw fail('등록할 사진을 골라 주세요.', 'image');
  // 윈도우에서는 HEIC 파일 형식이 비어 있을 수 있어 확장자도 확인합니다.
  const typeOk = ALLOWED_IMAGE_TYPES.includes(file.type) || ((!file.type || file.type === 'application/octet-stream') && isHeicName(file.name));
  if (!typeOk) throw fail('JPG, PNG, WEBP, HEIC 사진만 올릴 수 있어요.', 'image');
  if (file.size > MAX_IMAGE_BYTES) throw fail('20MB 이하 사진을 골라 주세요.', 'image');
  return file;
}

const toNumber = value => (String(value ?? '').trim() === '' ? NaN : Number(value));

// FormData → { imageFile, latitude, longitude, placeName, description, capturedAt(ISO) }
// imageFile: 미리 변환한 이미지(예: HEIC → JPEG)가 있으면 그것을 사용합니다.
export function parseUploadFields(data, {imageFile, now = Date.now()} = {}) {
  validateImageFile(data.get('image'));
  const image = imageFile ?? data.get('image');
  const placeName = String(data.get('placeName') ?? '').trim();
  if (!placeName) throw fail('촬영 장소명을 입력해 주세요.', 'placeName');
  if (placeName.length > PLACE_MAX) throw fail(`촬영 장소명은 ${PLACE_MAX}자 이내로 입력해 주세요.`, 'placeName');
  const latitude = toNumber(data.get('latitude')), longitude = toNumber(data.get('longitude'));
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) {
    throw fail('지도에서 위치를 찍거나 건물을 골라 주세요. 위도·경도를 직접 입력해도 돼요.', 'latitude');
  }
  if (!isInsideCampus(latitude, longitude)) throw fail('숭실대 캠퍼스 지도 범위 안의 위치를 선택해 주세요.', 'latitude');
  const captured = parseKstInput(String(data.get('capturedAt') ?? ''));
  if (captured === null) throw fail('촬영 날짜와 시간을 확인해 주세요.', 'capturedAt');
  if (captured > now + FUTURE_TOLERANCE_MS) throw fail('촬영 시각이 현재보다 미래예요. 날짜와 시간을 확인해 주세요.', 'capturedAt');
  const description = String(data.get('description') ?? '').trim();
  if (!description) throw fail('사진 설명을 입력해 주세요.', 'description');
  if (description.length > DESCRIPTION_MAX) throw fail(`사진 설명은 ${DESCRIPTION_MAX}자 이내로 입력해 주세요.`, 'description');
  return {imageFile: image, latitude, longitude, placeName, description, capturedAt: new Date(captured).toISOString()};
}

export const readUploadInput = (form, options) => parseUploadFields(new FormData(form), options);
