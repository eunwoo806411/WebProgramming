// 페이지는 이 파일만 통해 데이터에 접근합니다. 저장은 서버(Express + SQLite)가 담당합니다.
import {createServerAdapter} from './server-adapter.js';
const adapter=createServerAdapter();
export const {getCurrentUser,signInDemo,signOut,listPhotos,getPhoto,createPhoto,setPhotoLiked,getUserLikedPhotoIds,listUserPhotos,listUserLikedPhotos}=adapter;