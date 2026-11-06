import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {createPhotoRepository} from '../shared/server/photo-repository.js';
import {parsePhotoQuery} from '../shared/server/photo-query.js';
import {PersistentSessionStore} from '../shared/server/persistent-session-store.js';

test('PostgreSQL 스키마에서 기간·경계 조회, 페이지 이동, 좋아요와 세션을 처리한다',async()=>{
 const pg=new PGlite();
 try{
  // These roles and the Storage schema are supplied by Supabase, not by this app.
  await pg.exec(`CREATE ROLE anon; CREATE ROLE authenticated;CREATE SCHEMA storage;CREATE TABLE storage.buckets(id text PRIMARY KEY,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);`);
  await pg.exec(await fs.readFile(new URL('../supabase/migrations/202611060001_main_photos.sql',import.meta.url),'utf8'));
  const db={query:async(sql,args)=>(await pg.query(sql,args)).rows},repo=createPhotoRepository(db);
  for(let i=0;i<12;i++)await repo.insert({id:'p'+i.toString().padStart(2,'0'),authorId:'private',imageUrl:'https://example.test/a.jpg',latitude:37.496,longitude:126.957,placeName:'중앙도서관',description:'기록',capturedAt:'2026-01-01T00:00:00Z',uploadedAt:'2026-11-01T00:00:00Z'});
  const first=await repo.list(parsePhotoQuery(new URLSearchParams()));assert.equal(first.total,12);assert.equal(first.photos.length,10);
  const second=await repo.list(parsePhotoQuery(new URLSearchParams({cursor:first.nextCursor})));assert.deepEqual(second.photos.map(p=>p.id),['p01','p00']);
  await repo.setLiked('p01','user',true);await repo.setLiked('p01','user',true);assert.equal((await repo.get('p01','user')).likeCount,1);
  assert.equal((await repo.map(parsePhotoQuery(new URLSearchParams('south=38&north=39&west=126&east=127')))).photos.length,0);
  const store=new PersistentSessionStore(db),value={cookie:{expires:new Date(Date.now()+60000)},user:{id:'user'}};
  await new Promise((resolve,reject)=>store.set('s',value,e=>e?reject(e):resolve()));
  const loaded=await new Promise((resolve,reject)=>new PersistentSessionStore(db).get('s',(e,r)=>e?reject(e):resolve(r)));assert.equal(loaded.user.id,'user');
  await new Promise((resolve,reject)=>store.destroy('s',e=>e?reject(e):resolve()));
  assert.equal(await new Promise((resolve,reject)=>store.get('s',(e,r)=>e?reject(e):resolve(r))),null);
 }finally{await pg.close();}
});
