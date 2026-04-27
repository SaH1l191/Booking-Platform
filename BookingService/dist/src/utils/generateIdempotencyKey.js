"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateIdempotencyKey = generateIdempotencyKey;
const uuid_1 = require("uuid");
async function generateIdempotencyKey() {
    return (0, uuid_1.v4)();
}
