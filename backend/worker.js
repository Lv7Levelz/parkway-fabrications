import { safeLog } from './lib/http.js';
export function startNotificationWorker(database, emails, intervalMs = 60000) {
  let busy=false;
  const run=async()=>{if(busy)return;busy=true;try{const jobs=await database.claimNotifications(20);for(const job of jobs||[]){const enquiry=await database.getEnquiry(job.enquiry_id);if(!enquiry){await database.updateNotification(job.id,{status:'FAILED',last_error:'Enquiry no longer exists'});continue;}await emails.deliverJobs({...enquiry,fileCount:enquiry.enquiry_files?.length||0},[job]);}}catch(error){safeLog('notification_worker_failed',{message:error.message});}finally{busy=false;}};
  const timer=setInterval(run,intervalMs);timer.unref();run();return()=>clearInterval(timer);
}
