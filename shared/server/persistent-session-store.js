import session from 'express-session';
export class PersistentSessionStore extends session.Store{
 constructor(db){super();this.db=db;}
 get(sid,callback){this.db.query('SELECT data,expires FROM sessions WHERE sid=$1',[sid]).then(async rows=>{
  const row=rows[0];if(!row)return callback(null,null);
  if(Number(row.expires)<=Date.now()){await this.db.query('DELETE FROM sessions WHERE sid=$1',[sid]);return callback(null,null);}
  callback(null,JSON.parse(row.data));
 }).catch(callback);}
 set(sid,value,callback=()=>{}){
  const expires=value.cookie?.expires?new Date(value.cookie.expires).getTime():Date.now()+7*86400000;
  this.db.query('DELETE FROM sessions WHERE expires <= $1',[Date.now()]).then(()=>this.db.query('INSERT INTO sessions(sid,data,expires) VALUES($1,$2,$3) ON CONFLICT(sid) DO UPDATE SET data=excluded.data,expires=excluded.expires',[sid,JSON.stringify(value),expires])).then(()=>callback(null)).catch(callback);
 }
 touch(sid,value,callback=()=>{}){
  const expires=value.cookie?.expires?new Date(value.cookie.expires).getTime():Date.now()+7*86400000;
  this.db.query('UPDATE sessions SET expires=$1 WHERE sid=$2',[expires,sid]).then(()=>callback(null)).catch(callback);
 }
 destroy(sid,callback=()=>{}){this.db.query('DELETE FROM sessions WHERE sid=$1',[sid]).then(()=>callback(null)).catch(callback);}
}
