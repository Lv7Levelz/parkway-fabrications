import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { json, readBody, parseCookies, cookie, randomToken, sign, unsign, safeLog } from './lib/http.js';
import { parseMultipart } from './lib/uploads.js';
import { validateEnquiry, validateStatus } from './lib/validation.js';

const here=fileURLToPath(new URL('.',import.meta.url));
const securityHeaders={
  'X-Content-Type-Options':'nosniff','X-Frame-Options':'DENY','Referrer-Policy':'strict-origin-when-cross-origin',
  'Permissions-Policy':'camera=(), microphone=(), geolocation=()','X-Robots-Tag':'noindex, nofollow',
  'Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'"
};
const mime={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.svg':'image/svg+xml'};

export function createApp({ config, database, emails, fetchImpl=fetch, now=()=>Date.now() }) {
  const attempts=new Map();
  const clientIp=(request)=>config.trustProxy?(request.headers['x-forwarded-for']||request.socket.remoteAddress).split(',')[0].trim():request.socket.remoteAddress;
  const rateLimit=(request,key,limit,windowMs)=>{if(attempts.size>10000){const cutoff=now()-windowMs;for(const [entryId,entry] of attempts)if(entry.start<cutoff)attempts.delete(entryId);}const id=`${key}:${clientIp(request)}`,time=now(),record=attempts.get(id);if(!record||time-record.start>windowMs){attempts.set(id,{start:time,count:1});return false;}record.count++;return record.count>limit;};
  const allowedOrigin=(origin)=>!origin||config.frontendOrigins.includes(origin)||origin===config.appUrl;
  const cors=(request,response)=>{const origin=request.headers.origin;if(origin&&config.frontendOrigins.includes(origin)){response.setHeader('Access-Control-Allow-Origin',origin);response.setHeader('Vary','Origin');response.setHeader('Access-Control-Allow-Methods','GET,POST,OPTIONS');response.setHeader('Access-Control-Allow-Headers','Content-Type,X-CSRF-Token');}return allowedOrigin(origin);};
  const setAuthCookies=(response,tokens)=>{const secure=config.isProduction;response.setHeader('Set-Cookie',[
    cookie('pf_access',sign(tokens.access_token,config.sessionSecret),{path:'/admin',httpOnly:true,secure,sameSite:'Strict',maxAge:tokens.expires_in||3600}),
    cookie('pf_refresh',sign(tokens.refresh_token,config.sessionSecret),{path:'/admin',httpOnly:true,secure,sameSite:'Strict',maxAge:60*60*24*30}),
    cookie('pf_csrf',randomToken(),{path:'/admin',httpOnly:false,secure,sameSite:'Strict',maxAge:60*60*24*30})]);};
  const authenticate=async(request,response)=>{const cookies=parseCookies(request.headers.cookie);let access=unsign(cookies.pf_access||'',config.sessionSecret);let user=access?await database.getUser(access):null;if(!user){const refresh=unsign(cookies.pf_refresh||'',config.sessionSecret),tokens=refresh?await database.refresh(refresh):null;if(tokens){access=tokens.access_token;setAuthCookies(response,tokens);user=await database.getUser(access);}}if(!user||user.app_metadata?.role!=='admin')return null;return {...user,_accessToken:access};};
  const csrfValid=(request)=>{const cookies=parseCookies(request.headers.cookie);return Boolean(cookies.pf_csrf&&request.headers['x-csrf-token']===cookies.pf_csrf&&allowedOrigin(request.headers.origin));};
  const handleError=(error,response)=>{safeLog('request_error',{message:error.message,status:error.status||500});const status=error.status||500;json(response,status,{error:status<500?error.message:'The request could not be completed',field:error.field});};

  return createServer(async(request,response)=>{
    Object.entries(securityHeaders).forEach(([key,value])=>response.setHeader(key,value));if(config.isProduction)response.setHeader('Strict-Transport-Security','max-age=31536000; includeSubDomains');
    const url=new URL(request.url,config.appUrl||'http://localhost');
    try {
      if(request.method==='OPTIONS'){if(!cors(request,response))return json(response,403,{error:'Origin not allowed'});response.writeHead(204);return response.end();}
      if(url.pathname==='/api/health'&&request.method==='GET')return json(response,200,{ok:true});
      if(url.pathname==='/api/public-config'&&request.method==='GET'){
        if(!cors(request,response))return json(response,403,{error:'Origin not allowed'});
        const whatsappUrl=config.whatsappNumber?`https://wa.me/${config.whatsappNumber}?text=${encodeURIComponent("Hi Parkway Fabrications, I'd like to discuss a fabrication enquiry.")}`:null;
        return json(response,200,{turnstileSiteKey:config.turnstileSiteKey||null,whatsappUrl},{'Cache-Control':'public, max-age=300'});
      }
      if(url.pathname==='/api/enquiries'&&request.method==='POST'){
        response.setHeader('Cache-Control','no-store');
        if(!cors(request,response))return json(response,403,{error:'Origin not allowed'});
        if(rateLimit(request,'rfq',5,15*60*1000))return json(response,429,{error:'Too many submissions. Please try again later.'},{'Retry-After':'900'});
        const type=request.headers['content-type']||'';if(!type.startsWith('multipart/form-data'))return json(response,415,{error:'Use multipart form data'});
        const body=await readBody(request,config.maxTotalBytes+2*1024*1024),{fields,files}=parseMultipart(body,type,config);
        if(fields.website) return json(response,200,{received:true});
        if(config.turnstileSecretKey){const verifyBody=new URLSearchParams({secret:config.turnstileSecretKey,response:fields['cf-turnstile-response']||'',remoteip:clientIp(request)});const verify=await fetchImpl('https://challenges.cloudflare.com/turnstile/v0/siteverify',{method:'POST',body:verifyBody});const result=await verify.json();if(!result.success)return json(response,400,{error:'Security verification failed'});}
        const data=validateEnquiry(fields),created=await database.createEnquiry(data),paths=[];
        try {for(const file of files){const path=`unscanned/${created.id}/${file.storageFilename}`;await database.uploadFile(path,file);paths.push(path);await database.createFileRecord(created.id,path,file);}}
        catch(error){await database.deleteFiles(paths).catch(()=>{});await database.deleteEnquiry(created.id).catch(()=>{});throw Object.assign(new Error('Files could not be stored. Please try again.'),{status:503,cause:error});}
        const jobs=await database.queueEmails(created.id).catch((error)=>{safeLog('notification_queue_failed',{enquiryId:created.id,message:error.message});return[];});
        emails.deliverJobs({...data,...created,fileCount:files.length},jobs).catch((error)=>safeLog('notification_delivery_failed',{enquiryId:created.id,message:error.message}));
        safeLog('enquiry_created',{enquiryId:created.id,reference:created.reference,fileCount:files.length});
        return json(response,201,{reference:created.reference,summary:{service:data.service,requiredDate:data.required_date,fileCount:files.length}});
      }
      if(url.pathname==='/admin/api/login'&&request.method==='POST'){
        response.setHeader('Cache-Control','no-store');
        if(rateLimit(request,'login',10,15*60*1000))return json(response,429,{error:'Too many login attempts'},{'Retry-After':'900'});
        if(request.headers.origin!==config.appUrl)return json(response,403,{error:'Origin not allowed'});
        const input=JSON.parse((await readBody(request)).toString()||'{}'),tokens=await database.authenticate(String(input.email||''),String(input.password||''));
        if(!tokens||tokens.user?.app_metadata?.role!=='admin')return json(response,401,{error:'Invalid credentials'});
        setAuthCookies(response,tokens);return json(response,200,{user:{email:tokens.user.email}});
      }
      if(url.pathname.startsWith('/admin/api/')){
        response.setHeader('Cache-Control','no-store');
        const user=await authenticate(request,response);if(!user)return json(response,401,{error:'Authentication required'});
        if(url.pathname==='/admin/api/session'&&request.method==='GET')return json(response,200,{user:{email:user.email},csrf:parseCookies(request.headers.cookie).pf_csrf||null});
        if(url.pathname==='/admin/api/logout'&&request.method==='POST'){if(!csrfValid(request))return json(response,403,{error:'CSRF check failed'});await database.signOut(user._accessToken).catch((error)=>safeLog('logout_revoke_failed',{message:error.message}));response.setHeader('Set-Cookie',[cookie('pf_access','',{path:'/admin',maxAge:0}),cookie('pf_refresh','',{path:'/admin',maxAge:0}),cookie('pf_csrf','',{path:'/admin',maxAge:0})]);return json(response,200,{ok:true});}
        if(url.pathname==='/admin/api/enquiries'&&request.method==='GET'){const data=await database.listEnquiries({search:url.searchParams.get('search')||'',status:url.searchParams.get('status')||'',service:url.searchParams.get('service')||'',direction:url.searchParams.get('sort')||'desc'});return json(response,200,{enquiries:data});}
        const enquiryMatch=url.pathname.match(/^\/admin\/api\/enquiries\/([0-9a-f-]+)$/i);
        if(enquiryMatch&&request.method==='GET'){const data=await database.getEnquiry(enquiryMatch[1]);return data?json(response,200,{enquiry:data}):json(response,404,{error:'Enquiry not found'});}
        if(enquiryMatch&&request.method==='PATCH'){if(!csrfValid(request))return json(response,403,{error:'CSRF check failed'});const input=JSON.parse((await readBody(request)).toString()||'{}'),status=validateStatus(input.status);await database.updateStatus(enquiryMatch[1],status,user.id);return json(response,200,{status});}
        const fileMatch=url.pathname.match(/^\/admin\/api\/files\/([0-9a-f-]+)\/download$/i);
        if(fileMatch&&request.method==='GET'){const file=await database.getFile(fileMatch[1]);if(!file)return json(response,404,{error:'File not found'});const content=await database.downloadFile(file.storage_path);response.writeHead(200,{'Content-Type':file.mime_type,'Content-Length':content.length,'Content-Disposition':`attachment; filename*=UTF-8''${encodeURIComponent(file.original_filename)}`,'Cache-Control':'private, no-store'});return response.end(content);}
        return json(response,404,{error:'Not found'});
      }
      if(url.pathname==='/admin'||url.pathname==='/admin/')url.pathname='/admin/index.html';
      if(url.pathname.startsWith('/admin/')){const relative=normalize(url.pathname.slice('/admin/'.length)).replace(/^(\.\.[/\\])+/,''),path=join(here,'public/admin',relative);if(!path.startsWith(join(here,'public/admin')))return json(response,404,{error:'Not found'});try{const content=await readFile(path);response.writeHead(200,{'Content-Type':mime[extname(path)]||'application/octet-stream','Cache-Control':'no-store'});return response.end(content);}catch{return json(response,404,{error:'Not found'});}}
      return json(response,404,{error:'Not found'});
    } catch(error) { if(!response.headersSent)handleError(error,response); }
  });
}
