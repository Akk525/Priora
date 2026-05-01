import { Router } from 'express';
import { allowRoles, requireAuth } from '../middleware/auth';
import { pool } from '../db/pool';
import { z } from 'zod';

export const cardsRouter = Router({ mergeParams: true });
cardsRouter.use(requireAuth);

cardsRouter.get('/', allowRoles('owner', 'admin', 'member', 'viewer'), async (req, res) => {
  const q = await pool.query(`SELECT c.*, u.name assignee_name, cat.name category_name FROM cards c LEFT JOIN users u ON u.id=c.assignee_id LEFT JOIN categories cat ON cat.id=c.category_id WHERE c.board_id=$1 ORDER BY c.archived, c.position`, [req.params.boardId]);
  res.json({ cards: q.rows });
});

cardsRouter.post('/', allowRoles('owner', 'admin', 'member'), async (req, res) => {
  const parsed = z.object({
    title: z.string().min(1),
    description: z.string().optional().nullable(),
    assigneeId: z.string().uuid().optional().nullable(),
    priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
    categoryId: z.string().uuid().optional().nullable(),
    startDate: z.string().optional().nullable(),
    dueDate: z.string().optional().nullable(),
    archived: z.boolean().optional(),
    position: z.number().int().positive().optional(),
    estimateHours: z.number().optional().nullable(),
    columnId: z.string().uuid(),
  }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid card payload' });
  const b = parsed.data;
  const q = await pool.query(`INSERT INTO cards(board_id,column_id,title,description,assignee_id,priority,category_id,start_date,due_date,archived,position,estimate_hours)
  VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`, [req.params.boardId, b.columnId, b.title, b.description ?? null, b.assigneeId ?? null, b.priority ?? 'medium', b.categoryId ?? null, b.startDate ?? null, b.dueDate ?? null, b.archived ?? false, b.position ?? 1, b.estimateHours ?? null]);
  res.json({ card: q.rows[0] });
});

cardsRouter.patch('/:cardId', allowRoles('owner', 'admin', 'member'), async (req, res) => {
  const b = z.object({
    title: z.string().min(1).optional(),
    description: z.string().optional().nullable(),
    assigneeId: z.string().uuid().optional().nullable(),
    priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
    categoryId: z.string().uuid().optional().nullable(),
    startDate: z.string().optional().nullable(),
    dueDate: z.string().optional().nullable(),
    archived: z.boolean().optional(),
    position: z.number().int().positive().optional(),
    columnId: z.string().uuid().optional(),
  }).safeParse(req.body);
  if (!b.success) return res.status(400).json({ error: 'Invalid card payload' });
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

  const q = await pool.query(
    `UPDATE cards SET
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
     RETURNING *`,
    [
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
    ],
  );
  res.json({ card: q.rows[0] });
});

cardsRouter.delete('/:cardId', allowRoles('owner', 'admin', 'member'), async (req, res) => { await pool.query('DELETE FROM cards WHERE id=$1 AND board_id=$2', [req.params.cardId, req.params.boardId]); res.json({ ok: true }); });

cardsRouter.post('/:cardId/move', allowRoles('owner', 'admin', 'member'), async (req, res) => {
  const { columnId, position } = req.body;
  const q = await pool.query('UPDATE cards SET column_id=$1, position=$2, updated_at=NOW() WHERE id=$3 AND board_id=$4 RETURNING *', [columnId, position, req.params.cardId, req.params.boardId]);
  res.json({ card: q.rows[0] });
});

cardsRouter.post('/:cardId/archive', allowRoles('owner', 'admin', 'member'), async (req, res) => { await pool.query('UPDATE cards SET archived=true, archived_at=NOW(), updated_at=NOW() WHERE id=$1 AND board_id=$2', [req.params.cardId, req.params.boardId]); res.json({ ok: true }); });
cardsRouter.post('/:cardId/restore', allowRoles('owner', 'admin', 'member'), async (req, res) => { await pool.query('UPDATE cards SET archived=false, archived_at=NULL, updated_at=NOW() WHERE id=$1 AND board_id=$2', [req.params.cardId, req.params.boardId]); res.json({ ok: true }); });
