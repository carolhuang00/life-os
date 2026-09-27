// 共用小元件：Modal、提示訊息、確認框、選單、標籤、進度條
import { createContext } from 'preact';
import { useContext, useEffect, useRef, useState, useCallback } from 'preact/hooks';
import { html } from '../lib/html.js';
import { cx } from '../lib/util.js';
import { useStore } from '../store.js';
import { Icon } from './icons.js';

// ---------- Modal ----------
const modalStack = [];

export function Modal({ title, onClose, children, wide = false, className = '' }) {
  const idRef = useRef(Symbol('modal'));
  useEffect(() => {
    const id = idRef.current;
    modalStack.push(id);
    document.body.classList.add('modal-open');
    const onKey = (e) => {
      if (e.key === 'Escape' && modalStack[modalStack.length - 1] === id) {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      const i = modalStack.indexOf(id);
      if (i >= 0) modalStack.splice(i, 1);
      if (!modalStack.length) document.body.classList.remove('modal-open');
    };
  }, []);
  return html`
    <div class="modal-backdrop" onMouseDown=${(e) => e.target === e.currentTarget && onClose()}>
      <div class=${cx('modal', wide && 'modal-wide', className)} role="dialog" aria-modal="true" aria-label=${title}>
        <header class="modal-head">
          <h2>${title}</h2>
          <button type="button" class="icon-btn" onClick=${onClose} aria-label="關閉"><${Icon} name="x" /></button>
        </header>
        <div class="modal-body">${children}</div>
      </div>
    </div>`;
}

// ---------- Toast / Confirm ----------
const UICtx = createContext(null);

export function UIProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const [dialog, setDialog] = useState(null);

  const toast = useCallback((text, opts = {}) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((t) => [...t.slice(-2), { id, text, ...opts }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), opts.action ? 6000 : 2800);
  }, []);

  // confirm({ title, message, confirmText, danger }) → Promise<boolean>
  // choose({ title, message, options: [{ value, label, danger, hint }] }) → Promise<value|null>
  const confirm = useCallback((o) => new Promise((resolve) => setDialog({ kind: 'confirm', ...o, resolve })), []);
  const choose = useCallback((o) => new Promise((resolve) => setDialog({ kind: 'choose', ...o, resolve })), []);

  const close = (v) => {
    dialog?.resolve(v);
    setDialog(null);
  };

  return html`
    <${UICtx.Provider} value=${{ toast, confirm, choose }}>
      ${children}
      <div class="toasts" aria-live="polite">
        ${toasts.map(
          (t) => html`<div class="toast" key=${t.id}>
            <span>${t.text}</span>
            ${t.action && html`<button class="toast-action" onClick=${() => { t.action.run(); setToasts((x) => x.filter((y) => y.id !== t.id)); }}>${t.action.label}</button>`}
          </div>`
        )}
      </div>
      ${dialog &&
      html`<${Modal} title=${dialog.title} onClose=${() => close(dialog.kind === 'confirm' ? false : null)} className="dialog">
        ${dialog.message && html`<p class="dialog-msg">${dialog.message}</p>`}
        ${dialog.kind === 'confirm'
          ? html`<div class="form-actions">
              <button class="btn ghost" onClick=${() => close(false)}>取消</button>
              <button class=${cx('btn', dialog.danger ? 'danger' : 'primary')} onClick=${() => close(true)} autofocus>${dialog.confirmText || '確定'}</button>
            </div>`
          : html`<div class="choice-list">
              ${dialog.options.map(
                (o) => html`<button class=${cx('choice', o.danger && 'danger')} onClick=${() => close(o.value)}>
                  <strong>${o.label}</strong>${o.hint && html`<span>${o.hint}</span>`}
                </button>`
              )}
              <button class="btn ghost block" onClick=${() => close(null)}>取消</button>
            </div>`}
      <//>`}
    <//>`;
}

export const useUI = () => useContext(UICtx);

// ---------- 下拉選單 ----------
export function Menu({ items, label = '更多動作', icon = 'more', align = 'right' }) {
  const [open, setOpen] = useState(false);
  const ref = useRef();
  useEffect(() => {
    if (!open) return;
    const off = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false);
    const esc = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', off);
    document.addEventListener('touchstart', off);
    window.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('mousedown', off);
      document.removeEventListener('touchstart', off);
      window.removeEventListener('keydown', esc);
    };
  }, [open]);
  return html`
    <div class="menu-wrap" ref=${ref} onClick=${(e) => e.stopPropagation()}>
      <button type="button" class="icon-btn" aria-label=${label} aria-expanded=${open} onClick=${() => setOpen(!open)}><${Icon} name=${icon} /></button>
      ${open &&
      html`<div class=${cx('menu', align === 'left' && 'menu-left')} role="menu">
        ${items.filter(Boolean).map((it) =>
          it === '-'
            ? html`<div class="menu-sep"></div>`
            : html`<button type="button" role="menuitem" class=${cx('menu-item', it.danger && 'danger')} onClick=${() => { setOpen(false); it.onClick(); }}>${it.label}</button>`
        )}
      </div>`}
    </div>`;
}

// ---------- 標籤與小元件 ----------
export function AreaTag({ areaId, small = false }) {
  const { idx } = useStore();
  const a = idx.areas[areaId];
  if (!a) return null;
  return html`<span class=${cx('area-tag', small && 'small')} style=${`--c:${a.color}`}><span class="area-icon">${a.icon}</span>${a.name}</span>`;
}

export function ProgressBar({ pct, color }) {
  return html`<div class="progress" role="progressbar" aria-valuenow=${pct} aria-valuemin="0" aria-valuemax="100">
    <div class="progress-fill" style=${`width:${Math.max(0, Math.min(100, pct))}%;${color ? `background:${color}` : ''}`}></div>
  </div>`;
}

export function Empty({ title, children }) {
  return html`<div class="empty"><p class="empty-title">${title}</p>${children && html`<div class="empty-body">${children}</div>`}</div>`;
}

export function Segmented({ value, options, onChange, size }) {
  return html`<div class=${cx('segmented', size)} role="tablist">
    ${options.map(
      (o) => html`<button type="button" role="tab" aria-selected=${value === o.id} class=${cx(value === o.id && 'on')} onClick=${() => onChange(o.id)}>
        ${o.label}${o.count != null && o.count > 0 ? html`<span class="seg-count">${o.count}</span>` : ''}
      </button>`
    )}
  </div>`;
}

export function Collapse({ title, count, defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return html`<div class="collapse">
    <button type="button" class="collapse-head" onClick=${() => setOpen(!open)} aria-expanded=${open}>
      <${Icon} name=${open ? 'down' : 'right'} size=${16} />
      <span>${title}</span>${count != null && html`<span class="muted">${count}</span>`}
    </button>
    ${open && html`<div class="collapse-body">${children}</div>`}
  </div>`;
}

export function PageHead({ eyebrow, title, sub, actions }) {
  return html`<header class="page-head">
    <div class="page-head-text">
      ${eyebrow && html`<div class="eyebrow">${eyebrow}</div>`}
      <h1>${title}</h1>
      ${sub && html`<p class="page-sub">${sub}</p>`}
    </div>
    ${actions && html`<div class="page-actions">${actions}</div>`}
  </header>`;
}

// 單行快速輸入：Enter 送出
export function QuickInput({ placeholder, onSubmit, autoFocus = false, buttonLabel = '新增', children }) {
  const [text, setText] = useState('');
  const ref = useRef();
  useEffect(() => {
    if (autoFocus && window.matchMedia('(min-width: 900px)').matches) ref.current?.focus();
  }, []);
  const submit = (e) => {
    e.preventDefault();
    const v = text.trim();
    if (!v) return;
    onSubmit(v);
    setText('');
  };
  return html`<form class="quick-input" onSubmit=${submit}>
    <span class="quick-plus"><${Icon} name="plus" /></span>
    <input ref=${ref} value=${text} onInput=${(e) => setText(e.currentTarget.value)} placeholder=${placeholder} aria-label=${placeholder} enterkeyhint="done" />
    ${children}
    <button class="btn primary small" type="submit" disabled=${!text.trim()}>${buttonLabel}</button>
  </form>`;
}
