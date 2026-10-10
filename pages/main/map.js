import {CONFIG} from '../../shared/js/config.js';
import {el} from '../../shared/js/dom.js';
import {photoImage} from '../../shared/js/photo-ui.js';
import {groupByCoordinate,clusterGroups} from './clusters.js';
import {mountSmoothWheelZoom} from './wheel-zoom.js';
export function createPhotoMap(container,{onPhoto,onGroup,onGroupSelect,onViewChange,tiles=true}={}){
 const problem=document.querySelector('#map-error');
 function showProblem(text,retry){problem.replaceChildren(el('span','',text));if(retry){const b=el('button','button secondary small','다시 시도');b.onclick=retry;problem.append(b);}problem.hidden=false;}
 if(!window.L){showProblem('지도 라이브러리를 불러오지 못했어요. 사진 목록은 계속 사용할 수 있어요.',()=>location.reload());return {setPhotos(){},getBounds(){return null;},focusPhoto(){return false;},destroy(){}};}
 const L=window.L, map=L.map(container,{
  zoomControl:false,minZoom:CONFIG.map.minZoom,maxZoom:CONFIG.map.maxZoom,
  maxBounds:CONFIG.map.maxBounds,maxBoundsViscosity:1,
  zoomSnap:0,zoomDelta:1,scrollWheelZoom:false,
  bounceAtZoomLimits:false,zoomAnimation:true,fadeAnimation:true
 }).setView(CONFIG.map.center,CONFIG.map.zoom);
 const wheel=mountSmoothWheelZoom(map,container,CONFIG.map.wheelPxPerZoomLevel);
 L.control.zoom({position:'topright',zoomInTitle:'확대',zoomOutTitle:'축소'}).addTo(map);
 let tileLayer;
 // 연속 확대의 view reset에서도 기존 타일을 유지합니다.
 // 뒤따르는 viewreset/zoom 이벤트가 위치·해상도 갱신과 타일 정리를 처리합니다.
 const PersistentTileLayer=L.TileLayer.extend({getEvents(){
  const events=L.TileLayer.prototype.getEvents.call(this);
  delete events.viewprereset;
  return events;
 }});
 if(tiles){tileLayer=new PersistentTileLayer(CONFIG.map.tileUrl,{maxNativeZoom:CONFIG.map.maxNativeZoom,maxZoom:CONFIG.map.maxZoom,updateWhenZooming:false,keepBuffer:4,attribution:CONFIG.map.attribution}).addTo(map);
 tileLayer.on('tileerror',()=>showProblem('배경 지도를 불러오지 못했어요. 네트워크를 확인해 주세요.',()=>{problem.hidden=true;tileLayer.redraw();}));}
 const markers=L.layerGroup().addTo(map);let photos=[],selectedId=null,programmaticMove=false;
 const getBounds=()=>{const b=map.getBounds();return {south:b.getSouth(),west:b.getWest(),north:b.getNorth(),east:b.getEast()};};
 function render(){
  const clusters=clusterGroups(groupByCoordinate(photos),g=>map.latLngToContainerPoint([g.latitude,g.longitude]),{radius:78,separate:map.getZoom()===CONFIG.map.maxZoom});
  markers.clearLayers();
  container.dataset.zoom=String(map.getZoom());container.dataset.markerCount=String(clusters.length);
  for(const cluster of clusters){
   const group=cluster.groups[0],p=cluster.photos[0],button=el('button');button.type='button';button.dataset.focusKey='map:'+cluster.groups.map(g=>`${g.latitude},${g.longitude}`).sort().join(';');
   const label=cluster.photos.length===1?`${p.placeName} · 사진 보기`:cluster.groups.length===1?`${p.placeName} · 같은 위치 사진 ${cluster.photos.length}장`:`가까운 ${cluster.groups.length}곳 · 사진 ${cluster.photos.length}장 묶음 확대`;
   button.setAttribute('aria-label',label);button.append(photoImage(p));button.dataset.photoCount=String(cluster.photos.length);button.dataset.locationCount=String(cluster.groups.length);
   const selected=cluster.photos.some(photo=>photo.id===selectedId);
   button.classList.toggle('is-selected',selected);button.setAttribute('aria-pressed',String(selected));
   button.dataset.photoIds=cluster.photos.map(photo=>photo.id).join(',');
   if(cluster.photos.length>1)button.append(el('span','marker-count',String(cluster.photos.length)));
   const lat=cluster.groups.reduce((sum,g)=>sum+g.latitude,0)/cluster.groups.length,lng=cluster.groups.reduce((sum,g)=>sum+g.longitude,0)/cluster.groups.length;
   const marker=L.marker([lat,lng],{icon:L.divIcon({className:'photo-marker',html:button,iconSize:[64,64],iconAnchor:[32,71]}),keyboard:false,zIndexOffset:selected?1000:0}).addTo(markers);
   marker.getElement().dataset.latitude=String(lat);marker.getElement().dataset.longitude=String(lng);
   L.DomEvent.disableClickPropagation(button);
   button.onclick=()=>{
    if(cluster.photos.length===1){onPhoto(p.id);return;}
    if(cluster.groups.length>1){
     programmaticMove=Boolean(onGroupSelect);const before=map.getZoom();
     map.fitBounds(cluster.groups.map(g=>[g.latitude,g.longitude]),{padding:[90,90],maxZoom:CONFIG.map.maxZoom,animate:false});
     if(map.getZoom()<=before)map.setZoom(Math.min(before+1,CONFIG.map.maxZoom),{animate:false});programmaticMove=false;
    }
    if(onGroupSelect)onGroupSelect(cluster.photos,cluster.groups.length===1);
    else if(cluster.groups.length===1)onGroup(cluster.photos);
   };
  }
 }
 // 확대 중에는 기존 마커를 지도와 함께 움직이고, 조작 후 묶음을 갱신합니다.
 let renderTimer,pendingMoveClearsGroup=false;
 const scheduleRender=()=>{pendingMoveClearsGroup ||= !programmaticMove;clearTimeout(renderTimer);renderTimer=setTimeout(()=>{render();onViewChange?.(getBounds(),{clearGroup:pendingMoveClearsGroup});pendingMoveClearsGroup=false;},100);};
 map.on('moveend',scheduleRender);
 const reset=document.querySelector('#reset-map'),resetMap=()=>{wheel.stop();map.setView(CONFIG.map.center,Math.max(CONFIG.map.zoom,map.getMinZoom()),{animate:false});};reset.addEventListener('click',resetMap);
 function resizeMap(){
  map.invalidateSize({pan:false});
  // 넓은 화면에서도 경계 밖이 보이지 않도록 화면 크기에 맞춰 축소를 제한합니다.
  map.setMinZoom(Math.max(CONFIG.map.minZoom,map.getBoundsZoom(CONFIG.map.maxBounds,true)));
  map.panInsideBounds(CONFIG.map.maxBounds,{animate:false});
 }
 const resize=new ResizeObserver(resizeMap);resize.observe(container);resizeMap();
 return {getBounds,setPhotos(value){photos=value;if(!photos.some(p=>p.id===selectedId))selectedId=null;render();},focusPhoto(id){
  const photo=photos.find(p=>p.id===id);if(!photo)return false;
  selectedId=id;wheel.stop();programmaticMove=true;map.setView([photo.latitude,photo.longitude],Math.max(map.getZoom(),map.getMinZoom(),19),{animate:false});map.panInsideBounds(CONFIG.map.maxBounds,{animate:false});programmaticMove=false;render();return true;
 },destroy(){wheel.destroy();clearTimeout(renderTimer);resize.disconnect();reset.removeEventListener('click',resetMap);map.remove();}};
}
