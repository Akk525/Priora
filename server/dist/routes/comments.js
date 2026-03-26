"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.commentsRouter = void 0;
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const pool_1 = require("../db/pool");
const zod_1 = require("zod");
exports.commentsRouter = (0, express_1.Router)({ mergeParams: true });
exports.commentsRouter.use(auth_1.requireAuth);
exports.commentsRouter.post('/', (0, auth_1.allowRoles)('owner', 'admin', 'member'), async (req, res) => {
    const parsed = zod_1.z.object({ content: zod_1.z.string().min(1).max(2000) }).safeParse(req.body);
    if (!parsed.success)
        return res.status(400).json({ error: 'Invalid payload' });
    const validCard = await pool_1.pool.query('SELECT 1 FROM cards WHERE id=$1 AND board_id=$2', [req.params.cardId, req.params.boardId]);
    if (!validCard.rowCount)
        return res.status(404).json({ error: 'Card not found for board' });
    const q = await pool_1.pool.query('INSERT INTO card_comments(card_id,author_id,content) VALUES($1,$2,$3) RETURNING *', [req.params.cardId, req.user.id, parsed.data.content]);
    res.json({ comment: q.rows[0] });
});
exports.commentsRouter.patch('/:commentId', (0, auth_1.allowRoles)('owner', 'admin', 'member'), async (req, res) => {
    const parsed = zod_1.z.object({ content: zod_1.z.string().min(1).max(2000) }).safeParse(req.body);
    if (!parsed.success)
        return res.status(400).json({ error: 'Invalid payload' });
    const role = await (0, auth_1.getRole)(String(req.params.boardId), req.user.id);
    const existing = await pool_1.pool.query(`SELECT cc.id,cc.author_id
     FROM card_comments cc
     JOIN cards c ON c.id=cc.card_id
     WHERE cc.id=$1 AND cc.card_id=$2 AND c.board_id=$3`, [req.params.commentId, req.params.cardId, req.params.boardId]);
    if (!existing.rowCount)
        return res.status(404).json({ error: 'Comment not found for board/card' });
    if (existing.rows[0].author_id !== req.user.id && !['owner', 'admin'].includes(role ?? '')) {
        return res.status(403).json({ error: 'Forbidden' });
    }
    const q = await pool_1.pool.query('UPDATE card_comments SET content=$1,updated_at=NOW() WHERE id=$2 RETURNING *', [parsed.data.content, req.params.commentId]);
    res.json({ comment: q.rows[0] });
});
exports.commentsRouter.delete('/:commentId', (0, auth_1.allowRoles)('owner', 'admin', 'member'), async (req, res) => {
    const role = await (0, auth_1.getRole)(String(req.params.boardId), req.user.id);
    const existing = await pool_1.pool.query(`SELECT cc.id,cc.author_id
     FROM card_comments cc
     JOIN cards c ON c.id=cc.card_id
     WHERE cc.id=$1 AND cc.card_id=$2 AND c.board_id=$3`, [req.params.commentId, req.params.cardId, req.params.boardId]);
    if (!existing.rowCount)
        return res.status(404).json({ error: 'Comment not found for board/card' });
    if (existing.rows[0].author_id !== req.user.id && !['owner', 'admin'].includes(role ?? '')) {
        return res.status(403).json({ error: 'Forbidden' });
    }
    await pool_1.pool.query('DELETE FROM card_comments WHERE id=$1', [req.params.commentId]);
    res.json({ ok: true });
});
