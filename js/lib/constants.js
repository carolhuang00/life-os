export const STORAGE_KEY = 'lifeos:v1';
export const DATA_VERSION = 1;

export const TASK_STATUS = [
  { id: 'todo', label: '待處理' },
  { id: 'doing', label: '進行中' },
  { id: 'waiting', label: '等待中' },
  { id: 'done', label: '已完成' },
  { id: 'deferred', label: '延後' },
  { id: 'paused', label: '暫停' },
  { id: 'dropped', label: '放棄' },
];
export const TASK_STATUS_LABEL = Object.fromEntries(TASK_STATUS.map((s) => [s.id, s.label]));

export const PRIORITIES = [
  { id: 'P0', label: 'P0 最重要' },
  { id: 'P1', label: 'P1 重要' },
  { id: 'P2', label: 'P2 一般' },
  { id: 'P3', label: 'P3 有空再做' },
];
export const PRIORITY_RANK = { P0: 0, P1: 1, P2: 2, P3: 3, '': 4 };

export const GOAL_HORIZONS = [
  { id: 'week', label: '本週目標' },
  { id: 'month', label: '本月目標' },
  { id: 'quarter', label: '季度目標' },
  { id: 'year', label: '年度目標' },
  { id: 'long', label: '長期目標' },
];
export const HORIZON_LABEL = Object.fromEntries(GOAL_HORIZONS.map((s) => [s.id, s.label]));

export const GOAL_STATUS = [
  { id: 'active', label: '進行中' },
  { id: 'paused', label: '暫停' },
  { id: 'done', label: '已達成' },
  { id: 'dropped', label: '放下了' },
];
export const GOAL_STATUS_LABEL = Object.fromEntries(GOAL_STATUS.map((s) => [s.id, s.label]));

export const PROJECT_STATUS = [
  { id: 'planning', label: '規劃中' },
  { id: 'active', label: '進行中' },
  { id: 'paused', label: '暫停' },
  { id: 'done', label: '已完成' },
  { id: 'dropped', label: '放下了' },
];
export const PROJECT_STATUS_LABEL = Object.fromEntries(PROJECT_STATUS.map((s) => [s.id, s.label]));

export const SOMEDAY_CATS = [
  { id: 'place', label: '想去的地方' },
  { id: 'learn', label: '想學的東西' },
  { id: 'buy', label: '想買的東西' },
  { id: 'side', label: 'Side Project' },
  { id: 'plan', label: '未來計畫' },
  { id: 'idea', label: '靈感' },
  { id: 'other', label: '其他' },
];
export const SOMEDAY_LABEL = Object.fromEntries(SOMEDAY_CATS.map((s) => [s.id, s.label]));

export const ESTIMATES = [10, 15, 30, 45, 60, 90, 120, 180, 240, 480];

export const COLORS = [
  '#2479A8', '#3FA7A0', '#D9A55B', '#6C7FD1', '#E0816B', '#E59AAE',
  '#8C78C9', '#4FB3C9', '#E8B46A', '#6BAF8E', '#5E7F99', '#A98B7A',
];

export const ICONS = [
  '💼', '🌿', '💰', '📚', '🌱', '🏠', '💞', '🎨', '✈️', '☕', '🛠️', '🏃',
  '🧘', '🍳', '🎵', '📷', '🎮', '🐾', '🧠', '💡', '🗂️', '🧾', '🎓', '🌏',
  '⛰️', '🚲', '🛋️', '🪴', '📝', '🎯', '❤️', '👶', '🙌', '🎁', '🌙', '⭐',
];

export const DEFAULT_AREAS = [
  { id: 'area_work', name: '工作', icon: '💼', color: '#2479A8' },
  { id: 'area_health', name: '健康', icon: '🌿', color: '#3FA7A0' },
  { id: 'area_finance', name: '財務', icon: '💰', color: '#D9A55B' },
  { id: 'area_learning', name: '學習', icon: '📚', color: '#6C7FD1' },
  { id: 'area_growth', name: '個人成長', icon: '🌱', color: '#6BAF8E' },
  { id: 'area_family', name: '家庭', icon: '🏠', color: '#E59AAE' },
  { id: 'area_relation', name: '關係', icon: '💞', color: '#8C78C9' },
  { id: 'area_leisure', name: '休閒', icon: '🎨', color: '#4FB3C9' },
  { id: 'area_travel', name: '旅行', icon: '✈️', color: '#E8B46A' },
  { id: 'area_life', name: '生活', icon: '☕', color: '#E0816B' },
  { id: 'area_side', name: 'Side Project', icon: '🛠️', color: '#5E7F99' },
];

// 舊版配色 → 海洋色（讀取舊資料時自動換掉）
export const LEGACY_COLORS = {
  '#6B8AC9': '#2479A8',
  '#6FB08A': '#3FA7A0',
  '#C9A45C': '#D9A55B',
  '#9A7FC9': '#6C7FD1',
  '#D08A6E': '#E0816B',
  '#D9849B': '#E59AAE',
  '#C77DBA': '#8C78C9',
  '#5FB3B3': '#4FB3C9',
  '#E0A45E': '#E8B46A',
  '#8FA66B': '#6BAF8E',
  '#7C8DA6': '#5E7F99',
  '#B5838D': '#A98B7A',
  '#7E8A99': '#2479A8',
  '#7D8B74': '#3FA7A0',
  '#B09A6E': '#D9A55B',
  '#8C8296': '#6C7FD1',
  '#A7735C': '#E0816B',
  '#B08A86': '#E59AAE',
  '#9A8391': '#8C78C9',
  '#6F8A87': '#4FB3C9',
  '#B8925E': '#E8B46A',
  '#8E9468': '#6BAF8E',
  '#77808A': '#5E7F99',
  '#9C8676': '#A98B7A',
};

export const DEFAULT_SETTINGS = {
  theme: 'system',
  inboxThreshold: 8,
  todayThreshold: 6,
  staleDays: 21,
  welcomeDismissed: false,
};
