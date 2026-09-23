// Server integration replaces this adapter; pages do not access storage directly.
import {createLocalAdapter} from './local-adapter.js';
const storage={getItem:key=>localStorage.getItem(key),setItem:(key,value)=>localStorage.setItem(key,value)};
const adapter=createLocalAdapter(storage);
export const {getCurrentUser,signInDemo,signOut,listPhotos,getPhoto,createPhoto,setPhotoLiked,getUserLikedPhotoIds,listUserPhotos,listUserLikedPhotos}=adapter;
