import Database from 'better-sqlite3';
import pg from 'pg';

export function createSQLiteDatabase(raw){
 raw.pragma('journal_mode = WAL');
 raw.exec(`CREATE TABLE IF NOT EXISTS photos (
 id TEXT PRIMARY KEY,author_id TEXT NOT NULL,latitude REAL NOT NULL,longitude REAL NOT NULL,
 place_name TEXT NOT NULL,description TEXT NOT NULL,captured_at TEXT NOT NULL,uploaded_at TEXT NOT NULL,
 image_url TEXT NOT NULL DEFAULT '',base_likes INTEGER NOT NULL DEFAULT 0,is_demo INTEGER NOT NULL DEFAULT 0);
 CREATE TABLE IF NOT EXISTS likes(user_id TEXT NOT NULL,photo_id TEXT NOT NULL,PRIMARY KEY(user_id,photo_id));
 CREATE TABLE IF NOT EXISTS sessions(sid TEXT PRIMARY KEY,data TEXT NOT NULL,expires BIGINT NOT NULL);`);
 const columns=new Set(raw.prepare('PRAGMA table_info(photos)').all().map(c=>c.name));
 for(const [name,type] of [['image_url',"TEXT NOT NULL DEFAULT ''"],['base_likes','INTEGER NOT NULL DEFAULT 0'],['is_demo','INTEGER NOT NULL DEFAULT 0']])if(!columns.has(name))raw.exec(`ALTER TABLE photos ADD COLUMN ${name} ${type}`);
 raw.exec(`CREATE INDEX IF NOT EXISTS photos_latest ON photos(uploaded_at DESC,id DESC);
 CREATE INDEX IF NOT EXISTS photos_location ON photos(latitude,longitude);
 CREATE INDEX IF NOT EXISTS likes_photo ON likes(photo_id);`);
 return {kind:'sqlite',async query(sql,values=[]){const ordered=[];const text=sql.replace(/\$(\d+)/g,(_,i)=>{ordered.push(values[Number(i)-1]);return '?';});const statement=raw.prepare(text);return statement.reader?statement.all(...ordered):(statement.run(...ordered),[]);},async close(){raw.close();}};
}
export async function openDatabase({storageDir,connectionString,ca}={}){
 if(!connectionString)return createSQLiteDatabase(new Database(`${storageDir}/data.db`));
 // Pooler connection strings work without prepared statement names. TLS verification stays enabled.
 const url=new URL(connectionString);
 if(!['postgres:','postgresql:'].includes(url.protocol)||['disable','no-verify','prefer'].includes(url.searchParams.get('sslmode')))throw new Error('외부 DB는 인증서를 검증하는 TLS 연결이 필요합니다.');
 // Do not let URI sslmode=require override certificate verification in node-postgres.
 for(const key of ['sslmode','sslcert','sslkey','sslrootcert'])url.searchParams.delete(key);
 const pool=new pg.Pool({connectionString:url.toString(),max:5,connectionTimeoutMillis:10000,statement_timeout:15000,ssl:{rejectUnauthorized:true,...(ca?{ca:ca.replace(/\\n/g,'\n')}:{})}});
 try{await pool.query('SELECT id FROM photos LIMIT 0');}catch(error){await pool.end();throw error;}
 return {kind:'postgres',async query(sql,values=[]){return (await pool.query(sql,values)).rows;},async close(){await pool.end();}};
}
