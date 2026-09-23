import {el} from './dom.js';
import {assetUrl,pageUrl} from './routes.js';
import {formatKst} from './time.js';
import {getPhoto,getCurrentUser,getUserLikedPhotoIds,setPhotoLiked} from './service.js';
export function photoImage(photo,className=''){
 const img=el('img',className);img.src=photo.imageUrl;img.alt=photo.description;img.loading='lazy';
 img.addEventListener('error',()=>{img.src=assetUrl('fallback.svg');},{once:true});return img;
}
export function createPhotoCard(photo,onClick){
 const b=el('button','photo-card');b.type='button';b.dataset.focusKey=`photo:${photo.id}`;b.setAttribute('aria-label',`${photo.placeName} · ${photo.description}`);
 const copy=el('span','card-copy');copy.append(el('span','badge','DEMO · 예시 사진'),el('p','',photo.description),el('small','',`⌖ ${photo.placeName}`),el('small','',`업로드 ${formatKst(photo.uploadedAt).replace(' KST','')} · ♡ ${photo.likeCount}`));
 b.append(photoImage(photo),copy);b.onclick=onClick;return b;
}
let dialog,content,heading,returnFocus,returnFocusKey,request=0;
function prepareDialog(title){
 if(!dialog){
  dialog=el('dialog');dialog.id='photo-dialog';dialog.setAttribute('aria-labelledby','photo-dialog-title');
  const head=el('div','modal-head');heading=el('h2','','');heading.id='photo-dialog-title';
  const close=el('button','close','×');close.setAttribute('aria-label','사진 창 닫기');close.onclick=()=>dialog.close();head.append(heading,close);content=el('div');dialog.append(head,content);document.body.append(dialog);
  dialog.addEventListener('close',()=>{request++;document.body.style.overflow='';const replacement=[...document.querySelectorAll('[data-focus-key]')].find(n=>n.dataset.focusKey===returnFocusKey);const target=returnFocus?.isConnected?returnFocus:replacement || document.querySelector('#reset-time');target?.focus();});
  dialog.addEventListener('click',e=>{if(e.target===dialog){const b=dialog.getBoundingClientRect();if(e.clientX<b.left||e.clientX>b.right||e.clientY<b.top||e.clientY>b.bottom)dialog.close();}});
 }
 if(!dialog.open){returnFocus=document.activeElement;returnFocusKey=returnFocus?.dataset.focusKey;dialog.showModal();document.body.style.overflow='hidden';}
 heading.textContent=title;content.replaceChildren();dialog.querySelector('.close').focus();return content;
}
export async function showPhotoDetail(id){
 const root=prepareDialog('한 장의 기록'),token=++request;root.append(el('p','modal-body','사진을 불러오는 중…'));
 try{
 const [p,user]=await Promise.all([getPhoto(id),getCurrentUser()]);
 const likedIds=user?await getUserLikedPhotoIds(user.id):[];
 if(token!==request || !dialog.open)return;
 if(!p){root.replaceChildren(el('p','modal-body','이 사진을 찾을 수 없어요.'));return;}
 root.replaceChildren(photoImage(p,'detail-image'));
 const body=el('div','modal-body');body.append(el('span','badge','DEMO · 예시 이미지와 가상 기록'),el('h3','detail-desc',p.description));
 const meta=el('dl','detail-meta');
 for(const [label,value] of [['촬영 시각',formatKst(p.capturedAt)],['업로드 시각',formatKst(p.uploadedAt)],['촬영 위치',p.placeName],['위도 · 경도',`${p.latitude.toFixed(6)} · ${p.longitude.toFixed(6)}`]])meta.append(el('dt','',label),el('dd','',value));
 body.append(meta);
 const actions=el('div','detail-actions'),like=el('button','button secondary like'),msg=el('div','modal-message');msg.setAttribute('role','status');
 let liked=likedIds.includes(p.id),count=p.likeCount;
 const update=()=>{like.textContent=`${liked?'♥':'♡'} 좋아요 ${count}`;like.setAttribute('aria-pressed',String(liked));};update();
 like.onclick=async()=>{like.disabled=true;msg.replaceChildren();try{const result=await setPhotoLiked(p.id,!liked);liked=result.liked;count=result.photo.likeCount;update();document.dispatchEvent(new CustomEvent('photos-changed'));}catch(e){msg.append(el('span','error',e.message));if(e.code==='AUTH_REQUIRED'){const a=el('a','','로그인 화면으로 →');a.href=pageUrl('login');msg.append(a);}}finally{like.disabled=false;}};
 actions.append(el('small','muted','계정 정보는 공개되지 않아요.'),like);body.append(actions,msg,el('p','notice','실제 숭실대 촬영 기록이 아닌 데모입니다. 좋아요는 이 브라우저에서만 유지됩니다.'));root.append(body);
 }catch(e){if(token===request)root.replaceChildren(el('p','modal-body error',e.message));}
}
export function showPhotoGroup(photos){
 const root=prepareDialog(`같은 위치의 ${photos.length}장`);request++;
 const body=el('div','modal-body');body.append(el('span','badge',photos[0]?.placeName||'사진 묶음'),el('p','muted','선택한 시간 범위에 포함되는 사진입니다. 사진을 눌러 자세히 볼 수 있어요.'));
 const grid=el('div','photo-grid group-grid');grid.append(...photos.map(p=>createPhotoCard(p,()=>showPhotoDetail(p.id))));body.append(grid);root.append(body);
}
