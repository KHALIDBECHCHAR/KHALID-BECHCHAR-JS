const express = require('express');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// ── DATABASE SETUP ────────────────────────────────────────────────────────────
const dbFile = path.join(__dirname, 'data.db');
const db = new sqlite3.Database(dbFile);

db.serialize(() => {
  // Posts table
  db.run(`CREATE TABLE IF NOT EXISTS posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    author TEXT,
    color TEXT DEFAULT 'yellow',
    tag TEXT DEFAULT 'général',
    pinned INTEGER DEFAULT 0,
    votes INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME
  )`);

  // Safe migrations for existing DBs
  db.run(`ALTER TABLE posts ADD COLUMN color TEXT DEFAULT 'yellow'`, () => {});
  db.run(`ALTER TABLE posts ADD COLUMN tag TEXT DEFAULT 'général'`, () => {});
  db.run(`ALTER TABLE posts ADD COLUMN pinned INTEGER DEFAULT 0`, () => {});

  // Comments table
  db.run(`CREATE TABLE IF NOT EXISTS comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    post_id INTEGER,
    author TEXT,
    content TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(post_id) REFERENCES posts(id) ON DELETE CASCADE
  )`);

  // Reactions table (new feature)
  db.run(`CREATE TABLE IF NOT EXISTS reactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    post_id INTEGER NOT NULL,
    emoji TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(post_id) REFERENCES posts(id) ON DELETE CASCADE
  )`);
});

// ── VALID VALUES ──────────────────────────────────────────────────────────────
const VALID_COLORS = ['yellow', 'pink', 'blue', 'green', 'orange', 'purple'];
const VALID_TAGS   = ['général', 'idée', 'question', 'urgent', 'fun', 'annonce'];
const VALID_EMOJIS = ['❤️', '😂', '🔥', '👏', '😮', '😢'];

// ── ROUTES: POSTS ─────────────────────────────────────────────────────────────

// GET /api/posts?search=&sort=&tag=
app.get('/api/posts', (req, res) => {
  const search = req.query.search || '';
  const sort   = req.query.sort === 'popularity' ? 'votes DESC' : 'created_at DESC';
  const tag    = req.query.tag || '';
  const params = [];

  let sql = 'SELECT * FROM posts WHERE 1=1';

  if (search) {
    sql += ' AND (title LIKE ? OR content LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }
  if (tag) {
    sql += ' AND tag = ?';
    params.push(tag);
  }

  // Pinned posts always come first, then sorted by chosen criteria
  sql += ` ORDER BY pinned DESC, ${sort}`;

  db.all(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ error: 'DB error' });
    res.json(rows);
  });
});

// GET /api/posts/:id
app.get('/api/posts/:id', (req, res) => {
  const id = Number(req.params.id);
  db.get('SELECT * FROM posts WHERE id = ?', [id], (err, row) => {
    if (err) return res.status(500).json({ error: 'DB error' });
    if (!row) return res.status(404).json({ error: 'post not found' });
    res.json(row);
  });
});

// POST /api/posts
app.post('/api/posts', (req, res) => {
  const { title, content, author, color, tag } = req.body;
  if (!title || !content) return res.status(400).json({ error: 'title and content required' });

  const safeColor = VALID_COLORS.includes(color) ? color : 'yellow';
  const safeTag   = VALID_TAGS.includes(tag) ? tag : 'général';

  const stmt = db.prepare(
    'INSERT INTO posts (title, content, author, color, tag) VALUES (?, ?, ?, ?, ?)'
  );
  stmt.run(title, content, author || null, safeColor, safeTag, function (err) {
    if (err) return res.status(500).json({ error: 'DB insert error' });
    db.get('SELECT * FROM posts WHERE id = ?', [this.lastID], (err2, row) => {
      if (err2) return res.status(500).json({ error: 'DB error' });
      res.status(201).json(row);
    });
  });
});

// PUT /api/posts/:id
app.put('/api/posts/:id', (req, res) => {
  const id = Number(req.params.id);
  const { title, content, color, tag } = req.body;
  if (!title && !content) return res.status(400).json({ error: 'title or content required' });

  const safeColor = VALID_COLORS.includes(color) ? color : null;
  const safeTag   = VALID_TAGS.includes(tag) ? tag : null;

  db.run(
    `UPDATE posts SET
      title = COALESCE(?, title),
      content = COALESCE(?, content),
      color = COALESCE(?, color),
      tag = COALESCE(?, tag),
      updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [title, content, safeColor, safeTag, id],
    function (err) {
      if (err) return res.status(500).json({ error: 'DB error' });
      if (this.changes === 0) return res.status(404).json({ error: 'post not found' });
      db.get('SELECT * FROM posts WHERE id = ?', [id], (err2, row) => {
        if (err2) return res.status(500).json({ error: 'DB error' });
        res.json(row);
      });
    }
  );
});

// DELETE /api/posts/:id
app.delete('/api/posts/:id', (req, res) => {
  const id = Number(req.params.id);
  db.run('DELETE FROM posts WHERE id = ?', [id], function (err) {
    if (err) return res.status(500).json({ error: 'DB error' });
    if (this.changes === 0) return res.status(404).json({ error: 'post not found' });
    res.json({ success: true });
  });
});

// ── ROUTES: PIN ───────────────────────────────────────────────────────────────

// PATCH /api/posts/:id/pin  — toggle pin
app.patch('/api/posts/:id/pin', (req, res) => {
  const id = Number(req.params.id);
  db.get('SELECT pinned FROM posts WHERE id = ?', [id], (err, row) => {
    if (err) return res.status(500).json({ error: 'DB error' });
    if (!row) return res.status(404).json({ error: 'post not found' });

    const newPinned = row.pinned ? 0 : 1;
    db.run(
      'UPDATE posts SET pinned = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [newPinned, id],
      function (e) {
        if (e) return res.status(500).json({ error: 'DB error' });
        res.json({ pinned: newPinned });
      }
    );
  });
});

// ── ROUTES: VOTE ──────────────────────────────────────────────────────────────

// POST /api/posts/:id/vote
app.post('/api/posts/:id/vote', (req, res) => {
  const id = Number(req.params.id);
  const { type } = req.body;
  if (!['up', 'down'].includes(type)) return res.status(400).json({ error: 'type must be up or down' });

  const delta = type === 'up' ? 1 : -1;
  db.run(
    'UPDATE posts SET votes = votes + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [delta, id],
    function (err) {
      if (err) return res.status(500).json({ error: 'DB error' });
      if (this.changes === 0) return res.status(404).json({ error: 'post not found' });
      db.get('SELECT votes FROM posts WHERE id = ?', [id], (err2, row) => {
        if (err2) return res.status(500).json({ error: 'DB error' });
        res.json({ votes: row.votes });
      });
    }
  );
});

// ── ROUTES: COMMENTS ──────────────────────────────────────────────────────────

// GET /api/posts/:id/comments
app.get('/api/posts/:id/comments', (req, res) => {
  const postId = Number(req.params.id);
  db.all(
    'SELECT * FROM comments WHERE post_id = ? ORDER BY created_at ASC',
    [postId],
    (err, rows) => {
      if (err) return res.status(500).json({ error: 'DB error' });
      res.json(rows);
    }
  );
});

// POST /api/posts/:id/comments
app.post('/api/posts/:id/comments', (req, res) => {
  const postId = Number(req.params.id);
  const { author, content } = req.body;
  if (!content) return res.status(400).json({ error: 'content required' });

  db.get('SELECT id FROM posts WHERE id = ?', [postId], (err, post) => {
    if (err) return res.status(500).json({ error: 'DB error' });
    if (!post) return res.status(404).json({ error: 'post not found' });

    const stmt = db.prepare(
      'INSERT INTO comments (post_id, author, content) VALUES (?, ?, ?)'
    );
    stmt.run(postId, author || null, content, function (e) {
      if (e) return res.status(500).json({ error: 'DB insert error' });
      db.get('SELECT * FROM comments WHERE id = ?', [this.lastID], (err2, row) => {
        if (err2) return res.status(500).json({ error: 'DB error' });
        res.status(201).json(row);
      });
    });
  });
});

// ── ROUTES: REACTIONS ─────────────────────────────────────────────────────────

// GET /api/posts/:id/reactions  — returns counts per emoji
app.get('/api/posts/:id/reactions', (req, res) => {
  const postId = Number(req.params.id);
  db.all(
    'SELECT emoji, COUNT(*) as count FROM reactions WHERE post_id = ? GROUP BY emoji',
    [postId],
    (err, rows) => {
      if (err) return res.status(500).json({ error: 'DB error' });
      res.json(rows);
    }
  );
});

// POST /api/posts/:id/reactions
app.post('/api/posts/:id/reactions', (req, res) => {
  const postId = Number(req.params.id);
  const { emoji } = req.body;

  if (!emoji || !VALID_EMOJIS.includes(emoji)) {
    return res.status(400).json({ error: 'invalid emoji' });
  }

  db.get('SELECT id FROM posts WHERE id = ?', [postId], (err, post) => {
    if (err) return res.status(500).json({ error: 'DB error' });
    if (!post) return res.status(404).json({ error: 'post not found' });

    db.run(
      'INSERT INTO reactions (post_id, emoji) VALUES (?, ?)',
      [postId, emoji],
      function (e) {
        if (e) return res.status(500).json({ error: 'DB insert error' });
        // Return updated counts
        db.all(
          'SELECT emoji, COUNT(*) as count FROM reactions WHERE post_id = ? GROUP BY emoji',
          [postId],
          (err2, rows) => {
            if (err2) return res.status(500).json({ error: 'DB error' });
            res.status(201).json(rows);
          }
        );
      }
    );
  });
});

// ── ERROR HANDLER ─────────────────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'internal server error' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server listening on http://localhost:${PORT}`));
