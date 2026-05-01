"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cardsRouter = void 0;
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const pool_1 = require("../db/pool");
const zod_1 = require("zod");
exports.cardsRouter = (0, express_1.Router)({ mergeParams: true });
exports.cardsRouter.use(auth_1.requireAuth);
exports.cardsRouter.get('/', (0, auth_1.allowRoles)('owner', 'admin', 'member', 'viewer'), async (req, res) => {
    const q = await pool_1.pool.query(`SELECT c.*, u.name assignee_name, cat.name category_name FROM cards c LEFT JOIN users u ON u.id=c.assignee_id LEFT JOIN categories cat ON cat.id=c.category_id WHERE c.board_id=$1 ORDER BY c.archived, c.position`, [req.params.boardId]);
    res.json({ cards: q.rows });
});
exports.cardsRouter.post('/', (0, auth_1.allowRoles)('owner', 'admin', 'member'), async (req, res) => {
    const parsed = zod_1.z.object({
        title: zod_1.z.string().min(1),
        description: zod_1.z.string().optional().nullable(),
        assigneeId: zod_1.z.string().uuid().optional().nullable(),
        priority: zod_1.z.enum(['low', 'medium', 'high', 'urgent']).optional(),
        categoryId: zod_1.z.string().uuid().optional().nullable(),
        startDate: zod_1.z.string().optional().nullable(),
        dueDate: zod_1.z.string().optional().nullable(),
        archived: zod_1.z.boolean().optional(),
        position: zod_1.z.number().int().positive().optional(),
        estimateHours: zod_1.z.number().optional().nullable(),
        columnId: zod_1.z.string().uuid(),
    }).safeParse(req.body);
    if (!parsed.success)
        return res.status(400).json({ error: 'Invalid card payload' });
    const b = parsed.data;
    const q = await pool_1.pool.query(`INSERT INTO cards(board_id,column_id,title,description,assignee_id,priority,category_id,start_date,due_date,archived,position,estimate_hours)
  VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`, [req.params.boardId, b.columnId, b.title, b.description ?? null, b.assigneeId ?? null, b.priority ?? 'medium', b.categoryId ?? null, b.startDate ?? null, b.dueDate ?? null, b.archived ?? false, b.position ?? 1, b.estimateHours ?? null]);
    res.json({ card: q.rows[0] });
});
exports.cardsRouter.patch('/:cardId', (0, auth_1.allowRoles)('owner', 'admin', 'member'), async (req, res) => {
    const b = zod_1.z.object({
        title: zod_1.z.string().min(1).optional(),
        description: zod_1.z.string().optional().nullable(),
        assigneeId: zod_1.z.string().uuid().optional().nullable(),
        priority: zod_1.z.enum(['low', 'medium', 'high', 'urgent']).optional(),
        categoryId: zod_1.z.string().uuid().optional().nullable(),
        startDate: zod_1.z.string().optional().nullable(),
        dueDate: zod_1.z.string().optional().nullable(),
        archived: zod_1.z.boolean().optional(),
        position: zod_1.z.number().int().positive().optional(),
        columnId: zod_1.z.string().uuid().optional(),
    }).safeParse(req.body);
    if (!b.success)
        return res.status(400).json({ error: 'Invalid card payload' });
    const payload = b.data;
    const hasTitle = Object.prototype.hasOwnProperty.call(payload, 'title');
    const hasDescription = Object.prototype.hasOwnProperty.call(payload, 'description');
    const hasAssigneeId = Object.prototype.hasOwnProperty.call(payload, 'assigneeId');
    const hasPriority = Object.prototype.hasOwnProperty.call(payload, 'priority');
    const hasCategoryId = Object.prototype.hasOwnProperty.call(payload, 'categoryId');
    const hasStartDate = Object.prototype.hasOwnProperty.call(payload, 'startDate');
    const hasDueDate = Object.prototype.hasOwnProperty.call(payload, 'dueDate');
    const hasArchived = Object.prototype.hasOwnProperty.call(payload, 'archived');
    const hasPosition = Object.prototype.hasOwnProperty.call(payload, 'position');
    const hasColumnId = Object.prototype.hasOwnProperty.call(payload, 'columnId');
    const q = await pool_1.pool.query(`UPDATE cards SET
      title=CASE WHEN $1 THEN $2 ELSE title END,
      description=CASE WHEN $3 THEN $4 ELSE description END,
      assignee_id=CASE WHEN $5 THEN $6 ELSE assignee_id END,
      priority=CASE WHEN $7 THEN $8 ELSE priority END,
      category_id=CASE WHEN $9 THEN $10 ELSE category_id END,
      start_date=CASE WHEN $11 THEN $12 ELSE start_date END,
      due_date=CASE WHEN $13 THEN $14 ELSE due_date END,
      archived=CASE WHEN $15 THEN $16 ELSE archived END,
      position=CASE WHEN $17 THEN $18 ELSE position END,
      column_id=CASE WHEN $19 THEN $20 ELSE column_id END,
      updated_at=NOW()
     WHERE id=$21 AND board_id=$22
     RETURNING *`, [
        hasTitle,
        payload.title ?? null,
        hasDescription,
        payload.description ?? null,
        hasAssigneeId,
        payload.assigneeId ?? null,
        hasPriority,
        payload.priority ?? null,
        hasCategoryId,
        payload.categoryId ?? null,
        hasStartDate,
        payload.startDate ?? null,
        hasDueDate,
        payload.dueDate ?? null,
        hasArchived,
        payload.archived ?? null,
        hasPosition,
        payload.position ?? null,
        hasColumnId,
        payload.columnId ?? null,
        req.params.cardId,
        req.params.boardId,
    ]);
    res.json({ card: q.rows[0] });
});
exports.cardsRouter.delete('/:cardId', (0, auth_1.allowRoles)('owner', 'admin', 'member'), async (req, res) => { await pool_1.pool.query('DELETE FROM cards WHERE id=$1 AND board_id=$2', [req.params.cardId, req.params.boardId]); res.json({ ok: true }); });
exports.cardsRouter.post('/:cardId/move', (0, auth_1.allowRoles)('owner', 'admin', 'member'), async (req, res) => {
    const { columnId, position } = req.body;
    const q = await pool_1.pool.query('UPDATE cards SET column_id=$1, position=$2, updated_at=NOW() WHERE id=$3 AND board_id=$4 RETURNING *', [columnId, position, req.params.cardId, req.params.boardId]);
    res.json({ card: q.rows[0] });
});
exports.cardsRouter.post('/:cardId/archive', (0, auth_1.allowRoles)('owner', 'admin', 'member'), async (req, res) => { await pool_1.pool.query('UPDATE cards SET archived=true, archived_at=NOW(), updated_at=NOW() WHERE id=$1 AND board_id=$2', [req.params.cardId, req.params.boardId]); res.json({ ok: true }); });
exports.cardsRouter.post('/:cardId/restore', (0, auth_1.allowRoles)('owner', 'admin', 'member'), async (req, res) => { await pool_1.pool.query('UPDATE cards SET archived=false, archived_at=NULL, updated_at=NOW() WHERE id=$1 AND board_id=$2', [req.params.cardId, req.params.boardId]); res.json({ ok: true }); });
