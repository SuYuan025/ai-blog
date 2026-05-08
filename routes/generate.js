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
  return (data.organic || []).map(r => `${r.title}\n${r.snippet}`).join('\n\n');
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
      } catch (e) { /* 搜索失败降级 */ }
    }

    send('progress', { stage: 'writing', message: 'AI 正在撰写文章…', pct: 20 });

    const prompt = `你是一位专业的博客作者。用户给了你一句话作为主题，请完成以下任务：

【用户的话】：${topic}
【风格要求】：${styleMap[style] || '轻松易读'}
【字数要求】：${wordMap[wordCount] || '1000-1500字'}${searchContext}

请按以下格式输出：

1. 第一行写一个合适的文章标题（用 # 开头，如：# 这是标题）
2. 空一行
3. 正文内容（Markdown 格式），结构包含：
   - 一个吸引人的开头
   - 2-3 个小标题分段（用 ## 标记）
   - 技术类文章放代码示例
   - 一个总结段落
4. 文章最后输出标签，严格按这个格式（不要省略，不要改格式，否则程序解析失败）：
<!-- TAGS: ["标签1","标签2","标签3"] -->`;

    const response = await fetch(`${DEEPSEEK_BASE}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'deepseek-v4-pro',
        messages: [
          { role: 'system', content: '你是一个专业博客作者，文章素材充分。写完后严格按格式输出标签。' },
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

    // 解析 tags（支持多种格式）
    let tags = [];
    // 格式1: <!-- TAGS: ["a","b"] -->
    let m = content.match(/<!--\s*TAGS?\s*:\s*(\[.*?\])\s*-->/i);
    // 格式2: 最后一行「标签：a, b, c」或「#tag1 #tag2」
    if (!m) {
      const lastLines = content.split('\n').slice(-3).join('\n');
      const hashTags = lastLines.match(/#(\S+)/g);
      if (hashTags) { tags = hashTags.map(t => t.replace('#', '')); }
    }
    if (m) {
      try { tags = JSON.parse(m[1]); } catch (e) { /* ignore */ }
      content = content.replace(m[0], '').trim();
    }

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
