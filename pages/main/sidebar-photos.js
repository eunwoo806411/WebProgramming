// 시간 필터를 통과한 사진에서 지도 또는 선택 장소의 목록을 구성합니다.
export function selectSidebarPhotos(photos,{bounds=null,ids=null,limit=10}={}){
 const selected=ids?new Set(ids):null;
 const items=photos.filter(p=>selected?selected.has(p.id):!bounds||(
  Number.isFinite(p.latitude)&&Number.isFinite(p.longitude)&&p.latitude>=bounds.south&&p.latitude<=bounds.north&&p.longitude>=bounds.west&&p.longitude<=bounds.east));
 return {photos:items.slice(0,limit),total:items.length};
}
