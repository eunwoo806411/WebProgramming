import {mountLayout} from '../../shared/js/layout.js';
import {getCurrentUser,listUserPhotos,listUserLikedPhotos} from '../../shared/js/service.js';
import {createPhotoCard} from '../../shared/js/photo-ui.js';
import {photoUrl} from '../../shared/js/routes.js';
await mountLayout('mypage');
export async function loadMyPhotos(tab){const u=await getCurrentUser();if(!u)return {status:'signed-out',items:[]};return tab==='liked'?listUserLikedPhotos(u.id):listUserPhotos(u.id);}
export function openPhoto(id){location.href=photoUrl(id);}
let generation=0;
async function select(tab){const token=++generation;const title=tab==='liked'?'좋아요한 사진':'내가 업로드한 사진';for(const k of ['liked','uploaded'])document.querySelector(`#${k}-tab`).setAttribute('aria-selected',String(k===tab));document.querySelector('#my-results').setAttribute('aria-labelledby',`${tab}-tab`);
 const result=await loadMyPhotos(tab);if(token!==generation)return;
 document.querySelector('#my-grid').replaceChildren(...result.items.map(p=>createPhotoCard(p,()=>openPhoto(p.id))));
 document.querySelector('#my-status').textContent=result.status==='signed-out'?'로그인 후 나만의 사진을 확인할 수 있어요.':result.status==='not-connected'?`${title} 목록 연결 예정 · 담당 팀원이 사용자별 조회 함수를 구현할 영역입니다.`:result.items.length?'':`아직 ${title}이 없어요.`;
 document.querySelector('#my-status').hidden=result.status==='ready' && result.items.length>0;
}
for(const k of ['liked','uploaded']){const b=document.querySelector(`#${k}-tab`);b.onclick=()=>select(k);b.onkeydown=e=>{if(['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();const other=k==='liked'?'uploaded':'liked';document.querySelector(`#${other}-tab`).focus();select(other);}};}
await select('liked');
