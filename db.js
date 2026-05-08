const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// 初始化数据库表
async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS articles (
      id          SERIAL PRIMARY KEY,
      title       TEXT NOT NULL,
      content     TEXT NOT NULL,
      tags        TEXT[] DEFAULT '{}',
      style       VARCHAR(50),
      word_count  VARCHAR(20),
      created_at  TIMESTAMPTZ DEFAULT NOW(),
      updated_at  TIMESTAMPTZ DEFAULT NOW(),
      user_id     VARCHAR(100),
      grtblog_id  INTEGER,
      short_url   VARCHAR(200)
    )
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_articles_tags ON articles USING GIN (tags)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_articles_created_at ON articles (created_at DESC)`);
}

// 保存文章
async function createArticle({ title, content, tags, style, wordCount }) {
  const result = await pool.query(
    `INSERT INTO articles (title, content, tags, style, word_count)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [title, content, tags || [], style, wordCount]
  );
  return result.rows[0];
}

// 更新文章
async function updateArticle(id, { title, content, tags }) {
  const result = await pool.query(
    `UPDATE articles SET title = $2, content = $3, tags = $4, updated_at = NOW()
     WHERE id = $1 RETURNING *`,
    [id, title, content, tags || []]
  );
  return result.rows[0];
}

// 获取文章列表（支持标题搜索）
async function listArticles(search) {
  let query = 'SELECT id, title, tags, style, word_count, created_at, updated_at FROM articles';
  const params = [];
  if (search) {
    query += ' WHERE title ILIKE $1';
    params.push(`%${search}%`);
  }
  query += ' ORDER BY created_at DESC';
  const result = await pool.query(query, params);
  return result.rows;
}

// 获取单篇文章
async function getArticle(id) {
  const result = await pool.query('SELECT * FROM articles WHERE id = $1', [id]);
  return result.rows[0];
}

// 删除文章
async function deleteArticle(id) {
  await pool.query('DELETE FROM articles WHERE id = $1', [id]);
}

// 获取所有 tags（去重汇总）
async function getAllTags() {
  const result = await pool.query(
    'SELECT DISTINCT unnest(tags) AS tag FROM articles ORDER BY tag'
  );
  return result.rows.map(r => r.tag);
}

// 记录发布到 grtblog 的文章 ID 和 shortUrl
async function setGrtblogInfo(id, grtblogId, shortUrl) {
  await pool.query('UPDATE articles SET grtblog_id = $2, short_url = $3 WHERE id = $1', [id, grtblogId, shortUrl]);
}

module.exports = { initDB, createArticle, updateArticle, listArticles, getArticle, deleteArticle, getAllTags, setGrtblogInfo };
