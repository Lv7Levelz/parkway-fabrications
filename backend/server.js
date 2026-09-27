import { loadConfig } from './config.js';
import { createApp } from './app.js';
import { SupabaseService } from './services/supabase.js';
import { EmailService } from './services/email.js';
import { startNotificationWorker } from './worker.js';
const config=loadConfig(),database=new SupabaseService(config),emails=new EmailService(config,database);
startNotificationWorker(database,emails);
const server=createApp({config,database,emails});server.listen(config.port,()=>console.log(`Parkway API listening on ${config.port}`));
