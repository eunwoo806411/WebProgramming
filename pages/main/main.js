import {mountLayout} from '../../shared/js/layout.js';
import {listPhotos} from '../../shared/js/service.js';
import {filterPhotos} from '../../shared/js/photo-query.js';
import {CONFIG} from '../../shared/js/config.js';
import {el,notice} from '../../shared/js/dom.js';
import {createPhotoCard,showPhotoDetail} from '../../shared/js/photo-ui.js';
import {createPhotoMap} from './map.js?v=20261010-3';
import {mountTimeControls} from './time-controls.js?v=20261010-1';
import {selectSidebarPhotos} from './sidebar-photos.js';
await mountLayout('main');
const photosContainer=document.querySelector('#photo-list');
try{
 let photos=await listPhotos(),selection,selectedId=null,periodPhotos=[],bounds=null,placeIds=null,placeLabel='',limit=10;
 const map=createPhotoMap(document.querySelector('#map'),{
  onPhoto:showPhotoDetail,tiles:document.body.dataset.mapTiles!=='off',
  onViewChange(value,{clearGroup}){bounds=value;if(clearGroup){placeIds=null;limit=10;photosContainer.scrollTop=0;}renderSidebar();},
  onGroupSelect(items,samePlace){placeIds=items.map(p=>p.id);placeLabel=samePlace?items[0].placeName:'선택한 사진 묶음';limit=10;bounds=map.getBounds();photosContainer.scrollTop=0;renderSidebar();}
 });
 document.querySelector('#filter-basis').textContent=`${CONFIG.timeField==='capturedAt'?'촬영':'업로드'} 시각 기준 · 한국 시간`;
 function renderSidebar(){
  const result=selectSidebarPhotos(periodPhotos,{bounds,ids:placeIds,limit});
  const focusKey=photosContainer.contains(document.activeElement)?document.activeElement.dataset.focusKey:null;
  photosContainer.replaceChildren(...result.photos.map(p=>{
   const row=el('article','sidebar-photo'),detail=el('button','photo-detail-link','사진 상세 보기 →');detail.type='button';detail.hidden=p.id!==selectedId;detail.onclick=()=>showPhotoDetail(p.id);
   const card=createPhotoCard(p,()=>{
    selectedId=p.id;map.focusPhoto(p.id);
    for(const item of photosContainer.querySelectorAll('.sidebar-photo')){
     const active=item.dataset.photoId===selectedId;item.querySelector('.photo-card').setAttribute('aria-pressed',String(active));item.querySelector('.photo-detail-link').hidden=!active;
    }
   });card.setAttribute('aria-pressed',String(p.id===selectedId));card.setAttribute('aria-label',`${p.placeName} · 지도에서 위치 보기 · ${p.description}`);
   row.dataset.photoId=p.id;row.append(card,detail);return row;
  }));
  if(focusKey)for(const card of photosContainer.querySelectorAll('[data-focus-key]'))if(card.dataset.focusKey===focusKey)card.focus({preventScroll:true});
  if(!result.total)photosContainer.append(el('div','empty',!selection?.valid?'시간 범위를 확인해 주세요.':placeIds?'이 장소에 선택한 기간의 사진이 없어요.':'이 지도 안에 선택한 기간의 사진이 없어요. 지도를 이동하거나 기간을 넓혀 보세요.'));
  document.querySelector('#photo-count').textContent=`${result.total}장`;
  document.querySelector('#sidebar-title').textContent=placeIds?'이 장소의 순간':'이 지도 안의 순간';
  document.querySelector('#sidebar-scope').textContent=placeIds?placeLabel:'지도를 움직이면 목록도 바뀌어요.';
  document.querySelector('#scope-reset').hidden=!placeIds;
  const more=document.querySelector('#more-photos');more.hidden=result.photos.length>=result.total;more.textContent=`더 보기 · ${result.photos.length}/${result.total}장`;
 }
 function render(){
  if(!selection)return;
  periodPhotos=selection.valid?filterPhotos(photos,{...selection,field:CONFIG.timeField}):[];
  if(!periodPhotos.some(p=>p.id===selectedId))selectedId=null;
  document.querySelector('#results-summary').textContent=selection.valid?`선택한 시간 속 ${periodPhotos.length}장의 순간`:'시간 범위를 다시 확인해 주세요';
  map.setPhotos(periodPhotos);bounds=map.getBounds();renderSidebar();
 }
 document.querySelector('#more-photos').onclick=()=>{limit+=10;renderSidebar();};
 const clearPlace=()=>{placeIds=null;limit=10;bounds=map.getBounds();photosContainer.scrollTop=0;renderSidebar();};
 document.querySelector('#scope-reset').onclick=clearPlace;
 document.querySelector('#reset-map').addEventListener('click',clearPlace);
 mountTimeControls(document.querySelector('#time-controls'),{photos,onChange:value=>{selection=value;limit=10;placeIds=null;render();}});
 document.addEventListener('photos-changed',async()=>{photos=await listPhotos();render();});
 const deepLink=new URL(location.href).searchParams.get('photo');if(deepLink)showPhotoDetail(deepLink);
}catch(e){photosContainer.replaceChildren(el('div','empty','사진을 불러오지 못했어요. 새로고침 후 다시 시도해 주세요.'));notice(e.message);}
