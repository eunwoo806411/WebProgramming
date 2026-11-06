// ===== 마이페이지 =====
// 데이터: 공용 service.js (getCurrentUser, listUserPhotos, listUserLikedPhotos)
// 발자취 지도: 메인 페이지의 지도 컴포넌트(createPhotoMap)를 그대로 재사용

import { mountLayout } from '../../shared/js/layout.js';
import * as service from '../../shared/js/service.js';
import { photoUrl, pageUrl } from '../../shared/js/routes.js';
import { CONFIG } from '../../shared/js/config.js';
import { photoImage, showPhotoGroup } from '../../shared/js/photo-ui.js';
import { createPhotoMap } from '../main/map.js';
import {el} from '../../shared/js/dom.js';

await mountLayout('mypage');

/* ---------- 상태 ---------- */
let user = null;
let myPhotos = [];
let likedPhotos = [];
let status = { mine: 'loading', liked: 'loading' }; // 'signed-out' | 'not-connected' | 'ready'
let photoMap = null;

const today = new Date(); today.setHours(0, 0, 0, 0);

/* ---------- 사진 필드 읽기 ----------
   원본 사진 객체는 그대로 두고(지도·photoImage가 원본 필드를 씀),
   마이페이지에서 필요한 값만 읽는 함수예요. 필드 이름이 바뀌면 여기만 고치면 돼요. */
const timeOf = (p) => new Date(p[CONFIG.timeField] ?? p.capturedAt ?? p.createdAt ?? Date.now());
const placeOf = (p) => p.placeName ?? p.place ?? '장소 미정';
const likesOf = (p) => Number(p.likeCount ?? p.likes ?? 0);
const captionOf = (p) => p.description ?? p.caption ?? p.title ?? '';

/* ---------- 데이터 불러오기 (처음 파일의 함수 유지) ---------- */
export async function loadMyPhotos(tab) {
  const u = await service.getCurrentUser();
  if (!u) return { status: 'signed-out', items: [] };
  return tab === 'liked' ? service.listUserLikedPhotos(u.id) : service.listUserPhotos(u.id);
}
export function openPhoto(id) { location.href = photoUrl(id); }

let loadVersion=0;
async function loadAll() {
  const version=++loadVersion,u=await service.getCurrentUser();
  const [mine,liked]=u?await Promise.all([service.listUserPhotos(u.id),service.listUserLikedPhotos(u.id)]):[{status:'signed-out',items:[]},{status:'signed-out',items:[]}];
  if(version!==loadVersion)return;
  user=u;status={mine:mine.status,liked:liked.status};myPhotos=mine.items;likedPhotos=liked.items;
}
async function reload() {
  const statusBox=$('#mypage-status');statusBox.replaceChildren();
  try{await loadAll();refreshAll();if(!user){const link=el('a','button secondary small','로그인하기');link.href=pageUrl('login');statusBox.append(el('p','','로그인하면 내 기록을 확인할 수 있어요.'),link);}if(location.hash==='#account')showAccountStep();}
  catch(error){status.mine=status.liked='error';const retry=el('button','button secondary small','다시 시도');retry.onclick=reload;statusBox.replaceChildren(el('p','error',error.message),retry);refreshAll();}
}

function emptyText(kind) {
  const st = kind === 'liked' ? status.liked : status.mine;
  const title = kind === 'liked' ? '좋아요한 사진' : '업로드한 사진';
  if (st === 'signed-out') return '로그인 후 나만의 사진을 확인할 수 있어요.';
  if (st === 'error') return '기록을 불러오지 못했어요. 위의 다시 시도를 눌러 주세요.';
  if (st === 'loading') return '불러오는 중…';
  return `아직 ${title}이 없어요.`;
}

/* ---------- 공통 유틸 ---------- */
const $ = (s) => document.querySelector(s);
const fmtDate = (d) => `${d.getFullYear()}.${d.getMonth() + 1}.${d.getDate()}`;
function toast(msg) {
  const t = $('#toast'); t.textContent = msg; t.hidden = false;
  clearTimeout(toast.timer); toast.timer = setTimeout(() => (t.hidden = true), 1800);
}
// service.js에 함수가 아직 없으면 안내만 띄우고 멈춰요.
async function callService(name, ...args) {
  try { await service[name](...args); return true; }
  catch (err) { toast(err.message || '처리 중 문제가 생겼어요'); return false; }
}
function photoCard(p, actions = []) {
  const el = document.createElement('article'); el.className = 'mp-photo';
  const img = document.createElement('div'); img.className = 'mp-photo-img';
  img.append(photoImage(p)); img.tabIndex=0;img.setAttribute('role','button');img.setAttribute('aria-label','사진 상세 보기');img.onclick = () => openPhoto(p.id);img.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();openPhoto(p.id);}};
  const body = document.createElement('div'); body.className = 'mp-photo-body';
  body.innerHTML = `<p></p><p class="mp-photo-meta"></p>`;
  body.children[0].textContent = captionOf(p) || placeOf(p);
  body.children[1].textContent = `📍 ${placeOf(p)} · ♥ ${likesOf(p)} · ${fmtDate(timeOf(p))}`;
  if (actions.length) {
    const box = document.createElement('div'); box.className = 'mp-photo-actions';
    actions.forEach(({ label, cls = '', onClick }) => {
      const b = document.createElement('button'); b.type = 'button';
      b.className = `button secondary small ${cls}`; b.textContent = label; b.onclick = async()=>{if(b.disabled)return;b.disabled=true;try{await onClick();}finally{b.disabled=false;}}; box.append(b);
    });
    body.append(box);
  }
  el.append(img, body);
  return el;
}

/* ---------- 첫 화면: 프로필 ---------- */
function renderProfile() {
  const name = user?.nickname ?? user?.name ?? '';
  $('#nickname').textContent = name || (user ? '닉네임 없음' : '로그인이 필요해요');
  $('#avatar').textContent = (name || '?')[0];
  $('#dept').textContent = user ? (user.dept ?? user.department ?? '') : '로그인 후 내 기록을 볼 수 있어요';
  $('#cnt-upload').textContent = myPhotos.length;
  $('#cnt-like').textContent = myPhotos.reduce((s, p) => s + likesOf(p), 0);
  renderGrade();
}

/* ---------- 닉네임 옆 등급 + 등급 안내 팝업 ---------- */
function renderGrade() {
  const n = myPhotos.length, g = gradeOf(n);
  const badge = $('#profile-grade');
  // 로그인했으면 항상 표시 (사진이 0장이거나 목록이 아직 연결 전이면 '등급 없음')
  badge.hidden = !user;
  const none = n < GRADES[0][0];
  badge.classList.toggle('mp-grade-none', none);
  badge.textContent = none ? '🥚 아직 등급 없음' : g.name;

  // 팝업 속 등급 목록: 지난 등급 / 현재 등급 / 남은 등급 구분
  let cur = -1; GRADES.forEach(([min], i) => { if (n >= min) cur = i; });
  $('#grade-list').innerHTML = GRADES.map(([min, name], i) => `
    <li class="${i < cur ? 'done' : i === cur ? 'current' : 'todo'}">
      <span>${name}</span>
      <span class="mp-grade-min">${i === cur ? '현재 등급' : `${min}장~`}</span>
    </li>`).join('');

  const next = GRADES[cur + 1];
  const from = cur >= 0 ? GRADES[cur][0] : 0;
  $('#grade-bar-fill').style.width = next ? `${Math.max(4, ((n - from) / (next[0] - from)) * 100)}%` : '100%';
  $('#grade-progress-text').textContent = next ? `${next[1]}까지 ${next[0] - n}장 남았어요` : `${n}장 달성 · 최고 등급이에요 🎉`;
}
function toggleGradePop(open) {
  const pop = $('#grade-pop'), btn = $('#grade-btn');
  const show = open ?? pop.hidden;
  pop.hidden = !show; btn.setAttribute('aria-expanded', String(show));
}
$('#grade-btn').onclick = (e) => { e.stopPropagation(); toggleGradePop(); };
$('#grade-close').onclick = () => { toggleGradePop(false); $('#grade-btn').focus(); };
document.addEventListener('click', (e) => { if (!e.target.closest('.mp-grade-wrap')) toggleGradePop(false); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !$('#grade-pop').hidden) { toggleGradePop(false); $('#grade-btn').focus(); } });

/* ---------- 첫 화면: 발자취 지도 (메인 지도 재사용) ---------- */
function renderMap() {
  if (!photoMap) {
    photoMap = createPhotoMap($('#map'), {
      onPhoto: openPhoto,
      onGroup: showPhotoGroup,
      tiles: document.body.dataset.mapTiles !== 'off',
    });
  }
  const located = myPhotos.filter((p) => Number.isFinite(p.latitude) && Number.isFinite(p.longitude));
  photoMap.setPhotos(located);
  const places = new Set(located.map(placeOf)).size;
  $('#map-summary').textContent = located.length ? `${places}곳에 남긴 ${located.length}장의 순간` : '';
  const empty = $('#map-empty');
  empty.hidden = located.length > 0;
  empty.textContent = status.mine === 'ready' ? '아직 지도에 남긴 사진이 없어요. 첫 한 장을 남겨보세요.' : emptyText('mine');
}

/* ---------- 첫 화면: 활동 히트맵 ----------
   카드 너비에 따라 보여줄 주(week) 수를 정해요. 넓으면 최대 52주(1년), 좁으면 최소 12주. */
function renderHeatmap() {
  const box = $('#heatmap');
  const width = box.clientWidth || 600;
  const WEEKS = Math.max(12, Math.min(52, Math.floor((width - 22) / 26)));
  box.style.setProperty('--weeks', WEEKS);
  $('#heatmap-months').style.setProperty('--weeks', WEEKS);

  const perDay = {};
  myPhotos.forEach((p) => { const k = timeOf(p).toDateString(); perDay[k] = (perDay[k] || 0) + 1; });
  const start = new Date(today);
  start.setDate(today.getDate() - ((today.getDay() + 6) % 7) - (WEEKS - 1) * 7); // WEEKS주 전 월요일

  // 요일 라벨 (첫 번째 열)
  const cells = ['월', '', '수', '', '금', '', ''].map((t) => {
    const d = document.createElement('div'); d.className = 'day'; d.textContent = t; return d;
  });
  // 월 라벨: 그 주에 새 달이 시작되면 표시
  const months = [document.createElement('span')];
  let activeDays = 0, lastMonth = -1;
  for (let w = 0; w < WEEKS; w++) {
    const weekStart = new Date(start); weekStart.setDate(start.getDate() + w * 7);
    const m = document.createElement('span');
    if (weekStart.getMonth() !== lastMonth) { m.textContent = `${weekStart.getMonth() + 1}월`; lastMonth = weekStart.getMonth(); }
    months.push(m);
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart); d.setDate(weekStart.getDate() + i);
      const c = document.createElement('div');
      if (d > today) { c.className = 'cell'; cells.push(c); continue; } // 아직 안 온 날은 빈칸
      const n = perDay[d.toDateString()] || 0; if (n) activeDays++;
      c.className = `cell l${Math.min(n, 4)}`;
      c.title = `${fmtDate(d)} · ${n ? n + '장 기록' : '기록 없음'}`;
      cells.push(c);
    }
  }
  box.replaceChildren(...cells);
  $('#heatmap-months').replaceChildren(...months);
  $('#heatmap-summary').textContent = `최근 ${WEEKS}주 중 ${activeDays}일 기록`;
}
let resizeTimer;
window.addEventListener('resize', () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(renderHeatmap, 150); });

/* ---------- 내 사진 관리 (수정/삭제) ---------- */
function renderMyPhotos() {
  const grid = $('#my-photo-grid');
  if (!myPhotos.length) { grid.innerHTML = `<p class="mp-empty">${emptyText('mine')}</p>`; return; }
  const sorted = [...myPhotos].sort((a, b) => timeOf(b) - timeOf(a));
  grid.replaceChildren(...sorted.map((p) => photoCard(p, [
    { label: '수정', onClick: () => openEdit(p) },
    { label: '삭제', cls: 'mp-danger', onClick: () => removePhoto(p) },
  ])));
}
function openEdit(p) {
  const dlg = $('#edit-dialog');dlg.returnValue='';
  $('#edit-caption').value = captionOf(p);
  $('#edit-place').value = placeOf(p);
  dlg.onclose = async () => {
    if (dlg.returnValue !== 'save') return;
    const data = { description: $('#edit-caption').value.trim(), placeName: $('#edit-place').value.trim() || placeOf(p) };
    if (!(await callService('updatePhoto', p.id, data))) return;
    await reload(); toast('수정했어요');
  };
  dlg.showModal();
}
async function removePhoto(p) {
  if (!confirm('이 사진을 삭제할까요?')) return;
  if (!(await callService('deletePhoto', p.id))) return;
  await reload(); toast('삭제했어요');
}

/* ---------- 좋아요한 사진 ---------- */
function renderLiked() {
  const grid = $('#liked-grid');
  if (!likedPhotos.length) { grid.innerHTML = `<p class="mp-empty">${emptyText('liked')}</p>`; return; }
  grid.replaceChildren(...likedPhotos.map((p) => photoCard(p, [
    { label: '♥ 좋아요 취소', onClick: async () => {
      if (!(await callService('unlikePhoto', p.id))) return;
      await reload(); toast('좋아요를 취소했어요');
    } },
  ])));
}

/* ---------- 내 통계 ---------- */
function bars(entries) {
  const max=Math.max(1,...entries.map(([,v])=>v));
  return entries.map(([label,value])=>{
    const row=el('div','mp-bar');row.title=`${label} · ${value}장`;
    const track=el('div','mp-bar-track'),fill=el('div','mp-bar-fill');fill.style.width=`${value/max*100}%`;track.append(fill);
    row.append(el('span','',label),track,el('b','',String(value)));return row;
  });
}
/* 등급 달성 기록: 올린 순서대로 N번째 사진을 올린 날 = 그 등급을 딴 날 */
const uploadedAt = (p) => new Date(p.createdAt ?? p.uploadedAt ?? timeOf(p));
function renderGradeHistory() {
  const list = [...myPhotos].sort((a, b) => uploadedAt(a) - uploadedAt(b));
  const n = list.length;
  const got = GRADES.filter(([min]) => n >= min).length;
  $('#stat-grade-sub').textContent = `${GRADES.length}단계 중 ${got}단계 달성`;
  $('#stat-grades').innerHTML = GRADES.map(([min, name], i) => {
    if (n >= min) {
      return `<li class="done"><span class="mp-tl-dot"></span><div><b>${name}</b><small>${min}번째 사진 · ${fmtDate(uploadedAt(list[min - 1]))} 달성</small></div></li>`;
    }
    if (i === got) {
      return `<li class="next"><span class="mp-tl-dot"></span><div><b>${name}</b><small>다음 목표 · ${min - n}장 남음</small></div></li>`;
    }
    return `<li class="todo"><span class="mp-tl-dot"></span><div><b>${name}</b><small>${min}장</small></div></li>`;
  }).join('');
}

// '현재 등급' 칸: 이모지와 칭호를 나눠서 깔끔하게 표시
function gradeTile() {
  const n = myPhotos.length;
  if (n < GRADES[0][0]) return `<div class="mp-stat"><span>현재 등급</span><div class="mp-stat-grade"><i>🥚</i><b>아직 없음</b></div></div>`;
  const [icon, ...rest] = gradeOf(n).name.split(' ');
  return `<div class="mp-stat"><span>현재 등급</span><div class="mp-stat-grade"><i>${icon}</i><b>${rest.join(' ')}</b></div></div>`;
}

function renderStats() {
  const totalLikes = myPhotos.reduce((s, p) => s + likesOf(p), 0);
  $('#stat-tiles').innerHTML = [
    ['총 업로드', `${myPhotos.length}장`],
    ['받은 좋아요', totalLikes],
  ].map(([k, v]) => `<div class="mp-stat"><span>${k}</span><strong>${v}</strong></div>`).join('')
    + gradeTile();
  renderGradeHistory();

  const none = `<p class="mp-muted">${emptyText('mine')}</p>`;
  const byPlace = Object.create(null); myPhotos.forEach((p) => (byPlace[placeOf(p)] = (byPlace[placeOf(p)] || 0) + 1));
  $('#stat-places').replaceChildren(...(myPhotos.length?bars(Object.entries(byPlace).sort((a,b)=>b[1]-a[1]).slice(0,3)):[el('p','mp-muted',emptyText('mine'))]));

  const top = [...myPhotos].sort((a, b) => likesOf(b) - likesOf(a)).slice(0, 3);
  const box = $('#stat-best');
  if (!top.length) { box.innerHTML = none; return; }
  box.replaceChildren(...top.map((p, i) => {
    const row = document.createElement('div'); row.className = 'mp-best';
    const rank = document.createElement('span'); rank.className = 'mp-rank'; rank.textContent = i + 1;
    const img = document.createElement('div'); img.className = 'mp-photo-img';
    img.append(photoImage(p)); img.tabIndex=0;img.setAttribute('role','button');img.setAttribute('aria-label','사진 상세 보기');img.onclick = () => openPhoto(p.id);img.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();openPhoto(p.id);}};
    const text = document.createElement('div');
    text.innerHTML = '<p style="margin:0"></p><p class="mp-photo-meta"></p>';
    text.children[0].textContent = captionOf(p) || placeOf(p);
    text.children[1].textContent = `📍 ${placeOf(p)} · ♥ ${likesOf(p)} · ${fmtDate(timeOf(p))}`;
    row.append(rank, img, text);
    return row;
  }));
}

/* ---------- 로그인한 내 계정 정보 ---------- */


// 회원 등급: 올린 사진 장수로 계산 (재미 요소 · 기능 차이는 없음)
const GRADES = [
  [1, '🌱 첫 셔터'], [5, '📸 캠퍼스 스냅러'], [10, '🎞️ 숭실 필름러'], [20, '🖼️ 숭실 사진가'],
  [30, '📚 숭실 기록가'], [40, '🗂️ 숭실 큐레이터'], [50, '🏛️ 숭실 아키비스트'],
];
function gradeOf(n) {
  if (n < GRADES[0][0]) return { name: '아직 등급이 없어요', next: '첫 사진을 올리면 🌱 첫 셔터!' };
  let i = 0; while (i + 1 < GRADES.length && n >= GRADES[i + 1][0]) i++;
  const next = GRADES[i + 1];
  return { name: GRADES[i][1], next: next ? `다음 등급까지 ${next[0] - n}장` : '최고 등급이에요 🎉' };
}

function renderAccountInfo() {
  $('#info-id').textContent = user?.loginId ?? user?.username ?? user?.email ?? user?.id ?? '-';
  $('#info-nickname').textContent = user?.nickname ?? user?.name ?? '-';
  const joined = user?.createdAt ?? user?.joinedAt;
  $('#info-joined').textContent = joined ? fmtDate(new Date(joined)) : '정보 없음';
  const g = gradeOf(myPhotos.length);
  $('#info-grade').textContent = g.name; $('#info-grade-next').textContent = g.next;
}
function closeInlineForms() {$('#account-form').hidden=true;$('#account-form').reset();}
function showAccountStep() {
  $('#account-edit').hidden=!user;
  if(user)renderAccountInfo();
  closeInlineForms();
}
document.querySelector('[data-edit="nickname"]').onclick=()=>{
  const form=$('#account-form'),open=form.hidden;closeInlineForms();form.hidden=!open;
  if(open){$('#nickname-input').value=user?.nickname??'';$('#nickname-input').focus();}
};
document.querySelectorAll('[data-cancel]').forEach(b=>b.onclick=closeInlineForms);
$('#account-form').onsubmit = async (e) => {
  e.preventDefault();
  const v = $('#nickname-input').value.trim();
  if ([...v].length < 2 || [...v].length > 12) { toast('닉네임은 2~12자로 입력해 주세요'); return; }
  if (!(await callService('updateNickname', user.id, v))) return;
  user.nickname = v; renderProfile(); renderAccountInfo(); closeInlineForms(); toast('닉네임을 저장했어요');
};

/* ---------- 화면 전환 (#account, #my-photos ...) ---------- */
const VIEWS = { '': 'home', account: 'account', 'my-photos': 'my-photos', liked: 'liked', stats: 'stats' };
function route() {
  const key = VIEWS[location.hash.slice(1)] ?? 'home';
  document.querySelectorAll('.mp-view').forEach((v) => (v.hidden = v.id !== `view-${key}`));
  if (key === 'account') showAccountStep();
  if (key === 'home' && photoMap) requestAnimationFrame(() => { renderMap(); renderHeatmap(); }); // 숨겨졌던 화면 다시 그리기
  window.scrollTo(0, 0);
}
function refreshAll() { renderProfile(); renderMap(); renderHeatmap(); renderMyPhotos(); renderLiked(); renderStats(); }

document.querySelectorAll('.mp-back').forEach((a) => (a.onclick = (e) => { e.preventDefault(); location.hash = ''; }));
window.addEventListener('hashchange', route);
route();
refreshAll();          // 불러오는 동안 틀 먼저
await reload();
document.addEventListener('photos-changed',reload);