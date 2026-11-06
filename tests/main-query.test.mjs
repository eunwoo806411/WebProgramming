import test from 'node:test';
import assert from 'node:assert/strict';
import Database from 'better-sqlite3';
import {createSQLiteDatabase} from '../shared/server/database.js';
import {createPhotoRepository} from '../shared/server/photo-repository.js';
import {parsePhotoQuery} from '../shared/server/photo-query.js';

const photo=(id,overrides={})=>({id,authorId:'private-student',imageUrl:'/uploads/a.jpg',latitude:37.496,longitude:126.957,placeName:'도서관',description:'순간',capturedAt:'2024-01-01T00:00:00.000Z',uploadedAt:'2026-11-01T00:00:00.000Z',...overrides});
async function fixture(){const db=createSQLiteDatabase(new Database(':memory:'));const repo=createPhotoRepository(db);return {db,repo};}

test('빈 범위·중복 파라미터·역전 시간·잘못된 커서를 400 오류로 거부한다',()=>{
 for(const q of ['south=&west=126&east=128&north=38','south=38&north=37&west=126&east=128','south=37','start=bad','start=2026-11-02T00:00:00Z&end=2026-11-01T00:00:00Z','limit=0','limit=10&limit=20','cursor=not-base64','ids=a%27%20OR%201=1']){
  assert.throws(()=>parsePhotoQuery(new URLSearchParams(q)),e=>e.status===400,q);
 }
});
test('시간과 지도 경계를 포함 비교하고 공개 응답에 학번을 넣지 않는다',async()=>{
 const {db,repo}=await fixture();
 try{
  await repo.insert(photo('a'));await repo.insert(photo('b',{latitude:38}));await repo.insert(photo('c',{uploadedAt:'2026-11-02T00:00:00.000Z'}));
  const q=parsePhotoQuery(new URLSearchParams('south=37.496&north=37.5&west=126.957&east=127&start=2026-11-01T00:00:00Z&end=2026-11-01T00:00:00Z'));
  const result=await repo.list(q);assert.deepEqual(result.photos.map(p=>p.id),['a']);assert.equal(result.total,1);assert.equal('authorId' in result.photos[0],false);assert.equal('author_id' in result.photos[0],false);
 }finally{await db.close();}
});
test('같은 시각의 50장도 목록 커서에 중복·누락이 없고 지도에는 전부 표시한다',async()=>{
 const {db,repo}=await fixture();
 try{
  for(let i=0;i<50;i++)await repo.insert(photo('p'+String(i).padStart(2,'0')));
  let cursor=null,ids=[];
  do{const q=parsePhotoQuery(new URLSearchParams(cursor?{cursor}:{}));const r=await repo.list(q);assert.equal(r.total,50);assert.equal(r.photos.length,10);ids.push(...r.photos.map(p=>p.id));cursor=r.nextCursor;}while(cursor);
  assert.equal(new Set(ids).size,50);assert.equal(ids[0],'p49');assert.equal(ids.at(-1),'p00');
  const map=await repo.map(parsePhotoQuery(new URLSearchParams()));assert.equal(map.photos.length,50);assert.equal(map.truncated,false);
 }finally{await db.close();}
});
test('선택한 사진 묶음은 지도 범위보다 우선하고 시간 조건은 유지한다',async()=>{
 const {db,repo}=await fixture();
 try{await repo.insert(photo('inside'));await repo.insert(photo('outside',{latitude:38}));
 const q=parsePhotoQuery(new URLSearchParams('ids=outside&south=37&north=37.6&west=126&east=127'));
 assert.deepEqual((await repo.list(q)).photos.map(p=>p.id),['outside']);
 }finally{await db.close();}
});
test('좋아요 등록·취소는 멱등이며 다른 사용자 좋아요를 보존한다',async()=>{
 const {db,repo}=await fixture();
 try{await repo.insert(photo('a'));
 await repo.setLiked('a','u1',true);await repo.setLiked('a','u1',true);await repo.setLiked('a','u2',true);
 assert.equal((await repo.get('a','u1')).likeCount,2);assert.equal((await repo.get('a','u1')).liked,true);
 await repo.setLiked('a','u1',false);await repo.setLiked('a','u1',false);
 assert.equal((await repo.get('a','u1')).likeCount,1);assert.equal((await repo.get('a','u1')).liked,false);
 assert.equal(await repo.get('missing'),null);
 }finally{await db.close();}
});
test('시간대가 있는 사진을 UTC로 통일해서 날짜 필터 경계를 정확히 비교한다',async()=>{
 const {db,repo}=await fixture();
 try{await repo.insert(photo('kst',{uploadedAt:'2026-09-23T09:00:00+09:00'}));
 const q=parsePhotoQuery(new URLSearchParams('start=2026-09-23T00:00:00Z&end=2026-09-23T00:00:00Z'));
 assert.deepEqual((await repo.list(q)).photos.map(p=>p.id),['kst']);
 }finally{await db.close();}
});

test('인기순 페이지는 좋아요 수와 동률 순서를 유지하며 누락 없이 더 본다',async()=>{
 const db=createSQLiteDatabase(new Database(':memory:')),repo=createPhotoRepository(db);
 try{
  for(let i=0;i<7;i++)await repo.insert({id:'rank-'+i,authorId:'user',imageUrl:'https://example.test/a.jpg',latitude:37.496,longitude:126.957,placeName:'도서관',description:'기록',capturedAt:'2026-01-01T00:00:00Z',uploadedAt:'2026-01-01T00:00:00Z',likeCount:i%3});
  let cursor,ids=[];do{const page=await repo.list(parsePhotoQuery(new URLSearchParams({order:'popular',limit:'2',...(cursor?{cursor}:{})})));ids.push(...page.photos.map(p=>p.id));cursor=page.nextCursor;}while(cursor);
  assert.deepEqual(ids,['rank-5','rank-2','rank-4','rank-1','rank-6','rank-3','rank-0']);
 }finally{await db.close();}
});
