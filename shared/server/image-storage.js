import fs from 'node:fs/promises';
import path from 'node:path';
import {createClient} from '@supabase/supabase-js';
export function localImageStorage(directory){return {directory,async put(id,bytes){await fs.mkdir(directory,{recursive:true});await fs.writeFile(path.join(directory,`${id}.jpg`),bytes);return `/uploads/${id}.jpg`;},async remove(id){await fs.rm(path.join(directory,`${id}.jpg`),{force:true});}};}
export function supabaseImageStorage({url,key,bucket='photos',fetchImpl}){
 const client=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false},...(fetchImpl?{global:{fetch:fetchImpl}}:{})}),storage=client.storage.from(bucket);
 return {async put(id,bytes){const name=`${id}.jpg`;const {error}=await storage.upload(name,bytes,{contentType:'image/jpeg',upsert:false});if(error)throw error;return storage.getPublicUrl(name).data.publicUrl;},async remove(id){const {error}=await storage.remove([`${id}.jpg`]);if(error)throw error;}};
}
