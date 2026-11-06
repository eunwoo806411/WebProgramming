const invalid=()=>Object.assign(new Error('조회 조건을 확인해 주세요.'),{status:400,code:'INVALID_QUERY'});
const idPattern=/^[A-Za-z0-9_-]{1,100}$/;
export function parsePhotoQuery(params){
 const get=name=>{const values=params.getAll(name);if(values.length>1)throw invalid();return values[0];};
 const date=name=>{const raw=get(name);if(raw===undefined)return null;if(!/^\d{4}-\d\d-\d\dT/.test(raw)||!/(Z|[+-]\d\d:\d\d)$/.test(raw)||!Number.isFinite(Date.parse(raw)))throw invalid();return new Date(raw).toISOString();};
 const start=date('start'),end=date('end');if(start&&end&&start>end)throw invalid();
 const coordinates=['south','west','north','east'].map(get);let bounds=null;
 if(coordinates.some(v=>v!==undefined)){
  if(coordinates.some(v=>v===undefined||v.trim()===''||!Number.isFinite(Number(v))))throw invalid();
  const [south,west,north,east]=coordinates.map(Number);
  if(south< -90||north>90||west< -180||east>180||south>north||west>east)throw invalid();
  bounds={south,west,north,east};
 }
 const rawIds=get('ids');let ids=null;
 if(rawIds!==undefined){ids=[...new Set(rawIds.split(','))];if(ids.length>5000||ids.some(id=>!idPattern.test(id)))throw invalid();}
 const rawLimit=get('limit');if(rawLimit!==undefined&&!/^[1-9]\d*$/.test(rawLimit))throw invalid();
 const limit=rawLimit===undefined?10:Number(rawLimit);if(limit>100)throw invalid();
 let cursor=null;const rawCursor=get('cursor');
 if(rawCursor!==undefined){try{
  if(rawCursor.length>512||!/^[A-Za-z0-9_-]+$/.test(rawCursor))throw invalid();
  cursor=JSON.parse(Buffer.from(rawCursor,'base64url').toString());
  if(!idPattern.test(cursor.id)||typeof cursor.uploadedAt!=='string'||new Date(cursor.uploadedAt).toISOString()!==cursor.uploadedAt)throw invalid();
 }catch{throw invalid();}}
 return {start,end,bounds,ids,limit,cursor};
}
export const encodeCursor=p=>Buffer.from(JSON.stringify({uploadedAt:p.uploadedAt,id:p.id})).toString('base64url');
