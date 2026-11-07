import test from 'node:test';
import assert from 'node:assert/strict';
import {createLatestRequest} from '../pages/main/latest-request.js';
import {createServerAdapter} from '../shared/js/server-adapter.js';

test('늦은 이전 응답은 최신 지도·기간 응답을 덮어쓰지 않는다',async()=>{
 const gate=createLatestRequest();let release;const old=gate.run(()=>new Promise(r=>release=r));
 const current=await gate.run(async()=>['new']);release(['old']);assert.deepEqual(current,{current:true,value:['new']});assert.equal((await old).current,false);
});
test('API 실패를 예시 사진으로 숨기지 않고 전달한다',async()=>{
 const api=createServerAdapter({fetchImpl:async()=>new Response(JSON.stringify({success:false,message:'저장소 연결 오류'}),{status:503})});
 await assert.rejects(api.listPhotos(),/저장소 연결 오류/);
});
test('목록 여러 페이지와 지도용 조회를 구분하고 선택 묶음은 긴 URL 없이 보낸다',async()=>{
 const requests=[];
 const api=createServerAdapter({fetchImpl:async(url,options)=>{
  requests.push({url,options});
  return new Response(JSON.stringify({success:true,photos:[{id:'one',uploadedAt:'2026-01-01T00:00:00Z'}],total:1,nextCursor:null}));
 }});
 await api.listMapPhotos({start:Date.parse('2026-01-01T00:00:00Z'),bounds:{south:37,west:126,north:38,east:127}});
 await api.listPhotoPage({ids:['a','b'],cursor:'abc'});
 assert.ok(requests[0].url.startsWith('/api/map/photos?'));assert.ok(requests[0].url.includes('south=37'));
 assert.equal(requests[1].url,'/api/photos/search');assert.equal(requests[1].options.method,'POST');
 assert.ok(JSON.parse(requests[1].options.body).query.includes('ids=a%2Cb'));
});
