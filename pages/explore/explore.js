import {mountLayout} from '../../shared/js/layout.js';
import {createPhotoCard,showPhotoDetail} from '../../shared/js/photo-ui.js';
import {listPhotoPage} from '../../shared/js/service.js';
import {createLatestRequest} from '../main/latest-request.js';
import {el} from '../../shared/js/dom.js';

await mountLayout('explore');
let order='latest',photos=[],cursor=null,total=0,request=0;
const gate=createLatestRequest(),grid=document.querySelector('#explore-grid'),status=document.querySelector('#explore-status'),more=document.querySelector('#explore-more');
export const getExploreQuery=()=>({order});
export const openPhoto=id=>showPhotoDetail(id);
export function renderExplorePhotos(items){grid.replaceChildren(...items.map(p=>createPhotoCard(p,()=>openPhoto(p.id))));}
function selectOrder(value){
 order=value;
 for(const type of ['latest','popular'])document.querySelector('#'+type).setAttribute('aria-pressed',String(type===order));
 document.querySelector('#sort-description').textContent=order==='popular'?'좋아요가 많은 사진부터 표시합니다.':'업로드 시각이 최근인 사진부터 표시합니다.';
}
async function loadPhotos(append=false){
 const token=++request,next=append?cursor:null;
 if(append&&!next)return;
 more.disabled=true;grid.setAttribute('aria-busy','true');status.hidden=false;status.textContent='사진을 불러오는 중이에요.';
 if(!append){photos=[];cursor=null;renderExplorePhotos(photos);more.hidden=true;}
 try{
  const result=await gate.run(()=>listPhotoPage({order,limit:24,cursor:next}));if(!result.current)return;
  photos=append?[...new Map([...photos,...result.value.photos].map(p=>[p.id,p])).values()]:result.value.photos;cursor=result.value.nextCursor;total=result.value.total;
  renderExplorePhotos(photos);document.querySelector('#explore-count').textContent=`${total}장`;
  status.hidden=photos.length>0;status.textContent=photos.length?'':'아직 등록된 사진이 없어요.';
  more.hidden=!cursor;more.textContent=`더 보기 · ${photos.length}/${total}장`;
 }catch(error){
  status.hidden=false;const retry=el('button','button secondary small','다시 시도');retry.type='button';retry.onclick=()=>loadPhotos(append);
  status.replaceChildren(el('p','error',error.message),retry);
 }finally{if(token===request){more.disabled=false;grid.setAttribute('aria-busy','false');}}
}
for(const type of ['latest','popular'])document.querySelector('#'+type).onclick=()=>{selectOrder(type);loadPhotos();};
more.onclick=()=>loadPhotos(true);
document.addEventListener('photos-changed',()=>loadPhotos());
selectOrder('latest');await loadPhotos();
