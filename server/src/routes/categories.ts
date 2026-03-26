import { Router } from 'express';
import { allowRoles, requireAuth } from '../middleware/auth';
import { pool } from '../db/pool';

export const categoriesRouter = Router({ mergeParams: true });
categoriesRouter.use(requireAuth);
categoriesRouter.get('/', allowRoles('owner', 'admin', 'member', 'viewer'), async (req, res) => { const q = await pool.query('SELECT * FROM categories WHERE board_id=$1 ORDER BY name', [req.params.boardId]); res.json({ categories: q.rows }); });
categoriesRouter.post('/', allowRoles('owner', 'admin'), async (req, res) => { const q = await pool.query('INSERT INTO categories(board_id,name,color) VALUES($1,$2,$3) RETURNING *', [req.params.boardId, req.body.name, req.body.color ?? '#6b7280']); res.json({ category: q.rows[0] }); });
categoriesRouter.patch('/:categoryId', allowRoles('owner', 'admin'), async (req, res) => { const q = await pool.query('UPDATE categories SET name=COALESCE($1,name),color=COALESCE($2,color),updated_at=NOW() WHERE id=$3 AND board_id=$4 RETURNING *', [req.body.name ?? null, req.body.color ?? null, req.params.categoryId, req.params.boardId]); res.json({ category: q.rows[0] }); });
categoriesRouter.delete('/:categoryId', allowRoles('owner', 'admin'), async (req, res) => { await pool.query('DELETE FROM categories WHERE id=$1 AND board_id=$2', [req.params.categoryId, req.params.boardId]); res.json({ ok: true }); });
