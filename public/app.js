// ===== 笔尖 — 前端逻辑 =====

const state = {
  articles: [],
  currentView: 'empty',
  currentArticle: null,
  selectedText: '',
  searchQuery: '',
};

const $ = (sel) => document.querySelector(sel);

const dom = {
  viewEmpty: $('#viewEmpty'),
  viewGenerate: $('#viewGenerate'),
  viewEditor: $('#viewEditor'),
  articleList: $('#articleList'),
  searchInput: $('#searchInput'),
  inputTopic: $('#inputTopic'),
  webSearchToggle: $('#webSearchToggle'),
  chipCustom: $('#chipCustom'),
  customStyleWrap: $('#customStyleWrap'),
  customStyleInput: $('#customStyleInput'),
  wordInput: $('#wordInput'),
  inlineConfirm: $('#inlineConfirm'),
  editorTitle: $('#editorTitle'),
  editorTextarea: $('#editorTextarea'),
  previewContent: $('#previewContent'),
  toast: $('#toast'),
  progressArea: $('#progressArea'),
  progressFill: $('#progressFill'),
  progressStage: $('#progressStage'),
  progressPct: $('#progressPct'),
  generateError: $('#generateError'),
  aiEditBar: $('#aiEditBar'),
  aiEditResult: $('#aiEditResult'),
  aiResultContent: $('#aiResultContent'),
  btnAiEdit: $('#btnAiEdit'),
  btnNew: $('#btnNew'),
  btnStart: $('#btnStart'),
  btnGenerate: $('#btnGenerate'),
  btnDelete: $('#btnDelete'),
  btnSave: $('#btnSave'),
  btnPublish: $('#btnPublish'),
  btnApply: $('#btnApply'),
  btnCancel: $('#btnCancel'),
  btnTheme: $('#btnTheme'),
  paneDivider: $('#paneDivider'),
  paneEdit: $('#paneEdit'),
  panePreview: $('#panePreview'),
};

// ===== 初始化 =====
function init() {
  initTheme();
  initPaneDivider();
  initNavDivider();
  loadArticles();
  setupEventListeners();
  switchView('empty');
}

// ===== 主题切换 =====
function initTheme() {
  if (localStorage.getItem('theme') === 'light') setLightTheme();
}

function toggleTheme() {
  if (document.documentElement.dataset.theme === 'light') {
    setDarkTheme();
  } else {
    setLightTheme();
  }
}

function setLightTheme() {
  document.documentElement.dataset.theme = 'light';
  dom.btnTheme.textContent = '☾';
  dom.btnTheme.title = '切换深色模式';
  localStorage.setItem('theme', 'light');
}

function setDarkTheme() {
  delete document.documentElement.dataset.theme;
  dom.btnTheme.textContent = '☀';
  dom.btnTheme.title = '切换浅色模式';
  localStorage.setItem('theme', 'dark');
}

// ===== 分栏拖拽 =====
function initPaneDivider() {
  let dragging = false;
  const divider = dom.paneDivider;
  const panes = document.querySelector('.editor-panes');

  divider.addEventListener('mousedown', (e) => {
    dragging = true;
    divider.classList.add('dragging');
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    e.preventDefault();
  });

  document.addEventListener('mousemove', (e) => {
    if (!dragging) return;
    const rect = panes.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const pct = Math.max(25, Math.min(75, (x / rect.width) * 100));
    dom.paneEdit.style.flex = `${pct}%`;
    dom.panePreview.style.flex = `${100 - pct}%`;
  });

  document.addEventListener('mouseup', () => {
    if (!dragging) return;
    dragging = false;
    divider.classList.remove('dragging');
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  });
}

// ===== 导航栏拖拽 =====
function initNavDivider() {
  let dragging = false;
  const divider = $('#navDivider');
  const sidebar = $('#sidebar');

  divider.addEventListener('mousedown', (e) => {
    dragging = true;
    divider.classList.add('dragging');
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    e.preventDefault();
  });

  document.addEventListener('mousemove', (e) => {
    if (!dragging) return;
    const w = Math.max(140, Math.min(window.innerWidth * 0.35, e.clientX));
    sidebar.style.width = w + 'px';
    sidebar.style.minWidth = w + 'px';
    document.documentElement.style.setProperty('--nav-width', w + 'px');
  });

  document.addEventListener('mouseup', () => {
    if (!dragging) return;
    dragging = false;
    divider.classList.remove('dragging');
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  });
}

// ===== 视图切换 =====
function switchView(view) {
  state.currentView = view;
  dom.viewEmpty.style.display = view === 'empty' ? '' : 'none';
  dom.viewGenerate.style.display = view === 'generate' ? '' : 'none';
  dom.viewEditor.style.display = view === 'editor' ? '' : 'none';
  dom.aiEditBar.style.display = 'none';
}

// ===== 文章列表 =====
async function loadArticles() {
  try {
    const url = state.searchQuery
      ? `/api/articles?search=${encodeURIComponent(state.searchQuery)}`
      : '/api/articles';
    const res = await fetch(url);
    state.articles = await res.json();
    renderArticleList();
  } catch (e) {
    console.error('加载文章列表失败', e);
  }
}

function renderArticleList() {
  if (state.articles.length === 0) {
    dom.articleList.innerHTML = '<li class="article-empty">暂无文章</li>';
    return;
  }
  dom.articleList.innerHTML = state.articles.map(a => {
    const cls = state.currentArticle?.id === a.id ? 'active' : '';
    return `<li data-id="${a.id}" class="${cls}">
      <div class="article-item-title">${escHtml(a.title)}</div>
      <div class="article-item-meta">
        <span>${formatDate(a.created_at)}</span>
        ${a.tags?.length ? a.tags.slice(0, 3).map(t => '<span class="item-tag">' + escHtml(t) + '</span>').join('') : ''}
      </div>
    </li>`;
  }).join('');

  dom.articleList.querySelectorAll('li[data-id]').forEach(li => {
    li.addEventListener('click', () => openArticle(Number(li.dataset.id)));
  });
}

function formatDate(d) {
  if (!d) return '';
  const diff = Date.now() - new Date(d).getTime();
  if (diff < 86400000) return '今天';
  if (diff < 172800000) return '昨天';
  return new Date(d).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
}

function escHtml(s) {
  const div = document.createElement('div');
  div.textContent = s;
  return div.innerHTML;
}

// ===== 打开文章 =====
async function openArticle(id) {
  try {
    const res = await fetch(`/api/articles/${id}`);
    const article = await res.json();
    if (!article) return;
    state.currentArticle = article;
    dom.editorTitle.value = article.title;
    dom.editorTextarea.value = article.content;
    updatePublishButton(article);
    updatePreview();
    switchView('editor');
    renderArticleList();
  } catch (e) {
    toast('加载文章失败', true);
  }
}

// ===== 新建 =====
function startNew() {
  state.currentArticle = null;
  dom.inputTopic.value = '';
  dom.generateError.style.display = 'none';
  dom.progressArea.style.display = 'none';
  resetChipGroups();
  switchView('generate');
  setTimeout(() => dom.inputTopic.focus(), 100);
}

// ===== AI 生成 (SSE) =====
let progressTimer = null;
const PROGRESS_STEPS = [
  { pct: 6,  msg: '分析主题…',     delay: 800 },
  { pct: 14, msg: '构思大纲…',     delay: 1500 },
  { pct: 25, msg: '撰写开头…',     delay: 2500 },
  { pct: 40, msg: '正文撰写中…',    delay: 3500 },
  { pct: 56, msg: '深入展开中…',    delay: 3800 },
  { pct: 72, msg: '补充细节…',     delay: 3500 },
  { pct: 84, msg: '润色优化…',     delay: 2500 },
  { pct: 92, msg: '收尾整理…',     delay: 1800 },
];

async function generateArticle() {
  const topic = dom.inputTopic.value.trim();
  if (!topic) { toast('请输入文章主题'); return; }

  const style = getStyle();
  const wordCount = getWordCount();
  const webSearch = dom.webSearchToggle.checked;

  dom.generateError.style.display = 'none';
  dom.progressArea.style.display = '';
  setGenerating(true);

  // 启动渐慢进度动画
  let stepIdx = 0;
  setProgress(2, '准备中…');
  function nextStep() {
    if (stepIdx < PROGRESS_STEPS.length) {
      const s = PROGRESS_STEPS[stepIdx];
      setProgress(s.pct, s.msg);
      stepIdx++;
      progressTimer = setTimeout(nextStep, s.delay);
    }
  }
  progressTimer = setTimeout(nextStep, PROGRESS_STEPS[0].delay);

  try {
    const res = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic, style, wordCount, webSearch }),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || '生成失败');
    }

    // SSE 读取
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop();

      let eventType = '';
      for (const line of lines) {
        if (line.startsWith('event: ')) {
          eventType = line.slice(7).trim();
        } else if (line.startsWith('data: ')) {
          handleSSE(eventType, JSON.parse(line.slice(6)));
        }
      }
    }

    // 处理 buffer 中剩余的最后一条 data
    if (buffer.trim()) {
      const lastLine = buffer.trim();
      let lastEvent = '';
      let lastData = lastLine;
      if (lastLine.startsWith('event: ') && lastLine.includes('\ndata: ')) {
        const parts = lastLine.split('\n');
        lastEvent = parts[0].slice(7).trim();
        lastData = parts[1].slice(6).trim();
      } else if (lastLine.startsWith('data: ')) {
        lastData = lastLine.slice(6);
      }
      if (lastData) {
        handleSSE(lastEvent, JSON.parse(lastData));
      }
    }

    setGenerating(false);
  } catch (e) {
    clearTimeout(progressTimer);
    dom.generateError.textContent = e.message;
    dom.generateError.style.display = '';
    dom.progressArea.style.display = 'none';
    setGenerating(false);
  }
}

function setGenerating(active) {
  dom.btnGenerate.disabled = active;
  dom.btnGenerate.innerHTML = active
    ? '<span class="btn-spinner"></span> 生成中…'
    : '<svg class="gen-star" width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.4 7.2h7.6l-6 4.8 2.4 7.2-6.4-4.8-6.4 4.8 2.4-7.2-6-4.8h7.6z"/></svg><span>生成文章</span>';
  dom.inputTopic.disabled = active;
  document.querySelectorAll('#styleGroup .chip').forEach(c => {
    c.style.pointerEvents = active ? 'none' : '';
    c.style.opacity = active ? '0.5' : '';
  });
  dom.customStyleInput.disabled = active;
  dom.customStyleInput.style.opacity = active ? '0.5' : '';
  dom.inlineConfirm.disabled = active;
  dom.wordInput.disabled = active;
  dom.wordInput.style.opacity = active ? '0.5' : '';
}

function handleSSE(type, data) {
  switch (type) {
    case 'progress':
      // 保证进度不倒退
      break;
    case 'done':
      clearTimeout(progressTimer);
      setProgress(100, '完成！');
      setTimeout(() => {
        dom.progressArea.style.display = 'none';
        saveGeneratedArticle(data);
      }, 350);
      break;
    case 'error':
      clearTimeout(progressTimer);
      dom.generateError.textContent = data.message;
      dom.generateError.style.display = '';
      dom.progressArea.style.display = 'none';
      setGenerating(false);
      break;
  }
}

function setProgress(pct, message) {
  dom.progressFill.style.width = pct + '%';
  dom.progressPct.textContent = pct + '%';
  dom.progressStage.textContent = message;
}

async function saveGeneratedArticle(data) {
  try {
    const saveRes = await fetch('/api/articles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const saved = await saveRes.json();

    state.currentArticle = saved;
    dom.editorTitle.value = saved.title;
    dom.editorTextarea.value = saved.content;
    updatePublishButton(saved);
    updatePreview();
    switchView('editor');
    await loadArticles();

    toast('文章已生成并保存');
  } catch (e) {
    toast('保存失败', true);
  }
}

function getStyle() {
  const customVal = dom.customStyleInput.value.trim();
  if (customVal) return customVal;
  const active = document.querySelector('#styleGroup .chip:not(.chip-custom).active');
  return active ? active.dataset.value : 'tech';
}

function getWordCount() {
  const val = dom.wordInput.value.trim();
  return val || '1500';
}

function resetChipGroups() {
  document.querySelectorAll('#styleGroup .chip').forEach(c => c.classList.remove('active'));
  // Default to "tech"
  const techChip = document.querySelector('#styleGroup .chip[data-value="tech"]');
  if (techChip) techChip.classList.add('active');
  dom.chipCustom.classList.remove('active');
  dom.customStyleWrap.style.display = 'none';
  dom.customStyleInput.value = '';
  dom.wordInput.value = '1500';
}

// ===== 编辑功能 =====
function updatePreview() {
  if (typeof marked !== 'undefined') {
    dom.previewContent.innerHTML = marked.parse(dom.editorTextarea.value || '');
  } else {
    dom.previewContent.textContent = dom.editorTextarea.value;
  }
}

// ===== 保存文章 =====
async function saveArticle() {
  if (!state.currentArticle?.id) return;
  try {
    await fetch(`/api/articles/${state.currentArticle.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: dom.editorTitle.value,
        content: dom.editorTextarea.value,
        tags: state.currentArticle.tags,
      }),
    });
    state.currentArticle.title = dom.editorTitle.value;
    state.currentArticle.content = dom.editorTextarea.value;
    await loadArticles();
    toast('已保存');
  } catch (e) {
    toast('保存失败', true);
  }
}

// ===== 发布文章到 grtblog =====
function updatePublishButton(article) {
  const svg = dom.btnPublish.querySelector('.publish-svg');
  const label = dom.btnPublish.querySelector('.publish-label');
  if (article?.grtblog_id) {
    dom.btnPublish.classList.add('published');
    dom.btnPublish.title = '点击更新发布';
    if (svg) svg.outerHTML = '<svg class="publish-svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';
    if (label) label.textContent = '已发布';
  } else {
    dom.btnPublish.classList.remove('published');
    dom.btnPublish.title = '发布到主站';
    if (svg) svg.outerHTML = '<svg class="publish-svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>';
    if (label) label.textContent = '发布';
  }
}

async function publishArticle() {
  if (!state.currentArticle?.id) return;
  const btn = dom.btnPublish;
  const label = btn.querySelector('.publish-label');
  const svg = btn.querySelector('.publish-svg');
  btn.disabled = true;
  if (label) label.textContent = '发布中…';
  if (svg) svg.style.display = 'none';

  try {
    const res = await fetch(`/api/articles/${state.currentArticle.id}/publish`, { method: 'POST' });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || '发布失败');

    state.currentArticle.grtblog_id = data.grtblogId;
    updatePublishButton(state.currentArticle);
    await loadArticles();
    toast('已发布到主站');
  } catch (e) {
    toast(e.message, true);
    updatePublishButton(state.currentArticle);
  } finally {
    btn.disabled = false;
    if (svg) svg.style.display = '';
  }
}

// ===== 删除文章 =====
async function deleteArticle() {
  if (!state.currentArticle?.id) return;
  if (!confirm('确定删除这篇文章？')) return;
  try {
    await fetch(`/api/articles/${state.currentArticle.id}`, { method: 'DELETE' });
    state.currentArticle = null;
    await loadArticles();

    switchView('empty');
    toast('已删除');
  } catch (e) {
    toast('删除失败', true);
  }
}

// ===== AI 辅助编辑 =====
function onTextSelect() {
  const ta = dom.editorTextarea;
  const selected = ta.value.substring(ta.selectionStart, ta.selectionEnd).trim();
  if (selected.length > 20) {
    state.selectedText = selected;
    dom.btnAiEdit.disabled = false;
    dom.aiEditBar.style.display = '';
  } else {
    state.selectedText = '';
    dom.btnAiEdit.disabled = true;
    dom.aiEditBar.style.display = 'none';
    dom.aiEditResult.style.display = 'none';
  }
}

async function aiEdit(action) {
  if (!state.selectedText) return;
  dom.aiEditResult.style.display = '';
  dom.aiResultContent.textContent = 'AI 处理中...';
  try {
    const res = await fetch('/api/edit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: state.selectedText, action }),
    });
    const data = await res.json();
    dom.aiResultContent.textContent = data.result;
  } catch (e) {
    dom.aiResultContent.textContent = '处理失败: ' + e.message;
  }
}

function applyAiEdit() {
  const result = dom.aiResultContent.textContent;
  if (!result || result.startsWith('AI 处理中') || result.startsWith('处理失败')) return;
  const ta = dom.editorTextarea;
  ta.value = ta.value.substring(0, ta.selectionStart) + result + ta.value.substring(ta.selectionEnd);
  dom.aiEditResult.style.display = 'none';
  dom.aiEditBar.style.display = 'none';
  state.selectedText = '';
  dom.btnAiEdit.disabled = true;
  updatePreview();
}

function cancelAiEdit() {
  dom.aiEditResult.style.display = 'none';
  dom.aiEditBar.style.display = 'none';
  state.selectedText = '';
  dom.btnAiEdit.disabled = true;
}

// ===== Toast =====
function toast(msg, isError) {
  dom.toast.textContent = msg;
  dom.toast.style.color = isError ? '#d9756a' : '';
  dom.toast.classList.add('show');
  clearTimeout(dom.toast._timeout);
  dom.toast._timeout = setTimeout(() => {
    dom.toast.classList.remove('show');
    dom.toast.style.color = '';
  }, 2500);
}

// ===== 事件绑定 =====
function setupEventListeners() {
  dom.btnNew.addEventListener('click', startNew);
  dom.btnStart.addEventListener('click', startNew);
  dom.btnGenerate.addEventListener('click', generateArticle);
  dom.btnDelete.addEventListener('click', deleteArticle);
  dom.btnSave.addEventListener('click', saveArticle);
  dom.btnPublish.addEventListener('click', publishArticle);
  dom.btnApply.addEventListener('click', applyAiEdit);
  dom.btnCancel.addEventListener('click', cancelAiEdit);
  dom.btnTheme.addEventListener('click', toggleTheme);

  document.querySelectorAll('.ai-action').forEach(btn => {
    btn.addEventListener('click', () => aiEdit(btn.dataset.action));
  });

  // Style chips — handle regular clicks and custom expander
  $('#styleGroup').addEventListener('click', (e) => {
    const chip = e.target.closest('.chip');
    if (!chip) return;
    if (chip === dom.chipCustom) {
      // Toggle custom input
      const isOpen = dom.customStyleWrap.style.display !== 'none';
      if (isOpen) {
        dom.customStyleWrap.style.display = 'none';
        dom.customStyleInput.value = '';
        dom.chipCustom.classList.remove('active');
        dom.customStyleWrap.classList.remove('active');
      } else {
        dom.customStyleWrap.style.display = 'flex';
        dom.chipCustom.classList.add('active');
        dom.customStyleWrap.classList.add('active');
        document.querySelectorAll('#styleGroup .chip:not(.chip-custom)').forEach(c => c.classList.remove('active'));
        setTimeout(() => dom.customStyleInput.focus(), 50);
      }
    } else {
      // Regular style chip
      document.querySelectorAll('#styleGroup .chip').forEach(c => c.classList.remove('active'));
      dom.customStyleWrap.style.display = 'none';
      dom.customStyleInput.value = '';
      chip.classList.add('active');
    }
  });

  // Confirm custom style
  dom.inlineConfirm.addEventListener('click', () => {
    const val = dom.customStyleInput.value.trim();
    if (val) {
      dom.customStyleWrap.style.display = 'none';
    } else {
      dom.customStyleWrap.style.display = 'none';
      const tech = document.querySelector('#styleGroup .chip[data-value="tech"]');
      if (tech) tech.classList.add('active');
    }
  });

  dom.customStyleInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') dom.inlineConfirm.click();
    if (e.key === 'Escape') {
      dom.customStyleWrap.style.display = 'none';
      dom.customStyleInput.value = '';
      const tech = document.querySelector('#styleGroup .chip[data-value="tech"]');
      if (tech) tech.classList.add('active');
    }
  });

  dom.editorTextarea.addEventListener('input', updatePreview);
  dom.editorTextarea.addEventListener('mouseup', onTextSelect);
  dom.editorTextarea.addEventListener('keyup', (e) => {
    if (e.shiftKey || e.key.includes('Arrow')) onTextSelect();
  });

  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      if (state.currentView === 'editor') saveArticle();
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
      e.preventDefault();
      startNew();
    }
    if (e.key === 'Delete' && e.ctrlKey && state.currentView === 'editor') {
      e.preventDefault();
      deleteArticle();
    }
  });

  // 搜索标题
  let searchTimer;
  dom.searchInput.addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      state.searchQuery = dom.searchInput.value.trim();
      loadArticles();
    }, 300);
  });

  dom.inputTopic.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key === 'Enter') generateArticle();
  });
}

// ===== 移动端侧栏 =====
function initMobileSidebar() {
  const hamburger = $('#hamburger');
  const sidebar = $('#sidebar');
  const overlay = $('#sidebarOverlay');

  hamburger.addEventListener('click', () => {
    sidebar.classList.toggle('open');
    overlay.classList.toggle('active');
    document.body.classList.toggle('sidebar-open');
  });

  overlay.addEventListener('click', () => {
    sidebar.classList.remove('open');
    overlay.classList.remove('active');
    document.body.classList.remove('sidebar-open');
  });

  // 点击文章后自动关侧栏
  $('#articleList').addEventListener('click', (e) => {
    if (e.target.closest('li[data-id]') && sidebar.classList.contains('open')) {
      sidebar.classList.remove('open');
      overlay.classList.remove('active');
      document.body.classList.remove('sidebar-open');
    }
  });

  // 新建文章自动关侧栏
  const origStartNew = startNew;
  // Don't override, just add behavior after original
}

// ===== 启动 =====
init();
initMobileSidebar();
