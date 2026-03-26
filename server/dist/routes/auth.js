"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authRouter = void 0;
const bcrypt_1 = __importDefault(require("bcrypt"));
const express_1 = require("express");
const zod_1 = require("zod");
const pool_1 = require("../db/pool");
const auth_1 = require("../middleware/auth");
const auth_2 = require("../utils/auth");
exports.authRouter = (0, express_1.Router)();
const schema = zod_1.z.object({ email: zod_1.z.string().email(), password: zod_1.z.string().min(6), name: zod_1.z.string().min(1).optional() });
exports.authRouter.post('/register', async (req, res) => {
    const p = schema.safeParse(req.body);
    if (!p.success || !p.data.name)
        return res.status(400).json({ error: 'Invalid payload' });
    const hash = await bcrypt_1.default.hash(p.data.password, 10);
    const result = await pool_1.pool.query('INSERT INTO users(email,name,password_hash) VALUES($1,$2,$3) RETURNING id,email,name', [p.data.email.toLowerCase(), p.data.name, hash]);
    res.json({ user: result.rows[0] });
});
exports.authRouter.post('/login', async (req, res) => {
    const p = schema.safeParse({ ...req.body, name: 'x' });
    if (!p.success)
        return res.status(400).json({ error: 'Invalid payload' });
    const user = await pool_1.pool.query('SELECT * FROM users WHERE lower(email)=lower($1)', [req.body.email]);
    if (!user.rowCount)
        return res.status(401).json({ error: 'Invalid credentials' });
    const ok = await bcrypt_1.default.compare(req.body.password, user.rows[0].password_hash);
    if (!ok)
        return res.status(401).json({ error: 'Invalid credentials' });
    const token = (0, auth_2.genToken)();
    await pool_1.pool.query("INSERT INTO sessions(user_id,token_hash,user_agent,ip_address,expires_at) VALUES($1,$2,$3,$4,NOW()+INTERVAL '7 day')", [user.rows[0].id, (0, auth_2.sha256)(token), req.headers['user-agent'] || null, req.ip || null]);
    res.cookie('session_token', token, { httpOnly: true, sameSite: 'lax' });
    res.json({ user: { id: user.rows[0].id, email: user.rows[0].email, name: user.rows[0].name } });
});
exports.authRouter.post('/logout', auth_1.requireAuth, async (req, res) => {
    const token = req.cookies?.session_token;
    if (token)
        await pool_1.pool.query('DELETE FROM sessions WHERE token_hash=$1', [(0, auth_2.sha256)(token)]);
    res.clearCookie('session_token');
    res.json({ ok: true });
});
exports.authRouter.get('/me', auth_1.requireAuth, async (req, res) => res.json({ user: req.user }));
