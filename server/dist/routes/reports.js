"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.reportsRouter = void 0;
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const pool_1 = require("../db/pool");
const zod_1 = require("zod");
exports.reportsRouter = (0, express_1.Router)();
exports.reportsRouter.use(auth_1.requireAuth);
exports.reportsRouter.get('/boards/:boardId/analytics', (0, auth_1.allowRoles)('owner', 'admin', 'member', 'viewer'), async (req, res) => {
    const boardId = req.params.boardId;
    const total = await pool_1.pool.query('SELECT COUNT(*)::int count FROM cards WHERE board_id=$1', [boardId]);
    const archived = await pool_1.pool.query('SELECT COUNT(*)::int count FROM cards WHERE board_id=$1 AND archived=true', [boardId]);
    const overdue = await pool_1.pool.query("SELECT COUNT(*)::int count FROM cards WHERE board_id=$1 AND archived=false AND due_date < CURRENT_DATE", [boardId]);
    res.json({ total: total.rows[0].count, archived: archived.rows[0].count, overdue: overdue.rows[0].count });
});
exports.reportsRouter.get('/reports/cards', async (req, res) => {
    const schema = zod_1.z.object({
        boardId: zod_1.z.string().uuid(),
        columnId: zod_1.z.string().uuid().optional(),
        categoryId: zod_1.z.string().uuid().optional(),
        priority: zod_1.z.enum(['low', 'medium', 'high', 'urgent']).optional(),
        assigneeId: zod_1.z.string().uuid().optional(),
        archived: zod_1.z.enum(['true', 'false']).optional(),
        dueFrom: zod_1.z.string().optional(),
        dueTo: zod_1.z.string().optional(),
    });
    const parsed = schema.safeParse(req.query);
    if (!parsed.success)
        return res.status(400).json({ error: 'Invalid report filters' });
    const { boardId, columnId, categoryId, priority, assigneeId, archived, dueFrom, dueTo } = parsed.data;
    const memberCheck = await pool_1.pool.query('SELECT 1 FROM board_members WHERE board_id=$1 AND user_id=$2', [boardId, req.user.id]);
    if (!memberCheck.rowCount)
        return res.status(403).json({ error: 'Forbidden' });
    const values = [boardId];
    const where = ['c.board_id=$1'];
    const push = (clause, val) => { values.push(val); where.push(`${clause}$${values.length}`); };
    if (columnId)
        push('c.column_id=', columnId);
    if (categoryId)
        push('c.category_id=', categoryId);
    if (priority)
        push('c.priority=', priority);
    if (assigneeId)
        push('c.assignee_id=', assigneeId);
    if (archived !== undefined)
        push('c.archived=', archived === 'true');
    if (dueFrom)
        push('c.due_date>=', dueFrom);
    if (dueTo)
        push('c.due_date<=', dueTo);
    const whereSql = where.join(' AND ');
    const cardsQ = await pool_1.pool.query(`SELECT c.*, col.title column_title, cat.name category_name, u.name assignee_name
  FROM cards c
  LEFT JOIN columns col ON col.id=c.column_id
  LEFT JOIN categories cat ON cat.id=c.category_id
  LEFT JOIN users u ON u.id=c.assignee_id
  WHERE ${whereSql}
  ORDER BY c.created_at DESC`, values);
    const total = cardsQ.rows.length;
    const overdue = cardsQ.rows.filter((r) => !r.archived && r.due_date && new Date(r.due_date) < new Date()).length;
    const byPriority = cardsQ.rows.reduce((a, r) => ({ ...a, [r.priority]: (a[r.priority] || 0) + 1 }), {});
    const byColumn = cardsQ.rows.reduce((a, r) => ({ ...a, [r.column_title || 'Unknown']: (a[r.column_title || 'Unknown'] || 0) + 1 }), {});
    const dynamic = await pool_1.pool.query(`SELECT
    (SELECT json_agg(b.*) FROM (SELECT b.id,b.name FROM boards b JOIN board_members bm ON bm.board_id=b.id WHERE bm.user_id=$1 ORDER BY b.name) b) boards,
    (SELECT json_agg(c.*) FROM (SELECT id,title FROM columns WHERE board_id=$2 ORDER BY position) c) columns,
    (SELECT json_agg(cg.*) FROM (SELECT id,name FROM categories WHERE board_id=$2 ORDER BY name) cg) categories,
    (SELECT json_agg(u.*) FROM (SELECT u.id,u.name FROM board_members bm JOIN users u ON u.id=bm.user_id WHERE bm.board_id=$2 ORDER BY u.name) u) assignees`, [req.user.id, boardId]);
    res.json({ cards: cardsQ.rows, summary: { total, overdue, byPriority, byColumn }, options: dynamic.rows[0] });
});
