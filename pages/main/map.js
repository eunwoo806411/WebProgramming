import {CONFIG} from '../../shared/js/config.js';
import {el} from '../../shared/js/dom.js';
import {photoImage} from '../../shared/js/photo-ui.js';
import {groupByCoordinate,clusterGroups} from './clusters.js';
export function createPhotoMap(container,{onPhoto,onGroup,tiles=true}={}){
 const problem=document.querySelector('#map-error');
 function showProblem(text,retry){problem.replaceChildren(el('span','',text));if(retry){const b=el('button','button secondary small','다시 시도');b.onclick=retry;problem.append(b);}problem.hidden=false;}
 if(!window.L){showProblem('지도 라이브러리를 불러오지 못했어요. 사진 목록은 계속 사용할 수 있어요.',()=>location.reload());return {setPhotos(){},destroy(){}};}
 const L=window.L, map=L.map(container,{zoomControl:false,maxZoom:CONFIG.map.maxZoom,minZoom:13,zoomAnimation:false,fadeAnimation:false}).setView(CONFIG.map.center,CONFIG.map.zoom);
 L.control.zoom({position:'topright',zoomInTitle:'확대',zoomOutTitle:'축소'}).addTo(map);
 let tileLayer;
 if(tiles){tileLayer=L.tileLayer(CONFIG.map.tileUrl,{maxNativeZoom:CONFIG.map.maxNativeZoom,maxZoom:CONFIG.map.maxZoom,attribution:CONFIG.map.attribution}).addTo(map);
 tileLayer.on('tileerror',()=>showProblem('배경 지도를 불러오지 못했어요. 네트워크를 확인해 주세요.',()=>{problem.hidden=true;tileLayer.redraw();}));}
 const markers=L.layerGroup().addTo(map);let photos=[];
 function render(){
  const clusters=clusterGroups(groupByCoordinate(photos),g=>map.latLngToContainerPoint([g.latitude,g.longitude]),{radius:78,separate:map.getZoom()===CONFIG.map.maxZoom});
  markers.clearLayers();
  container.dataset.zoom=String(map.getZoom());container.dataset.markerCount=String(clusters.length);
  for(const cluster of clusters){
   const group=cluster.groups[0],p=cluster.photos[0],button=el('button');button.type='button';button.dataset.focusKey='map:'+cluster.groups.map(g=>`${g.latitude},${g.longitude}`).sort().join(';');
   const label=cluster.photos.length===1?`${p.placeName} · 사진 보기`:cluster.groups.length===1?`${p.placeName} · 같은 위치 사진 ${cluster.photos.length}장`:`가까운 ${cluster.groups.length}곳 · 사진 ${cluster.photos.length}장 묶음 확대`;
   button.setAttribute('aria-label',label);button.append(photoImage(p));button.dataset.photoCount=String(cluster.photos.length);button.dataset.locationCount=String(cluster.groups.length);
   if(cluster.photos.length>1)button.append(el('span','marker-count',String(cluster.photos.length)));
   const lat=cluster.groups.reduce((sum,g)=>sum+g.latitude,0)/cluster.groups.length,lng=cluster.groups.reduce((sum,g)=>sum+g.longitude,0)/cluster.groups.length;
   const marker=L.marker([lat,lng],{icon:L.divIcon({className:'photo-marker',html:button,iconSize:[64,64],iconAnchor:[32,71]}),keyboard:false}).addTo(markers);
   marker.getElement().dataset.latitude=String(lat);marker.getElement().dataset.longitude=String(lng);
   L.DomEvent.disableClickPropagation(button);
   button.onclick=()=>{if(cluster.photos.length===1)onPhoto(p.id);else if(cluster.groups.length===1)onGroup(cluster.photos);else{const before=map.getZoom();map.fitBounds(cluster.groups.map(g=>[g.latitude,g.longitude]),{padding:[90,90],maxZoom:CONFIG.map.maxZoom,animate:false});if(map.getZoom()<=before)map.setZoom(Math.min(before+1,CONFIG.map.maxZoom));}};
  }
 }
 map.on('moveend zoomend resize',render);
 const reset=document.querySelector('#reset-map'),resetMap=()=>map.setView(CONFIG.map.center,CONFIG.map.zoom,{animate:false});reset.addEventListener('click',resetMap);
 const resize=new ResizeObserver(()=>map.invalidateSize({pan:false}));resize.observe(container);
 return {setPhotos(value){photos=value;render();},destroy(){resize.disconnect();reset.removeEventListener('click',resetMap);map.remove();}};
}
