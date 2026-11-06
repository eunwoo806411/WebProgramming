import {encodeCursor} from './photo-query.js';
const publicPhoto=r=>({id:r.id,imageUrl:r.image_url||`/uploads/${r.id}.jpg`,latitude:Number(r.latitude),longitude:Number(r.longitude),placeName:r.place_name,description:r.description,capturedAt:r.captured_at,uploadedAt:r.uploaded_at,likeCount:Number(r.like_count??r.base_likes??0),isDemo:Boolean(r.is_demo),liked:Number(r.liked??0)>0});
export function createPhotoRepository(db){
 const likeCountSql='p.base_likes+(SELECT COUNT(*) FROM likes l WHERE l.photo_id=p.id)';
 const select=`SELECT p.*,p.base_likes+(SELECT COUNT(*) FROM likes l WHERE l.photo_id=p.id) AS like_count,
 CASE WHEN EXISTS(SELECT 1 FROM likes l WHERE l.photo_id=p.id AND l.user_id=$1) THEN 1 ELSE 0 END AS liked FROM photos p`;
 function conditions(q,values,includeCursor=false){
  const parts=['p.deleted_at IS NULL'];const param=v=>{values.push(v);return '$'+values.length;};
  if(q.start)parts.push(`p.uploaded_at >= ${param(q.start)}`);if(q.end)parts.push(`p.uploaded_at <= ${param(q.end)}`);
  if(q.authorId)parts.push(`p.author_id = ${param(q.authorId)}`);
  if(q.likedBy)parts.push(`EXISTS(SELECT 1 FROM likes u WHERE u.photo_id=p.id AND u.user_id=${param(q.likedBy)})`);
  if(q.ids)parts.push(`p.id IN (${q.ids.map(param).join(',')})`);
  else if(q.bounds){const b=q.bounds;parts.push(`p.latitude >= ${param(b.south)} AND p.latitude <= ${param(b.north)} AND p.longitude >= ${param(b.west)} AND p.longitude <= ${param(b.east)}`);}
  if(includeCursor&&q.cursor){const t=param(q.cursor.uploadedAt),id=param(q.cursor.id);const time=`(p.uploaded_at < ${t} OR (p.uploaded_at = ${t} AND p.id < ${id}))`;if(q.order==='popular'){const likes=param(q.cursor.likeCount);parts.push(`(${likeCountSql} < ${likes} OR (${likeCountSql} = ${likes} AND ${time}))`);}else parts.push(time);}
  return parts.length?' WHERE '+parts.join(' AND '):'';
 }
 async function count(q){const v=[];const rows=await db.query('SELECT COUNT(*) AS total FROM photos p'+conditions(q,v),v);return Number(rows[0].total);}
 async function rows(q,userId,limit){const v=[userId??null],where=conditions(q,v,true);v.push(limit);return (await db.query(select+where+` ORDER BY ${q.order==='popular'?'like_count DESC,':''}p.uploaded_at DESC,p.id DESC LIMIT $${v.length}`,v)).map(publicPhoto);}
 return {
  async insert(p){await db.query(`INSERT INTO photos(id,author_id,latitude,longitude,place_name,description,captured_at,uploaded_at,image_url,base_likes,is_demo) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) ON CONFLICT(id) DO NOTHING`,[p.id,p.authorId,p.latitude,p.longitude,p.placeName,p.description,new Date(p.capturedAt).toISOString(),new Date(p.uploadedAt).toISOString(),p.imageUrl,p.likeCount??0,p.isDemo?1:0]);},
  async list(q,userId){const total=await count(q),items=await rows(q,userId,q.limit+1),photos=items.slice(0,q.limit);return {photos,total,nextCursor:items.length>q.limit?encodeCursor(photos.at(-1),q.order):null};},
  async map(q,userId){const total=await count(q),photos=await rows({...q,cursor:null,order:'latest'},userId,5000);const periodTotal=await count({...q,bounds:null,ids:null});return {photos,total,periodTotal,truncated:total>photos.length};},
  async get(id,userId){const photos=await rows({ids:[id]},userId,1);return photos[0]??null;},
  async update(id,userId,changes){
   const values=[id,userId],sets=Object.entries(changes).map(([key,value])=>{values.push(value);return `${key==='placeName'?'place_name':'description'}=$${values.length}`;});
   const result=await db.query(`UPDATE photos SET ${sets.join(',')} WHERE id=$1 AND author_id=$2 AND deleted_at IS NULL RETURNING id`,values);
   return result.length?this.get(id,userId):null;
  },
  async markDeleted(id,userId){return (await db.query('UPDATE photos SET deleted_at=$3 WHERE id=$1 AND author_id=$2 AND deleted_at IS NULL RETURNING id',[id,userId,new Date().toISOString()])).length>0;},
  async pendingDeletions(){return (await db.query('SELECT id,is_demo FROM photos WHERE deleted_at IS NOT NULL ORDER BY deleted_at LIMIT 100')).map(r=>({id:r.id,isDemo:Boolean(r.is_demo)}));},
  async finishDeletion(id){
   await db.query('DELETE FROM likes WHERE photo_id=$1 AND EXISTS(SELECT 1 FROM photos WHERE id=$1 AND deleted_at IS NOT NULL)',[id]);
   await db.query('DELETE FROM photos WHERE id=$1 AND deleted_at IS NOT NULL',[id]);
  },
  async profile(userId){
   await db.query('INSERT INTO profiles(user_id,nickname,created_at) VALUES($1,$2,$3) ON CONFLICT(user_id) DO NOTHING',[userId,'숭실 기록가',new Date().toISOString()]);
   const [row]=await db.query('SELECT nickname,created_at FROM profiles WHERE user_id=$1',[userId]);
   return {id:userId,nickname:row.nickname,createdAt:row.created_at,isDemo:false};
  },
  async updateProfile(userId,nickname){await this.profile(userId);await db.query('UPDATE profiles SET nickname=$2 WHERE user_id=$1',[userId,nickname]);return this.profile(userId);},
  async extent(){const [r]=await db.query('SELECT MIN(uploaded_at) AS start,MAX(uploaded_at) AS end FROM photos WHERE deleted_at IS NULL');return r;},
  async setLiked(id,userId,liked){
   if(!await this.get(id,userId))return null;
   if(liked)await db.query('INSERT INTO likes(user_id,photo_id) VALUES($1,$2) ON CONFLICT(user_id,photo_id) DO NOTHING',[userId,id]);
   else await db.query('DELETE FROM likes WHERE user_id=$1 AND photo_id=$2',[userId,id]);
   const photo=await this.get(id,userId);return photo?{photo,liked:photo.liked}:null;
  },
  async likes(userId){const counts={};for(const r of await db.query('SELECT l.photo_id,COUNT(*) AS c FROM likes l JOIN photos p ON p.id=l.photo_id WHERE p.deleted_at IS NULL GROUP BY l.photo_id'))counts[r.photo_id]=Number(r.c);const mine=userId?(await db.query('SELECT l.photo_id FROM likes l JOIN photos p ON p.id=l.photo_id WHERE l.user_id=$1 AND p.deleted_at IS NULL',[userId])).map(r=>r.photo_id):[];return {counts,mine};}
 };
}
