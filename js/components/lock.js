// 簡單密碼門檻：輸入正確密碼才顯示內容，這台裝置記住後不用每次輸入
// 程式裡只存密碼的雜湊值（SHA-256），不存密碼本身
// 注意：這是擋一般訪客的門鎖，不是伺服器等級的安全機制；你的資料本來就只存在自己的瀏覽器裡
import { useEffect, useRef, useState } from 'preact/hooks';
import { html } from '../lib/html.js';

const PASS_HASH = 'e44fac6c61d07056044f71636647b8db3fa77995a3e9e90795b7f3e716281109';
const SALT = 'lifeos:';
const AUTH_KEY = 'lifeos:auth';

async function sha256(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function isUnlocked() {
  try {
    return localStorage.getItem(AUTH_KEY) === PASS_HASH || sessionStorage.getItem(AUTH_KEY) === PASS_HASH;
  } catch (e) {
    return false;
  }
}

export function lock() {
  try {
    localStorage.removeItem(AUTH_KEY);
    sessionStorage.removeItem(AUTH_KEY);
  } catch (e) {}
  location.reload();
}

export function LockScreen({ onUnlock }) {
  const [pw, setPw] = useState('');
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const ref = useRef();
  useEffect(() => { setTimeout(() => ref.current?.focus(), 50); }, []);

  const submit = async (e) => {
    e.preventDefault();
    if (!pw || busy) return;
    setBusy(true);
    const h = await sha256(SALT + pw.trim());
    setBusy(false);
    if (h !== PASS_HASH) {
      setError('密碼不對，再試一次。');
      setPw('');
      ref.current?.focus();
      return;
    }
    try {
      (remember ? localStorage : sessionStorage).setItem(AUTH_KEY, PASS_HASH);
    } catch (err) {}
    onUnlock();
  };

  return html`<div class="lock-screen">
    <form class="lock-card" onSubmit=${submit}>
      <div class="brand lock-brand"><span class="brand-mark"></span><span>Life OS</span></div>
      <p class="muted small">這是私人空間，請輸入密碼。</p>
      <input ref=${ref} class="lock-input" type="password" inputmode="numeric" autocomplete="current-password"
        placeholder="密碼" value=${pw} onInput=${(e) => { setPw(e.currentTarget.value); setError(''); }} aria-label="密碼" />
      ${error && html`<p class="lock-error">${error}</p>`}
      <label class="toggle small"><input type="checkbox" checked=${remember} onChange=${(e) => setRemember(e.currentTarget.checked)} /><span>在這台裝置記住我</span></label>
      <button class="btn primary block" type="submit" disabled=${!pw || busy}>進入</button>
    </form>
  </div>`;
}
