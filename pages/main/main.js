import {mountLayout} from '../../shared/js/layout.js';
import {listPhotoPage,listMapPhotos,getPhotoExtent} from '../../shared/js/service.js';
import {el,notice} from '../../shared/js/dom.js';
import {createPhotoCard,showPhotoDetail} from '../../shared/js/photo-ui.js';
import {createPhotoMap} from './map.js?v=20261010-3';
import {mountTimeControls} from './time-controls.js?v=20261028-1';
import {createLatestRequest} from './latest-request.js';
await mountLayout('main');
const container=document.querySelector('#photo-list'),more=document.querySelector('#more-photos'),summary=document.querySelector('#results-summary');
try{
 const extent=await getPhotoExtent(),mapGate=createLatestRequest(),listGate=createLatestRequest();
 let selection,bounds,placeIds=null,placeLabel='',selectedId=null,rows=[],total=0,nextCursor=null,sidebarRequest=0;
 const scope=document.querySelector('#sidebar-scope');
 const map=createPhotoMap(document.querySelector('#map'),{
  onPhoto:showPhotoDetail,tiles:document.body.dataset.mapTiles!=='off',
  onViewChange(value,{clearGroup}){bounds=value;if(clearGroup){placeIds=null;container.scrollTop=0;}refreshMap();refreshSidebar();},
  onGroupSelect(items,samePlace){placeIds=items.map(p=>p.id);placeLabel=samePlace?items[0].placeName:'선택한 사진 묶음';bounds=map.getBounds();container.scrollTop=0;refreshSidebar();}
 });
 bounds=map.getBounds();
 document.querySelector('#filter-basis').textContent='업로드 시각 기준 · 한국 시간';
 const query=()=>({start:selection.start,end:selection.end,bounds});
 function renderRows(){
  const focusKey=container.contains(document.activeElement)?document.activeElement.dataset.focusKey:null;
  container.replaceChildren(...rows.map(p=>{
   const row=el('article','sidebar-photo'),detail=el('button','photo-detail-link','사진 상세 보기 →');row.dataset.photoId=p.id;detail.type='button';detail.hidden=p.id!==selectedId;detail.onclick=()=>showPhotoDetail(p.id);
   const card=createPhotoCard(p,()=>{
    selectedId=p.id;map.focusPhoto(p.id);
    for(const item of container.querySelectorAll('.sidebar-photo')){const active=item.dataset.photoId===selectedId;item.querySelector('.photo-card').setAttribute('aria-pressed',String(active));item.querySelector('.photo-detail-link').hidden=!active;}
   });card.setAttribute('aria-pressed',String(p.id===selectedId));card.setAttribute('aria-label',`${p.placeName} · 지도에서 위치 보기 · ${p.description}`);row.append(card,detail);return row;
  }));
  if(focusKey)for(const card of container.querySelectorAll('[data-focus-key]'))if(card.dataset.focusKey===focusKey)card.focus({preventScroll:true});
  if(!rows.length)container.append(el('div','empty',!selection?.valid?'시간 범위를 확인해 주세요.':placeIds?'이 장소에 선택한 기간의 사진이 없어요.':'이 지도 안에 선택한 기간의 사진이 없어요. 지도를 이동하거나 기간을 넓혀 보세요.'));
  document.querySelector('#photo-count').textContent=`${total}장`;
  document.querySelector('#sidebar-title').textContent=placeIds?'이 장소의 순간':'이 지도 안의 순간';
  document.querySelector('#scope-reset').hidden=!placeIds;
  scope.textContent=placeIds?placeLabel:'지도를 움직이면 목록도 바뀌어요.';
  more.hidden=!nextCursor;more.textContent=`더 보기 · ${rows.length}/${total}장`;
 }
 async function refreshMap(){
  if(!selection?.valid){mapGate.invalidate();map.setPhotos([]);summary.textContent='시간 범위를 다시 확인해 주세요';return;}
  summary.textContent='사진을 불러오는 중…';
  try{const result=await mapGate.run(()=>listMapPhotos(query()));if(!result.current)return;
   map.setPhotos(result.value.photos);
   summary.textContent=`선택한 시간 속 ${result.value.periodTotal}장의 순간${result.value.truncated?' · 지도를 확대하면 더 많은 사진을 볼 수 있어요.':''}`;
  }catch(error){map.setPhotos([]);summary.textContent='지도 사진을 불러오지 못했어요. ';const retry=el('button','button secondary small','다시 시도');retry.type='button';retry.onclick=()=>refreshMap();summary.append(retry);}
 }
 async function refreshSidebar(append=false){
  const request=++sidebarRequest;
  if(!selection)return;
  if(!selection.valid){listGate.invalidate();rows=[];total=0;nextCursor=null;container.setAttribute('aria-busy','false');more.disabled=false;renderRows();return;}
  const cursor=append?nextCursor:null;if(append&&!cursor)return;
  if(!append){nextCursor=null;more.hidden=true;}
  more.disabled=true;container.setAttribute('aria-busy','true');scope.textContent='사진을 불러오는 중…';
  try{
   const result=await listGate.run(()=>listPhotoPage({...query(),ids:placeIds,cursor,limit:10}));if(!result.current)return;
   rows=append?[...rows,...result.value.photos]:result.value.photos;total=result.value.total;nextCursor=result.value.nextCursor;renderRows();
  }catch(error){
   if(!append)container.replaceChildren();
   scope.textContent='사진을 불러오지 못했어요.';
   const box=el('div','empty'),retry=el('button','button secondary small','다시 시도');retry.type='button';retry.onclick=()=>{refreshMap();refreshSidebar(append);};box.append(el('p','',error.message),retry);container.append(box);
  }finally{if(request===sidebarRequest){container.setAttribute('aria-busy','false');more.disabled=false;}}
 }
 more.onclick=()=>refreshSidebar(true);
 document.querySelector('#scope-reset').onclick=()=>{placeIds=null;container.scrollTop=0;refreshSidebar();};
 document.querySelector('#reset-map').addEventListener('click',()=>{placeIds=null;bounds=map.getBounds();refreshSidebar();});
 const photos=[extent.start,extent.end].filter(Boolean).map(uploadedAt=>({uploadedAt}));
 mountTimeControls(document.querySelector('#time-controls'),{photos,onChange:value=>{selection=value;placeIds=null;selectedId=null;listGate.invalidate();mapGate.invalidate();container.scrollTop=0;refreshMap();refreshSidebar();}});
 document.addEventListener('photos-changed',()=>{refreshMap();refreshSidebar();});
 const id=new URL(location.href).searchParams.get('photo');if(id)showPhotoDetail(id);
}catch(error){
 const retry=el('button','button secondary small','다시 시도');retry.onclick=()=>location.reload();
 container.replaceChildren(el('div','empty','사진을 불러오지 못했어요.'),retry);notice(error.message);
}
