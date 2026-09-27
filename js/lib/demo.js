// 示範資料：日期全部以「今天」為基準推算，任何時候打開都合理
import { addDays, todayKey, weekStart, parseKey, diffDays } from './date.js';
import { emptyData, normalize } from './storage.js';

export function buildDemoData(today = todayKey()) {
  const D = (n) => addDays(today, n);
  const iso = (n, hour = 10) => {
    const d = parseKey(D(n));
    d.setHours(hour, 0, 0, 0);
    return d.toISOString();
  };
  // 下一個週三（如果今天就是週三，取今天）
  const dow = parseKey(today).getDay();
  const nextWed = D((3 - dow + 7) % 7);
  const thisWeekEnd = addDays(weekStart(today), 6);

  const goals = [
    { id: 'g_ai', title: '建立更成熟的團隊 AI 工作流程', areaId: 'area_work', horizon: 'quarter', why: '減少重複性工作，讓團隊把時間留給需要判斷的事情。', startDate: D(-40), targetDate: D(60), status: 'active', createdAt: iso(-40) },
    { id: 'g_fit', title: '建立固定運動習慣', areaId: 'area_health', horizon: 'year', why: '想要精神好一點，也想睡得更好。這是持續性的目標，沒有終點。', startDate: D(-30), targetDate: '', status: 'active', createdAt: iso(-30) },
    { id: 'g_week_fit', title: '本週運動兩次', areaId: 'area_health', horizon: 'week', why: '先從做得到的頻率開始。每次運動完手動更新進度。', progressMode: 'manual', progress: 50, startDate: weekStart(today), targetDate: thisWeekEnd, status: 'active', createdAt: iso(-diffDays(today, weekStart(today))) },
    { id: 'g_japan', title: '安排明年的日本旅行', areaId: 'area_travel', horizon: 'year', why: '好久沒有好好休息，想給自己一段完整的假期。', startDate: D(-10), targetDate: D(120), status: 'active', createdAt: iso(-10) },
    { id: 'g_en', title: '提升英文能力', areaId: 'area_learning', horizon: 'long', why: '想直接讀第一手的 AI 研究與國外文章。', startDate: D(-60), targetDate: '', status: 'active', createdAt: iso(-60) },
    { id: 'g_home', title: '讓家裡住起來更舒服', areaId: 'area_life', horizon: 'month', why: '下班回家想要有一個放鬆的空間。', startDate: D(-8), targetDate: D(30), status: 'active', createdAt: iso(-8) },
  ];

  const projects = [
    { id: 'p_ai_news', title: 'AI 新知分享自動化', areaId: 'area_work', goalId: 'g_ai', description: '每週自動整理 AI 新知，產出團隊可以直接閱讀的摘要。', startDate: D(-30), dueDate: D(11), status: 'active', createdAt: iso(-30) },
    { id: 'p_forum', title: '2027 行銷趨勢論壇', areaId: 'area_work', goalId: '', description: '年度論壇，負責講者邀約與場地。', startDate: D(-14), dueDate: D(45), status: 'active', createdAt: iso(-14) },
    { id: 'p_trip', title: '日本旅行', areaId: 'area_travel', goalId: 'g_japan', description: '預計春天出發，7～10 天。', startDate: D(-10), dueDate: D(90), status: 'planning', createdAt: iso(-10) },
    { id: 'p_gym', title: '每週運動 3 次', areaId: 'area_health', goalId: 'g_fit', description: '健身、跑步、瑜伽輪流。', startDate: D(-30), dueDate: '', status: 'active', createdAt: iso(-30) },
    { id: 'p_room', title: '整理房間', areaId: 'area_life', goalId: 'g_home', description: '衣櫃、書桌、收納一次整理好。', startDate: D(-8), dueDate: D(20), status: 'active', createdAt: iso(-8) },
    { id: 'p_reading', title: '英文閱讀習慣', areaId: 'area_learning', goalId: 'g_en', description: '每週至少讀兩篇英文文章。', startDate: D(-60), dueDate: '', status: 'active', createdAt: iso(-60) },
  ];

  const T = (o) => ({ status: 'todo', createdAt: iso(-3), ...o });
  const done = (o, n) => ({ ...o, status: 'done', completedAt: iso(n, 17), updatedAt: iso(n, 17) });

  const tasks = [
    // 工作
    T({ id: 't_ai_flow', title: '完成 AI 新知流程', projectId: 'p_ai_news', priority: 'P0', status: 'doing', dueDate: D(11), estimate: 120, nextAction: '把三個資訊來源的整理格式統一', todayDate: today, tags: ['AI'], createdAt: iso(-20), updatedAt: iso(-1) }),
    done(T({ id: 't_sources', title: '整理資訊來源', projectId: 'p_ai_news', priority: 'P1', estimate: 60, createdAt: iso(-15) }), -2),
    T({ id: 't_template', title: '設計分享模板', projectId: 'p_ai_news', priority: 'P1', dueDate: D(5), estimate: 60, nextAction: '先找三個喜歡的電子報版型參考', createdAt: iso(-10) }),
    done(T({ id: 't_feedback', title: '蒐集 AI 工具使用回饋', projectId: 'p_ai_news', estimate: 45, createdAt: iso(-12) }), -8),
    done(T({ id: 't_interview', title: '訪談團隊使用痛點', projectId: 'p_ai_news', estimate: 90, createdAt: iso(-20) }), -15),
    T({ id: 't_speaker', title: '回覆論壇講者邀約信', projectId: 'p_forum', priority: 'P1', dueDate: D(0), estimate: 20, todayDate: today, nextAction: '確認講者可以的日期', blocksOthers: true, createdAt: iso(-4) }),
    T({ id: 't_venue', title: '論壇場地報價比較', projectId: 'p_forum', priority: 'P2', dueDate: D(-2), estimate: 45, nextAction: '整理三家場地的價格與容納人數', createdAt: iso(-9), updatedAt: iso(-6) }),
    done(T({ id: 't_weekly', title: '準備週會簡報', areaId: 'area_work', estimate: 40 }), -1),
    done(T({ id: 't_report', title: '客戶月報', areaId: 'area_work', priority: 'P1', estimate: 90 }), -3),
    done(T({ id: 't_sop', title: '更新團隊 SOP', areaId: 'area_work', goalId: 'g_ai', estimate: 60 }), -5),
    done(T({ id: 't_tools', title: '整理 AI 工具清單', areaId: 'area_work', goalId: 'g_ai', estimate: 30, todayDate: today }), 0),
    // 健康
    T({ id: 't_gym', title: '週三晚上去健身房', projectId: 'p_gym', plannedDate: nextWed, estimate: 60 }),
    done(T({ id: 't_run', title: '晨跑 30 分鐘', projectId: 'p_gym', estimate: 30 }), -2),
    done(T({ id: 't_yoga', title: '週六瑜伽課', projectId: 'p_gym', estimate: 60, createdAt: iso(-12) }), -8),
    T({ id: 't_yoga2', title: '報名下個月瑜伽課', projectId: 'p_gym', priority: 'P3', estimate: 10 }),
    T({ id: 't_dentist', title: '預約牙醫洗牙', areaId: 'area_health', priority: 'P2', dueDate: D(3), estimate: 10, nextAction: '打電話給診所' }),
    // 生活、財務、家庭
    T({ id: 't_closet', title: '整理衣櫃', projectId: 'p_room', priority: 'P2', estimate: 60, todayDate: today, nextAction: '先把不穿的衣服裝箱' }),
    done(T({ id: 't_boxes', title: '買新的收納箱', projectId: 'p_room', estimate: 30 }), -6),
    T({ id: 't_bills', title: '繳水電費', areaId: 'area_finance', priority: 'P1', dueDate: D(2), estimate: 10 }),
    T({ id: 't_mom', title: '打電話給媽媽', areaId: 'area_family', priority: 'P1', estimate: 15, todayDate: today }),
    T({ id: 't_photos', title: '整理舊照片', areaId: 'area_life', priority: 'P3', estimate: 120, createdAt: iso(-45), updatedAt: iso(-40) }),
    T({ id: 't_budget_app', title: '研究記帳 App', areaId: 'area_finance', status: 'deferred', createdAt: iso(-30), updatedAt: iso(-25) }),
    // 學習、旅行
    T({ id: 't_paper', title: '閱讀一篇 AI 研究文章', areaId: 'area_learning', estimate: 30, todayDate: today }),
    T({ id: 't_en_article', title: '閱讀一篇英文文章', projectId: 'p_reading', estimate: 20, createdAt: iso(-30), updatedAt: iso(-28) }),
    T({ id: 't_flight', title: '確認機票價格', projectId: 'p_trip', priority: 'P2', dueDate: D(14), estimate: 30, nextAction: '比較三家航空春季票價' }),
    done(T({ id: 't_cities', title: '列出想去的城市', projectId: 'p_trip', estimate: 30 }), -3),
  ];

  const inbox = [
    { id: 'i1', text: '回 Joy', createdAt: iso(0, 9) },
    { id: 'i2', text: '10/8 AI 流程', createdAt: iso(-1, 21) },
    { id: 'i3', text: '想買新的桌子', createdAt: iso(-1, 20) },
    { id: 'i4', text: '年底要不要安排旅行', createdAt: iso(-2, 22) },
    { id: 'i5', text: '研究 Claude Code', createdAt: iso(-3, 23) },
  ];

  const someday = [
    { id: 's1', title: '學習攝影', category: 'learn', areaId: 'area_leisure', notes: '先從手機攝影構圖開始。' },
    { id: 's2', title: '去冰島看極光', category: 'place', areaId: 'area_travel' },
    { id: 's3', title: '做一個個人網站', category: 'side', areaId: 'area_side', notes: '放作品集與寫作。' },
    { id: 's4', title: '研究投資', category: 'learn', areaId: 'area_finance' },
    { id: 's5', title: '學日文', category: 'learn', areaId: 'area_learning', notes: '去日本旅行前可以先學五十音。' },
    { id: 's6', title: '一張好一點的工作椅', category: 'buy', areaId: 'area_life' },
  ].map((x, i) => ({ ...x, createdAt: iso(-20 + i) }));

  const waiting = [
    { id: 'w1', what: '等待朋友確認聚餐時間', who: '小安', since: D(-4), followUp: D(0), createdAt: iso(-4) },
    { id: 'w2', what: '等同事交論壇預算資料', who: 'Joy', since: D(-2), followUp: D(2), projectId: 'p_forum', createdAt: iso(-2) },
    { id: 'w3', what: '等新桌子到貨', who: '家具店', since: D(-5), followUp: D(5), createdAt: iso(-5) },
  ];

  const notes = [
    { id: 'n1', title: '日本旅行想法', body: '想去京都、金澤，住一晚溫泉旅館。\n春天櫻花季人很多，可以考慮三月初。', areaId: 'area_travel', createdAt: iso(-6) },
    { id: 'n2', title: 'AI 工具觀察', body: '團隊最常卡在「不知道要問什麼」，分享時可以附上範例提問。', areaId: 'area_work', createdAt: iso(-9) },
  ];

  const mark = (list) => list.map((x) => ({ ...x, demo: true }));
  const data = {
    ...emptyData(),
    goals: mark(goals),
    projects: mark(projects),
    tasks: mark(tasks),
    inbox: mark(inbox),
    someday: mark(someday),
    waiting: mark(waiting),
    notes: mark(notes),
    reviews: {
      [weekStart(today)]: {
        focus: [
          { type: 'goal', id: 'g_ai', title: '建立更成熟的團隊 AI 工作流程' },
          { type: 'goal', id: 'g_week_fit', title: '本週運動兩次' },
          { type: 'project', id: 'p_room', title: '整理房間' },
        ],
        note: '',
        savedAt: iso(-diffDays(today, weekStart(today)) - 1, 20),
        demo: true,
      },
    },
  };
  return normalize(data);
}
