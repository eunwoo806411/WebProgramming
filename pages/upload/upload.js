// 사진 등록 페이지 진입점: 폼·지도·서비스 호출을 연결만 합니다. 세부 로직은 같은 폴더의 모듈에 둡니다.
import {mountLayout} from '../../shared/js/layout.js';
import {getCurrentUser, createPhoto} from '../../shared/js/service.js';
import {pageUrl, photoUrl} from '../../shared/js/routes.js';
import {readUploadInput, validateImageFile, isInsideCampus} from './upload-input.js';
import {createLocationPicker} from './location-picker.js';
import {CAMPUS_BUILDINGS, searchBuildings, findBuilding} from './campus-buildings.js';

export {readUploadInput};
await mountLayout('upload');

const $ = selector => document.querySelector(selector);
const form = $('#upload-form'), status = $('#upload-status'), locationStatus = $('#upload-location-status');
const latInput = form.elements.latitude, lngInput = form.elements.longitude;
const preview = $('#upload-preview'), submitButton = $('#upload-submit');
let previewUrl = null, submitting = false;

function setStatus(text, isError = false) { status.textContent = text; status.classList.toggle('error', isError); }

// ── 촬영 위치: 지도에서 직접 찍기 / 건물로 선택 ─────────────────
// 두 방법 모두 결과는 같은 위도·경도 입력값입니다. 건물을 고르면 건물 중심 좌표가 들어가고,
// 장소명이 비어 있으면 건물 이름으로 채워집니다. 핀을 직접 옮기면 '지도에서 직접 찍기'로 바뀝니다.
const modeInputs = [...form.elements.locationMode];
const buildingPanel = $('#upload-buildings'), buildingList = $('#building-list'), buildingSearch = $('#building-search');
const locationHint = $('#upload-location-hint'), placeInput = form.elements.placeName;
const HINTS = {
  map: '지도를 클릭하거나 핀을 끌어 위치를 정해요. 좌표를 직접 입력해도 지도에 반영돼요.',
  building: '건물을 고르면 그 건물 위치에 사진이 남아요. 지도의 건물 점을 눌러도 돼요.'
};
let selectedBuildingId = null, autoPlaceName = '';

const currentMode = () => modeInputs.find(input => input.checked)?.value ?? 'map';
function setMode(mode) {
  for (const input of modeInputs) input.checked = input.value === mode;
  buildingPanel.hidden = mode !== 'building';
  locationHint.textContent = HINTS[mode];
}
function showLocation(lat, lng) {
  const building = findBuilding(selectedBuildingId);
  locationStatus.textContent = !Number.isFinite(lat) ? (currentMode() === 'building' ? '아직 건물을 선택하지 않았어요.' : '아직 위치를 선택하지 않았어요.')
    : building ? `선택한 건물: ${building.name} (${lat.toFixed(6)}, ${lng.toFixed(6)})` : `선택한 위치: ${lat.toFixed(6)}, ${lng.toFixed(6)}`;
}
// 직접 위치를 바꾸면 건물 선택을 풀고 '지도에서 직접 찍기'로 전환합니다. 입력한 장소명은 그대로 둡니다.
function releaseBuilding() {
  if (selectedBuildingId === null && currentMode() === 'map') return;
  selectedBuildingId = null; picker?.highlightBuilding(null); renderBuildings(); setMode('map');
}
function writeCoords(lat, lng) { latInput.value = lat.toFixed(6); lngInput.value = lng.toFixed(6); showLocation(lat, lng); }

function selectBuilding(id) {
  const building = findBuilding(id);
  if (!building) return;
  selectedBuildingId = id; setMode('building');
  picker?.setPosition(building.latitude, building.longitude); picker?.highlightBuilding(id);
  writeCoords(building.latitude, building.longitude);
  // 장소명이 비어 있거나 이전에 건물로 자동 입력한 값이면 건물 이름으로 바꿉니다.
  const typed = placeInput.value.trim();
  if (!typed || typed === autoPlaceName) { placeInput.value = building.name; autoPlaceName = building.name; }
  renderBuildings(); setStatus('');
}

function renderBuildings() {
  const items = searchBuildings(buildingSearch.value);
  buildingList.replaceChildren(...items.map(building => {
    const chip = document.createElement('button');
    chip.type = 'button'; chip.className = 'upload-building-chip'; chip.textContent = building.name;
    chip.dataset.buildingId = building.id;
    chip.setAttribute('aria-pressed', String(building.id === selectedBuildingId));
    chip.onclick = () => selectBuilding(building.id);
    return chip;
  }));
  $('#building-empty').hidden = items.length > 0;
}

const picker = createLocationPicker($('#upload-map'), {
  tiles: document.body.dataset.mapTiles !== 'off',
  buildings: CAMPUS_BUILDINGS,
  onBuildingSelect: selectBuilding,
  onChange(lat, lng) {
    // 지도 클릭·핀 끌기 = 직접 지정
    releaseBuilding(); writeCoords(lat, lng); setStatus('');
  },
  onTileError() { $('#upload-map-error').textContent = '배경 지도를 불러오지 못했어요. 건물을 고르거나 좌표를 직접 입력해도 등록할 수 있어요.'; $('#upload-map-error').hidden = false; }
});
if (!picker) { $('#upload-map-error').textContent = '지도 라이브러리를 불러오지 못했어요. 건물을 고르거나 위도·경도를 직접 입력해 주세요.'; $('#upload-map-error').hidden = false; }

for (const input of modeInputs) input.addEventListener('change', () => {
  setMode(input.value);
  if (input.value === 'building') buildingSearch.focus(); else releaseBuilding();
  showLocation(Number.parseFloat(latInput.value), Number.parseFloat(lngInput.value));
});
buildingSearch.addEventListener('input', renderBuildings);
// 검색 결과가 하나뿐이면 Enter로 바로 선택 (폼 제출 방지)
buildingSearch.addEventListener('keydown', e => {
  if (e.key !== 'Enter') return;
  e.preventDefault();
  const items = searchBuildings(buildingSearch.value);
  if (items.length === 1) selectBuilding(items[0].id);
});
setMode('map'); renderBuildings(); showLocation(NaN);

export function requestLocationSelection() {
  if (currentMode() === 'building') { buildingSearch.focus(); setStatus('건물을 골라 촬영 위치를 정해 주세요.'); return; }
  picker?.focus(); setStatus('지도를 클릭하거나 핀을 끌어 촬영 위치를 정해 주세요.');
}

function syncMapFromInputs() {
  const lat = Number(latInput.value), lng = Number(lngInput.value);
  if (latInput.value.trim() === '' || lngInput.value.trim() === '' || !Number.isFinite(lat) || !Number.isFinite(lng)) return;
  if (!isInsideCampus(lat, lng)) { setStatus('숭실대 캠퍼스 지도 범위 밖의 좌표예요.', true); return; }
  releaseBuilding(); setStatus(''); picker?.setPosition(lat, lng); showLocation(lat, lng);
}
latInput.addEventListener('change', syncMapFromInputs);
lngInput.addEventListener('change', syncMapFromInputs);
$('#use-map-center').onclick = () => picker?.useCenter();
$('#clear-location').onclick = () => {
  picker?.clear(); selectedBuildingId = null; renderBuildings();
  latInput.value = lngInput.value = ''; showLocation(NaN);
};

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
    if (currentMode() === 'building' && !selectedBuildingId) throw Object.assign(new Error('촬영 위치로 쓸 건물을 골라 주세요.'), {field: 'buildingSearch'});
    const created = await submitUpload(readUploadInput(form));
    setStatus('등록했어요. 잠시 후 이동합니다.');
    location.href = created?.id ? photoUrl(created.id) : pageUrl('main');
    return;
  } catch (error) {
    setStatus(error.message, true);
    if (error.field === 'buildingSearch') buildingSearch.focus();
    else if (error.field === 'latitude') requestLocationSelection();
    else form.elements[error.field]?.focus();
  }
  submitting = false; submitButton.disabled = false;
};
