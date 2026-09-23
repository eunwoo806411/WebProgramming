import test from 'node:test';
import assert from 'node:assert/strict';
import {createLocalAdapter, STORAGE_KEY} from '../shared/js/local-adapter.js';
import {parseKstInput,toKstInput} from '../shared/js/time.js';
import {filterPhotos,sortPhotos} from '../shared/js/photo-query.js';
import {groupByCoordinate,clusterGroups} from '../pages/main/clusters.js';
const memory=()=>{const m=new Map();return {getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,v)}};
test('비로그인 차단, 중복 좋아요 방지, 새 접속 유지, 취소',async()=>{
 const store=memory(),api=createLocalAdapter(store),[p]=await api.listPhotos();
 await assert.rejects(api.setPhotoLiked(p.id,true),{code:'AUTH_REQUIRED'});
 const user=await api.signInDemo();await api.setPhotoLiked(p.id,true);await api.setPhotoLiked(p.id,true);
 assert.equal((await api.getPhoto(p.id)).likeCount,p.likeCount+1);
 const fresh=createLocalAdapter(store);assert.deepEqual(await fresh.getUserLikedPhotoIds(user.id),[p.id]);
 await fresh.setPhotoLiked(p.id,false);assert.equal((await fresh.getPhoto(p.id)).likeCount,p.likeCount);
 await fresh.signOut();await assert.rejects(fresh.setPhotoLiked(p.id,true),{code:'AUTH_REQUIRED'});
});
test('손상된 저장 상태는 초기값으로, 저장 불가는 상태를 바꾸지 않는다',async()=>{
 for(const value of ['{broken','null','{"currentUser":{},"likedByUser":3}','{"version":1,"currentUser":{"id":"demo-user","isDemo":true},"likedByUser":{"demo-user":"bad"}}']) {
 const a=createLocalAdapter({getItem:()=>value,setItem(){}});assert.ok(Array.isArray(await a.listPhotos()));
 }
 let fail=false;const base=memory();const store={getItem:base.getItem,setItem:(k,v)=>{if(fail)throw Error('quota');base.setItem(k,v)}};
 const a=createLocalAdapter(store);const [p]=await a.listPhotos();await a.signInDemo();fail=true;
 await assert.rejects(a.setPhotoLiked(p.id,true),{code:'STORAGE_UNAVAILABLE'});assert.equal((await a.getPhoto(p.id)).likeCount,p.likeCount);
});
test('사용자별 좋아요 분리 및 조회와 미연결 계약',async()=>{
 const store=memory(),api=createLocalAdapter(store),[p]=await api.listPhotos();
 store.setItem(STORAGE_KEY,JSON.stringify({version:1,currentUser:{id:'other',isDemo:true},likedByUser:{other:[p.id],'demo-user':[]}}));
 assert.deepEqual(await api.getUserLikedPhotoIds('other'),[p.id]);assert.deepEqual(await api.getUserLikedPhotoIds('demo-user'),[]);
 await api.signInDemo();assert.deepEqual(await api.getUserLikedPhotoIds('demo-user'),[]);
 await assert.rejects(api.setPhotoLiked('missing',true),{code:'PHOTO_NOT_FOUND'});
 assert.equal(await api.getPhoto('missing'),null);await assert.rejects(api.createPhoto({}),{code:'NOT_IMPLEMENTED'});
 assert.equal((await api.listUserPhotos('demo-user')).status,'not-connected');
});
test('한국 시간은 호스트 시간대와 무관하고 무효 날짜를 거부한다',()=>{
 assert.equal(parseKstInput('2026-09-01T09:00:00'),Date.parse('2026-09-01T00:00:00Z'));
 assert.equal(toKstInput(Date.parse('2026-09-01T00:00:00Z')),'2026-09-01T09:00:00');
 for(const input of ['', '2026-02-30T10:00','wrong'])assert.equal(parseKstInput(input),null);
});
test('시간 양쪽 경계 포함, 날짜 횡단, 역순·빈 결과, 필드 변경',()=>{
 const p=[0,1,2].map(n=>({id:String(n),uploadedAt:new Date(n*86400000).toISOString(),capturedAt:new Date(0).toISOString()}));
 assert.deepEqual(filterPhotos(p,{start:0,end:86400000,field:'uploadedAt'}).map(x=>x.id),['0','1']);
 assert.deepEqual(filterPhotos(p,{start:86400000,end:86400000,field:'uploadedAt'}).map(x=>x.id),['1']);
 assert.equal(filterPhotos(p,{start:1,end:2,field:'uploadedAt'}).length,0);
 assert.equal(filterPhotos(p,{start:2,end:1,field:'uploadedAt'}).length,0);
 assert.equal(filterPhotos(p,{start:0,end:0,field:'capturedAt'}).length,3);
});
test('인기 동점은 최신 업로드 순이며 원본을 변경하지 않는다',()=>{
 const p=[{id:'a',likeCount:5,uploadedAt:'2026-01-01T00:00:00Z'},{id:'b',likeCount:5,uploadedAt:'2026-01-02T00:00:00Z'},{id:'c',likeCount:8,uploadedAt:'2025-01-01T00:00:00Z'}];
 assert.deepEqual(sortPhotos(p,'popular').map(x=>x.id),['c','b','a']);assert.deepEqual(sortPhotos(p,'latest').map(x=>x.id),['b','a','c']);assert.equal(p[0].id,'a');
});
test('같은 좌표 유지, 다른 좌표 확대 분리, 필터 후 개수',()=>{
 const p=[{id:'a',latitude:37,longitude:127},{id:'b',latitude:37,longitude:127},{id:'c',latitude:37.0002,longitude:127}];
 const g=groupByCoordinate(p);assert.deepEqual(g.map(x=>x.photos.length),[2,1]);
 const project=g=>({x:g.latitude*10000,y:0});
 assert.equal(clusterGroups(g,project,{radius:70,separate:false})[0].photos.length,3);
 assert.deepEqual(clusterGroups(g,project,{radius:70,separate:true}).map(x=>x.photos.length),[2,1]);
 assert.equal(clusterGroups(groupByCoordinate(p.slice(1)),project,{radius:70,separate:false})[0].photos.length,2);
 assert.equal(clusterGroups(g,g=>({x:g.latitude*1000000,y:0}),{radius:70,separate:false}).length,2);
});
test('이미 비로그인이면 저장 불가 환경에서도 둘러보기 가능',async()=>{
 const api=createLocalAdapter({getItem(){throw Error('disabled')},setItem(){throw Error('disabled')}});
 assert.equal(await api.getCurrentUser(),null);await assert.doesNotReject(api.signOut());
 assert.equal(await api.getCurrentUser(),null);
});
test('실제 데모 세션을 지우지 못하면 로그아웃 성공으로 처리하지 않는다',async()=>{
 const api=createLocalAdapter({getItem:()=>JSON.stringify({version:1,currentUser:{id:'demo-user',isDemo:true},likedByUser:{}}),setItem(){throw Error('quota')}});
 await assert.rejects(api.signOut(),{code:'STORAGE_UNAVAILABLE'});
 assert.equal((await api.getCurrentUser()).id,'demo-user');
});
