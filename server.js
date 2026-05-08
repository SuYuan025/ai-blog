require('dotenv').config({ override: true });
const express = require('express');
const path = require('path');
const { initDB } = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/api', require('./routes/generate'));
app.use('/api/articles', require('./routes/articles'));

async function start() {
  try {
    await initDB();
    console.log('数据库已就绪');
  } catch (e) {
    console.warn('数据库连接失败，请检查 PostgreSQL 和 .env 配置:', e.message);
    console.warn('文章存储功能将不可用，但仍可生成文章');
  }
  app.listen(PORT, () => {
    console.log(`博客生成器已启动: http://localhost:${PORT}`);
  });
}

start();
