import crypto from 'node:crypto';
import {parsePhotoQuery} from './photo-query.js';
import {CONFIG} from '../js/config.js';
export function mountPhotoRoutes(app,{repo,files,requireLogin}){
 const user=req=>req.session.user?.id;
 app.get('/api/photos/extent',async(req,res)=>res.json({success:true,...await repo.extent()}));
 app.get('/api/map/photos',async(req,res)=>res.json({success:true,...await repo.map(parsePhotoQuery(new URLSearchParams(req.originalUrl.split('?')[1])),user(req))}));
 app.get('/api/photos',async(req,res)=>res.json({success:true,...await repo.list(parsePhotoQuery(new URLSearchParams(req.originalUrl.split('?')[1])),user(req))}));
 app.post('/api/photos/search',async(req,res)=>{if(typeof req.body?.query!=='string'||req.body.query.length>600000)return res.status(400).json({success:false,message:'조회 조건을 확인해 주세요.'});res.json({success:true,...await repo.list(parsePhotoQuery(new URLSearchParams(req.body.query)),user(req))});});
 app.get('/api/photos/:id',async(req,res)=>{const photo=await repo.get(req.params.id,user(req));if(!photo)return res.status(404).json({success:false,message:'사진을 찾을 수 없어요.'});res.json({success:true,photo});});
 app.get('/api/my/photos',requireLogin('로그인이 필요합니다.'),async(req,res)=>res.json({success:true,...await repo.list({...parsePhotoQuery(new URLSearchParams(req.originalUrl.split('?')[1])),authorId:user(req)},user(req))}));
 app.get('/api/my/likes',requireLogin('로그인이 필요합니다.'),async(req,res)=>res.json({success:true,...await repo.list({...parsePhotoQuery(new URLSearchParams(req.originalUrl.split('?')[1])),likedBy:user(req)},user(req))}));
 app.get('/api/likes',async(req,res)=>res.json({success:true,...await repo.likes(user(req))}));
 app.put('/api/likes/:photoId',requireLogin('좋아요는 로그인 후 사용할 수 있어요.'),async(req,res)=>{
  if(typeof req.body?.liked!=='boolean')return res.status(400).json({success:false,message:'좋아요 값을 확인해 주세요.'});
  const result=await repo.setLiked(req.params.photoId,user(req),req.body.liked);
  if(!result)return res.status(404).json({success:false,message:'사진을 찾을 수 없어요.'});
  res.json({success:true,...result});
 });
 app.post('/api/photos',requireLogin('사진 등록은 로그인 후 사용할 수 있어요.'),async(req,res)=>{
  const b=req.body??{},bad=message=>res.status(400).json({success:false,message});
  const placeName=String(b.placeName??'').trim().slice(0,100),description=String(b.description??'').trim().slice(0,1000),captured=Date.parse(b.capturedAt);
  if(!Number.isFinite(b.latitude)||!Number.isFinite(b.longitude)||!placeName||!description||!Number.isFinite(captured))return bad('등록 정보를 확인해 주세요.');
  const [[south,west],[north,east]]=CONFIG.map.maxBounds;
  if(b.latitude<south||b.latitude>north||b.longitude<west||b.longitude>east)return bad('숭실대 캠퍼스 지도 범위 안의 위치를 선택해 주세요.');
  const prefix='data:image/jpeg;base64,';if(typeof b.imageData!=='string'||!b.imageData.startsWith(prefix))return bad('사진 형식이 올바르지 않아요.');
  const bytes=Buffer.from(b.imageData.slice(prefix.length),'base64');
  if(bytes.length<4||bytes.length>5*1024*1024||bytes[0]!==255||bytes[1]!==216||bytes[2]!==255)return bad('사진 파일이 올바르지 않거나 너무 커요.');
  const id=`upload-${Date.now().toString(36)}-${crypto.randomBytes(8).toString('hex')}`;
  const imageUrl=await files.put(id,bytes);
  try{await repo.insert({id,authorId:user(req),imageUrl,latitude:b.latitude,longitude:b.longitude,placeName,description,capturedAt:new Date(captured).toISOString(),uploadedAt:new Date().toISOString()});}
  catch(error){await files.remove(id).catch(()=>{});throw error;}
  res.status(201).json({success:true,photo:await repo.get(id,user(req))});
 });
}
