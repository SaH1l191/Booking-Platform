"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = void 0;
const client_1 = require("../generated/client");
function createAdapter() {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
        throw new Error("DATABASE_URL is required to initialize Prisma.");
    }
    const { PrismaMariaDb } = require("@prisma/adapter-mariadb");
    return new PrismaMariaDb({ connectionString });
}
exports.prisma = globalThis.prisma || new client_1.PrismaClient({ adapter: createAdapter() });
if (process.env.NODE_ENV !== 'production')
    globalThis.prisma = exports.prisma;
exports.default = exports.prisma;
