// 日期一律用本地時間的 'YYYY-MM-DD' 字串（key）儲存與比較，避免時區誤差

const pad = (n) => String(n).padStart(2, '0');
const ymd = (k) => {
  const [y, m, d] = k.split('-').map(Number);
  return [y, m - 1, d];
};

export const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];

export const toKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const todayKey = () => toKey(new Date());
export const nowISO = () => new Date().toISOString();
export const isValidKey = (k) => typeof k === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(k);

export const parseKey = (k) => {
  const [y, m, d] = ymd(k);
  return new Date(y, m, d);
};

export const isoToKey = (iso) => {
  if (!iso) return '';
  if (isValidKey(iso)) return iso;
  const d = new Date(iso);
  return isNaN(d) ? '' : toKey(d);
};

export const addDays = (k, n) => {
  const d = parseKey(k);
  d.setDate(d.getDate() + n);
  return toKey(d);
};

export const addMonths = (k, n) => {
  const d = parseKey(k);
  d.setDate(1);
  d.setMonth(d.getMonth() + n);
  return toKey(d);
};

// a - b 的天數
export const diffDays = (a, b) =>
  Math.round((Date.UTC(...ymd(a)) - Date.UTC(...ymd(b))) / 86400000);

// 週一為一週的開始
export const weekStart = (k) => {
  const d = parseKey(k);
  const dow = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - dow);
  return toKey(d);
};
export const weekEnd = (k) => addDays(weekStart(k), 6);
export const monthStart = (k) => k.slice(0, 8) + '01';
export const monthEnd = (k) => addDays(addMonths(monthStart(k), 1), -1);

export const weekdayOf = (k) => WEEKDAYS[parseKey(k).getDay()];

export const fmtDate = (k) => {
  const d = parseKey(k);
  return `${d.getMonth() + 1}月${d.getDate()}日`;
};
export const fmtDateWeek = (k) => `${fmtDate(k)} 週${weekdayOf(k)}`;
export const fmtFull = (k) => {
  const d = parseKey(k);
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日 週${weekdayOf(k)}`;
};
export const fmtShort = (k, today = todayKey()) => {
  const [y, m, d] = ymd(k);
  const s = `${m + 1}/${d}`;
  return y === Number(today.slice(0, 4)) ? s : `${y}/${s}`;
};
export const fmtRange = (a, b) => `${fmtShort(a)} ～ ${fmtShort(b)}`;

// 到期日的人性化描述
export function relDue(k, today = todayKey()) {
  if (!k) return null;
  const n = diffDays(k, today);
  if (n < 0) return { text: `逾期 ${-n} 天`, tone: 'overdue', days: n };
  if (n === 0) return { text: '今天到期', tone: 'today', days: n };
  if (n === 1) return { text: '明天到期', tone: 'soon', days: n };
  if (n <= 3) return { text: `${n} 天後到期`, tone: 'soon', days: n };
  if (n <= 7) return { text: `${fmtShort(k, today)} 週${weekdayOf(k)}`, tone: 'normal', days: n };
  return { text: fmtShort(k, today), tone: 'normal', days: n };
}

export function relDay(k, today = todayKey()) {
  const n = diffDays(k, today);
  if (n === 0) return '今天';
  if (n === 1) return '明天';
  if (n === -1) return '昨天';
  if (n > 1 && n <= 6) return `${n} 天後`;
  if (n < -1 && n >= -6) return `${-n} 天前`;
  return fmtShort(k, today);
}

// 從文字中找「10/8」這類日期，回傳最近一次出現的日期（今天或之後）
export function parseLooseDate(text, today = todayKey()) {
  const m = String(text).match(/(?:^|[^\d/])(\d{1,2})\/(\d{1,2})(?![\d/])/);
  if (!m) return '';
  const month = Number(m[1]);
  const day = Number(m[2]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return '';
  let y = Number(today.slice(0, 4));
  let k = `${y}-${pad(month)}-${pad(day)}`;
  if (toKey(parseKey(k)) !== k) return '';
  if (diffDays(k, today) < -30) k = `${y + 1}-${pad(month)}-${pad(day)}`;
  return k;
}
