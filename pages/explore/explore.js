import {mountLayout} from '../../shared/js/layout.js';
import {photoUrl} from '../../shared/js/routes.js';
import {createPhotoCard} from '../../shared/js/photo-ui.js';
await mountLayout('explore');
let order='latest';
export function getExploreQuery(){return {order};}
export function openPhoto(id){location.href=photoUrl(id);}
export function renderExplorePhotos(photos){document.querySelector('#explore-grid').replaceChildren(...photos.map(p=>createPhotoCard(p,()=>openPhoto(p.id))));const status=document.querySelector('#explore-status');status.hidden=photos.length>0;status.textContent='아직 등록된 사진이 없어요.';}
function select(value){order=value;for(const k of ['latest','popular'])document.querySelector(`#${k}`).setAttribute('aria-pressed',String(k===order));document.querySelector('#sort-description').textContent=order==='latest'?'업로드 시각이 최근인 사진부터 표시합니다.':'좋아요가 많은 순서로, 수가 같으면 최근 업로드부터 표시합니다.';}
for(const k of ['latest','popular'])document.querySelector(`#${k}`).onclick=()=>select(k);
select(order);
