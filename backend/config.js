const required = [
  'SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY',
  'SUPABASE_STORAGE_BUCKET', 'FRONTEND_ORIGIN', 'APP_URL', 'SESSION_SECRET'
];

export function loadConfig(env = process.env, { allowIncomplete = false } = {}) {
  if (!allowIncomplete) {
    const missing = required.filter((key) => !env[key]?.trim());
    if (missing.length) throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    if ((env.SESSION_SECRET || '').length < 32) throw new Error('SESSION_SECRET must be at least 32 characters');
  }
  const origins = (env.FRONTEND_ORIGIN || '').split(',').map((value) => value.trim()).filter(Boolean);
  return Object.freeze({
    nodeEnv: env.NODE_ENV || 'development',
    port: Number(env.PORT || 3000),
    supabaseUrl: (env.SUPABASE_URL || '').replace(/\/$/, ''),
    supabaseAnonKey: env.SUPABASE_ANON_KEY || '',
    supabaseServiceKey: env.SUPABASE_SERVICE_ROLE_KEY || '',
    storageBucket: env.SUPABASE_STORAGE_BUCKET || 'rfq-private',
    resendApiKey: env.RESEND_API_KEY || '',
    emailFrom: env.EMAIL_FROM || '',
    notificationEmail: env.NOTIFICATION_EMAIL || '',
    whatsappNumber: (env.WHATSAPP_NUMBER || '').replace(/\D/g, ''),
    turnstileSiteKey: env.TURNSTILE_SITE_KEY || '',
    turnstileSecretKey: env.TURNSTILE_SECRET_KEY || '',
    frontendOrigins: origins,
    appUrl: (env.APP_URL || '').replace(/\/$/, ''),
    sessionSecret: env.SESSION_SECRET || '',
    retentionDays: Number(env.DATA_RETENTION_DAYS || 730),
    trustProxy: env.TRUST_PROXY === 'true',
    maxFileBytes: Number(env.MAX_FILE_BYTES || 10 * 1024 * 1024),
    maxTotalBytes: Number(env.MAX_TOTAL_UPLOAD_BYTES || 25 * 1024 * 1024),
    maxFiles: Number(env.MAX_FILES || 10),
    isProduction: env.NODE_ENV === 'production'
  });
}
