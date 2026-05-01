"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.boardsRouter = void 0;
const express_1 = require("express");
const zod_1 = require("zod");
const auth_1 = require("../middleware/auth");
const pool_1 = require("../db/pool");
exports.boardsRouter = (0, express_1.Router)();
exports.boardsRouter.use(auth_1.requireAuth);
exports.boardsRouter.get('/', async (req, res) => {
    const result = await pool_1.pool.query(`SELECT b.*, bm.role FROM boards b JOIN board_members bm ON bm.board_id=b.id WHERE bm.user_id=$1 ORDER BY b.created_at DESC`, [req.user.id]);
    res.json({ boards: result.rows });
});
exports.boardsRouter.post('/', async (req, res) => {
    const { name, description, color } = req.body;
    const client = await pool_1.pool.connect();
    try {
        await client.query('BEGIN ISOLATION LEVEL READ COMMITTED');
        const b = await client.query('INSERT INTO boards(name,description,color,owner_id) VALUES($1,$2,$3,$4) RETURNING *', [name, description ?? null, color ?? '#4f46e5', req.user.id]);
        const boardId = b.rows[0].id;
        await client.query('INSERT INTO board_members(board_id,user_id,role) VALUES($1,$2,$3)', [boardId, req.user.id, 'owner']);
        await client.query(`INSERT INTO columns(board_id,title,position) VALUES ($1,'To Do',1),($1,'In Progress',2),($1,'In Review',3),($1,'Done',4)`, [boardId]);
        await client.query('COMMIT');
        res.json({ board: b.rows[0] });
    }
    catch (e) {
        try {
            await client.query('ROLLBACK');
        }
        catch {
            /* ignore */
        }
        throw e;
    }
    finally {
        client.release();
    }
});
exports.boardsRouter.get('/:boardId', (0, auth_1.allowRoles)('owner', 'admin', 'member', 'viewer'), async (req, res) => {
    const b = await pool_1.pool.query('SELECT * FROM boards WHERE id=$1', [req.params.boardId]);
    res.json({ board: b.rows[0] });
});
exports.boardsRouter.patch('/:boardId', (0, auth_1.allowRoles)('owner', 'admin'), async (req, res) => {
    const parsed = zod_1.z.object({
        name: zod_1.z.string().min(1).optional(),
        description: zod_1.z.string().nullable().optional(),
        color: zod_1.z.string().min(1).optional(),
    }).safeParse(req.body);
    if (!parsed.success)
        return res.status(400).json({ error: 'Invalid board payload' });
    const hasName = Object.prototype.hasOwnProperty.call(parsed.data, 'name');
    const hasDescription = Object.prototype.hasOwnProperty.call(parsed.data, 'description');
    const hasColor = Object.prototype.hasOwnProperty.call(parsed.data, 'color');
    const b = await pool_1.pool.query(`UPDATE boards SET
      name=CASE WHEN $1 THEN $2 ELSE name END,
      description=CASE WHEN $3 THEN $4 ELSE description END,
      color=CASE WHEN $5 THEN $6 ELSE color END,
      updated_at=NOW()
     WHERE id=$7
     RETURNING *`, [
        hasName,
        parsed.data.name ?? null,
        hasDescription,
        parsed.data.description ?? null,
        hasColor,
        parsed.data.color ?? null,
        req.params.boardId,
    ]);
    res.json({ board: b.rows[0] });
});
exports.boardsRouter.delete('/:boardId', (0, auth_1.allowRoles)('owner'), async (req, res) => {
    await pool_1.pool.query('DELETE FROM boards WHERE id=$1', [req.params.boardId]);
    res.json({ ok: true });
});
