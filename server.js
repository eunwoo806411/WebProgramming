import express from 'express';
import session from 'express-session';
import 'dotenv/config';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {ssuLogin,loginErrorResponse} from './shared/server/school-login.js';
import {openDatabase} from './shared/server/database.js';
import {createPhotoRepository} from './shared/server/photo-repository.js';
import {PersistentSessionStore} from './shared/server/persistent-session-store.js';
import {localImageStorage,supabaseImageStorage} from './shared/server/image-storage.js';
import {mountPhotoRoutes} from './shared/server/photo-routes.js';
import {mockPhotos} from './data/mock-photos.js';
const ROOT=path.dirname(fileURLToPath(import.meta.url));

export async function createServer(options={}){
 const isProd=options.isProd??process.env.NODE_ENV==='production';
 const databaseUrl=options.databaseUrl??process.env.DATABASE_URL;
 const supabaseUrl=options.supabaseUrl??process.env.SUPABASE_URL;
 const supabaseKey=options.supabaseKey??process.env.SUPABASE_SERVICE_ROLE_KEY;
 const cloud=[databaseUrl,supabaseUrl,supabaseKey];
 if(cloud.some(Boolean)&&!cloud.every(Boolean))throw new Error('DATABASE_URL, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY를 함께 설정해 주세요.');
 if(isProd&&!cloud.every(Boolean))throw new Error('배포 환경에서는 사진·DB·세션용 외부 저장소를 설정해 주세요.');
 const secret=options.sessionSecret??process.env.SESSION_SECRET;
 if(isProd&&!secret)throw new Error('배포 환경에서는 SESSION_SECRET이 필요합니다.');
 const storageDir=path.resolve(options.storageDir??process.env.STORAGE_DIR??path.join(ROOT,'storage'));
 if(!databaseUrl)await fs.mkdir(storageDir,{recursive:true});
 const db=await openDatabase({storageDir,connectionString:databaseUrl,ca:process.env.DATABASE_SSL_CA});
 try{
 const repo=createPhotoRepository(db);
 const files=options.files??(databaseUrl?supabaseImageStorage({url:supabaseUrl,key:supabaseKey,bucket:process.env.SUPABASE_STORAGE_BUCKET??'photos'}):localImageStorage(path.join(storageDir,'uploads')));
 const seedDemo=options.seedDemo??(process.env.SEED_DEMO_PHOTOS==='true'||(!databaseUrl&&process.env.SEED_DEMO_PHOTOS!=='false'));
 if(seedDemo)for(const photo of mockPhotos)await repo.insert(photo);
 const app=express();app.disable('x-powered-by');app.set('trust proxy',1);
 if(isProd)app.use((req,res,next)=>req.secure?next():res.redirect(301,`https://${req.headers.host}${req.originalUrl}`));
 app.use(express.json({limit:'8mb'}));
 app.use(session({store:new PersistentSessionStore(db),secret:secret??'dev-only-change-me',resave:false,saveUninitialized:false,cookie:{httpOnly:true,sameSite:'lax',secure:isProd,maxAge:7*86400000}}));
 app.get(['/','/index.html'],(req,res)=>res.sendFile(path.join(ROOT,'index.html')));
 for(const dir of ['pages','shared','data'])app.use('/'+dir,express.static(path.join(ROOT,dir),{setHeaders(res,file){if(/\.(html|js|css)$/.test(file))res.setHeader('Cache-Control','no-cache');}}));
 if(files.directory)app.use('/uploads',express.static(files.directory,{maxAge:'7d',setHeaders:res=>res.setHeader('X-Content-Type-Options','nosniff')}));
 const requireLogin=message=>(req,res,next)=>req.session.user?next():res.status(401).json({success:false,message});
 app.get('/api/health',(req,res)=>res.json({success:true,storage:db.kind}));
 app.post('/api/login',async(req,res)=>{
  const id=String(req.body?.id??'').trim(),password=String(req.body?.password??'');
  const testLogin=!isProd&&(options.allowTestLogin??process.env.ALLOW_TEST_LOGIN==='true')&&id==='test'&&password==='1234';
  if(!testLogin&&(!/^\d{8}$/.test(id)||!password))return res.status(400).json({success:false,message:'학번(8자리)과 비밀번호를 입력해주세요.'});
  if(!testLogin)try{await (options.login??ssuLogin)(id,password);}catch(error){const e=loginErrorResponse(error);return res.status(e.status).json({success:false,code:e.code,message:e.message});}
  req.session.regenerate(error=>{if(error)return res.status(500).json({success:false,message:'세션 생성 실패'});req.session.user={id,name:id};res.json({success:true,message:'로그인 성공!'});});
 });
 app.get('/api/me',(req,res)=>req.session.user?res.json({success:true,user:req.session.user}):res.status(401).json({success:false,message:'로그인이 필요합니다.'}));
 app.post('/api/logout',(req,res)=>req.session.destroy(error=>{if(error)return res.status(500).json({success:false,message:'로그아웃 실패'});res.clearCookie('connect.sid');res.json({success:true,message:'로그아웃 완료'});}));
 mountPhotoRoutes(app,{repo,files,requireLogin});
 app.use('/api',(req,res)=>res.status(404).json({success:false,message:'존재하지 않는 API입니다.'}));
 app.use((error,req,res,next)=>{const status=error.status===400?400:error.status===413?413:500;if(status===500)console.error('요청 처리 실패:',error.code??error.name);res.status(status).json({success:false,message:status===400?error.message:status===413?'사진 용량이 너무 커요.':'데이터를 처리하지 못했어요. 잠시 후 다시 시도해 주세요.'});});
 return {app,repo,db,files,close:()=>db.close()};
 }catch(error){await db.close();throw error;}
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{
  const runtime=await createServer(),port=process.env.PORT??3000;
  const server=runtime.app.listen(port,process.env.HOST??(process.env.NODE_ENV==='production'?'0.0.0.0':'127.0.0.1'),()=>console.log(`서버 실행 중: http://localhost:${port}`));
  for(const signal of ['SIGTERM','SIGINT'])process.on(signal,()=>server.close(async()=>{await runtime.close();process.exit(0);}));
 }catch(error){console.error('서버 시작 실패:',error.code??'CONFIGURATION_ERROR');process.exitCode=1;}
}
