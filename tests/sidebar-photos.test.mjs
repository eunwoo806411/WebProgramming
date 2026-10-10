import test from 'node:test';
import assert from 'node:assert/strict';
import * as sidebar from '../pages/main/sidebar-photos.js';
const bounds={south:37,west:126,north:38,east:127};
test('지도 경계 안의 사진만 목록에 포함하고 경계선 사진도 포함한다',()=>{
 assert.equal(typeof sidebar.selectSidebarPhotos,'function');
 const photos=[{id:'inside',latitude:37.5,longitude:126.5},{id:'edge',latitude:38,longitude:127},{id:'outside',latitude:38.1,longitude:127},{id:'bad',latitude:NaN,longitude:126}];
 assert.deepEqual(sidebar.selectSidebarPhotos(photos,{bounds}).photos.map(p=>p.id),['inside','edge']);
});
test('50장의 목록은 10장부터 보여주고 더 보기로 20장까지 늘린다',()=>{
 assert.equal(typeof sidebar.selectSidebarPhotos,'function');
 const photos=Array.from({length:50},(_,id)=>({id,latitude:37.5,longitude:126.5}));
 assert.equal(sidebar.selectSidebarPhotos(photos,{bounds}).photos.length,10);
 assert.equal(sidebar.selectSidebarPhotos(photos,{bounds}).total,50);
 assert.deepEqual(sidebar.selectSidebarPhotos(photos,{bounds,limit:20}).photos.map(p=>p.id),Array.from({length:20},(_,i)=>i));
});
test('장소 묶음은 현재 기간에 포함된 선택 사진만 보여준다',()=>{
 assert.equal(typeof sidebar.selectSidebarPhotos,'function');
 const photos=[{id:'a',latitude:37.5,longitude:126.5},{id:'b',latitude:37.6,longitude:126.6}];
 assert.deepEqual(sidebar.selectSidebarPhotos(photos,{bounds,ids:['b','filtered-out']}).photos.map(p=>p.id),['b']);
});
