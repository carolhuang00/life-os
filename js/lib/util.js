export const uid = (prefix = 'id') =>
  `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

export const cx = (...xs) => xs.filter(Boolean).join(' ');

export const byId = (list) => {
  const map = {};
  for (const x of list || []) map[x.id] = x;
  return map;
};

export const clamp = (n, a, b) => Math.min(b, Math.max(a, n));

export function fmtMinutes(m) {
  const n = Number(m);
  if (!n) return '';
  if (n < 60) return `${n} 分鐘`;
  const h = n / 60;
  return `${Number.isInteger(h) ? h : h.toFixed(1)} 小時`;
}

export const includesText = (hay, q) =>
  String(hay || '').toLowerCase().includes(String(q || '').toLowerCase());

export const parseTags = (s) =>
  String(s || '')
    .split(/[,，、\s]+/)
    .map((t) => t.replace(/^#/, '').trim())
    .filter(Boolean);

export function downloadFile(filename, text, type = 'application/json') {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
