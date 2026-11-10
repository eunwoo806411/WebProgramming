// 사진 등록 페이지 진입점: 폼·지도·서비스 호출을 연결만 합니다. 세부 로직은 같은 폴더의 모듈에 둡니다.
import {mountLayout} from '../../shared/js/layout.js';
import {getCurrentUser, createPhoto} from '../../shared/js/service.js';
import {pageUrl, photoUrl} from '../../shared/js/routes.js';
import {toKstInput} from '../../shared/js/time.js';
import {readUploadInput, parseUploadFields, validateImageFile, isInsideCampus, DESCRIPTION_MAX} from './upload-input.js';
import {prepareImage} from './image-prepare.js';
import {createLocationPicker} from './location-picker.js';
import {CAMPUS_BUILDINGS, searchBuildings, findBuilding} from './campus-buildings.js';

export {readUploadInput};
await mountLayout('upload');

const $ = selector => document.querySelector(selector);
const form = $('#upload-form'), fields = $('#upload-fields'), status = $('#upload-status'), locationStatus = $('#upload-location-status');
const latInput = form.elements.latitude, lngInput = form.elements.longitude, capturedInput = form.elements.capturedAt, descInput = form.elements.description;
const submitButton = $('#upload-submit');
let submitting = false, currentUser = null;

function setStatus(text, isError = false) { status.textContent = text; status.classList.toggle('error', isError); status.classList.remove('success'); }

// ── 로그인 확인: 로그인 전에는 입력 자체를 막고 안내합니다 ────────────
// 로그인 화면에 next=upload를 넘겨 로그인 후 이 페이지로 돌아옵니다.
const loginUrl = (() => { const u = pageUrl('login'); u.searchParams.set('next', 'upload'); return u.href; })();
$('#upload-login').href = loginUrl;
function lockForm(locked) {
  fields.disabled = locked; submitButton.disabled = locked;
  form.classList.toggle('is-locked', locked); $('#upload-gate').hidden = !locked;
}
try {
  currentUser = await getCurrentUser();
  $('#upload-auth').textContent = currentUser ? (currentUser.nickname ? `${currentUser.nickname} 님 계정으로 사진을 남겨요.` : '로그인한 계정으로 사진을 남겨요.') : '사진 등록에는 로그인이 필요해요.';
  lockForm(!currentUser);
} catch (error) { $('#upload-auth').textContent = error.message; }

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
  if (fields.disabled) return;
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
  $('#building-count').textContent = buildingSearch.value.trim()
    ? `검색 결과 ${items.length}곳` : `숭실대 건물 ${CAMPUS_BUILDINGS.length}곳 · 이름을 검색하거나 아래에서 골라요`;
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
  if (currentMode() === 'building') { buildingSearch.focus(); return; }
  picker?.focus();
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

// ── 촬영 시각: 기본은 지금, 사진 속 촬영 정보(EXIF)가 있으면 그 시각 ──────
const nowInput = () => toKstInput(Math.floor(Date.now() / 1000) * 1000);
const capturedNote = $('#captured-note');
let capturedTouched = false;
function showCapturedNote(text) { capturedNote.textContent = text; capturedNote.hidden = !text; }
capturedInput.value = nowInput(); capturedInput.max = nowInput();
// 미래 시각을 고르지 못하도록 입력할 때마다 상한을 지금으로 맞춥니다.
capturedInput.addEventListener('focus', () => { capturedInput.max = nowInput(); });
capturedInput.addEventListener('input', () => { capturedTouched = true; showCapturedNote(''); });

// ── 사진 선택·미리보기 (버튼 · 끌어다 놓기) ──────────────────────
const imageInput = form.elements.image, drop = $('#upload-drop');
const dropEmpty = $('#upload-drop-empty'), dropSelected = $('#upload-drop-selected'), dropBusy = $('#upload-drop-busy');
const preview = $('#upload-preview');
let previewUrl = null, prepared = null, preparing = null, selectToken = 0;

const formatBytes = bytes => bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)}MB` : `${Math.max(1, Math.round(bytes / 1024))}KB`;
function showDrop(state) {
  dropEmpty.hidden = state !== 'empty'; dropSelected.hidden = state !== 'selected'; dropBusy.hidden = state !== 'busy';
  drop.classList.toggle('has-image', state === 'selected');
}
function clearImage() {
  selectToken++;
  if (previewUrl) { URL.revokeObjectURL(previewUrl); previewUrl = null; }
  preview.removeAttribute('src'); imageInput.value = ''; prepared = null; preparing = null;
  showDrop('empty');
}

async function handleImage(file) {
  const token = ++selectToken;
  if (previewUrl) { URL.revokeObjectURL(previewUrl); previewUrl = null; }
  prepared = null;
  if (!file) { showDrop('empty'); return; }
  setStatus('');
  try { validateImageFile(file); }
  catch (error) { clearImage(); setStatus(error.message, true); return; }
  showDrop('busy');
  dropBusy.textContent = /\.hei[cf]$/i.test(file.name) || /hei[cf]/i.test(file.type) ? 'HEIC 사진을 JPG로 바꾸는 중이에요… (몇 초 걸려요)' : '사진을 확인하는 중이에요…';
  preparing = prepareImage(file);
  try {
    const result = await preparing;
    if (token !== selectToken) return;
    prepared = result;
    previewUrl = URL.createObjectURL(result.blob); preview.src = previewUrl;
    $('#upload-file-name').textContent = file.name;
    $('#upload-file-meta').textContent = `${formatBytes(file.size)} · ${result.width}×${result.height}${result.converted ? ' · HEIC를 JPG로 변환함' : ''}`;
    showDrop('selected');
    if (!capturedTouched) {
      if (result.capturedAt) { capturedInput.value = result.capturedAt; showCapturedNote('사진 정보에서 촬영 시각을 가져왔어요. 다르면 고쳐 주세요.'); }
      else { capturedInput.value = nowInput(); showCapturedNote('사진에 촬영 시각 정보가 없어 지금 시각을 넣었어요. 다르면 고쳐 주세요.'); }
    }
  } catch (error) {
    if (token !== selectToken) return;
    clearImage(); setStatus(error.message, true);
  } finally { if (token === selectToken) preparing = null; }
}

imageInput.addEventListener('change', () => handleImage(imageInput.files[0]));
$('#pick-image').onclick = () => imageInput.click();
$('#change-image').onclick = () => imageInput.click();
$('#remove-image').onclick = () => { clearImage(); $('#pick-image').focus(); };
for (const type of ['dragenter', 'dragover']) drop.addEventListener(type, e => {
  if (fields.disabled || !e.dataTransfer?.types.includes('Files')) return;
  e.preventDefault(); drop.classList.add('is-dragging');
});
for (const type of ['dragleave', 'dragend']) drop.addEventListener(type, e => { if (!drop.contains(e.relatedTarget)) drop.classList.remove('is-dragging'); });
drop.addEventListener('drop', e => {
  drop.classList.remove('is-dragging');
  if (fields.disabled) return;
  e.preventDefault();
  const file = e.dataTransfer?.files?.[0];
  if (!file) return;
  // 폼에도 같은 파일이 들어가도록 파일 입력칸을 맞춥니다.
  try { const dt = new DataTransfer(); dt.items.add(file); imageInput.files = dt.files; } catch { /* 일부 브라우저는 미지원: 미리 준비한 이미지로 등록 */ }
  handleImage(file);
});
// 끌어다 놓기 영역 밖에 떨어뜨려 사진이 새 탭으로 열리는 것을 막습니다.
window.addEventListener('dragover', e => { if (e.dataTransfer?.types.includes('Files')) e.preventDefault(); });
window.addEventListener('drop', e => { if (!drop.contains(e.target)) e.preventDefault(); });

// ── 설명 글자 수 ────────────────────────────────────────────
const descCount = $('#description-count');
const updateCount = () => { descCount.textContent = `${descInput.value.length} / ${DESCRIPTION_MAX}`; };
descInput.addEventListener('input', updateCount); updateCount();

// 오류를 본 뒤 입력을 고치면 지난 오류 문구를 지웁니다.
form.addEventListener('input', () => { if (!submitting && status.classList.contains('error')) setStatus(''); });

// ── 등록 ────────────────────────────────────────────────────
// 실제 저장은 shared/js/service.js의 createPhoto가 담당합니다. (로그인 확인도 그 안에서 한 번만 합니다)
export async function submitUpload(input) { return createPhoto(input); }

function focusField(field) {
  if (field === 'image') $('#pick-image').focus();
  else if (field === 'buildingSearch') buildingSearch.focus();
  else if (field === 'latitude') requestLocationSelection();
  else form.elements[field]?.focus();
}

form.onsubmit = async e => {
  e.preventDefault();
  if (submitting) return;
  if (!currentUser) { lockForm(true); setStatus('사진 등록은 로그인 후 사용할 수 있어요.', true); return; }
  submitting = true; submitButton.disabled = true; setStatus('등록하는 중…');
  let done = false;
  try {
    if (preparing) await preparing.catch(() => {});
    if (!prepared) throw Object.assign(new Error(imageInput.files[0] ? '사진 파일을 열 수 없어요. 다른 사진을 골라 주세요.' : '등록할 사진을 골라 주세요.'), {field: 'image'});
    // 화면에서 고른 파일과 끌어다 놓은 파일이 다를 수 있어 미리 준비한 이미지 기준으로 검사합니다.
    const data = new FormData(form); if (!data.get('image')?.size) data.set('image', prepared.blob, 'photo.jpg');
    if (currentMode() === 'building' && !selectedBuildingId) throw Object.assign(new Error('촬영 위치로 쓸 건물을 골라 주세요.'), {field: 'buildingSearch'});
    const input = parseUploadFields(data, {imageFile: prepared.blob});
    const created = await submitUpload(input);
    done = true;
    status.textContent = '등록했어요! 방금 남긴 사진을 지도에서 보여 드릴게요.'; status.classList.add('success');
    submitButton.textContent = '등록 완료 ✓';
    setTimeout(() => { location.href = created?.id ? photoUrl(created.id) : pageUrl('main'); }, 1200);
  } catch (error) {
    if (error.code === 'AUTH_REQUIRED') { currentUser = null; lockForm(true); }
    setStatus(error.message, true);
    focusField(error.field);
  } finally {
    if (!done) { submitting = false; submitButton.disabled = form.classList.contains('is-locked'); }
  }
};
