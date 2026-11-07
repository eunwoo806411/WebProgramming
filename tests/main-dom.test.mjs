import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {JSDOM} from 'jsdom';
import {createServer} from '../server.js';

test('실제 HTML과 API로 날짜 변경·더 보기·선택 버튼을 갱신하며 지도 라이브러리 실패에도 목록은 동작한다',async t=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'main-dom-'));
 const runtime=await createServer({env:{},storageDir:dir,seedDemo:true,sessionSecret:'dom-test-secret'});
 const server=runtime.app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));
 const base=`http://127.0.0.1:${server.address().port}`;
 const dom=new JSDOM(await fs.readFile(new URL('../pages/main/index.html',import.meta.url),'utf8'),{url:base+'/pages/main/index.html'});
 const globals=['window','document','location','CustomEvent'];const old=new Map(globals.map(k=>[k,Object.getOwnPropertyDescriptor(globalThis,k)]));const network=globalThis.fetch;
 for(const k of globals)Object.defineProperty(globalThis,k,{configurable:true,writable:true,value:dom.window[k]});
 let failMap=false;
 globalThis.fetch=(url,options)=>failMap&&String(url).startsWith('/api/map/photos')?Promise.resolve(new Response(JSON.stringify({message:'지도 조회 실패'}),{status:503,headers:{'Content-Type':'application/json'}})):network(new URL(url,base),options);
 t.after(async()=>{globalThis.fetch=network;for(const k of globals){if(old.get(k))Object.defineProperty(globalThis,k,old.get(k));else delete globalThis[k];}dom.window.close();await new Promise(r=>server.close(r));await runtime.close();await fs.rm(dir,{recursive:true,force:true});});
 const wait=async check=>{for(let i=0;i<100;i++){if(check())return;await new Promise(r=>setTimeout(r,10));}assert.fail('DOM update timed out');};
 await import('../pages/main/main.js');
 const doc=dom.window.document;
 await wait(()=>doc.querySelector('#photo-list').getAttribute('aria-busy')==='false');
 doc.querySelector('#reset-time').click();
 await wait(()=>doc.querySelectorAll('.sidebar-photo').length===10);
 assert.equal(doc.querySelector('#photo-count').textContent,'12장');assert.equal(doc.querySelector('#more-photos').hidden,false);
 doc.querySelector('#more-photos').click();await wait(()=>doc.querySelectorAll('.sidebar-photo').length===12);
 assert.equal(doc.querySelector('#more-photos').hidden,true);
 for(const id of ['date-start','date-end']){const input=doc.getElementById(id);input.value='2026-09-23';input.dispatchEvent(new dom.window.Event('input',{bubbles:true}));}
 await wait(()=>doc.querySelectorAll('.sidebar-photo').length===4);
 assert.equal(doc.querySelector('#photo-count').textContent,'4장');
 failMap=true;doc.querySelector('#reset-time').click();
 await wait(()=>doc.querySelector('#results-summary button')&&doc.querySelectorAll('.sidebar-photo').length===10);
 failMap=false;doc.querySelector('#results-summary button').click();
 await wait(()=>!doc.querySelector('#results-summary button')&&doc.querySelector('#results-summary').textContent.includes('12장'));
 doc.querySelector('.photo-card').click();assert.equal(doc.querySelectorAll('.photo-card[aria-pressed=true]').length,1);assert.equal(doc.querySelector('.photo-detail-link').hidden,false);
});
