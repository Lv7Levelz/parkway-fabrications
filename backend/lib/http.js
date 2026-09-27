import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

export const json = (response, status, body, headers = {}) => {
  const data = Buffer.from(JSON.stringify(body));
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Content-Length': data.length, ...headers });
  response.end(data);
};

export const readBody = (request, limit = 1024 * 1024) => new Promise((resolve, reject) => {
  const chunks = []; let size = 0;
  request.on('data', (chunk) => {
    size += chunk.length;
    if (size > limit) { chunks.length = 0; return; }
    chunks.push(chunk);
  });
  request.on('end', () => size > limit ? reject(Object.assign(new Error('Request too large'), {status:413})) : resolve(Buffer.concat(chunks)));
  request.on('error', reject);
});

export const parseCookies = (header = '') => Object.fromEntries(header.split(';').map((value) => value.trim().split(/=(.*)/s)).filter(([key]) => key).map(([key, value]) => [decodeURIComponent(key), decodeURIComponent(value || '')]));
export const cookie = (name, value, options = {}) => {
  let result = `${encodeURIComponent(name)}=${encodeURIComponent(value)}`;
  if (options.maxAge !== undefined) result += `; Max-Age=${options.maxAge}`;
  if (options.path) result += `; Path=${options.path}`;
  if (options.httpOnly) result += '; HttpOnly';
  if (options.secure) result += '; Secure';
  if (options.sameSite) result += `; SameSite=${options.sameSite}`;
  return result;
};
export const randomToken = (bytes = 24) => randomBytes(bytes).toString('base64url');
export const sign = (value, secret) => `${value}.${createHmac('sha256', secret).update(value).digest('base64url')}`;
export const unsign = (signed, secret) => {
  const index = signed.lastIndexOf('.'); if (index < 1) return null;
  const value = signed.slice(0, index), supplied = Buffer.from(signed.slice(index + 1));
  const expected = Buffer.from(createHmac('sha256', secret).update(value).digest('base64url'));
  return supplied.length === expected.length && timingSafeEqual(supplied, expected) ? value : null;
};
export const escapeHtml = (value = '') => String(value).replace(/[&<>'"]/g, (char) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#39;', '"':'&quot;' })[char]);
export const safeLog = (event, detail = {}) => console.log(JSON.stringify({ level: 'info', event, at: new Date().toISOString(), ...detail }));

