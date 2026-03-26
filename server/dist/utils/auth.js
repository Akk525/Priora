"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sha256 = sha256;
exports.genToken = genToken;
const crypto_1 = __importDefault(require("crypto"));
function sha256(input) {
    return crypto_1.default.createHash('sha256').update(input).digest('hex');
}
function genToken() {
    return crypto_1.default.randomBytes(32).toString('hex');
}
