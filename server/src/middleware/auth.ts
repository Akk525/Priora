import { NextFunction, Request, Response } from 'express';
import { pool } from '../db/pool';
import { sha256 } from '../utils/auth';

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies?.session_token;
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  const hashed = sha256(token);
  const result = await pool.query(
    `SELECT u.id,u.email,u.name FROM sessions s JOIN users u ON u.id=s.user_id
     WHERE s.token_hash=$1 AND s.expires_at > NOW()`,
    [hashed],
  );
  if (!result.rowCount) return res.status(401).json({ error: 'Unauthorized' });
  req.user = result.rows[0];
  next();
}

export async function getRole(boardId: string, userId: string): Promise<string | null> {
  const result = await pool.query('SELECT role FROM board_members WHERE board_id=$1 AND user_id=$2', [boardId, userId]);
  return result.rows[0]?.role ?? null;
}

export function allowRoles(...roles: string[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const boardId = req.params.boardId || req.body.boardId || req.query.boardId;
    if (!req.user || !boardId) return res.status(400).json({ error: 'Missing board context' });
    const role = await getRole(String(boardId), req.user.id);
    if (!role || !roles.includes(role)) return res.status(403).json({ error: 'Forbidden' });
    next();
  };
}
