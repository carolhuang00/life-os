// Hash 路由：網址長這樣 .../#/tasks?view=overdue
// GitHub Pages 只認得實體檔案，用 # 後面的路徑切換頁面，重新整理也不會 404
import { useEffect, useState } from 'preact/hooks';

export function parseHash(hash = location.hash) {
  const raw = hash.replace(/^#/, '') || '/';
  const [pathPart, queryPart = ''] = raw.split('?');
  const path = '/' + pathPart.replace(/^\/+|\/+$/g, '');
  const parts = path.split('/').filter(Boolean);
  const query = Object.fromEntries(new URLSearchParams(queryPart));
  return { path, parts, query };
}

export function useRoute() {
  const [route, setRoute] = useState(parseHash());
  useEffect(() => {
    const on = () => {
      setRoute(parseHash());
      window.scrollTo(0, 0);
    };
    const quiet = () => setRoute(parseHash());
    window.addEventListener('hashchange', on);
    window.addEventListener('lifeos:route', quiet);
    return () => {
      window.removeEventListener('hashchange', on);
      window.removeEventListener('lifeos:route', quiet);
    };
  }, []);
  return route;
}

export function navigate(to) {
  const target = to.startsWith('#') ? to : '#' + to;
  if (location.hash === target) window.dispatchEvent(new HashChangeEvent('hashchange'));
  else location.hash = target;
}

// 更新目前頁面的查詢參數（篩選條件），不新增瀏覽紀錄
export function setQuery(patch) {
  const { path, query } = parseHash();
  const next = { ...query, ...patch };
  for (const k of Object.keys(next)) if (next[k] === '' || next[k] == null) delete next[k];
  const qs = new URLSearchParams(next).toString();
  history.replaceState(null, '', `#${path}${qs ? '?' + qs : ''}`);
  window.dispatchEvent(new Event('lifeos:route'));
}
