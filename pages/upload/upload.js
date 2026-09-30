// 사진 등록 페이지 진입점: 폼·지도·서비스 호출을 연결만 합니다. 세부 로직은 같은 폴더의 모듈에 둡니다.
import {mountLayout} from '../../shared/js/layout.js';
import {getCurrentUser, createPhoto} from '../../shared/js/service.js';
import {pageUrl, photoUrl} from '../../shared/js/routes.js';
import {readUploadInput, validateImageFile, isInsideCampus} from './upload-input.js';
import {createLocationPicker} from './location-picker.js';

export {readUploadInput};
await mountLayout('upload');

const $ = selector => document.querySelector(selector);
const form = $('#upload-form'), status = $('#upload-status'), locationStatus = $('#upload-location-status');
const latInput = form.elements.latitude, lngInput = form.elements.longitude;
const preview = $('#upload-preview'), submitButton = $('#upload-submit');
let previewUrl = null, submitting = false;

function setStatus(text, isError = false) { status.textContent = text; status.classList.toggle('error', isError); }
function showLocation(lat, lng) { locationStatus.textContent = Number.isFinite(lat) ? `선택한 위치: ${lat.toFixed(6)}, ${lng.toFixed(6)}` : '아직 위치를 선택하지 않았어요.'; }

// ── 지도 위치 선택 ──────────────────────────────────────────
const picker = createLocationPicker($('#upload-map'), {
  tiles: document.body.dataset.mapTiles !== 'off',
  onChange(lat, lng) {
    latInput.value = lat.toFixed(6); lngInput.value = lng.toFixed(6);
    showLocation(lat, lng); setStatus('');
  },
  onTileError() { $('#upload-map-error').textContent = '배경 지도를 불러오지 못했어요. 좌표를 직접 입력해도 등록할 수 있어요.'; $('#upload-map-error').hidden = false; }
});
if (!picker) { $('#upload-map-error').textContent = '지도 라이브러리를 불러오지 못했어요. 위도·경도를 직접 입력해 주세요.'; $('#upload-map-error').hidden = false; }
showLocation(NaN);

export function requestLocationSelection() { picker?.focus(); setStatus('지도를 클릭하거나 핀을 끌어 촬영 위치를 정해 주세요.'); }

function syncMapFromInputs() {
  const lat = Number(latInput.value), lng = Number(lngInput.value);
  if (latInput.value.trim() === '' || lngInput.value.trim() === '' || !Number.isFinite(lat) || !Number.isFinite(lng)) return;
  if (!isInsideCampus(lat, lng)) { setStatus('숭실대 캠퍼스 지도 범위 밖의 좌표예요.', true); return; }
  setStatus(''); picker?.setPosition(lat, lng); showLocation(lat, lng);
}
latInput.addEventListener('change', syncMapFromInputs);
lngInput.addEventListener('change', syncMapFromInputs);
$('#use-map-center').onclick = () => picker?.useCenter();
$('#clear-location').onclick = () => { picker?.clear(); latInput.value = lngInput.value = ''; showLocation(NaN); };

// ── 사진 선택·미리보기 ──────────────────────────────────────
form.elements.image.addEventListener('change', e => {
  if (previewUrl) { URL.revokeObjectURL(previewUrl); previewUrl = null; }
  preview.hidden = true; preview.removeAttribute('src');
  const file = e.target.files[0];
  if (!file) return;
  try {
    validateImageFile(file);
    previewUrl = URL.createObjectURL(file); preview.src = previewUrl; preview.hidden = false; setStatus('');
  } catch (error) { e.target.value = ''; setStatus(error.message, true); }
});

// ── 등록 ────────────────────────────────────────────────────
// 실제 저장은 shared/js/service.js의 createPhoto가 담당합니다. 이 페이지는 호출만 합니다.
export async function submitUpload(input) {
  if (!await getCurrentUser()) throw new Error('사진 등록은 로그인 후 사용할 수 있어요.');
  return createPhoto(input);
}

$('#upload-auth').textContent = await getCurrentUser() ? '개발용 테스트 사용자로 접속 중입니다.' : '현재 비로그인 상태예요. 사진 등록에는 로그인이 필요합니다.';

form.onsubmit = async e => {
  e.preventDefault();
  if (submitting) return;
  submitting = true; submitButton.disabled = true; setStatus('등록하는 중…');
  try {
    const created = await submitUpload(readUploadInput(form));
    setStatus('등록했어요. 잠시 후 이동합니다.');
    location.href = created?.id ? photoUrl(created.id) : pageUrl('main');
    return;
  } catch (error) {
    setStatus(error.message, true);
    form.elements[error.field]?.focus();
  }
  submitting = false; submitButton.disabled = false;
};
