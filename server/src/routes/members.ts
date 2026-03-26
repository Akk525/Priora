import { Router } from 'express';
import { allowRoles, requireAuth } from '../middleware/auth';
import { pool } from '../db/pool';
import { z } from 'zod';

export const membersRouter = Router({ mergeParams: true });
membersRouter.use(requireAuth);
membersRouter.get('/', allowRoles('owner', 'admin', 'member', 'viewer'), async (req, res) => {
  const q = await pool.query('SELECT bm.board_id,bm.user_id,bm.role,bm.joined_at,u.email,u.name FROM board_members bm JOIN users u ON u.id=bm.user_id WHERE bm.board_id=$1', [req.params.boardId]);
  res.json({ members: q.rows });
});
membersRouter.patch('/:userId', allowRoles('owner', 'admin'), async (req, res) => {
  const parsed = z.object({ role: z.enum(['admin', 'member', 'viewer']) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid role payload' });
  const q = await pool.query('UPDATE board_members SET role=$1 WHERE board_id=$2 AND user_id=$3 RETURNING *', [parsed.data.role, req.params.boardId, req.params.userId]);
  res.json({ member: q.rows[0] });
});
membersRouter.delete('/:userId', allowRoles('owner', 'admin'), async (req, res) => { await pool.query('DELETE FROM board_members WHERE board_id=$1 AND user_id=$2', [req.params.boardId, req.params.userId]); res.json({ ok: true }); });
