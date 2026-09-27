// 版面：桌機左側導航、手機底部導航、快速記錄按鈕
import { useEffect, useRef, useState } from 'preact/hooks';
import { html } from '../lib/html.js';
import { useStore } from '../store.js';
import { Icon } from './icons.js';
import { Modal, useUI } from './ui.js';
import { SearchModal } from './search.js';
import { cx } from '../lib/util.js';
import { todayKey } from '../lib/date.js';
import { navigate } from '../lib/router.js';

export const PRIMARY_NAV = [
  { path: '/', label: '今天', en: 'Today', icon: 'today' },
  { path: '/inbox', label: '收件匣', en: 'Inbox', icon: 'inbox' },
  { path: '/tasks', label: '任務', en: 'Tasks', icon: 'tasks' },
  { path: '/goals', label: '目標', en: 'Goals', icon: 'goals' },
  { path: '/projects', label: '計畫', en: 'Projects', icon: 'projects' },
  { path: '/someday', label: '想做清單', en: 'Someday', icon: 'someday' },
  { path: '/review', label: '每週回顧', en: 'Review', icon: 'review' },
];

export const SECONDARY_NAV = [
  { path: '/calendar', label: '行事曆', icon: 'calendar' },
  { path: '/waiting', label: '等待中', icon: 'waiting' },
  { path: '/notes', label: '筆記', icon: 'notes' },
  { path: '/areas', label: '人生領域', icon: 'areas' },
  { path: '/settings', label: '設定', icon: 'settings' },
];

const isActive = (route, path) => (path === '/' ? route.path === '/' : route.path === path || route.path.startsWith(path + '/'));

function useCounts() {
  const { data } = useStore();
  const today = todayKey();
  return {
    '/': data.tasks.filter((t) => t.todayDate === today && t.status !== 'done' && t.status !== 'dropped').length,
    '/inbox': data.inbox.filter((i) => !i.archived).length,
    '/waiting': data.waiting.filter((w) => w.status === 'waiting' && w.followUp && w.followUp <= today).length,
  };
}

function ThemeButton() {
  const { data, setSettings } = useStore();
  const t = data.settings.theme;
  const dark = t === 'dark' || (t === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  return html`<button type="button" class="icon-btn" title=${dark ? '切換為淺色' : '切換為深色'} aria-label="切換深淺色"
    onClick=${() => setSettings({ theme: dark ? 'light' : 'dark' })}><${Icon} name=${dark ? 'sun' : 'moon'} /></button>`;
}

export function Sidebar({ route, onSearch, onCapture }) {
  const counts = useCounts();
  return html`<aside class="sidebar">
    <div class="brand"><span class="brand-mark"></span><span>Life OS</span></div>
    <button type="button" class="search-trigger" onClick=${onSearch}><${Icon} name="search" size=${16} /><span>搜尋</span><kbd>/</kbd></button>
    <button type="button" class="capture-trigger" onClick=${onCapture}><${Icon} name="plus" size=${16} /><span>快速記下一件事</span></button>
    <nav class="nav">
      ${PRIMARY_NAV.map((n) => html`<a href=${'#' + n.path} class=${cx('nav-item', isActive(route, n.path) && 'on')}>
        <${Icon} name=${n.icon} /><span class="nav-label">${n.label}</span><span class="nav-en">${n.en}</span>
        ${counts[n.path] ? html`<span class="nav-count">${counts[n.path]}</span>` : ''}
      </a>`)}
    </nav>
    <div class="nav-sep"></div>
    <nav class="nav secondary">
      ${SECONDARY_NAV.map((n) => html`<a href=${'#' + n.path} class=${cx('nav-item', isActive(route, n.path) && 'on')}>
        <${Icon} name=${n.icon} /><span class="nav-label">${n.label}</span>
        ${counts[n.path] ? html`<span class="nav-count soft">${counts[n.path]}</span>` : ''}
      </a>`)}
    </nav>
    <div class="sidebar-foot"><${ThemeButton} /><span class="muted small">資料只存在這台裝置</span></div>
  </aside>`;
}

export function MobileTop({ onSearch }) {
  return html`<header class="mobile-top">
    <div class="brand"><span class="brand-mark"></span><span>Life OS</span></div>
    <div class="row gap-4">
      <button type="button" class="icon-btn" aria-label="搜尋" onClick=${onSearch}><${Icon} name="search" /></button>
      <${ThemeButton} />
    </div>
  </header>`;
}

const MOBILE_TABS = ['/', '/inbox', '/tasks', '/goals'];

export function BottomNav({ route }) {
  const [more, setMore] = useState(false);
  const counts = useCounts();
  const tabs = PRIMARY_NAV.filter((n) => MOBILE_TABS.includes(n.path));
  const moreItems = [...PRIMARY_NAV.filter((n) => !MOBILE_TABS.includes(n.path)), ...SECONDARY_NAV];
  const moreActive = moreItems.some((n) => isActive(route, n.path));
  return html`<nav class="bottom-nav">
    ${tabs.map((n) => html`<a href=${'#' + n.path} class=${cx('tab', isActive(route, n.path) && 'on')}>
      <span class="tab-icon"><${Icon} name=${n.icon} size=${22} />${counts[n.path] ? html`<span class="tab-dot">${counts[n.path]}</span>` : ''}</span>
      <span>${n.label}</span>
    </a>`)}
    <button type="button" class=${cx('tab', moreActive && 'on')} onClick=${() => setMore(true)}>
      <span class="tab-icon"><${Icon} name="menu" size=${22} /></span><span>更多</span>
    </button>
    ${more && html`<${Modal} title="更多" onClose=${() => setMore(false)} className="sheet">
      <div class="more-grid">
        ${moreItems.map((n) => html`<a href=${'#' + n.path} class=${cx('more-item', isActive(route, n.path) && 'on')} onClick=${() => setMore(false)}>
          <${Icon} name=${n.icon} size=${22} /><span>${n.label}</span>
        </a>`)}
      </div>
    <//>`}
  </nav>`;
}

// 快速記錄：只要一行字，預設進 Inbox
export function CaptureModal({ onClose }) {
  const store = useStore();
  const ui = useUI();
  const [text, setText] = useState('');
  const ref = useRef();
  useEffect(() => { setTimeout(() => ref.current?.focus(), 30); }, []);
  const save = (asTask) => {
    const v = text.trim();
    if (!v) return ref.current?.focus();
    if (asTask === 'today') {
      store.add('tasks', { title: v, todayDate: todayKey() });
      ui.toast('已加入今天');
    } else if (asTask) {
      store.add('tasks', { title: v });
      ui.toast('已存成任務');
    } else {
      store.add('inbox', { text: v });
      ui.toast('已放進 Inbox，之後再整理就好');
    }
    onClose();
  };
  return html`<${Modal} title="快速記下一件事" onClose=${onClose} className="capture-modal">
    <form class="form" onSubmit=${(e) => { e.preventDefault(); save(false); }}>
      <input ref=${ref} class="title-input" placeholder="腦中想到什麼？例如：牙醫預約、想去日本" value=${text} onInput=${(e) => setText(e.currentTarget.value)} enterkeyhint="done" />
      <p class="field-hint">不用分類、不用填日期。按 Enter 先放進 Inbox，之後再整理。</p>
      <div class="form-actions wrap">
        <button type="button" class="btn ghost small" onClick=${() => save(true)}>存成任務</button>
        <button type="button" class="btn ghost small" onClick=${() => save('today')}>加入今天</button>
        <span class="spacer"></span>
        <button type="submit" class="btn primary">放進 Inbox</button>
      </div>
    </form>
  <//>`;
}

export function Layout({ route, children }) {
  const [search, setSearch] = useState(false);
  const [capture, setCapture] = useState(false);

  useEffect(() => {
    const onKey = (e) => {
      const tag = (e.target.tagName || '').toLowerCase();
      const typing = ['input', 'textarea', 'select'].includes(tag) || e.target.isContentEditable;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setSearch(true); return; }
      if (typing || document.body.classList.contains('modal-open')) return;
      if (e.key === '/') { e.preventDefault(); setSearch(true); }
      else if (e.key === 'n' || e.key === 'c') { e.preventDefault(); setCapture(true); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return html`<div class="shell">
    <${Sidebar} route=${route} onSearch=${() => setSearch(true)} onCapture=${() => setCapture(true)} />
    <${MobileTop} onSearch=${() => setSearch(true)} />
    <main class="main" id="main">${children}</main>
    <button type="button" class="fab" aria-label="快速記下一件事" onClick=${() => setCapture(true)}><${Icon} name="plus" size=${24} /></button>
    <${BottomNav} route=${route} />
    ${search && html`<${SearchModal} onClose=${() => setSearch(false)} />`}
    ${capture && html`<${CaptureModal} onClose=${() => setCapture(false)} />`}
  </div>`;
}
