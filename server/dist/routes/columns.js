"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.columnsRouter = void 0;
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const pool_1 = require("../db/pool");
exports.columnsRouter = (0, express_1.Router)({ mergeParams: true });
exports.columnsRouter.use(auth_1.requireAuth);
exports.columnsRouter.get('/', (0, auth_1.allowRoles)('owner', 'admin', 'member', 'viewer'), async (req, res) => {
    const q = await pool_1.pool.query('SELECT * FROM columns WHERE board_id=$1 ORDER BY position', [req.params.boardId]);
    res.json({ columns: q.rows });
});
/** Add standard columns when a board has none (e.g. boards created before defaults existed). */
exports.columnsRouter.post('/defaults', (0, auth_1.allowRoles)('owner', 'admin'), async (req, res) => {
    const boardId = req.params.boardId;
    const count = await pool_1.pool.query('SELECT COUNT(*)::int AS c FROM columns WHERE board_id=$1', [boardId]);
    if (Number(count.rows[0]?.c) > 0) {
        return res.status(400).json({ error: 'Board already has columns' });
    }
    await pool_1.pool.query(`INSERT INTO columns(board_id,title,position) VALUES ($1,'To Do',1),($1,'In Progress',2),($1,'In Review',3),($1,'Done',4)`, [boardId]);
    const q = await pool_1.pool.query('SELECT * FROM columns WHERE board_id=$1 ORDER BY position', [boardId]);
    res.json({ columns: q.rows });
});
exports.columnsRouter.post('/', (0, auth_1.allowRoles)('owner', 'admin'), async (req, res) => {
    const { title, position } = req.body;
    const q = await pool_1.pool.query('INSERT INTO columns(board_id,title,position) VALUES($1,$2,$3) RETURNING *', [req.params.boardId, title, position]);
    res.json({ column: q.rows[0] });
});
exports.columnsRouter.patch('/:columnId', (0, auth_1.allowRoles)('owner', 'admin'), async (req, res) => {
    const q = await pool_1.pool.query('UPDATE columns SET title=COALESCE($1,title),position=COALESCE($2,position),updated_at=NOW() WHERE id=$3 AND board_id=$4 RETURNING *', [req.body.title ?? null, req.body.position ?? null, req.params.columnId, req.params.boardId]);
    res.json({ column: q.rows[0] });
});
exports.columnsRouter.delete('/:columnId', (0, auth_1.allowRoles)('owner', 'admin'), async (req, res) => { await pool_1.pool.query('DELETE FROM columns WHERE id=$1 AND board_id=$2', [req.params.columnId, req.params.boardId]); res.json({ ok: true }); });
exports.columnsRouter.post('/reorder', (0, auth_1.allowRoles)('owner', 'admin'), async (req, res) => { for (const item of req.body.items ?? [])
    await pool_1.pool.query('UPDATE columns SET position=$1 WHERE id=$2 AND board_id=$3', [item.position, item.id, req.params.boardId]); res.json({ ok: true }); });
