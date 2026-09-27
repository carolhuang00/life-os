// 首頁與回顧共用的小區塊
import { html } from '../lib/html.js';
import { useStore } from '../store.js';
import { ProgressBar } from './ui.js';
import { lifeBalance, balanceHint, goalProgress } from '../lib/insights.js';
import { HORIZON_LABEL } from '../lib/constants.js';
import { relDue, todayKey } from '../lib/date.js';

export function BalanceBars({ from, to, showHint = true, emptyText = '這段時間還沒有完成紀錄。完成幾件事情之後，這裡會顯示時間大多花在哪些生活面向。' }) {
  const { data, idx } = useStore();
  const bal = lifeBalance(data, idx, from, to);
  const hint = showHint ? balanceHint(bal, idx) : null;
  if (!bal.total) return html`<p class="muted small">${emptyText}</p>`;
  const max = bal.rows[0].count;
  return html`<div class="balance">
    ${bal.rows.map((r) => {
      const a = idx.areas[r.areaId];
      return html`<div class="balance-row" key=${r.areaId}>
        <span class="balance-label">${a ? html`<span class="area-icon">${a.icon}</span>${a.name}` : '未分類'}</span>
        <span class="balance-track"><span class="balance-fill" style=${`width:${Math.max(8, (r.count / max) * 100)}%;background:${a?.color || 'var(--muted)'}`}></span></span>
        <span class="balance-count">${r.count}</span>
      </div>`;
    })}
    ${hint && html`<p class="soft-note">${hint}</p>`}
  </div>`;
}

export function GoalMiniList({ goals, limit = 5 }) {
  const { data, idx } = useStore();
  const today = todayKey();
  if (!goals.length) return html`<p class="muted small">還沒有進行中的目標。<a href="#/goals">建立一個方向</a>，讓每天的小事有個歸屬。</p>`;
  return html`<div class="goal-mini-list">
    ${goals.slice(0, limit).map((g) => {
      const p = goalProgress(g, data, idx);
      const a = idx.areas[g.areaId];
      const due = g.targetDate ? relDue(g.targetDate, today) : null;
      return html`<a class="goal-mini" href=${`#/goals/${g.id}`} key=${g.id}>
        <div class="goal-mini-top">
          <span class="goal-mini-title">${a ? a.icon + ' ' : ''}${g.title}</span>
          <span class="muted small">${p.pct}%</span>
        </div>
        <${ProgressBar} pct=${p.pct} color=${a?.color} />
        <div class="muted small">${HORIZON_LABEL[g.horizon]}${due ? ` · ${due.tone === 'overdue' ? '已過目標日期' : '目標 ' + due.text.replace('到期', '')}` : ''}</div>
      </a>`;
    })}
  </div>`;
}
