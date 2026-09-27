const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const STATUSES = ['NEW', 'CONTACTED', 'QUOTED', 'WON', 'LOST', 'ARCHIVED'];
const SERVICES = ['Laser cutting', 'CNC folding', 'Welding', 'Metal fabrication', 'Perforated metal fabrication', 'Granulator screen manufacture', 'Other'];
const URGENCY = ['Standard', 'Time-sensitive', 'Breakdown/replacement'];
const limits = { name:120, company:160, email:254, phone:40, service:100, project_description:10000, material:200, thickness:100, quantity:100, dimensions:500, finish:500, tolerance:500, urgency:100 };
const text = (body, key, required = false) => {
  const value = String(body[key] ?? '').trim();
  if (required && !value) throw Object.assign(new Error(`${key.replaceAll('_', ' ')} is required`), { status: 400, field: key });
  if (value.length > limits[key]) throw Object.assign(new Error(`${key.replaceAll('_', ' ')} is too long`), { status: 400, field: key });
  return value || null;
};
export function validateEnquiry(body) {
  const result = {};
  for (const key of Object.keys(limits)) result[key] = text(body, key, ['name','email','service','project_description'].includes(key));
  if (!EMAIL.test(result.email)) throw Object.assign(new Error('Enter a valid email address'), { status: 400, field: 'email' });
  if (!SERVICES.includes(result.service)) throw Object.assign(new Error('Select a valid service'), { status: 400, field: 'service' });
  if (result.urgency && !URGENCY.includes(result.urgency)) throw Object.assign(new Error('Select a valid urgency'), { status: 400, field: 'urgency' });
  const requiredDate = String(body.required_date ?? '').trim();
  if (requiredDate && !/^\d{4}-\d{2}-\d{2}$/.test(requiredDate)) throw Object.assign(new Error('Required date is invalid'), { status: 400, field: 'required_date' });
  result.required_date = requiredDate || null;
  const consent = body.privacy_consent === 'true' || body.privacy_consent === true || body.privacy_consent === 'on';
  if (!consent) throw Object.assign(new Error('Privacy acknowledgement is required'), { status: 400, field: 'privacy_consent' });
  return result;
}
export function validateStatus(value) {
  if (!STATUSES.includes(value)) throw Object.assign(new Error('Invalid status'), { status: 400 });
  return value;
}
export { STATUSES, SERVICES, URGENCY };
