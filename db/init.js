const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbFile = path.join(__dirname, '..', 'data.db');
const db = new sqlite3.Database(dbFile);

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    author TEXT,
    votes INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    post_id INTEGER,
    author TEXT,
    content TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(post_id) REFERENCES posts(id) ON DELETE CASCADE
  )`);

  db.run('DELETE FROM posts');
  db.run('DELETE FROM comments');

  const stmt = db.prepare('INSERT INTO posts (title, content, author, votes) VALUES (?, ?, ?, ?)');
  stmt.run('Bienvenue', 'Ceci est le mur de Post-it 2.0. Ajoutez vos idées !', 'Admin', 3);
  stmt.run('Idée: réunion', 'Proposer une réunion hebdomadaire', 'Alice', 1);
  stmt.finalize();

  console.log('DB initialized with sample data.');
  db.close();
});
