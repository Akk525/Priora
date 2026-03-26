import cookieParser from 'cookie-parser';
import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import { authRouter } from './routes/auth';
import { boardsRouter } from './routes/boards';
import { cardsRouter } from './routes/cards';
import { categoriesRouter } from './routes/categories';
import { columnsRouter } from './routes/columns';
import { commentsRouter } from './routes/comments';
import { invitationsRouter } from './routes/invitations';
import { membersRouter } from './routes/members';
import { reportsRouter } from './routes/reports';

dotenv.config();

export const app = express();
const allowedOrigins = (process.env.CLIENT_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
  }),
);
app.use(express.json());
app.use(cookieParser());

app.get('/health', (_req, res) => res.json({ ok: true }));
app.use('/auth', authRouter);
app.use('/boards', boardsRouter);
app.use('/boards/:boardId/columns', columnsRouter);
app.use('/boards/:boardId/categories', categoriesRouter);
app.use('/boards/:boardId/cards', cardsRouter);
app.use('/boards/:boardId/cards/:cardId/comments', commentsRouter);
app.use('/boards/:boardId/members', membersRouter);
app.use('/', invitationsRouter);
app.use('/', reportsRouter);

app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});
