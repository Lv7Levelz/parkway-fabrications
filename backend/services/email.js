import { escapeHtml, safeLog } from '../lib/http.js';

export class EmailService {
  constructor(config, database, fetchImpl = fetch) { this.config=config; this.database=database; this.fetch=fetchImpl; }
  async send(to, subject, html, jobId) {
    if (!this.config.resendApiKey || !this.config.emailFrom) throw new Error('Email provider is not configured');
    const response=await this.fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${this.config.resendApiKey}`,'Content-Type':'application/json','Idempotency-Key':`parkway-notification/${jobId}`},body:JSON.stringify({from:this.config.emailFrom,to:[to],subject,html})});
    if(!response.ok) throw new Error(`Resend delivery failed: ${response.status}`);
    return response.json();
  }
  async deliverJobs(enquiry, jobs) {
    for (const job of jobs || []) {
      try {
        const isCustomer=job.kind==='CUSTOMER_CONFIRMATION';
        const destination=isCustomer?enquiry.email:this.config.notificationEmail;
        if(!destination) throw new Error('Notification destination is not configured');
        const subject=isCustomer?`We received your enquiry ${enquiry.reference}`:`New Parkway enquiry ${enquiry.reference}`;
        const detail=isCustomer
          ? `<p>Thank you for sending your requirements to Parkway Fabrications.</p><p><strong>Reference:</strong> ${escapeHtml(enquiry.reference)}<br><strong>Service:</strong> ${escapeHtml(enquiry.service)}<br><strong>Project:</strong> ${escapeHtml(enquiry.project_description)}</p><p>Please quote the reference if you contact the team about this enquiry.</p>`
          : `<p><strong>Reference:</strong> ${escapeHtml(enquiry.reference)}</p><p><strong>Contact:</strong> ${escapeHtml(enquiry.name)}${enquiry.company?` — ${escapeHtml(enquiry.company)}`:''}<br><strong>Email:</strong> ${escapeHtml(enquiry.email)}<br><strong>Phone:</strong> ${escapeHtml(enquiry.phone||'Not supplied')}<br><strong>Service:</strong> ${escapeHtml(enquiry.service)}<br><strong>Material:</strong> ${escapeHtml(enquiry.material||'Not supplied')}<br><strong>Thickness:</strong> ${escapeHtml(enquiry.thickness||'Not supplied')}<br><strong>Quantity:</strong> ${escapeHtml(enquiry.quantity||'Not supplied')}<br><strong>Dimensions:</strong> ${escapeHtml(enquiry.dimensions||'Not supplied')}<br><strong>Finish:</strong> ${escapeHtml(enquiry.finish||'Not supplied')}<br><strong>Tolerance:</strong> ${escapeHtml(enquiry.tolerance||'Not supplied')}<br><strong>Required date:</strong> ${escapeHtml(enquiry.required_date||'Not supplied')}<br><strong>Files:</strong> ${enquiry.fileCount}</p><p>${escapeHtml(enquiry.project_description)}</p><p><a href="${this.config.appUrl}/admin/#/enquiries/${encodeURIComponent(enquiry.id)}">Open this enquiry in the secure admin area</a></p>`;
        const response=await this.send(destination,subject,`<!doctype html><html><body style="font-family:Arial,sans-serif;color:#17232b;line-height:1.6"><h1 style="font-size:22px">Parkway Fabrications</h1>${detail}<p>4 Colwall Street, Sheffield, S9 3WP · 0114 242 2733</p></body></html>`,job.id);
        await this.database.updateNotification(job.id,{status:'SENT',provider_id:response.id,last_error:null,sent_at:new Date().toISOString()});
      } catch (error) {
        safeLog('notification_failed',{jobId:job.id,kind:job.kind,message:error.message});
        await this.database.updateNotification(job.id,{status:(job.attempts||0)>=5?'FAILED':'RETRY',attempts:(job.attempts||0)+(job.status==='PROCESSING'?0:1),last_error:String(error.message).slice(0,500),next_attempt_at:new Date(Date.now()+5*60*1000).toISOString()}).catch(()=>{});
      }
    }
  }
}

