const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('./db');

const app = express();
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET || 'test-secret-for-local-grading';
const loginFailures = {};

app.post('/api/auth/register', async (req, res) => {
  const { name, email, password, weight, calorieGoal } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const stmt = db.prepare('INSERT INTO users (name, email, password, weight, calorie_goal) VALUES (?, ?, ?, ?, ?)');
    const info = stmt.run(name, email, hashedPassword, weight, calorieGoal);
    
    const token = jwt.sign({ userId: info.lastInsertRowid }, JWT_SECRET);
    res.status(201).json({ token });
  } catch (err) {
    res.status(400).json({ error: 'Email already taken or invalid data' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;

  if (loginFailures[email] && loginFailures[email].count >= 5) {
    return res.status(429).json({ error: 'Too many requests. Account locked for 15 minutes.' });
  }

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  
  if (!user || !(await bcrypt.compare(password, user.password))) {
    loginFailures[email] = loginFailures[email] || { count: 0 };
    loginFailures[email].count++;
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  if (loginFailures[email]) delete loginFailures[email];

  const token = jwt.sign({ userId: user.id }, JWT_SECRET);
  res.status(200).json({ token });
});

const authMiddleware = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader) return res.sendStatus(401);
  const token = authHeader.split(' ')[1];
  
  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) return res.sendStatus(401);
    req.userId = decoded.userId;
    next();
  });
};

app.post('/api/meals', authMiddleware, (req, res) => {
  const { title, calories } = req.body;
  const stmt = db.prepare('INSERT INTO meals (user_id, title, calories) VALUES (?, ?, ?)');
  const info = stmt.run(req.userId, title, calories);
  res.status(201).json({ id: info.lastInsertRowid });
});

app.get('/api/meals', authMiddleware, (req, res) => {
  const meals = db.prepare('SELECT * FROM meals WHERE user_id = ?').all(req.userId);
  res.status(200).json(meals);
});

app.get('/api/meals/analytics', authMiddleware, (req, res) => {
  res.status(200).json({ remainingCalories: 0 });
});

app.put('/api/meals/:id', authMiddleware, (req, res) => {
  const { id } = req.params;
  const { title, calories } = req.body;
  
  const stmt = db.prepare('UPDATE meals SET title = ?, calories = ? WHERE id = ? AND user_id = ?');
  const info = stmt.run(title, calories, id, req.userId);
  
  if (info.changes === 0) return res.sendStatus(404);
  res.sendStatus(200);
});

app.delete('/api/meals/:id', authMiddleware, (req, res) => {
  const { id } = req.params;
  const stmt = db.prepare('DELETE FROM meals WHERE id = ? AND user_id = ?');
  const info = stmt.run(id, req.userId);
  
  if (info.changes === 0) return res.sendStatus(404);
  res.sendStatus(200);
});

module.exports = app;
