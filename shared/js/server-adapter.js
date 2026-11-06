import {sortPhotos} from './photo-query.js';
import {encodeImageFile} from './image-encode.js';
import {CONFIG} from './config.js';

export function createServerAdapter({encodeImage=encodeImageFile,fetchImpl=(...args)=>fetch(...args)}={}){
 async function api(url,options={}){
  let res;try{res=await fetchImpl(url,{credentials:'same-origin',...options,headers:{'Content-Type':'application/json',...options.headers}});}catch{throw Object.assign(new Error('서버에 연결할 수 없어요.'),{code:'NETWORK_ERROR'});}
  let data;try{data=await res.json();}catch{throw new Error('서버 응답을 확인하지 못했어요.');}
  if(!res.ok||!data?.success)throw Object.assign(new Error(data?.message??'요청에 실패했어요.'),{code:res.status===401?'AUTH_REQUIRED':res.status===404?'PHOTO_NOT_FOUND':'REQUEST_FAILED',status:res.status});
  return data;
 }
 function params(q={}){
  const p=new URLSearchParams();
  for(const name of ['start','end'])if(q[name]!==undefined&&q[name]!==null&&Number.isFinite(Number(q[name])))p.set(name,new Date(Number(q[name])).toISOString());
  for(const [key,value] of Object.entries(q.bounds??{}))p.set(key,String(value));
  for(const key of ['cursor','limit','order'])if(q[key]!==undefined&&q[key]!==null)p.set(key,String(q[key]));
  if(q.ids)p.set('ids',q.ids.join(','));return p;
 }
 const listPhotoPage=q=>q?.ids?api('/api/photos/search',{method:'POST',body:JSON.stringify({query:params(q).toString()})}):api('/api/photos?'+params(q));
 async function collect(endpoint,q={}){const photos=[];let cursor;do{const data=endpoint?await api(endpoint+'?'+params({...q,limit:100,cursor})):await listPhotoPage({...q,limit:100,cursor});photos.push(...data.photos);cursor=data.nextCursor;}while(cursor);return sortPhotos(photos,q.order);}
 async function getCurrentUser(){try{const {user}=await api('/api/me');return {...user,isDemo:false};}catch(e){if(e.code==='AUTH_REQUIRED')return null;throw e;}}
 return {
  getCurrentUser,signInDemo:getCurrentUser,signOut:()=>api('/api/logout',{method:'POST'}),
  listPhotoPage,listMapPhotos:q=>api('/api/map/photos?'+params(q)),getPhotoExtent:()=>api('/api/photos/extent'),
  listPhotos:q=>collect(null,q),
  async getPhoto(id){try{return (await api('/api/photos/'+encodeURIComponent(id))).photo;}catch(e){if(e.code==='PHOTO_NOT_FOUND')return null;throw e;}},
  async getUserLikedPhotoIds(){return (await api('/api/likes')).mine;},
  setPhotoLiked:(id,liked)=>api('/api/likes/'+encodeURIComponent(id),{method:'PUT',body:JSON.stringify({liked:Boolean(liked)})}),
  async createPhoto(input={}){
   const {imageFile,latitude,longitude}=input,placeName=String(input.placeName??'').trim(),description=String(input.description??'').trim(),captured=Date.parse(input.capturedAt);
   if(!imageFile||!Number.isFinite(latitude)||!Number.isFinite(longitude)||!placeName||!description||!Number.isFinite(captured))throw Object.assign(new Error('등록 정보를 확인해 주세요.'),{code:'INVALID_INPUT'});
   const [[south,west],[north,east]]=CONFIG.map.maxBounds;if(latitude<south||latitude>north||longitude<west||longitude>east)throw new Error('숭실대 캠퍼스 지도 범위 안의 위치를 선택해 주세요.');
   if(!await getCurrentUser())throw Object.assign(new Error('사진 등록은 로그인 후 사용할 수 있어요.'),{code:'AUTH_REQUIRED'});
   const imageData=await encodeImage(imageFile);return (await api('/api/photos',{method:'POST',body:JSON.stringify({imageData,latitude,longitude,placeName,description,capturedAt:new Date(captured).toISOString()})})).photo;
  },
  updatePhoto:async(id,changes)=>(await api('/api/photos/'+encodeURIComponent(id),{method:'PATCH',body:JSON.stringify(changes)})).photo,
  deletePhoto:id=>api('/api/photos/'+encodeURIComponent(id),{method:'DELETE'}),
  unlikePhoto:id=>api('/api/likes/'+encodeURIComponent(id),{method:'PUT',body:JSON.stringify({liked:false})}),
  updateNickname:async(userId,nickname)=>(await api('/api/me',{method:'PATCH',body:JSON.stringify({nickname})})).user,
  async listUserPhotos(userId){return {status:'ready',userId,items:await collect('/api/my/photos')};},
  async listUserLikedPhotos(userId){return {status:'ready',userId,items:await collect('/api/my/likes')};}
 };
}
