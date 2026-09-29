// 기존에 사용하던 감도와 프레임별 보간을 유지합니다.
export function mountSmoothWheelZoom(map,container,pixelsPerLevel){
 let frame=0,lastTime=0,target=map.getZoom(),anchor;
 const clamp=value=>Math.max(map.getMinZoom(),Math.min(map.getMaxZoom(),value));
 function stop(){
  cancelAnimationFrame(frame);
  frame=0;lastTime=0;target=map.getZoom();
 }
 function tick(time){
  const elapsed=lastTime?Math.min(time-lastTime,64):16;
  lastTime=time;
  target=clamp(target);
  const current=map.getZoom(),difference=target-current;
  const next=Math.abs(difference)<0.001?target:current+difference*(1-Math.exp(-elapsed/55));
  map.setZoomAround(anchor,clamp(next),{animate:false});
  if(Math.abs(target-map.getZoom())>0.001)frame=requestAnimationFrame(tick);
  else{map.setZoomAround(anchor,target,{animate:false});frame=0;lastTime=0;}
 }
 function onWheel(event){
  if(event.target.closest('.leaflet-control'))return;
  event.preventDefault();event.stopPropagation();
  const unit=event.deltaMode===1?16:event.deltaMode===2?container.clientHeight:1;
  const delta=event.deltaY*unit*(event.ctrlKey?4:1);
  if(!Number.isFinite(delta)||delta===0)return;
  if(!frame)target=map.getZoom();
  target=clamp(target-Math.max(-0.5,Math.min(0.5,delta/pixelsPerLevel)));
  anchor=map.mouseEventToContainerPoint(event);
  if(!frame)frame=requestAnimationFrame(tick);
 }
 container.addEventListener('wheel',onWheel,{passive:false});
 container.addEventListener('pointerdown',stop);
 container.addEventListener('keydown',stop);
 map.on('resize',stop);
 return {stop,destroy(){
  stop();
  container.removeEventListener('wheel',onWheel);
  container.removeEventListener('pointerdown',stop);
  container.removeEventListener('keydown',stop);
  map.off('resize',stop);
 }};
}
