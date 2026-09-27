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

export function parseMultipart(buffer, contentType, config) {
  const invalid = () => Object.assign(new Error('Invalid multipart form'), {status:400});
  const match = contentType.match(/boundary=(?:"([^"\r\n]+)"|([^;\s]+))/i);
  const value = match?.[1] || match?.[2];
  if (!value || value.length > 70) throw invalid();
  const boundary = Buffer.from('--' + value), delimiter = Buffer.from('\r\n--' + value);
  const crlf = Buffer.from('\r\n'), close = Buffer.from('--');
  if (!buffer.subarray(0, boundary.length).equals(boundary)) throw invalid();
  const fields = Object.create(null), files = [];
  let offset = boundary.length;
  for (;;) {
    if (buffer.subarray(offset,offset+2).equals(close)) {
      const rest=buffer.subarray(offset+2);
      if (rest.length && !rest.equals(crlf)) throw invalid();
      break;
    }
    if (!buffer.subarray(offset,offset+2).equals(crlf)) throw invalid();
    const headerStart=offset+2, headerEnd=buffer.indexOf('\r\n\r\n',headerStart);
    if (headerEnd<0 || headerEnd-headerStart>16384) throw invalid();
    const header=buffer.subarray(headerStart,headerEnd).toString('utf8');
    const disposition=header.match(/^content-disposition:\s*form-data;([^\r\n]*)/im)?.[1];
    const parameter=key=>disposition?.match(new RegExp('(?:^|;)\\s*'+key+'="([^"\\r\\n]*)"','i'))?.[1];
    const name=parameter('name'), filename=parameter('filename');
    if (!name) throw invalid();
    let next=headerEnd+4;
    for (;;) {
      next=buffer.indexOf(delimiter,next);
      if (next<0) throw invalid();
      const suffix=buffer.subarray(next+delimiter.length,next+delimiter.length+2);
      if (suffix.equals(crlf) || suffix.equals(close)) break;
      next+=delimiter.length;
    }
    const bytes=buffer.subarray(headerEnd+4,next);
    if (filename !== undefined && (filename || bytes.length)) {
      if (name!=='drawings') throw Object.assign(new Error('Unexpected upload field'),{status:400});
      const declaredMime=header.match(/^content-type:\s*([^\r\n]+)/im)?.[1].trim().toLowerCase() || 'application/octet-stream';
      files.push(validateUpload({originalFilename:filename,declaredMime,buffer:bytes},config));
    } else if (filename === undefined) {
      if (Object.hasOwn(fields,name)) throw Object.assign(new Error('Duplicate form field'),{status:400});
      fields[name]=bytes.toString('utf8');
    }
    offset=next+delimiter.length;
  }
  if (files.length > config.maxFiles) throw Object.assign(new Error(`A maximum of ${config.maxFiles} files is allowed`), {status:413});
  if (files.reduce((sum,file)=>sum+file.sizeBytes,0)>config.maxTotalBytes) throw Object.assign(new Error('The total upload size is too large'),{status:413});
  return {fields,files};
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

