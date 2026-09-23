import {CONFIG} from '../../shared/js/config.js';
import {parseKstInput,toKstInput,formatKst} from '../../shared/js/time.js';
export function mountTimeControls(container,{photos,onChange}){
 const inputStart=container.querySelector('#time-start'),inputEnd=container.querySelector('#time-end'),rangeStart=container.querySelector('#range-start'),rangeEnd=container.querySelector('#range-end');
 const message=document.querySelector('#time-message'),resetButton=document.querySelector('#reset-time');
 const times=photos.map(p=>Date.parse(p[CONFIG.timeField])).filter(Number.isFinite);
 const extent=times.length?[Math.min(...times),Math.max(...times)]:[Date.now(),Date.now()];
 let selection={start:extent[0],end:extent[1]};
 function sync(){
  const {start,end}=selection;
  const valid=start!==null && end!==null && start<=end;
  for(const n of [inputStart,inputEnd])n.setAttribute('aria-invalid',String(!valid));
  message.classList.toggle('error',!valid);
  if(start===null || end===null)message.textContent='시작과 끝 날짜·시간을 모두 입력해 주세요.';
  else if(start>end)message.textContent='시작 시간이 끝 시간보다 늦어요. 범위를 다시 확인해 주세요.';
  else message.textContent=`${formatKst(start).replace(' KST','')} — ${formatKst(end).replace(' KST','')} · 시작과 끝 시각 포함`;
  if(start!==null && end!==null){
   const min=Math.min(extent[0],start,end),max=Math.max(extent[1],start,end,min+1000);
   for(const range of [rangeStart,rangeEnd]){range.min=String(min/1000);range.max=String(max/1000);}
   rangeStart.value=String(start/1000);rangeEnd.value=String(end/1000);
   rangeStart.setAttribute('aria-valuetext',formatKst(start));rangeEnd.setAttribute('aria-valuetext',formatKst(end));
  }
  onChange({...selection,valid});
 }
 const fromInput=()=>{selection={start:parseKstInput(inputStart.value),end:parseKstInput(inputEnd.value)};sync();};
 const fromRange=()=>{selection={start:Number(rangeStart.value)*1000,end:Number(rangeEnd.value)*1000};inputStart.value=toKstInput(selection.start);inputEnd.value=toKstInput(selection.end);sync();};
 function reset(){selection={start:extent[0],end:extent[1]};inputStart.value=toKstInput(selection.start);inputEnd.value=toKstInput(selection.end);sync();}
 inputStart.addEventListener('input',fromInput);inputEnd.addEventListener('input',fromInput);rangeStart.addEventListener('input',fromRange);rangeEnd.addEventListener('input',fromRange);resetButton.addEventListener('click',reset);
 reset();return {reset,destroy(){inputStart.removeEventListener('input',fromInput);inputEnd.removeEventListener('input',fromInput);rangeStart.removeEventListener('input',fromRange);rangeEnd.removeEventListener('input',fromRange);resetButton.removeEventListener('click',reset);}};
}
