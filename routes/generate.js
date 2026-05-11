const express = require('express');
const router = express.Router();

const DEEPSEEK_BASE = 'https://api.deepseek.com';
const SERPER_BASE = 'https://google.serper.dev/search';

async function searchSerper(query) {
  const resp = await fetch(SERPER_BASE, {
    method: 'POST',
    headers: { 'X-API-KEY': process.env.SERPER_API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ q: query, gl: 'cn', hl: 'zh-cn', num: 6 }),
  });
  const data = await resp.json();
  console.log('[Serper] 搜索完成，返回结果数:', (data.organic || []).length);
  return (data.organic || []).map(r => `${r.title}\n${r.snippet}\n来源: ${r.link}`).join('\n\n');
}

// 生成完整文章（SSE 流式）
router.post('/generate', async (req, res) => {
  const { topic, style, wordCount, webSearch } = req.body;
  if (!topic) return res.status(400).json({ error: '请输入文章主题' });

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });

  const send = (type, data) => res.write(`event: ${type}\ndata: ${JSON.stringify(data)}\n\n`);

  try {
    const wordMap = { short: '800-1200字', medium: '1500-2500字', long: '3000-5000字' };
    const styleMap = { formal: '正式严谨', casual: '轻松易读', tech: '技术深度' };
    const styleText = styleMap[style] || style || '轻松易读';
    const wordText = wordMap[wordCount] || (/^\d+$/.test(wordCount) ? `约${wordCount}字` : (wordCount || '1000-1500字'));

    let searchContext = '';
    if (webSearch && process.env.SERPER_API_KEY && process.env.SERPER_API_KEY !== '你的serper密钥') {
      send('progress', { stage: 'searching', message: '正在搜索最新资料…', pct: 5 });
      try {
        const results = await searchSerper(topic);
        if (results) {
          searchContext = '\n\n【联网搜索参考素材，请基于这些信息来写文章】：\n' + results +
            '\n\n请根据以上搜索到的真实信息来写文章，如果信息不足或过时，可以结合你的知识补充。';
          send('progress', { stage: 'writing', message: '已获取最新信息，开始撰写…', pct: 15 });
        }
      } catch (e) { console.warn('[Serper] 搜索失败:', e.message); }
    } else {
      console.log('[Serper] 跳过搜索: webSearch=', webSearch, ', key有效=', !!process.env.SERPER_API_KEY && process.env.SERPER_API_KEY !== '你的serper密钥');
    }

    send('progress', { stage: 'writing', message: 'AI 正在撰写文章…', pct: 20 });

    const searchHint = searchContext
      ? '\n【重要】你必须以上面的联网搜索素材为主要信息来源来写这篇文章。优先引用素材中的真实数据、事件和观点。如果素材不足，再用你的知识补充。'
      : '\n请基于你最新的知识来写，确保内容准确、有深度。';

    const prompt = `你是一位专业的博客作者。请根据用户提供的主题写一篇博客文章。

【主题】：${topic}
【风格】：${styleText}
【字数】：${wordText}${searchContext}${searchHint}

输出格式要求（严格遵守）：

第一行：文章标题（# 开头）
空一行
正文（Markdown，含 ## 小标题分段）
空一行
标签行：<!-- TAGS: ["标签1","标签2"] -->

标签必须是 JSON 数组，放在 HTML 注释中，标签用中文，2-3 个。例如：
<!-- TAGS: ["人工智能","深度学习"] -->

务必输出标签行，这是强制要求的。`;

    const response = await fetch(`${DEEPSEEK_BASE}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'deepseek-v4-pro',
        messages: [
          { role: 'system', content: '你是专业博客作者。如果有搜索素材，必须基于素材中的真实信息写文章。文章末尾必须输出标签行 <!-- TAGS: ["标签"] -->，不可遗漏。' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.8,
        max_tokens: 4000,
      }),
    });

    send('progress', { stage: 'writing', message: '即将完成…', pct: 80 });

    if (!response.ok) {
      const err = await response.text();
      send('error', { message: `AI API 错误: ${err}` });
      return res.end();
    }

    const data = await response.json();
    const fullText = data.choices[0].message.content;

    // 解析标题（第一个 # 开头的行）
    const titleMatch = fullText.match(/^# (.+)/m);
    const title = titleMatch ? titleMatch[1].trim() : topic;
    let content = titleMatch ? fullText.replace(/^# .+\n?\n?/, '') : fullText;

    // 解析 tags
    let tags = [];
    // 格式1: <!-- TAGS: ["a","b"] --> 或 <!-- TAG: ["a","b"] -->
    let m = content.match(/<!--\s*TAGS?\s*:\s*\[([^\]]*)\]\s*-->/i);
    if (m) {
      try {
        // 尝试 JSON 解析
        tags = JSON.parse(`[${m[1]}]`);
      } catch (e) {
        // JSON 解析失败，手动分割
        tags = m[1].split(/[,，]/).map(t => t.replace(/["'\s]/g, '')).filter(Boolean);
      }
      content = content.replace(m[0], '').trim();
    } else {
      // 格式2: 文末 #标签1 #标签2
      const lastLines = content.split('\n').slice(-4).join('\n');
      const hashTags = lastLines.match(/#([^\s#]+)/g);
      if (hashTags) {
        tags = hashTags.map(t => t.replace(/^#/, '')).filter(t => t.length < 20 && !/^\d+$/.test(t));
      }
    }
    console.log('[Tags] 解析结果:', tags);

    send('done', { title, content, tags: tags || [], style, wordCount });
    res.end();
  } catch (e) {
    send('error', { message: `服务器错误: ${e.message}` });
    res.end();
  }
});

// AI 辅助编辑段落
router.post('/edit', async (req, res) => {
  try {
    const { text, action } = req.body;
    if (!text || !action) return res.status(400).json({ error: '缺少文本或操作类型' });

    const actionMap = {
      rewrite: '重写',
      expand: '扩写（保持核心意思，增加细节和深度）',
      shorten: '缩写（精简表达，保留关键信息）',
      polish: '润色（优化措辞和流畅度）',
    };

    const prompt = `对以下段落进行${actionMap[action] || '重写'}：\n---\n${text}\n---\n只返回处理后的段落，不加解释。`;

    const response = await fetch(`${DEEPSEEK_BASE}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'deepseek-v4-pro',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      return res.status(response.status).json({ error: `AI API 错误: ${err}` });
    }

    const data = await response.json();
    res.json({ result: data.choices[0].message.content.trim() });
  } catch (e) {
    res.status(500).json({ error: `服务器错误: ${e.message}` });
  }
});

module.exports = router;
