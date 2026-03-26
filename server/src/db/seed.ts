import bcrypt from 'bcrypt';
import { pool } from './pool';

async function seed() {
  const c = await pool.connect();
  try {
    await c.query('BEGIN');
    const pass = await bcrypt.hash('password123', 10);
    const u1 = await c.query(`INSERT INTO users(email,name,password_hash) VALUES($1,$2,$3) ON CONFLICT(email) DO UPDATE SET name=EXCLUDED.name RETURNING id`, ['demo@priora.local', 'Demo User', pass]);
    const u2 = await c.query(`INSERT INTO users(email,name,password_hash) VALUES($1,$2,$3) ON CONFLICT(email) DO UPDATE SET name=EXCLUDED.name RETURNING id`, ['alex@priora.local', 'Alex Member', pass]);
    const user1 = u1.rows[0].id;
    const user2 = u2.rows[0].id;

    const b1 = await c.query(`INSERT INTO boards(name,description,owner_id,color) VALUES($1,$2,$3,$4) RETURNING id`, ['Product Launch', 'Launch board', user1, '#4f46e5']);
    const b2 = await c.query(`INSERT INTO boards(name,description,owner_id,color) VALUES($1,$2,$3,$4) RETURNING id`, ['Engineering Sprint', 'Sprint board', user2, '#059669']);
    const board1 = b1.rows[0].id;
    const board2 = b2.rows[0].id;

    await c.query(`INSERT INTO board_members(board_id,user_id,role) VALUES ($1,$2,'owner'),($1,$3,'admin'),($4,$3,'owner'),($4,$2,'member') ON CONFLICT DO NOTHING`, [board1, user1, user2, board2]);

    const cols = await c.query(
      `INSERT INTO columns(board_id,title,position) VALUES
      ($1,'To Do',1),($1,'In Progress',2),($1,'In Review',3),($1,'Done',4),
      ($2,'To Do',1),($2,'In Progress',2),($2,'In Review',3),($2,'Done',4)
      RETURNING id, board_id, title`,
      [board1, board2],
    );
    const colB1 = (title: string) =>
      cols.rows.find((r: { board_id: string; title: string; id: string }) => r.board_id === board1 && r.title === title)?.id;
    const todo = colB1('To Do')!;
    const inProgress = colB1('In Progress')!;
    const inReview = colB1('In Review')!;
    const done = colB1('Done')!;

    const cats = await c.query(
      `INSERT INTO categories(board_id,name,color) VALUES
      ($1,'Design','#3b82f6'),
      ($1,'Backend','#6366f1'),
      ($1,'DevOps','#f59e0b'),
      ($1,'Frontend','#10b981'),
      ($1,'Documentation','#8b5cf6'),
      ($2,'Feature','#3b82f6'),
      ($2,'Bug','#ef4444')
      RETURNING id,name,board_id`,
      [board1, board2],
    );
    const cat = (name: string) =>
      cats.rows.find((r: { board_id: string; name: string; id: string }) => r.board_id === board1 && r.name === name)?.id;

    const due = '2025-03-20';

    await c.query(
      `INSERT INTO cards(board_id,column_id,title,description,assignee_id,priority,category_id,start_date,due_date,position,archived) VALUES
      ($1,$2,'Design homepage mockup','Create wireframes and mockups for the new homepage design',$3,'high',$4,NULL,$5::date,1,false),
      ($1,$2,'Set up CI/CD pipeline','Configure GitHub Actions for automated testing and deployment',$3,'medium',$6,NULL,$5::date,2,false),
      ($1,$7,'Implement user authentication','Add login/logout functionality with JWT tokens',$8,'high',$9,NULL,$5::date,1,false),
      ($1,$10,'Update API documentation','Document all new endpoints and update existing ones',$3,'low',$11,NULL,$5::date,1,false),
      ($1,$12,'Setup project structure','Initialize React project with TypeScript and necessary dependencies',$8,'high',$13,NULL,$5::date,1,false),
      ($1,$2,'Old archived task','Archived sample',$3,'low',$4,NULL,NULL,3,true)
      `,
      [
        board1,
        todo,
        user1,
        cat('Design')!,
        due,
        cat('DevOps')!,
        inProgress,
        user2,
        cat('Backend')!,
        inReview,
        cat('Documentation')!,
        done,
        cat('Frontend')!,
      ],
    );

    await c.query(`INSERT INTO board_invitations(board_id,email,role,status,invited_by_user_id,expires_at) VALUES($1,$2,'member','pending',$3,NOW()+INTERVAL '7 day')`, [board1, 'newuser@priora.local', user1]);

    await c.query('COMMIT');
    console.log('Seed completed');
  } catch (e) {
    await c.query('ROLLBACK');
    throw e;
  } finally {
    c.release();
    await pool.end();
  }
}

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});
