import { Router } from 'express';
import { allowRoles, requireAuth } from '../middleware/auth';
import { pool } from '../db/pool';
import { z } from 'zod';

export const invitationsRouter = Router();

invitationsRouter.post('/boards/:boardId/invitations', requireAuth, allowRoles('owner', 'admin'), async (req, res) => {
  const parsed = z.object({
    email: z.string().email(),
    role: z.enum(['admin', 'member', 'viewer']),
  }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid payload' });
  const q = await pool.query(`INSERT INTO board_invitations(board_id,email,role,status,invited_by_user_id,expires_at,token)
  VALUES($1,$2,$3,'pending',$4,NOW()+INTERVAL '7 day',gen_random_uuid()::text) RETURNING *`, [req.params.boardId, parsed.data.email.toLowerCase(), parsed.data.role, req.user!.id]);
  res.json({ invitation: q.rows[0] });
});

invitationsRouter.get('/invitations/me', requireAuth, async (req, res) => {
  const q = await pool.query(`SELECT bi.*, b.name board_name FROM board_invitations bi JOIN users u ON lower(u.email)=lower(bi.email) JOIN boards b ON b.id=bi.board_id WHERE u.id=$1 AND bi.status='pending'`, [req.user!.id]);
  res.json({ invitations: q.rows });
});

invitationsRouter.post('/invitations/:invitationId/accept', requireAuth, async (req, res) => {
  const c = await pool.connect();
  try {
    await c.query('BEGIN');
    const inv = await c.query(
      'UPDATE board_invitations SET status=\'accepted\',responded_at=NOW() WHERE id=$1 AND status=\'pending\' AND lower(email)=lower($2) RETURNING *',
      [req.params.invitationId, req.user!.email],
    );
    if (!inv.rowCount) { await c.query('ROLLBACK'); return res.status(404).json({ error: 'Invitation not found' }); }
    await c.query('INSERT INTO board_members(board_id,user_id,role) VALUES($1,$2,$3) ON CONFLICT(board_id,user_id) DO UPDATE SET role=EXCLUDED.role', [inv.rows[0].board_id, req.user!.id, inv.rows[0].role]);
    await c.query('COMMIT');
    res.json({ ok: true });
  } catch (e) { await c.query('ROLLBACK'); throw e; } finally { c.release(); }
});

invitationsRouter.post('/invitations/:invitationId/reject', requireAuth, async (req, res) => {
  await pool.query(
    'UPDATE board_invitations SET status=\'rejected\',responded_at=NOW() WHERE id=$1 AND status=\'pending\' AND lower(email)=lower($2)',
    [req.params.invitationId, req.user!.email],
  );
  res.json({ ok: true });
});
