import {CONFIG} from './config.js';
export function filterPhotos(photos,{start=-Infinity,end=Infinity,field=CONFIG.timeField}={}) {
  if (start === null || end === null || start > end) return [];
  return photos.filter(p=>{ const t=Date.parse(p[field]);return Number.isFinite(t) && start<=t && t<=end; });
}
export function sortPhotos(photos,order='latest') {
  return [...photos].sort((a,b)=>(order==='popular' ? b.likeCount-a.likeCount : 0) || Date.parse(b.uploadedAt)-Date.parse(a.uploadedAt) || a.id.localeCompare(b.id));
}
