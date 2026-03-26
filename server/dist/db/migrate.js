"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const pool_1 = require("./pool");
async function run() {
    const dir = path_1.default.resolve(process.cwd(), 'migrations');
    const files = (await promises_1.default.readdir(dir)).filter((f) => f.endsWith('.sql')).sort();
    for (const file of files) {
        const sql = await promises_1.default.readFile(path_1.default.join(dir, file), 'utf8');
        await pool_1.pool.query(sql);
        console.log(`Applied ${file}`);
    }
    await pool_1.pool.end();
}
run().catch(async (err) => {
    console.error(err);
    await pool_1.pool.end();
    process.exit(1);
});
