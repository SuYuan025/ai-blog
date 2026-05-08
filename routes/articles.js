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

module.exports = router;
