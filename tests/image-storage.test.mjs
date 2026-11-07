import test from 'node:test';
import assert from 'node:assert/strict';
import {supabaseImageStorage} from '../shared/server/image-storage.js';

test('Supabase SDK에 JPEG 바이트를 전송하고 메타데이터용 공개 주소를 반환한다',async()=>{
 const calls=[];
 const store=supabaseImageStorage({url:'https://project.supabase.co',key:'server-only-test-key',fetchImpl:async(url,options)=>{
  calls.push({url:String(url),options});return new Response(JSON.stringify({Key:'photos/a.jpg'}),{status:200,headers:{'Content-Type':'application/json'}});
 }});
 const bytes=Buffer.from([255,216,255,217]);
 assert.equal(await store.put('a',bytes),'https://project.supabase.co/storage/v1/object/public/photos/a.jpg');
 assert.equal(calls[0].url,'https://project.supabase.co/storage/v1/object/photos/a.jpg');assert.deepEqual(calls[0].options.body,bytes);
 await store.remove('a');assert.equal(calls[1].options.method,'DELETE');assert.deepEqual(JSON.parse(calls[1].options.body),{prefixes:['a.jpg']});
});
test('Storage 업로드 실패를 성공 URL로 바꾸지 않는다',async()=>{
 const store=supabaseImageStorage({url:'https://project.supabase.co',key:'test-key',fetchImpl:async()=>new Response(JSON.stringify({message:'Storage full'}),{status:400,headers:{'Content-Type':'application/json'}})});
 await assert.rejects(store.put('a',Buffer.from([255,216,255,217])),/Storage full/);
});
