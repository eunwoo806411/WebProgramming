import test from 'node:test';
import assert from 'node:assert/strict';
import Database from 'better-sqlite3';
import {createSQLiteDatabase} from '../shared/server/database.js';
import {PersistentSessionStore} from '../shared/server/persistent-session-store.js';
const call=(store,method,...args)=>new Promise((resolve,reject)=>store[method](...args,(error,value)=>error?reject(error):resolve(value)));
test('로그아웃 뒤 완료된 요청은 세션을 다시 만들지 않는다',async()=>{
 const db=createSQLiteDatabase(new Database(':memory:')),store=new PersistentSessionStore(db);
 try{
  const value={cookie:{expires:new Date(Date.now()+60000).toISOString()},user:{id:'student'}};
  await call(store,'set','login',value);
  await call(store,'touch','login',value);
  assert.deepEqual(await call(store,'get','login'),value);
  await call(store,'destroy','login');
  await call(store,'touch','login',value);
  assert.equal(await call(store,'get','login'),null);
 }finally{await db.close();}
});
