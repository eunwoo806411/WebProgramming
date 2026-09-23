export function groupByCoordinate(photos) {
  const groups=new Map();
  for (const p of photos) { const key=`${p.latitude},${p.longitude}`;
    if (!groups.has(key)) groups.set(key,{latitude:p.latitude,longitude:p.longitude,photos:[]});
    groups.get(key).photos.push(p);
  }
  return [...groups.values()];
}
// Connected components on projected screen coordinates. Exact positions stay unchanged.
export function clusterGroups(groups,project,{radius=76,separate=false}={}) {
  const points=groups.map(project), seen=new Set(), result=[];
  for(let i=0;i<groups.length;i++) {
    if(seen.has(i))continue;
    const members=[], queue=[i];seen.add(i);
    while(queue.length) {
      const current=queue.shift();members.push(groups[current]);
      if(separate)continue;
      for(let j=0;j<groups.length;j++)if(!seen.has(j) && Math.hypot(points[j].x-points[current].x,points[j].y-points[current].y)<radius){seen.add(j);queue.push(j);}
    }
    result.push({groups:members,photos:members.flatMap(g=>g.photos)});
  }
  return result;
}
