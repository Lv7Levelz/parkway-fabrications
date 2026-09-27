import { basename, extname } from 'node:path';
import { randomUUID } from 'node:crypto';

const types = {
  '.pdf': { mime: 'application/pdf', allowed: ['application/pdf'], magic: (b) => b.subarray(0, 5).toString() === '%PDF-' },
  '.dxf': { mime: 'application/dxf', allowed: ['application/dxf','application/x-dxf','application/octet-stream','text/plain'], magic: (b) => /^(\s*0\s*(SECTION|EOF)|AutoCAD Binary DXF)/i.test(b.subarray(0, 128).toString()) },
  '.dwg': { mime: 'application/acad', allowed: ['application/acad','application/x-acad','application/autocad_dwg','application/dwg','application/x-dwg','application/octet-stream'], magic: (b) => /^AC10\d{2}/.test(b.subarray(0, 6).toString()) },
  '.step': { mime: 'application/step', allowed: ['application/step','application/step-file','application/octet-stream','text/plain'], magic: (b) => /^\s*ISO-10303-21;/i.test(b.subarray(0, 128).toString()) },
  '.stp': { mime: 'application/step', allowed: ['application/step','application/step-file','application/octet-stream','text/plain'], magic: (b) => /^\s*ISO-10303-21;/i.test(b.subarray(0, 128).toString()) },
  '.png': { mime: 'image/png', allowed: ['image/png'], magic: (b) => b.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10])) },
  '.jpg': { mime: 'image/jpeg', allowed: ['image/jpeg'], magic: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  '.jpeg': { mime: 'image/jpeg', allowed: ['image/jpeg'], magic: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  '.svg': { mime: 'image/svg+xml', allowed: ['image/svg+xml','text/xml','application/xml'], magic: (b) => {
    const value = b.toString('utf8');
    return /<svg[\s>]/i.test(value) && !/<script|\bon\w+\s*=|javascript:|<foreignObject/i.test(value);
  }}
};

const dispositionName = (header, key) => {
  const match = header.match(new RegExp(`${key}="([^"]*)"`, 'i'));
  return match ? match[1] : null;
};

export function parseMultipart(buffer, contentType, config) {
  const boundaryMatch = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/i);
  if (!boundaryMatch) throw Object.assign(new Error('Invalid multipart form'), { status: 400 });
  const boundary = Buffer.from(`--${boundaryMatch[1] || boundaryMatch[2]}`);
  const fields = {}, files = [];
  let start = buffer.indexOf(boundary) + boundary.length;
  while (start >= boundary.length) {
    if (buffer.subarray(start, start + 2).equals(Buffer.from('--'))) break;
    if (buffer.subarray(start, start + 2).equals(Buffer.from('\r\n'))) start += 2;
    const headerEnd = buffer.indexOf(Buffer.from('\r\n\r\n'), start); if (headerEnd < 0) break;
    const header = buffer.subarray(start, headerEnd).toString('utf8');
    const next = buffer.indexOf(boundary, headerEnd + 4); if (next < 0) break;
    const value = buffer.subarray(headerEnd + 4, next - 2);
    const name = dispositionName(header, 'name'), filename = dispositionName(header, 'filename');
    if (name && filename) {
      const mime = (header.match(/content-type:\s*([^\r\n]+)/i)?.[1] || 'application/octet-stream').trim().toLowerCase();
      files.push(validateUpload({ originalFilename: filename, declaredMime: mime, buffer: value }, config));
    } else if (name) fields[name] = value.toString('utf8');
    start = next + boundary.length;
  }
  if (files.length > config.maxFiles) throw Object.assign(new Error(`A maximum of ${config.maxFiles} files is allowed`), { status: 413 });
  if (files.reduce((sum, file) => sum + file.sizeBytes, 0) > config.maxTotalBytes) throw Object.assign(new Error('The total upload size is too large'), { status: 413 });
  return { fields, files };
}

export function validateUpload(file, config) {
  const originalFilename = basename(file.originalFilename).replace(/[\u0000-\u001f\u007f]/g, '').slice(0, 240);
  const extension = extname(originalFilename).toLowerCase(), rule = types[extension];
  if (!rule) throw Object.assign(new Error(`File type ${extension || '(none)'} is not allowed`), { status: 400 });
  if (!file.buffer.length) throw Object.assign(new Error(`${originalFilename} is empty`), { status: 400 });
  if (file.buffer.length > config.maxFileBytes) throw Object.assign(new Error(`${originalFilename} exceeds the per-file limit`), { status: 413 });
  if (!rule.allowed.includes(file.declaredMime)) throw Object.assign(new Error(`${originalFilename} has an invalid MIME type`), { status: 400 });
  if (!rule.magic(file.buffer)) throw Object.assign(new Error(`${originalFilename} content does not match its extension`), { status: 400 });
  const storageFilename = `${randomUUID()}${extension}`;
  return { originalFilename, storageFilename, extension: extension.slice(1), mimeType: rule.mime, sizeBytes: file.buffer.length, buffer: file.buffer };
}
export const allowedExtensions = Object.keys(types).map((value) => value.slice(1));
