const express = require('express');
const router = express.Router();
const db = require('../db');

// 文章列表
router.get('/', async (req, res) => {
  try {
    const { search } = req.query;
    const articles = await db.listArticles(search);
    res.json(articles);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// 获取所有 tags
router.get('/tags', async (req, res) => {
  try {
    const tags = await db.getAllTags();
    res.json(tags);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// 获取单篇文章
router.get('/:id', async (req, res) => {
  try {
    const article = await db.getArticle(req.params.id);
    if (!article) return res.status(404).json({ error: '文章不存在' });
    res.json(article);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// 保存文章
router.post('/', async (req, res) => {
  try {
    const article = await db.createArticle(req.body);
    res.status(201).json(article);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// 更新文章
router.put('/:id', async (req, res) => {
  try {
    const article = await db.updateArticle(req.params.id, req.body);
    if (!article) return res.status(404).json({ error: '文章不存在' });
    res.json(article);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// 删除文章
router.delete('/:id', async (req, res) => {
  try {
    await db.deleteArticle(req.params.id);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// 发布文章到 grtblog
router.post('/:id/publish', async (req, res) => {
  try {
    const article = await db.getArticle(req.params.id);
    if (!article) return res.status(404).json({ error: '文章不存在' });

    const apiUrl = process.env.GRTBLOG_API_URL || 'http://grtblog-server:8080/api/v2';
    const token = process.env.GRTBLOG_TOKEN;
    if (!token) return res.status(500).json({ error: '未配置 GRTBLOG_TOKEN' });

    const shortUrl = article.short_url || `ai-blog-${article.id}`;

    const body = {
      title: article.title,
      content: article.content,
      shortUrl,
      isPublished: true,
      isOriginal: true,
    };

    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    };

    let resp;
    if (article.grtblog_id) {
      // 已发布过 → 更新
      resp = await fetch(`${apiUrl}/articles/${article.grtblog_id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(body),
      });
    } else {
      // 首次发布 → 创建
      resp = await fetch(`${apiUrl}/articles`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });
    }

    if (!resp.ok) {
      const err = await resp.text();
      return res.status(resp.status).json({ error: `grtblog 返回错误: ${err}` });
    }

    const data = await resp.json();
    const grtblogId = data.data?.id;
    const grtblogShortUrl = data.data?.shortUrl;
    if (grtblogId) {
      await db.setGrtblogInfo(article.id, grtblogId, grtblogShortUrl || shortUrl);
    }

    res.json({ ok: true, grtblogId, url: `https://zhuxu.cc/articles/${grtblogShortUrl || shortUrl}` });
  } catch (e) {
    res.status(500).json({ error: `发布失败: ${e.message}` });
  }
});

module.exports = router;
