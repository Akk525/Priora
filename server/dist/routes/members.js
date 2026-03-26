"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.membersRouter = void 0;
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const pool_1 = require("../db/pool");
const zod_1 = require("zod");
exports.membersRouter = (0, express_1.Router)({ mergeParams: true });
exports.membersRouter.use(auth_1.requireAuth);
exports.membersRouter.get('/', (0, auth_1.allowRoles)('owner', 'admin', 'member', 'viewer'), async (req, res) => {
    const q = await pool_1.pool.query('SELECT bm.board_id,bm.user_id,bm.role,bm.joined_at,u.email,u.name FROM board_members bm JOIN users u ON u.id=bm.user_id WHERE bm.board_id=$1', [req.params.boardId]);
    res.json({ members: q.rows });
});
exports.membersRouter.patch('/:userId', (0, auth_1.allowRoles)('owner', 'admin'), async (req, res) => {
    const parsed = zod_1.z.object({ role: zod_1.z.enum(['admin', 'member', 'viewer']) }).safeParse(req.body);
    if (!parsed.success)
        return res.status(400).json({ error: 'Invalid role payload' });
    const q = await pool_1.pool.query('UPDATE board_members SET role=$1 WHERE board_id=$2 AND user_id=$3 RETURNING *', [parsed.data.role, req.params.boardId, req.params.userId]);
    res.json({ member: q.rows[0] });
});
exports.membersRouter.delete('/:userId', (0, auth_1.allowRoles)('owner', 'admin'), async (req, res) => { await pool_1.pool.query('DELETE FROM board_members WHERE board_id=$1 AND user_id=$2', [req.params.boardId, req.params.userId]); res.json({ ok: true }); });
