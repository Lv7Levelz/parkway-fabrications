const encodePath = (path) => path.split('/').map(encodeURIComponent).join('/');
export class SupabaseService {
  constructor(config, fetchImpl = fetch) { this.config = config; this.fetch = fetchImpl; }
  headers(extra = {}) { return { apikey: this.config.supabaseServiceKey, Authorization: `Bearer ${this.config.supabaseServiceKey}`, ...extra }; }
  async request(path, options = {}) {
    const response = await this.fetch(`${this.config.supabaseUrl}${path}`, { ...options, headers: this.headers(options.headers) });
    if (!response.ok) { const detail = await response.text(); throw new Error(`Supabase ${response.status}: ${detail.slice(0, 300)}`); }
    if (response.status === 204) return null;
    const text = await response.text(); return text ? JSON.parse(text) : null;
  }
  async createEnquiry(data) {
    const rows = await this.request('/rest/v1/rpc/create_enquiry', { method:'POST', headers:{ 'Content-Type':'application/json' }, body:JSON.stringify({
      p_name:data.name,p_company:data.company,p_email:data.email,p_phone:data.phone,p_service:data.service,
      p_project_description:data.project_description,p_material:data.material,p_thickness:data.thickness,p_quantity:data.quantity,
      p_dimensions:data.dimensions,p_finish:data.finish,p_tolerance:data.tolerance,p_required_date:data.required_date,p_urgency:data.urgency
    }) });
    return Array.isArray(rows) ? rows[0] : rows;
  }
  async deleteEnquiry(id) { return this.request(`/rest/v1/enquiries?id=eq.${encodeURIComponent(id)}`, { method:'DELETE', headers:{ Prefer:'return=minimal' } }); }
  async uploadFile(path, file) {
    return this.request(`/storage/v1/object/${encodeURIComponent(this.config.storageBucket)}/${encodePath(path)}`, { method:'POST', headers:{ 'Content-Type':file.mimeType, 'x-upsert':'false' }, body:file.buffer });
  }
  async deleteFiles(paths) {
    if (!paths.length) return;
    return this.request(`/storage/v1/object/${encodeURIComponent(this.config.storageBucket)}`, { method:'DELETE', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ prefixes:paths }) });
  }
  async createFileRecord(enquiryId, path, file) {
    const rows = await this.request('/rest/v1/enquiry_files', { method:'POST', headers:{'Content-Type':'application/json',Prefer:'return=representation'}, body:JSON.stringify({ enquiry_id:enquiryId, original_filename:file.originalFilename, storage_filename:file.storageFilename, mime_type:file.mimeType, extension:file.extension, size_bytes:file.sizeBytes, storage_path:path }) });
    return rows[0];
  }
  async completeEnquiry(enquiryId) { return this.request('/rest/v1/rpc/complete_enquiry', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({p_enquiry_id:enquiryId}) }); }
  async claimNotifications(limit=20) { return this.request('/rest/v1/rpc/claim_notification_jobs', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({p_limit:limit}) }); }
  async updateNotification(id, update) { return this.request(`/rest/v1/notification_jobs?id=eq.${encodeURIComponent(id)}`, {method:'PATCH',headers:{'Content-Type':'application/json',Prefer:'return=minimal'},body:JSON.stringify(update)}); }
  async listEnquiries({ search='', status='', service='', direction='desc' }) {
    const query = new URLSearchParams({ select:'id,reference,name,company,email,phone,service,required_date,status,created_at,updated_at,enquiry_files(count)', order:`created_at.${direction === 'asc' ? 'asc' : 'desc'}`, limit:'250' });
    if (status) query.set('status',`eq.${status}`); if (service) query.set('service',`eq.${service}`);
    if (search) query.set('or',`(reference.ilike.*${search.replace(/[^a-zA-Z0-9@._+\-\s]/g,'')}*,name.ilike.*${search.replace(/[^a-zA-Z0-9@._+\-\s]/g,'')}*,company.ilike.*${search.replace(/[^a-zA-Z0-9@._+\-\s]/g,'')}*,email.ilike.*${search.replace(/[^a-zA-Z0-9@._+\-\s]/g,'')}*)`);
    return this.request(`/rest/v1/enquiries?${query}`);
  }
  async getEnquiry(id) { const rows=await this.request(`/rest/v1/enquiries?id=eq.${encodeURIComponent(id)}&select=*,enquiry_files(*)`); return rows[0] || null; }
  async updateStatus(id, status, actorId) { return this.request('/rest/v1/rpc/update_enquiry_status',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({p_enquiry_id:id,p_status:status,p_actor_id:actorId})}); }
  async getFile(id) { const rows=await this.request(`/rest/v1/enquiry_files?id=eq.${encodeURIComponent(id)}&select=*`); return rows[0] || null; }
  async listPendingFiles(limit=5) { return this.request(`/rest/v1/enquiry_files?scan_status=eq.PENDING&select=*&order=created_at.asc&limit=${Math.max(1,Math.min(Number(limit)||5,20))}`); }
  async updateFileScan(id,status) { return this.request(`/rest/v1/enquiry_files?id=eq.${encodeURIComponent(id)}`, { method:'PATCH', headers:{'Content-Type':'application/json',Prefer:'return=minimal'}, body:JSON.stringify({scan_status:status,scan_completed_at:new Date().toISOString()}) }); }
  async downloadFile(path) {
    const response=await this.fetch(`${this.config.supabaseUrl}/storage/v1/object/authenticated/${encodeURIComponent(this.config.storageBucket)}/${encodePath(path)}`,{headers:this.headers()});
    if(!response.ok) throw new Error(`Storage download failed: ${response.status}`); return Buffer.from(await response.arrayBuffer());
  }
  async authenticate(email,password) {
    const response=await this.fetch(`${this.config.supabaseUrl}/auth/v1/token?grant_type=password`,{method:'POST',headers:{apikey:this.config.supabaseAnonKey,'Content-Type':'application/json'},body:JSON.stringify({email,password})});
    if(!response.ok) return null; return response.json();
  }
  async signOut(accessToken) {
    const response=await this.fetch(`${this.config.supabaseUrl}/auth/v1/logout`,{method:'POST',headers:{apikey:this.config.supabaseAnonKey,Authorization:`Bearer ${accessToken}`}});
    if(!response.ok&&response.status!==401) throw new Error(`Supabase logout failed: ${response.status}`);
  }
  async getUser(accessToken) {
    const response=await this.fetch(`${this.config.supabaseUrl}/auth/v1/user`,{headers:{apikey:this.config.supabaseAnonKey,Authorization:`Bearer ${accessToken}`}});
    if(!response.ok) return null; return response.json();
  }
  async refresh(refreshToken) {
    const response=await this.fetch(`${this.config.supabaseUrl}/auth/v1/token?grant_type=refresh_token`,{method:'POST',headers:{apikey:this.config.supabaseAnonKey,'Content-Type':'application/json'},body:JSON.stringify({refresh_token:refreshToken})});
    if(!response.ok) return null; return response.json();
  }
}

