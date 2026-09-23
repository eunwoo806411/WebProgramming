const OFFSET = 9 * 3600000;
export function toKstInput(ms) { return Number.isFinite(ms) ? new Date(ms + OFFSET).toISOString().slice(0,19) : ''; }
export function parseKstInput(value) {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/.test(value)) return null;
  const normalized = value.length === 16 ? value + ':00' : value;
  const ms = Date.parse(normalized + '+09:00');
  return Number.isFinite(ms) && toKstInput(ms) === normalized ? ms : null;
}
export function formatKst(value) {
  const ms = typeof value === 'number' ? value : Date.parse(value);
  return toKstInput(ms).replace('T',' ').replaceAll('-','.') + ' KST';
}
