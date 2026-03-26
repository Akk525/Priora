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
  const q = await pool.query(`UPDATE cards SET
  title=COALESCE($1,title), description=$2, assignee_id=$3, priority=COALESCE($4,priority), category_id=$5,
  start_date=$6,due_date=$7,archived=COALESCE($8,archived),position=COALESCE($9,position),column_id=COALESCE($10,column_id),updated_at=NOW()
  WHERE id=$11 AND board_id=$12 RETURNING *`, [payload.title ?? null, payload.description ?? null, payload.assigneeId ?? null, payload.priority ?? null, payload.categoryId ?? null, payload.startDate ?? null, payload.dueDate ?? null, payload.archived ?? null, payload.position ?? null, payload.columnId ?? null, req.params.cardId, req.params.boardId]);
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
