import {mockPhotos} from '../../data/mock-photos.js';
import {filterPhotos,sortPhotos} from './photo-query.js';
export const STORAGE_KEY='soongsil-one-frame-preview-v1';
const error=(code,message)=>Object.assign(new Error(message),{code});
const empty=()=>({version:1,currentUser:null,likedByUser:{}});
export function createLocalAdapter(storage) {
  function read() {
    try {
      const raw=JSON.parse(storage.getItem(STORAGE_KEY));
      if(!raw || raw.version!==1)return empty();
      const state=empty();
      if(raw.currentUser && typeof raw.currentUser.id==='string' && raw.currentUser.isDemo===true)state.currentUser={id:raw.currentUser.id,isDemo:true};
      if(raw.likedByUser && typeof raw.likedByUser==='object')for(const [id,values] of Object.entries(raw.likedByUser)) {
        if(Array.isArray(values))Object.defineProperty(state.likedByUser,id,{value:[...new Set(values.filter(v=>mockPhotos.some(p=>p.id===v)))],enumerable:true,writable:true,configurable:true});
      }
      return state;
    } catch { return empty(); }
  }
  function save(state){try{storage.setItem(STORAGE_KEY,JSON.stringify(state));}catch{throw error('STORAGE_UNAVAILABLE','브라우저 저장 공간을 사용할 수 없어 변경하지 못했어요.');}}
  function decorate(photo,state) { return {...photo,likeCount:photo.likeCount+Object.values(state.likedByUser).filter(ids=>ids.includes(photo.id)).length}; }
  return {
    async getCurrentUser(){return read().currentUser;},
    async signInDemo(){const s=read();s.currentUser={id:'demo-user',isDemo:true};save(s);return s.currentUser;},
    async signOut(){const s=read();if(!s.currentUser)return;s.currentUser=null;save(s);},
    async listPhotos(query={}){const s=read();return sortPhotos(filterPhotos(mockPhotos.map(p=>decorate(p,s)),query),query.order);},
    async getPhoto(id){const p=mockPhotos.find(p=>p.id===id);return p?decorate(p,read()):null;},
    async getUserLikedPhotoIds(userId){const s=read();return Object.hasOwn(s.likedByUser,userId)?[...s.likedByUser[userId]]:[];},
    async setPhotoLiked(id,liked){
      const s=read();if(!s.currentUser)throw error('AUTH_REQUIRED','좋아요는 로그인 후 사용할 수 있어요.');
      const p=mockPhotos.find(p=>p.id===id);if(!p)throw error('PHOTO_NOT_FOUND','사진을 찾을 수 없어요.');
      const uid=s.currentUser.id, ids=new Set(Object.hasOwn(s.likedByUser,uid)?s.likedByUser[uid]:[]);
      if(liked)ids.add(id);else ids.delete(id);
      Object.defineProperty(s.likedByUser,uid,{value:[...ids],enumerable:true,writable:true,configurable:true});save(s);
      return {photo:decorate(p,s),liked:ids.has(id)};
    },
    async createPhoto(){throw error('NOT_IMPLEMENTED','사진 저장 서버가 아직 연결되지 않았어요. 등록 담당자가 연결할 영역입니다.');},
    async listUserPhotos(userId){return {status:'not-connected',userId,items:[]};},
    async listUserLikedPhotos(userId){return {status:'not-connected',userId,items:[]};}
  };
}
