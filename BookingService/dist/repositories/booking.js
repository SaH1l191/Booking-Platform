"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createBooking = createBooking;
const prisma_1 = require("../config/prisma");
async function createBooking(data) {
    return prisma_1.prisma.booking.create({ data });
}
