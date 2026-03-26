import bcrypt from 'bcrypt';
import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../db/pool';
import { requireAuth } from '../middleware/auth';
import { genToken, sha256 } from '../utils/auth';

export const authRouter = Router();
const schema = z.object({ email: z.string().email(), password: z.string().min(6), name: z.string().min(1).optional() });

authRouter.post('/register', async (req, res) => {
  const p = schema.safeParse(req.body);
  if (!p.success || !p.data.name) return res.status(400).json({ error: 'Invalid payload' });
  const hash = await bcrypt.hash(p.data.password, 10);
  const result = await pool.query('INSERT INTO users(email,name,password_hash) VALUES($1,$2,$3) RETURNING id,email,name', [p.data.email.toLowerCase(), p.data.name, hash]);
  res.json({ user: result.rows[0] });
});

authRouter.post('/login', async (req, res) => {
  const p = schema.safeParse({ ...req.body, name: 'x' });
  if (!p.success) return res.status(400).json({ error: 'Invalid payload' });
  const user = await pool.query('SELECT * FROM users WHERE lower(email)=lower($1)', [req.body.email]);
  if (!user.rowCount) return res.status(401).json({ error: 'Invalid credentials' });
  const ok = await bcrypt.compare(req.body.password, user.rows[0].password_hash);
  if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
  const token = genToken();
  await pool.query("INSERT INTO sessions(user_id,token_hash,user_agent,ip_address,expires_at) VALUES($1,$2,$3,$4,NOW()+INTERVAL '7 day')", [user.rows[0].id, sha256(token), req.headers['user-agent'] || null, req.ip || null]);
  res.cookie('session_token', token, { httpOnly: true, sameSite: 'lax' });
  res.json({ user: { id: user.rows[0].id, email: user.rows[0].email, name: user.rows[0].name } });
});

authRouter.post('/logout', requireAuth, async (req, res) => {
  const token = req.cookies?.session_token;
  if (token) await pool.query('DELETE FROM sessions WHERE token_hash=$1', [sha256(token)]);
  res.clearCookie('session_token');
  res.json({ ok: true });
});

authRouter.get('/me', requireAuth, async (req, res) => res.json({ user: req.user }));
