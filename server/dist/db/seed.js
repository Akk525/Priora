"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const bcrypt_1 = __importDefault(require("bcrypt"));
const pool_1 = require("./pool");
async function seed() {
    const c = await pool_1.pool.connect();
    try {
        await c.query('BEGIN');
        const pass = await bcrypt_1.default.hash('password123', 10);
        const u1 = await c.query(`INSERT INTO users(email,name,password_hash) VALUES($1,$2,$3) ON CONFLICT(email) DO UPDATE SET name=EXCLUDED.name RETURNING id`, ['demo@priora.local', 'Demo User', pass]);
        const u2 = await c.query(`INSERT INTO users(email,name,password_hash) VALUES($1,$2,$3) ON CONFLICT(email) DO UPDATE SET name=EXCLUDED.name RETURNING id`, ['alex@priora.local', 'Alex Member', pass]);
        const user1 = u1.rows[0].id;
        const user2 = u2.rows[0].id;
        const b1 = await c.query(`INSERT INTO boards(name,description,owner_id,color) VALUES($1,$2,$3,$4) RETURNING id`, ['Product Launch', 'Launch board', user1, '#4f46e5']);
        const b2 = await c.query(`INSERT INTO boards(name,description,owner_id,color) VALUES($1,$2,$3,$4) RETURNING id`, ['Engineering Sprint', 'Sprint board', user2, '#059669']);
        const board1 = b1.rows[0].id;
        const board2 = b2.rows[0].id;
        await c.query(`INSERT INTO board_members(board_id,user_id,role) VALUES ($1,$2,'owner'),($1,$3,'admin'),($4,$3,'owner'),($4,$2,'member') ON CONFLICT DO NOTHING`, [board1, user1, user2, board2]);
        const cols = await c.query(`INSERT INTO columns(board_id,title,position) VALUES ($1,'Backlog',1),($1,'In Progress',2),($1,'Done',3),($2,'Todo',1),($2,'Doing',2),($2,'Done',3) RETURNING id, board_id, title`, [board1, board2]);
        const backlog = cols.rows.find((r) => r.board_id === board1 && r.title === 'Backlog')?.id;
        const progress = cols.rows.find((r) => r.board_id === board1 && r.title === 'In Progress')?.id;
        const cats = await c.query(`INSERT INTO categories(board_id,name,color) VALUES ($1,'Feature','#3b82f6'),($1,'Bug','#ef4444'),($2,'Ops','#8b5cf6') RETURNING id,name,board_id`, [board1, board2]);
        const feature = cats.rows.find((r) => r.board_id === board1 && r.name === 'Feature')?.id;
        await c.query(`INSERT INTO cards(board_id,column_id,title,description,assignee_id,priority,category_id,start_date,due_date,position,archived) VALUES
      ($1,$2,'Create landing page','Initial MVP page',$3,'high',$4,CURRENT_DATE,CURRENT_DATE + INTERVAL '3 day',1,false),
      ($1,$5,'Fix auth bug','Resolve cookie issue',$6,'urgent',$4,CURRENT_DATE,CURRENT_DATE + INTERVAL '1 day',1,false),
      ($1,$2,'Old archived task','Archived sample',$3,'low',$4,NULL,NULL,2,true)
    `, [board1, backlog, user1, feature, progress, user2]);
        await c.query(`INSERT INTO board_invitations(board_id,email,role,status,invited_by_user_id,expires_at) VALUES($1,$2,'member','pending',$3,NOW()+INTERVAL '7 day')`, [board1, 'newuser@priora.local', user1]);
        await c.query('COMMIT');
        console.log('Seed completed');
    }
    catch (e) {
        await c.query('ROLLBACK');
        throw e;
    }
    finally {
        c.release();
        await pool_1.pool.end();
    }
}
seed().catch((e) => {
    console.error(e);
    process.exit(1);
});
