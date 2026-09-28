import { safeLog } from '../lib/http.js';

const delay=(ms)=>new Promise(resolve=>setTimeout(resolve,ms));

export class MetaDefenderScanner {
  constructor(config, fetchImpl=fetch) {
    this.config=config;
    this.fetch=fetchImpl;
  }

  get enabled() { return this.config.malwareScanProvider==='metadefender' && Boolean(this.config.metaDefenderApiKey); }

  async scan(file) {
    if (!this.enabled) throw new Error('MetaDefender scanner is not configured');
    const upload=await this.fetch(`${this.config.metaDefenderBaseUrl}/file`,{
      method:'POST',
      headers:{
        apikey:this.config.metaDefenderApiKey,
        filename:encodeURIComponent(file.original_filename || file.storage_filename || 'upload'),
        'Content-Type':'application/octet-stream',
        ...(this.config.metaDefenderPrivate ? { samplesharing:'0', privateprocessing:'1' } : {})
      },
      body:file.content
    });
    if(!upload.ok) throw new Error(`MetaDefender upload failed: ${upload.status} ${(await upload.text()).slice(0,200)}`);
    const created=await upload.json();
    if(!created?.data_id) throw new Error('MetaDefender did not return a data_id');

    const deadline=Date.now()+this.config.malwareScanTimeoutMs;
    while(Date.now()<deadline){
      const response=await this.fetch(`${this.config.metaDefenderBaseUrl}/file/${encodeURIComponent(created.data_id)}`,{
        headers:{apikey:this.config.metaDefenderApiKey}
      });
      if(!response.ok) throw new Error(`MetaDefender result failed: ${response.status} ${(await response.text()).slice(0,200)}`);
      const result=await response.json();
      const scan=result?.scan_results;
      if(Number(scan?.progress_percentage)===100){
        const code=Number(scan?.scan_all_result_i);
        if(code===0||code===7) return {status:'CLEAN',providerId:created.data_id,summary:scan?.scan_all_result_a||'No Threat Detected'};
        return {status:'QUARANTINED',providerId:created.data_id,summary:scan?.scan_all_result_a||`Scan result ${code}`};
      }
      await delay(1500);
    }
    throw new Error('MetaDefender scan timed out');
  }
}

export function startMalwareScanWorker(database, scanner, intervalMs=60000) {
  if(!scanner?.enabled){safeLog('malware_scanner_disabled',{provider:'metadefender'});return()=>{};}
  let busy=false;
  const run=async()=>{
    if(busy)return;
    busy=true;
    try{
      const files=await database.listPendingFiles(5);
      for(const file of files||[]){
        try{
          const content=await database.downloadFile(file.storage_path);
          const verdict=await scanner.scan({...file,content});
          await database.updateFileScan(file.id,verdict.status);
          safeLog('file_scan_completed',{fileId:file.id,status:verdict.status,providerId:verdict.providerId,summary:verdict.summary});
        }catch(error){
          safeLog('file_scan_failed',{fileId:file.id,message:error.message});
        }
      }
    }catch(error){safeLog('malware_scan_worker_failed',{message:error.message});}
    finally{busy=false;}
  };
  const timer=setInterval(run,intervalMs);timer.unref();run();return()=>clearInterval(timer);
}
