import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createServer} from '../server.js';

const jpeg='data:image/jpeg;base64,/9j/2Q==';
async function start(t,options={}){
 const dir=options.storageDir??await fs.mkdtemp(path.join(os.tmpdir(),'main-api-'));
 const runtime=await createServer({storageDir:dir,sessionSecret:'test-only-long-secret',seedDemo:true,allowTestLogin:true,...options});
 const server=runtime.app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));
 const base=`http://127.0.0.1:${server.address().port}`;
 t.after(async()=>{await new Promise(r=>server.close(r));await runtime.close();if(!options.storageDir)await fs.rm(dir,{recursive:true,force:true});});
 return {...runtime,dir,base,async request(url,method='GET',body,cookie){return fetch(base+url,{method,headers:{'Content-Type':'application/json',...(cookie?{Cookie:cookie}:{})},...(body?{body:JSON.stringify(body)}:{})});}};
}
async function login(r){const res=await r.request('/api/login','POST',{id:'test',password:'1234'});assert.equal(res.status,200);return res.headers.get('set-cookie').split(';')[0];}

test('API는 비로그인 조회·상세를 허용하되 업로드와 좋아요는 차단한다',async t=>{
 const r=await start(t);
 const list=await(await r.request('/api/photos')).json();assert.equal(list.photos.length,10);assert.equal(list.total,12);assert.ok(list.nextCursor);
 const map=await(await r.request('/api/map/photos')).json();assert.equal(map.photos.length,12);
 const detail=await(await r.request('/api/photos/demo-01')).json();assert.equal(detail.photo.id,'demo-01');assert.equal('authorId' in detail.photo,false);
 assert.equal((await r.request('/api/photos/missing')).status,404);
 assert.equal((await r.request('/api/photos?limit=0')).status,400);
 assert.equal((await r.request('/api/photos','POST',{})).status,401);
 assert.equal((await r.request('/api/likes/demo-01','PUT',{liked:true})).status,401);
});
test('업로드·좋아요·세션은 서버를 새로 만들어도 동일 저장소에서 유지된다',async t=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'main-restart-'));t.after(()=>fs.rm(dir,{recursive:true,force:true}));
 const r=await start(t,{storageDir:dir});const cookie=await login(r);
 const created=await(await r.request('/api/photos','POST',{imageData:jpeg,latitude:37.496,longitude:126.957,placeName:'도서관',description:'직접 등록',capturedAt:'2026-11-01T00:00:00Z'},cookie)).json();
 assert.equal(created.success,true);assert.ok(created.photo.imageUrl);
 await r.request('/api/likes/'+created.photo.id,'PUT',{liked:true},cookie);
 await r.request('/api/likes/'+created.photo.id,'PUT',{liked:true},cookie);
 const second=await start(t,{storageDir:dir});
 assert.equal((await second.request('/api/me','GET',null,cookie)).status,200);
 const detail=await(await second.request('/api/photos/'+created.photo.id,'GET',null,cookie)).json();assert.equal(detail.photo.likeCount,1);assert.equal(detail.photo.liked,true);
 assert.equal((await second.request(created.photo.imageUrl)).status,200);
 assert.equal((await r.request('/api/likes/'+created.photo.id,'PUT',{liked:'yes'},cookie)).status,400);
 await r.request('/api/logout','POST',{},cookie);assert.equal((await second.request('/api/me','GET',null,cookie)).status,401);
});
test('배포 또는 불완전한 외부 저장소 설정은 로컬 저장소로 조용히 대체하지 않는다',async()=>{
 await assert.rejects(createServer({isProd:true,sessionSecret:'test-secret'}),/외부 저장소/);
 await assert.rejects(createServer({databaseUrl:'postgresql://example.invalid/db',sessionSecret:'test-secret'}),/함께 설정/);
});
test('사진 파일 저장 후 DB 저장이 실패하면 파일을 정리한다',async t=>{
 const files={ids:[],removed:[],async put(id){this.ids.push(id);return '/uploads/'+id+'.jpg';},async remove(id){this.removed.push(id);}};
 const r=await start(t,{files});const cookie=await login(r);await r.db.query('DROP TABLE photos');
 const res=await r.request('/api/photos','POST',{imageData:jpeg,latitude:37.496,longitude:126.957,placeName:'도서관',description:'실패 확인',capturedAt:'2026-01-01T00:00:00Z'},cookie);
 assert.equal(res.status,500);assert.equal(files.ids.length,1);assert.deepEqual(files.removed,files.ids);
});
