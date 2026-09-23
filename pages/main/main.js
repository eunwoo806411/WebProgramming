import {mountLayout} from '../../shared/js/layout.js';
import {listPhotos} from '../../shared/js/service.js';
import {filterPhotos} from '../../shared/js/photo-query.js';
import {CONFIG} from '../../shared/js/config.js';
import {el,notice} from '../../shared/js/dom.js';
import {createPhotoCard,showPhotoDetail,showPhotoGroup} from '../../shared/js/photo-ui.js';
import {createPhotoMap} from './map.js';
import {mountTimeControls} from './time-controls.js';
await mountLayout('main');
const photosContainer=document.querySelector('#photo-list');
try{
 let photos=await listPhotos(),selection;
 const map=createPhotoMap(document.querySelector('#map'),{onPhoto:showPhotoDetail,onGroup:showPhotoGroup,tiles:document.body.dataset.mapTiles!=='off'});
 document.querySelector('#filter-basis').textContent=`${CONFIG.timeField==='capturedAt'?'촬영':'업로드'} 시각 기준 · 한국 시간`;
 function render(){
  if(!selection)return;
  const visible=selection.valid?filterPhotos(photos,{...selection,field:CONFIG.timeField}):[];
  photosContainer.replaceChildren(...visible.map(p=>createPhotoCard(p,()=>showPhotoDetail(p.id))));
  if(!visible.length)photosContainer.append(el('div','empty',selection.valid?'선택한 기간에 업로드된 사진이 없어요. 시간 범위를 넓혀 보세요.':'시간 범위를 확인해 주세요. 올바른 범위를 입력하면 사진이 표시돼요.'));
  document.querySelector('#photo-count').textContent=`${visible.length}장의 기록`;
  document.querySelector('#results-summary').textContent=selection.valid?`선택한 시간 속 ${visible.length}장의 순간`:'시간 범위를 다시 확인해 주세요';
  map.setPhotos(visible);
 }
 mountTimeControls(document.querySelector('#time-controls'),{photos,onChange:value=>{selection=value;render();}});
 document.addEventListener('photos-changed',async()=>{photos=await listPhotos();render();});
 const deepLink=new URL(location.href).searchParams.get('photo');if(deepLink)showPhotoDetail(deepLink);
}catch(e){photosContainer.replaceChildren(el('div','empty','사진을 불러오지 못했어요. 새로고침 후 다시 시도해 주세요.'));notice(e.message);}
