import {CONFIG} from '../../shared/js/config.js';
import {parseKstInput,toKstInput,formatKst} from '../../shared/js/time.js';
export function dateSelection(startDate,endDate){
 const start=parseKstInput(`${startDate}T00:00:00`),last=parseKstInput(`${endDate}T23:59:59`);
 return {start,end:last===null?null:last+999};
}
export function presetSelection(kind,now=Date.now()){
 const today=toKstInput(now).slice(0,10),[year,month,day]=today.split('-').map(Number);
 const previous=new Date(Date.UTC(year,month-2,1));
 const lastDay=new Date(Date.UTC(year,month-1,0)).getUTCDate();
 const monthStart=new Date(Date.UTC(previous.getUTCFullYear(),previous.getUTCMonth(),Math.min(day,lastDay))).toISOString().slice(0,10);
 return dateSelection(kind==='year'?`${year}-01-01`:monthStart,today);
}
export function mountTimeControls(container,{photos,onChange}){
 const inputStart=container.querySelector('#time-start'),inputEnd=container.querySelector('#time-end'),rangeStart=container.querySelector('#range-start'),rangeEnd=container.querySelector('#range-end');
 const message=document.querySelector('#time-message'),resetButton=document.querySelector('#reset-time');
 const dateStart=container.querySelector('#date-start'),dateEnd=container.querySelector('#date-end'),details=container.querySelector('#time-details');
 const presets=[resetButton,...container.querySelectorAll('[data-period]')];
 const listeners=[];
 const listen=(node,event,handler)=>{if(node){node.addEventListener(event,handler);listeners.push(()=>node.removeEventListener(event,handler));}};
 let period='all';
 const times=photos.map(p=>Date.parse(p[CONFIG.timeField])).filter(Number.isFinite);
 const extent=times.length?[Math.min(...times),Math.max(...times)]:[Date.now(),Date.now()];
 let selection={start:extent[0],end:extent[1]};
 function sync(){
  const {start,end}=selection;
  const valid=start!==null && end!==null && start<=end;
  for(const n of [inputStart,inputEnd])n.setAttribute('aria-invalid',String(!valid));
  for(const n of [dateStart,dateEnd])if(n)n.setAttribute('aria-invalid',String(!valid));
  for(const button of presets)button.setAttribute('aria-pressed',String((button.dataset.period||'all')===period));
  message.classList.toggle('error',!valid);
  if(start===null || end===null)message.textContent='시작과 끝 날짜·시간을 모두 입력해 주세요.';
  else if(start>end)message.textContent='시작 시간이 끝 시간보다 늦어요. 범위를 다시 확인해 주세요.';
  else message.textContent=details&&!details.open?`${toKstInput(start).slice(0,10).replaceAll('-','.')} — ${toKstInput(end).slice(0,10).replaceAll('-','.')} · 선택한 날짜 포함`:`${formatKst(start).replace(' KST','')} — ${formatKst(end).replace(' KST','')} · 시작과 끝 시각 포함`;
  if(start!==null && end!==null){
   const min=Math.min(extent[0],start,end),max=Math.max(extent[1],start,end,min+1000);
   for(const range of [rangeStart,rangeEnd]){range.min=String(min/1000);range.max=String(max/1000);}
   rangeStart.value=String(start/1000);rangeEnd.value=String(end/1000);
   rangeStart.setAttribute('aria-valuetext',formatKst(start));rangeEnd.setAttribute('aria-valuetext',formatKst(end));
  }
  onChange({...selection,valid});
 }
 function writeDates(){if(dateStart)dateStart.value=toKstInput(selection.start).slice(0,10);if(dateEnd)dateEnd.value=toKstInput(selection.end).slice(0,10);}
 function writeTimes(){inputStart.value=toKstInput(selection.start);inputEnd.value=toKstInput(selection.end);}
 const fromInput=()=>{period=null;selection={start:parseKstInput(inputStart.value),end:parseKstInput(inputEnd.value)};writeDates();sync();};
 const fromDates=()=>{period=null;selection=dateSelection(dateStart.value,dateEnd.value);writeTimes();sync();};
 const fromRange=()=>{period=null;selection={start:Number(rangeStart.value)*1000,end:Number(rangeEnd.value)*1000};writeTimes();writeDates();sync();};
 function reset(){period='all';selection={start:extent[0],end:extent[1]};writeTimes();writeDates();sync();}
 listen(inputStart,'input',fromInput);listen(inputEnd,'input',fromInput);listen(rangeStart,'input',fromRange);listen(rangeEnd,'input',fromRange);listen(resetButton,'click',reset);
 listen(dateStart,'input',fromDates);listen(dateEnd,'input',fromDates);listen(details,'toggle',sync);
 for(const button of presets.slice(1))listen(button,'click',()=>{period=button.dataset.period;selection=presetSelection(period);writeTimes();writeDates();sync();});
 reset();return {reset,destroy(){listeners.forEach(remove=>remove());}};
}
