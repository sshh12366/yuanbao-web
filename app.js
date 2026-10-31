(() => {
  'use strict';

  const STORAGE_KEY = 'yuanbao-ledger-v1';
  const categories = {
    '支出': ['餐饮', '交通', '购物', '居家', '娱乐', '医疗', '其他'],
    '收入': ['工资', '奖金', '理财', '其他'],
    '存钱': ['目标存入']
  };
  const symbols = { '支出': '↗', '收入': '↙', '存钱': '✦' };
  const state = loadState();
  let selectedKind = '支出';
  let selectedGoalForContribution = null;
  let currentFilter = 'all';
  let toastTimer;

  function loadState() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      return {
        entries: Array.isArray(saved.entries) ? saved.entries : [],
        goals: Array.isArray(saved.goals) ? saved.goals : []
      };
    } catch {
      return { entries: [], goals: [] };
    }
  }

  function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function newId() {
    return globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function money(value) {
    return new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY' }).format(Number(value) || 0);
  }

  function localDateInput(date = new Date()) {
    const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 16);
  }

  function parsedDate(value) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? new Date() : date;
  }

  function isSameDay(a, b) {
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  }

  function isSameMonth(a, b) {
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
  }

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
  }

  function entryDateLabel(date) {
    return new Intl.DateTimeFormat('zh-CN', { hour: '2-digit', minute: '2-digit' }).format(date);
  }

  function emptyState(title, description) {
    return `<div class="empty-state"><div class="empty-icon">⌁</div><strong>${escapeHtml(title)}</strong><p>${escapeHtml(description)}</p></div>`;
  }

  function goalSaved(goal) {
    return Number(goal.starting || 0) + state.entries
      .filter((entry) => entry.kind === '存钱' && entry.goalId === goal.id)
      .reduce((sum, entry) => sum + Number(entry.amount || 0), 0);
  }

  function renderGoal(goal, compact = false) {
    const current = goalSaved(goal);
    const target = Number(goal.target) || 0;
    const ratio = target > 0 ? Math.min(current / target, 1) : 0;
    const percent = Math.round(ratio * 100);
    const remain = Math.max(target - current, 0);
    const deadline = goal.deadline
      ? `计划 ${new Date(`${goal.deadline}T00:00:00`).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' })}`
      : '一步一步来';
    return `<article class="goal-card">
      <div class="goal-main"><span class="goal-icon">${escapeHtml(goal.symbol || '✦')}</span>
        <div class="goal-copy"><strong>${escapeHtml(goal.name)}</strong><small>已存 ${money(current)} / ${money(target)}</small></div>
        <span class="goal-percent">${percent}%</span>
      </div>
      <div class="progress-track"><div class="progress-fill" style="width:${percent}%"></div></div>
      <div class="goal-bottom"><span>${escapeHtml(deadline)}${remain ? ` · 还差 ${money(remain)}` : ' · 目标达成 ✨'}</span>
        ${compact ? '' : `<span><button data-action="contribute" data-id="${escapeHtml(goal.id)}">＋ 存一笔</button> <button data-action="delete-goal" data-id="${escapeHtml(goal.id)}" aria-label="删除目标" title="删除目标">⋯</button></span>`}
      </div>
    </article>`;
  }

  function renderEntry(entry, deletable = false) {
    const sign = entry.kind === '支出' ? '−' : '+';
    const note = entry.note ? escapeHtml(entry.note) : `${escapeHtml(entry.category)} · ${entryDateLabel(parsedDate(entry.date))}`;
    const goal = entry.goalId ? state.goals.find((item) => item.id === entry.goalId) : null;
    const title = entry.kind === '存钱' && goal ? goal.name : entry.category;
    return `<div class="entry-row">
      <span class="entry-icon ${entry.kind === '支出' ? 'expense' : ''}">${symbols[entry.kind] || '•'}</span>
      <div class="entry-copy"><strong>${escapeHtml(title)}${entry.kind === '存钱' ? ' · 存钱' : ''}</strong><small>${note}</small></div>
      <span class="entry-amount">${sign}${money(entry.amount)}</span>
      ${deletable ? `<button class="delete-entry" data-action="delete-entry" data-id="${escapeHtml(entry.id)}" aria-label="删除记录">×</button>` : ''}
    </div>`;
  }

  function renderHome() {
    const now = new Date();
    document.getElementById('todayLabel').textContent = now.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' });
    const today = state.entries.filter((entry) => entry.kind === '支出' && isSameDay(parsedDate(entry.date), now)).reduce((sum, entry) => sum + Number(entry.amount), 0);
    const monthExpenses = state.entries.filter((entry) => entry.kind === '支出' && isSameMonth(parsedDate(entry.date), now)).reduce((sum, entry) => sum + Number(entry.amount), 0);
    const monthIncome = state.entries.filter((entry) => entry.kind === '收入' && isSameMonth(parsedDate(entry.date), now)).reduce((sum, entry) => sum + Number(entry.amount), 0);
    document.getElementById('todayExpense').textContent = money(today);
    document.getElementById('monthExpense').textContent = money(monthExpenses);
    document.getElementById('monthIncome').textContent = money(monthIncome);

    const days = Array.from({ length: 7 }, (_, index) => {
      const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (6 - index));
      const total = state.entries.filter((entry) => entry.kind === '支出' && isSameDay(parsedDate(entry.date), day)).reduce((sum, entry) => sum + Number(entry.amount), 0);
      return { day, total };
    });
    const max = Math.max(...days.map((item) => item.total), 1);
    document.getElementById('weekChart').innerHTML = days.map(({ day, total }) => {
      const isToday = isSameDay(day, now);
      const height = total ? Math.max((total / max) * 72, 7) : 4;
      const label = day.toLocaleDateString('zh-CN', { weekday: 'short' });
      const value = total ? (total >= 1000 ? `${(total / 1000).toFixed(1)}k` : `${Math.round(total)}`) : ' ';
      return `<div class="chart-column"><span class="chart-value">${value}</span><div class="chart-track"><div class="chart-bar ${isToday ? 'today' : ''}" style="height:${height}px"></div></div><span class="chart-label ${isToday ? 'today' : ''}">${label}</span></div>`;
    }).join('');

    const goals = state.goals.slice(0, 2);
    document.getElementById('homeGoals').innerHTML = goals.length ? goals.map((goal) => renderGoal(goal, true)).join('') : emptyState('给未来一个小目标', '创建目标后，就能看见每一步的进度。');
    const recent = [...state.entries].sort((a, b) => parsedDate(b.date) - parsedDate(a.date)).slice(0, 4);
    document.getElementById('homeEntries').innerHTML = recent.length ? recent.map((entry) => renderEntry(entry)).join('') : emptyState('还没有记账', '点右下角的 +，记录今天的第一笔。');
  }

  function renderLedger() {
    let entries = [...state.entries].sort((a, b) => parsedDate(b.date) - parsedDate(a.date));
    if (currentFilter !== 'all') entries = entries.filter((entry) => entry.kind === currentFilter);
    const groups = new Map();
    for (const entry of entries) {
      const date = parsedDate(entry.date);
      const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
      if (!groups.has(key)) groups.set(key, { date, entries: [] });
      groups.get(key).entries.push(entry);
    }
    const container = document.getElementById('allEntries');
    if (!groups.size) {
      container.innerHTML = emptyState('这里还没有记录', '记下今天的花销或一笔存入。');
      return;
    }
    container.innerHTML = [...groups.values()].map((group) => {
      const expense = group.entries.filter((entry) => entry.kind === '支出').reduce((sum, entry) => sum + Number(entry.amount), 0);
      const dateLabel = group.date.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' });
      return `<section class="day-group"><div class="day-heading"><strong>${escapeHtml(dateLabel)}</strong><small>支出 ${money(expense)}</small></div>${group.entries.map((entry) => renderEntry(entry, true)).join('')}</section>`;
    }).join('');
  }

  function renderGoals() {
    const container = document.getElementById('allGoals');
    container.innerHTML = state.goals.length ? state.goals.map((goal) => renderGoal(goal)).join('') : emptyState('创建你的第一个目标', '旅行、设备、应急金……先从一个愿望开始。');
  }

  function render() {
    renderHome();
    renderLedger();
    renderGoals();
  }

  function toast(message) {
    const element = document.getElementById('toast');
    element.textContent = message;
    element.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => element.classList.remove('show'), 2200);
  }

  function showDialog(id) {
    const dialog = document.getElementById(id);
    if (dialog && !dialog.open) dialog.showModal();
  }

  function closeDialog(id) {
    document.getElementById(id)?.close();
  }

  function setKind(kind) {
    selectedKind = kind;
    document.querySelectorAll('#kindPicker button').forEach((button) => button.classList.toggle('selected', button.dataset.kind === kind));
    const category = document.getElementById('entryCategory');
    category.innerHTML = categories[kind].map((name) => `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`).join('');
    const goalWrap = document.getElementById('goalSelectWrap');
    const goalPicker = document.getElementById('entryGoal');
    goalWrap.hidden = kind !== '存钱';
    goalPicker.innerHTML = state.goals.length
      ? state.goals.map((goal) => `<option value="${escapeHtml(goal.id)}">${escapeHtml(goal.name)}</option>`).join('')
      : '<option value="">请先创建存钱目标</option>';
    goalPicker.disabled = !state.goals.length;
  }

  function openEntry() {
    document.getElementById('entryForm').reset();
    document.getElementById('entryDate').value = localDateInput();
    setKind('支出');
    showDialog('entryDialog');
  }

  function saveEntry(form) {
    const amount = Number(form.get('amount'));
    const goalId = selectedKind === '存钱' ? document.getElementById('entryGoal').value : null;
    if (!Number.isFinite(amount) || amount <= 0) return toast('请输入大于 0 的金额');
    if (selectedKind === '存钱' && !goalId) return toast('请先创建一个存钱目标');
    state.entries.push({
      id: newId(), amount: Math.round(amount * 100) / 100, kind: selectedKind,
      category: form.get('category'), note: String(form.get('note') || '').trim(),
      date: new Date(form.get('date') || Date.now()).toISOString(), goalId
    });
    saveState(); render(); closeDialog('entryDialog'); toast('记下了，做得很好');
  }

  function createGoal(form) {
    const name = String(form.get('name') || '').trim();
    const target = Number(form.get('target'));
    const starting = Math.max(0, Number(form.get('starting')) || 0);
    if (!name || !Number.isFinite(target) || target <= 0) return toast('请填写目标名称和有效金额');
    state.goals.unshift({ id: newId(), name, target: Math.round(target * 100) / 100, starting: Math.round(starting * 100) / 100, deadline: form.get('deadline') || '', symbol: '✦', createdAt: new Date().toISOString() });
    saveState(); render(); closeDialog('goalDialog'); form.reset(); document.getElementById('goalStarting').value = '0'; toast('目标已创建');
  }

  function openContribution(id) {
    const goal = state.goals.find((item) => item.id === id);
    if (!goal) return;
    selectedGoalForContribution = id;
    document.getElementById('contributionTitle').textContent = `存入「${goal.name}」`;
    document.getElementById('contributionForm').reset();
    showDialog('contributionDialog');
  }

  function saveContribution(form) {
    const amount = Number(document.getElementById('contributionAmount').value);
    if (!Number.isFinite(amount) || amount <= 0) return toast('请输入大于 0 的金额');
    state.entries.push({
      id: newId(), amount: Math.round(amount * 100) / 100, kind: '存钱', category: '目标存入',
      note: String(document.getElementById('contributionNote').value || '').trim(),
      date: new Date().toISOString(), goalId: selectedGoalForContribution
    });
    saveState(); render(); closeDialog('contributionDialog'); toast('又离目标近了一步');
  }

  function navigate(page) {
    document.querySelectorAll('.page').forEach((section) => section.classList.toggle('active', section.dataset.page === page));
    document.querySelectorAll('.tab').forEach((tab) => tab.classList.toggle('active', tab.dataset.pageLink === page));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function downloadFile(fileName, contents, type) {
    const blob = new Blob([contents], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url; link.download = fileName; link.style.display = 'none';
    document.body.append(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function shareOrDownload(fileName, contents, type, fallbackMessage) {
    const file = new File([contents], fileName, { type });
    try {
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: fileName });
        return toast('已打开分享面板');
      }
    } catch (error) {
      if (error?.name === 'AbortError') return;
    }
    downloadFile(fileName, contents, type);
    toast(fallbackMessage);
  }

  function exportCsv() {
    const header = ['日期', '类型', '分类', '金额', '备注', '目标'];
    const rows = [...state.entries].sort((a, b) => parsedDate(a.date) - parsedDate(b.date)).map((entry) => {
      const goal = state.goals.find((item) => item.id === entry.goalId)?.name || '';
      return [new Date(entry.date).toLocaleString('zh-CN'), entry.kind, entry.category, Number(entry.amount).toFixed(2), entry.note || '', goal];
    });
    const csv = '\ufeff' + [header, ...rows].map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\r\n');
    shareOrDownload(`小金库账单-${new Date().toISOString().slice(0, 10)}.csv`, csv, 'text/csv;charset=utf-8', '账单已准备好');
  }

  function exportJson() {
    const backup = { app: '小金库', version: 1, exportedAt: new Date().toISOString(), ...state };
    shareOrDownload(`小金库备份-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(backup, null, 2), 'application/json', '备份文件已准备好');
  }

  function importJson() {
    document.getElementById('importFile').click();
  }

  document.getElementById('entryForm').addEventListener('submit', (event) => {
    event.preventDefault(); saveEntry(new FormData(event.currentTarget));
  });
  document.getElementById('goalForm').addEventListener('submit', (event) => {
    event.preventDefault(); createGoal(new FormData(event.currentTarget));
  });
  document.getElementById('contributionForm').addEventListener('submit', (event) => {
    event.preventDefault(); saveContribution(new FormData(event.currentTarget));
  });
  document.getElementById('kindPicker').addEventListener('click', (event) => {
    const button = event.target.closest('[data-kind]');
    if (button) setKind(button.dataset.kind);
  });
  document.getElementById('addButton').addEventListener('click', openEntry);
  document.getElementById('shareButton').addEventListener('click', async () => {
    try {
      if (navigator.share) await navigator.share({ title: '小金库', text: '记录花销，也给未来存一笔。' });
      else toast('从 Safari 分享菜单可添加到主屏幕');
    } catch (error) { if (error?.name !== 'AbortError') toast('从 Safari 分享菜单可添加到主屏幕'); }
  });
  document.querySelector('.tabbar').addEventListener('click', (event) => {
    const button = event.target.closest('[data-page-link]');
    if (button) navigate(button.dataset.pageLink);
  });
  document.getElementById('mainContent').addEventListener('click', (event) => {
    const button = event.target.closest('[data-page-link], [data-action]');
    if (!button) return;
    if (button.dataset.pageLink) navigate(button.dataset.pageLink);
    if (button.dataset.action === 'new-goal') showDialog('goalDialog');
    if (button.dataset.action === 'contribute') openContribution(button.dataset.id);
    if (button.dataset.action === 'delete-entry') {
      state.entries = state.entries.filter((entry) => entry.id !== button.dataset.id);
      saveState(); render(); toast('记录已删除');
    }
    if (button.dataset.action === 'delete-goal') {
      const goal = state.goals.find((item) => item.id === button.dataset.id);
      if (goal && confirm(`删除「${goal.name}」？相关存入记录会保留在账本里。`)) {
        state.goals = state.goals.filter((item) => item.id !== goal.id);
        saveState(); render(); toast('目标已删除');
      }
    }
    if (button.dataset.action === 'export-csv') exportCsv();
    if (button.dataset.action === 'export-json') exportJson();
    if (button.dataset.action === 'import-json') importJson();
  });
  document.querySelector('.filter-row').addEventListener('click', (event) => {
    const button = event.target.closest('[data-filter]');
    if (!button) return;
    currentFilter = button.dataset.filter;
    document.querySelectorAll('.filter-chip').forEach((chip) => chip.classList.toggle('active', chip === button));
    renderLedger();
  });
  document.querySelectorAll('[data-close]').forEach((button) => button.addEventListener('click', () => closeDialog(button.dataset.close)));
  document.querySelectorAll('dialog').forEach((dialog) => dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close();
  }));
  document.getElementById('importFile').addEventListener('change', async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      const backup = JSON.parse(await file.text());
      if (!Array.isArray(backup.entries) || !Array.isArray(backup.goals)) throw new Error('invalid backup');
      if (!confirm(`恢复备份将替换当前 ${state.entries.length} 笔记录和 ${state.goals.length} 个目标，继续吗？`)) return;
      state.entries = backup.entries; state.goals = backup.goals;
      saveState(); render(); toast('备份恢复完成');
    } catch { toast('这个文件不是有效的小金库备份'); }
  });

  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  }
  render();
})();

