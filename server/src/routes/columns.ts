import { Router } from 'express';
import { allowRoles, requireAuth } from '../middleware/auth';
import { pool } from '../db/pool';

export const columnsRouter = Router({ mergeParams: true });
columnsRouter.use(requireAuth);

columnsRouter.get('/', allowRoles('owner', 'admin', 'member', 'viewer'), async (req, res) => {
  const q = await pool.query('SELECT * FROM columns WHERE board_id=$1 ORDER BY position', [req.params.boardId]);
  res.json({ columns: q.rows });
});

/** Add standard columns when a board has none (e.g. boards created before defaults existed). */
columnsRouter.post('/defaults', allowRoles('owner', 'admin'), async (req, res) => {
  const boardId = req.params.boardId;
  const count = await pool.query('SELECT COUNT(*)::int AS c FROM columns WHERE board_id=$1', [boardId]);
  if (Number(count.rows[0]?.c) > 0) {
    return res.status(400).json({ error: 'Board already has columns' });
  }
  await pool.query(
    `INSERT INTO columns(board_id,title,position) VALUES ($1,'To Do',1),($1,'In Progress',2),($1,'In Review',3),($1,'Done',4)`,
    [boardId],
  );
  const q = await pool.query('SELECT * FROM columns WHERE board_id=$1 ORDER BY position', [boardId]);
  res.json({ columns: q.rows });
});

columnsRouter.post('/', allowRoles('owner', 'admin'), async (req, res) => {
  const { title, position } = req.body;
  const q = await pool.query('INSERT INTO columns(board_id,title,position) VALUES($1,$2,$3) RETURNING *', [req.params.boardId, title, position]);
  res.json({ column: q.rows[0] });
});
columnsRouter.patch('/:columnId', allowRoles('owner', 'admin'), async (req, res) => {
  const q = await pool.query('UPDATE columns SET title=COALESCE($1,title),position=COALESCE($2,position),updated_at=NOW() WHERE id=$3 AND board_id=$4 RETURNING *', [req.body.title ?? null, req.body.position ?? null, req.params.columnId, req.params.boardId]);
  res.json({ column: q.rows[0] });
});
columnsRouter.delete('/:columnId', allowRoles('owner', 'admin'), async (req, res) => { await pool.query('DELETE FROM columns WHERE id=$1 AND board_id=$2', [req.params.columnId, req.params.boardId]); res.json({ ok: true }); });
columnsRouter.post('/reorder', allowRoles('owner', 'admin'), async (req, res) => { for (const item of req.body.items ?? []) await pool.query('UPDATE columns SET position=$1 WHERE id=$2 AND board_id=$3', [item.position, item.id, req.params.boardId]); res.json({ ok: true }); });
