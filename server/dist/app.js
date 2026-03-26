"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.app = void 0;
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const express_1 = __importDefault(require("express"));
const auth_1 = require("./routes/auth");
const boards_1 = require("./routes/boards");
const cards_1 = require("./routes/cards");
const categories_1 = require("./routes/categories");
const columns_1 = require("./routes/columns");
const comments_1 = require("./routes/comments");
const invitations_1 = require("./routes/invitations");
const members_1 = require("./routes/members");
const reports_1 = require("./routes/reports");
dotenv_1.default.config();
exports.app = (0, express_1.default)();
const allowedOrigins = (process.env.CLIENT_ORIGIN || 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
exports.app.use((0, cors_1.default)({
    origin(origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
            return;
        }
        callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
}));
exports.app.use(express_1.default.json());
exports.app.use((0, cookie_parser_1.default)());
exports.app.get('/health', (_req, res) => res.json({ ok: true }));
exports.app.use('/auth', auth_1.authRouter);
exports.app.use('/boards', boards_1.boardsRouter);
exports.app.use('/boards/:boardId/columns', columns_1.columnsRouter);
exports.app.use('/boards/:boardId/categories', categories_1.categoriesRouter);
exports.app.use('/boards/:boardId/cards', cards_1.cardsRouter);
exports.app.use('/boards/:boardId/cards/:cardId/comments', comments_1.commentsRouter);
exports.app.use('/boards/:boardId/members', members_1.membersRouter);
exports.app.use('/', invitations_1.invitationsRouter);
exports.app.use('/', reports_1.reportsRouter);
exports.app.use((err, _req, res, _next) => {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
});
