const express    = require('express');
const Database   = require('better-sqlite3');
const bcrypt     = require('bcryptjs');
const jwt        = require('jsonwebtoken');
const path       = require('path');

const app    = express();
const db     = new Database('goldspin.db');
const SECRET = 'goldspin-secret-key-2025'; // смени на что-то длинное на проде!

app.use(express.json());
app.use(express.static('.')); // раздаёт все HTML/JS/CSS файлы из текущей папки

// ─── Создаём таблицу если не существует ────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    username     TEXT    UNIQUE NOT NULL,
    password_hash TEXT   NOT NULL,
    balance      INTEGER DEFAULT 1000,
    spins        INTEGER DEFAULT 0,
    wins         INTEGER DEFAULT 0,
    best_win     INTEGER DEFAULT 0,
    created_at   DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);
console.log('✅ База данных готова');

// ─── Middleware: проверка токена ────────────────────────────────────────────
function requireAuth(req, res, next) {
  const header = req.headers['authorization'];
  if (!header) return res.status(401).json({ error: 'Нет токена' });
  const token = header.split(' ')[1];
  try {
    req.user = jwt.verify(token, SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Токен недействителен или истёк' });
  }
}

// ─── РЕГИСТРАЦИЯ ─────────────────────────────────────────────────────────────
app.post('/api/register', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password)
    return res.status(400).json({ error: 'Заполни все поля' });
  if (username.trim().length < 3)
    return res.status(400).json({ error: 'Имя: минимум 3 символа' });
  if (password.length < 4)
    return res.status(400).json({ error: 'Пароль: минимум 4 символа' });

  const hash = await bcrypt.hash(password, 10);
  try {
    const result = db
      .prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)')
      .run(username.trim(), hash);

    const token = jwt.sign(
      { id: result.lastInsertRowid, username: username.trim() },
      SECRET,
      { expiresIn: '30d' }
    );
    res.json({ token, username: username.trim(), balance: 1000, spins: 0, wins: 0, best_win: 0 });
  } catch (e) {
    if (e.message.includes('UNIQUE'))
      return res.status(400).json({ error: 'Это имя уже занято' });
    console.error(e);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// ─── ВХОД ────────────────────────────────────────────────────────────────────
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  const user = db
    .prepare('SELECT * FROM users WHERE username = ?')
    .get(username?.trim());

  if (!user) return res.status(401).json({ error: 'Пользователь не найден' });

  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) return res.status(401).json({ error: 'Неверный пароль' });

  const token = jwt.sign({ id: user.id, username: user.username }, SECRET, { expiresIn: '30d' });
  res.json({
    token,
    username: user.username,
    balance:  user.balance,
    spins:    user.spins,
    wins:     user.wins,
    best_win: user.best_win
  });
});

// ─── ПОЛУЧИТЬ ПРОФИЛЬ ─────────────────────────────────────────────────────────
app.get('/api/me', requireAuth, (req, res) => {
  const user = db
    .prepare('SELECT id, username, balance, spins, wins, best_win, created_at FROM users WHERE id = ?')
    .get(req.user.id);
  if (!user) return res.status(404).json({ error: 'Пользователь не найден' });
  res.json(user);
});

// ─── СОХРАНИТЬ БАЛАНС И СТАТИСТИКУ ───────────────────────────────────────────
app.post('/api/balance', requireAuth, (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  if (!user) return res.status(404).json({ error: 'Не найден' });

  // Никогда не уменьшаем spins/wins — берём максимум
  const newBal   = Math.max(0, req.body.balance  ?? user.balance);
  const newSpins = Math.max(user.spins, req.body.spins    ?? 0);
  const newWins  = Math.max(user.wins,  req.body.wins     ?? 0);
  const newBest  = Math.max(user.best_win, req.body.best_win ?? 0);

  db.prepare('UPDATE users SET balance=?, spins=?, wins=?, best_win=? WHERE id=?')
    .run(newBal, newSpins, newWins, newBest, req.user.id);

  res.json({ balance: newBal, spins: newSpins, wins: newWins, best_win: newBest });
});

// ─── ЗАПУСК ──────────────────────────────────────────────────────────────────
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`\n🎰 GoldSpin сервер запущен!`);
  console.log(`👉 Открой: http://localhost:${PORT}/login.html\n`);
});
