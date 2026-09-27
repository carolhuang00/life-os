// 行事曆：今天／本週／本月的重要時間點
import { useState } from 'preact/hooks';
import { html } from '../lib/html.js';
import { useStore } from '../store.js';
import { useEditor } from '../components/editor.js';
import { PageHead, Segmented, Empty } from '../components/ui.js';
import { Icon } from '../components/icons.js';
import { setQuery, navigate } from '../lib/router.js';
import { cx } from '../lib/util.js';
import {
  todayKey, addDays, addMonths, weekStart, monthStart, monthEnd, fmtDate, fmtFull, weekdayOf, fmtRange, parseKey, isValidKey, relDay,
} from '../lib/date.js';
import { calendarItems } from '../lib/insights.js';

const LEGEND = [
  { kind: 'due', label: 'Deadline' },
  { kind: 'goal', label: '目標日期' },
  { kind: 'today', label: 'Today 任務' },
  { kind: 'plan', label: '預定／開始' },
  { kind: 'waiting', label: '追蹤' },
];

function useOpenItem() {
  const { openEditor } = useEditor();
  return (it) => {
    if (it.type === 'task') openEditor('task', { id: it.id });
    else if (it.type === 'waiting') openEditor('waiting', { id: it.id });
    else if (it.type === 'goal') navigate(`/goals/${it.id}`);
    else navigate(`/projects/${it.id}`);
  };
}

function ItemRow({ it }) {
  const open = useOpenItem();
  return html`<button type="button" class=${cx('cal-item', it.kind, it.done && 'is-done')} onClick=${() => open(it)}>
    <span class=${cx('kind-pill', it.kind)}>${it.label}</span><span class="cal-item-title">${it.title}</span>
  </button>`;
}

function DayList({ days, items, today }) {
  const byDay = {};
  for (const it of items) (byDay[it.date] ||= []).push(it);
  return html`<div class="day-list">
    ${days.map((d) => html`<section class=${cx('day-block', d === today && 'is-today')} key=${d}>
      <h3 class="day-title">${fmtDate(d)} <span class="muted">週${weekdayOf(d)}</span>${d === today && html`<span class="today-pill">今天</span>`}</h3>
      ${byDay[d]?.length ? byDay[d].map((it) => html`<${ItemRow} key=${it.kind + it.id} it=${it} />`) : html`<p class="muted small">沒有安排</p>`}
    </section>`)}
  </div>`;
}

export function CalendarPage({ query }) {
  const { data } = useStore();
  const today = todayKey();
  const view = query.v || 'week';
  const anchor = isValidKey(query.d) ? query.d : today;
  const [picked, setPicked] = useState(null);

  const go = (d) => setQuery({ d: d === today ? '' : d });
  const step = (n) => go(view === 'month' ? addMonths(anchor, n) : view === 'week' ? addDays(anchor, 7 * n) : addDays(anchor, n));

  let title, body;
  if (view === 'day') {
    const items = calendarItems(data, anchor, anchor);
    title = fmtFull(anchor);
    body = items.length ? html`<div class="day-block solo">${items.map((it) => html`<${ItemRow} key=${it.kind + it.id} it=${it} />`)}</div>` : html`<${Empty} title=${anchor === today ? '今天沒有特別的時間點' : '這天沒有安排'} />`;
  } else if (view === 'week') {
    const ws = weekStart(anchor);
    const days = Array.from({ length: 7 }, (_, i) => addDays(ws, i));
    title = fmtRange(days[0], days[6]);
    body = html`<${DayList} days=${days} items=${calendarItems(data, days[0], days[6])} today=${today} />`;
  } else {
    const ms = monthStart(anchor);
    const me = monthEnd(anchor);
    const gridStart = weekStart(ms);
    const cells = [];
    for (let d = gridStart; d <= me || cells.length % 7; d = addDays(d, 1)) cells.push(d);
    const items = calendarItems(data, cells[0], cells[cells.length - 1]);
    const byDay = {};
    for (const it of items) (byDay[it.date] ||= []).push(it);
    const month = parseKey(ms).getMonth();
    const sel = picked && picked >= cells[0] && picked <= cells[cells.length - 1] ? picked : null;
    title = `${parseKey(ms).getFullYear()}年${month + 1}月`;
    body = html`<div class="month">
      <div class="month-head">${['一', '二', '三', '四', '五', '六', '日'].map((w) => html`<span>${w}</span>`)}</div>
      <div class="month-grid">
        ${cells.map((d) => {
          const list = byDay[d] || [];
          return html`<button type="button" key=${d} class=${cx('month-cell', parseKey(d).getMonth() !== month && 'other', d === today && 'is-today', d === sel && 'selected')} onClick=${() => setPicked(d)}>
            <span class="month-date">${parseKey(d).getDate()}</span>
            <span class="month-items">
              ${list.slice(0, 3).map((it) => html`<span class=${cx('month-item', it.kind, it.done && 'is-done')}>${it.title}</span>`)}
              ${list.length > 3 && html`<span class="muted small">+${list.length - 3}</span>`}
            </span>
            ${list.length > 0 && html`<span class="month-dots">${list.slice(0, 4).map((it) => html`<i class=${it.kind}></i>`)}</span>`}
          </button>`;
        })}
      </div>
      ${sel && html`<div class="day-block picked"><h3 class="day-title">${fmtDate(sel)} <span class="muted">週${weekdayOf(sel)} · ${relDay(sel, today)}</span></h3>
        ${(byDay[sel] || []).length ? byDay[sel].map((it) => html`<${ItemRow} key=${it.kind + it.id} it=${it} />`) : html`<p class="muted small">沒有安排</p>`}
      </div>`}
    </div>`;
  }

  return html`<div class="page">
    <${PageHead} eyebrow="Calendar" title="行事曆" sub="最近有哪些重要時間點，一眼看完。" />
    <div class="cal-toolbar">
      <${Segmented} value=${view} onChange=${(v) => setQuery({ v: v === 'week' ? '' : v })} options=${[{ id: 'day', label: '今天' }, { id: 'week', label: '本週' }, { id: 'month', label: '本月' }]} />
      <div class="cal-nav">
        <button class="icon-btn" aria-label="上一段" onClick=${() => step(-1)}><${Icon} name="left" /></button>
        <span class="cal-title">${title}</span>
        <button class="icon-btn" aria-label="下一段" onClick=${() => step(1)}><${Icon} name="right" /></button>
        ${anchor !== today && html`<button class="btn ghost small" onClick=${() => go(today)}>回到今天</button>`}
      </div>
    </div>
    <div class="legend">${LEGEND.map((l) => html`<span class="legend-item"><i class=${l.kind}></i>${l.label}</span>`)}</div>
    ${body}
  </div>`;
}
